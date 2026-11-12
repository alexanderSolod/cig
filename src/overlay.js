// The cigarette as a floating layer over a web page (X / Twitter).
// No addons and no import map here, so it can be loaded straight from an extension.
import * as THREE from '../vendor/three/build/three.module.js';
import { Cigarette, L } from './cigarette.js';
import { createFx } from './fx.js';

const BOX_W = 520, BOX_H = 780;       // canvas size, CSS px
const PX_PER_CM = 24;                 // cigarette ≈ 200px long
const ORIGIN_UP = 150;                // cigarette centre, px above the bottom of the box
const HIT_W = 230, HIT_H = 84;
const LONG_PRESS = 550;               // ms
const SAVE_KEY = 'cig:v1';
const RESUME_WINDOW = 20 * 60e3;      // a lit cigarette left longer than this is gone
const IDLE_RATE = 0.0125;             // keep in step with cigarette.js

const CSS = `
:host { all: initial; }
.dim { position: fixed; inset: 0; z-index: 2147483645; pointer-events: none; opacity: 0;
  background: rgba(0,0,0,.8); backdrop-filter: grayscale(1) blur(1.5px); -webkit-backdrop-filter: grayscale(1) blur(1.5px);
  transition: opacity 1.8s ease; }
.dim.on { opacity: 1; }
.box { position: fixed; width: ${BOX_W}px; height: ${BOX_H}px; z-index: 2147483646; pointer-events: none; }
canvas { width: 100%; height: 100%; display: block; transition: opacity .35s ease;
  -webkit-mask-image: linear-gradient(to right, transparent, #000 16%, #000 84%, transparent), linear-gradient(to bottom, transparent, #000 26%);
  -webkit-mask-composite: source-in; mask-composite: intersect; }
canvas.fade { opacity: 0; }
.box.light canvas { filter: drop-shadow(0 5px 10px rgba(0,0,0,.28)); }
.hit { position: absolute; left: ${(BOX_W - HIT_W) / 2}px; bottom: ${ORIGIN_UP - HIT_H / 2}px; width: ${HIT_W}px; height: ${HIT_H}px;
  pointer-events: auto; cursor: pointer; touch-action: none; border-radius: 40px; -webkit-tap-highlight-color: transparent; }
.hit.moving { cursor: grabbing; }
`;

function load() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch { return {}; } }
function save(patch) { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...load(), ...patch })); } catch { /* storage blocked */ } }

export function mount() {
  if (window.__cigOverlay) return window.__cigOverlay;

  const host = document.createElement('div');
  host.id = 'cig-overlay';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>${CSS}</style><div class="dim"></div><div class="box"><canvas></canvas><div class="hit"></div></div>`;
  document.documentElement.appendChild(host);
  const dim = root.querySelector('.dim'), box = root.querySelector('.box');
  const canvas = root.querySelector('canvas'), hit = root.querySelector('.hit');

  /* ---------------------------------------------------------------- scene */
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(BOX_W, BOX_H, false);

  const scene = new THREE.Scene();
  { // small studio for reflections on the gold band
    const env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.SphereGeometry(60, 16, 8), new THREE.MeshBasicMaterial({ color: 0x24242a, side: THREE.BackSide })));
    const panel = (color, x, y, z, s) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
    };
    panel(new THREE.Color(9, 8.4, 7.6), -22, 34, 22, 30);
    panel(new THREE.Color(3, 3.6, 5), 30, 14, -30, 26);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(env, 0.04).texture;
    scene.environmentIntensity = 0.3;
    pmrem.dispose();
  }
  const key = new THREE.DirectionalLight(0xfff1e0, 1.55); key.position.set(-4, 7, 6);
  const rim = new THREE.DirectionalLight(0xbcd0ff, 1.3); rim.position.set(5, 3, -7);
  const fill = new THREE.DirectionalLight(0xffe2c8, 0.3); fill.position.set(4, -3, 5);
  scene.add(key, rim, fill);

  // world units are cm; frame it so 1cm = PX_PER_CM px and the origin sits ORIGIN_UP px above the bottom
  const halfH = BOX_H / PX_PER_CM / 2, fov = 28;
  const camera = new THREE.PerspectiveCamera(fov, BOX_W / BOX_H, 1, 400);
  const camY = halfH - ORIGIN_UP / PX_PER_CM;
  camera.position.set(0, camY, halfH / Math.tan(THREE.MathUtils.degToRad(fov / 2)));
  camera.lookAt(0, camY, 0);

  const timeU = { value: 0 };
  const fx = createFx(scene, camera, { glow: true });
  const cig = new Cigarette(scene, fx, timeU, { sway: true });

  /* ------------------------------------------------------------ placement */
  // default: bottom of X's right-hand column; falls back to the bottom-right corner
  let custom = load().pos || null;      // { right, bottom } px of the cigarette centre, once the user has moved it
  function place() {
    let cx, bottom;
    if (custom) { cx = innerWidth - custom.right; bottom = custom.bottom; }
    else {
      const col = document.querySelector('[data-testid="sidebarColumn"]');
      const r = col && col.getBoundingClientRect();
      cx = r && r.width > 200 ? r.left + r.width / 2 : innerWidth - 170;
      bottom = ORIGIN_UP;
    }
    cx = Math.max(HIT_W / 2, Math.min(innerWidth - HIT_W / 2, cx));
    bottom = Math.max(HIT_H / 2, Math.min(innerHeight - HIT_H / 2, bottom));
    box.style.left = `${Math.round(cx - BOX_W / 2)}px`;
    box.style.top = `${Math.round(innerHeight - bottom + ORIGIN_UP - BOX_H)}px`;
    return { cx, bottom };
  }
  place();
  addEventListener('resize', place);
  let placeTries = 0;                   // the column renders after the script does
  const placeTimer = setInterval(() => { place(); if (++placeTries > 20) clearInterval(placeTimer); }, 500);

  let light = null;
  function syncTheme() {
    const m = /rgba?\(([^)]+)\)/.exec(getComputedStyle(document.body).backgroundColor || '');
    const [r, g, b, a = 1] = m ? m[1].split(',').map(Number) : [0, 0, 0, 1];
    const isLight = a > 0.5 && (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.6;
    if (isLight === light) return;
    light = isLight;
    box.classList.toggle('light', light);
    fx.setDark(light ? 1 : 0);
  }
  syncTheme();
  setInterval(syncTheme, 2000);

  /* ---------------------------------------------------------------- input */
  // scrolling the page is the drag
  let energy = 0, lastY = scrollY;
  function pull(px) { energy = Math.min(energy + Math.min(Math.abs(px), 160), 900); }
  document.addEventListener('scroll', () => {
    const d = scrollY - lastY; lastY = scrollY;
    pull(d !== 0 ? d : 30);             // 0 = something other than the window scrolled
  }, { passive: true, capture: true });

  let fading = false;
  function relight() {
    if (fading) return;
    fading = true; canvas.classList.add('fade');
    setTimeout(() => { cig.reset(); cig.light(); canvas.classList.remove('fade'); fading = false; persist(); }, 360);
  }

  // click = ash (or a fresh one when it's out) · long press = stub · drag = move
  let press = null;
  hit.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault(); hit.setPointerCapture(e.pointerId);
    press = { x: e.clientX, y: e.clientY, moved: false, long: false, from: place() };
    press.timer = setTimeout(() => { if (press && !press.moved) { press.long = true; cig.stub(); } }, LONG_PRESS);
  });
  hit.addEventListener('pointermove', (e) => {
    if (!press) return;
    const dx = e.clientX - press.x, dy = e.clientY - press.y;
    if (!press.moved && Math.hypot(dx, dy) < 6) return;
    if (press.long) return;
    press.moved = true; clearTimeout(press.timer); hit.classList.add('moving');
    custom = { right: innerWidth - (press.from.cx + dx), bottom: press.from.bottom - dy };
    place();
  });
  const release = (e) => {
    if (!press) return;
    clearTimeout(press.timer); hit.classList.remove('moving');
    const p = press; press = null;
    if (p.moved) { const at = place(); custom = { right: innerWidth - at.cx, bottom: at.bottom }; save({ pos: custom }); return; }
    if (p.long || e.type === 'pointercancel') return;
    if (cig.state === 'lit') cig.ash();
    else if (cig.state === 'out') relight();
    else if (cig.state === 'fresh') cig.light();
  };
  hit.addEventListener('pointerup', release);
  hit.addEventListener('pointercancel', release);
  hit.addEventListener('contextmenu', (e) => e.preventDefault());

  /* ---------------------------------------------------------- persistence */
  // one cigarette per sitting: reloading the page must not hand out a fresh one
  function persist() { save({ state: cig.state === 'out' || cig.state === 'stubbing' ? 'out' : cig.state === 'fresh' ? 'fresh' : 'lit', burn: cig.burn, t: Date.now() }); }
  {
    const s = load(), age = Date.now() - (s.t || 0);
    if (s.state === 'out' && age < RESUME_WINDOW) cig.restore(s.burn, true);
    else if (s.state === 'lit' && age < RESUME_WINDOW && s.burn < L - 0.2) cig.restore(s.burn - IDLE_RATE * age / 1000, false);
    else setTimeout(() => cig.light(), 700);
  }
  setInterval(persist, 2000);
  addEventListener('pagehide', persist);

  /* ----------------------------------------------------------------- loop */
  let last = performance.now(), time = 0, asleep = false;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 1 / 24);
    last = now;

    const out = cig.state === 'out';
    dim.classList.toggle('on', out || (cig.state === 'stubbing' && cig.impact));
    hit.title = out ? 'Light another' : '';
    // nothing moves once it is out and the last smoke has gone
    if (out && cig.wisp < 0.01 && fx.count === 0 && !fading) { if (asleep) return; asleep = true; }
    else asleep = false;

    time += dt; timeU.value = time;
    energy *= Math.exp(-dt / 0.28);
    cig.update(dt, time, 1 - Math.exp(-energy / 260));
    fx.update(dt, time);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  return (window.__cigOverlay = { cig, fx, pull, relight, place });
}
