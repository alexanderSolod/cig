import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Cigarette } from './cigarette.js';
import { createFx } from './fx.js';
import { Pack } from './pack.js';
import { Tracker } from './stats.js';
import { createPanel, fmtDur } from './panel.js';
import { BRANDS, brand as getBrand } from './brands.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
{ // soft dark backdrop
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 118, 0, 128, 128, 180);
  grad.addColorStop(0, '#1b1a1d'); grad.addColorStop(0.55, '#0d0d0f'); grad.addColorStop(1, '#050506');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  scene.background = tex;
}
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.3;

const camera = new THREE.PerspectiveCamera(28, 1, 0.5, 200);
const LOOK = new THREE.Vector3(0, 1.5, 0);

const key = new THREE.DirectionalLight(0xfff1e0, 1.55); key.position.set(-4, 7, 6);
const rim = new THREE.DirectionalLight(0xbcd0ff, 1.3); rim.position.set(5, 3, -7);
const fill = new THREE.DirectionalLight(0xffe2c8, 0.3); fill.position.set(4, -3, 5);
scene.add(key, rim, fill);

const timeU = { value: 0 };
const fx = createFx(scene, camera);
const tracker = new Tracker();
const cig = new Cigarette(scene, fx, timeU, { brand: tracker.brand });
const pack = new Pack(scene, tracker.brand, tracker.left());

cig.on('light', () => tracker.clearHand());
cig.on('drag', () => tracker.drag());
cig.on('burn', (f) => tracker.burn(f, cig.brand.id));
cig.on('pop', () => tracker.pop());

const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.45, 1.25);
composer.addPass(bloom);
composer.addPass(new OutputPass());

let baseDist = 26;
function resize() {
  const w = innerWidth, h = innerHeight, pr = Math.min(devicePixelRatio || 1, 2);
  renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
  composer.setPixelRatio(pr); composer.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  baseDist = Math.max(26, 11.5 / (2 * Math.tan(THREE.MathUtils.degToRad(14)) * camera.aspect));
  // the pack sits to the left of the cigarette, or under it on a tall screen
  const halfW = baseDist * Math.tan(THREE.MathUtils.degToRad(14)) * camera.aspect;
  if (camera.aspect < 1) { pack.root.position.set(0, -3.6, 0); pack.root.scale.setScalar(0.62); pack.yaw = 0.35; }
  else {
    const k = Math.min(0.78, Math.max(0.45, (halfW - 4.7) / 8));
    pack.root.position.set(-(4.4 + 3.2 * k), 0.7, -0.5); pack.root.scale.setScalar(k); pack.yaw = 0.5;
  }
}
addEventListener('resize', resize); resize();

/* ------------------------------------------------------------------ input */
const input = { hold: 0, energy: 0 };
const $ = (id) => document.getElementById(id);
const btn = { light: $('light'), drag: $('drag'), ash: $('ash'), stub: $('stub'), pop: $('pop'), stats: $('stats') };
const hud = $('hud');
const panel = createPanel(document, tracker, { onBrand: setBrand });
let lastActive = -1e9;

// scrolling = dragging on it. Wheel energy leaks away, so the pull follows the scroll.
function pull(px) { input.energy = Math.min(input.energy + Math.min(Math.abs(px), 160), 900); lastActive = performance.now(); }
addEventListener('wheel', (e) => {
  e.preventDefault();
  const px = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
  pull(px); tracker.scroll(px);
}, { passive: false });

// the stub shrinks away, the pack opens and the next one slides out
const stage = { k: 1, target: 1 };
function takeNew() {
  if (pack.busy) return;
  stage.target = 0;
  const { left, opened } = tracker.take();
  pack.take({ left, refill: opened, onOut: () => { cig.reset(); cig.setBrand(tracker.brand); stage.target = 1; } });
}
function lightOrNew() { if (cig.state === 'fresh') cig.light(); else if (cig.state === 'out') takeNew(); }
function setBrand(id) {
  tracker.setBrand(id);
  cig.setBrand(id);
  pack.swapTo(id, tracker.left(id));
  shown = '';
}
function cycleBrand(dir = 1) {
  const i = BRANDS.findIndex((b) => b.id === tracker.brand);
  setBrand(BRANDS[(i + dir + BRANDS.length) % BRANDS.length].id);
}
const holdOn = () => { input.hold = 1; btn.drag.classList.add('on'); lastActive = performance.now(); };
const holdOff = () => { input.hold = 0; btn.drag.classList.remove('on'); };

btn.light.addEventListener('click', lightOrNew);
btn.ash.addEventListener('click', () => cig.ash());
btn.stub.addEventListener('click', () => cig.stub());
btn.pop.addEventListener('click', () => cig.pop());
btn.stats.addEventListener('click', () => panel.toggle());
btn.drag.addEventListener('pointerdown', (e) => { btn.drag.setPointerCapture(e.pointerId); holdOn(); });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) btn.drag.addEventListener(ev, holdOff);

addEventListener('keydown', (e) => {
  if (e.repeat || e.metaKey || e.ctrlKey) return;
  if (e.code === 'KeyT') return panel.toggle();
  if (panel.isOpen) return;
  if (e.code === 'Space') { e.preventDefault(); holdOn(); }
  else if (e.code === 'KeyP') cig.pop();
  else if (e.code === 'KeyB') cycleBrand(e.shiftKey ? -1 : 1);
  else if (e.code === 'KeyL') lightOrNew();
  else if (e.code === 'KeyA') cig.ash();
  else if (e.code === 'KeyS') cig.stub();
});
addEventListener('keyup', (e) => { if (e.code === 'Space') holdOff(); });
addEventListener('blur', holdOff);

// grab to spin it; click the pack for stats
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function overPack(e) {
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  return pack.hit(ray);
}
let px = 0, py = 0, pt = 0;
canvas.addEventListener('pointerdown', (e) => {
  if (overPack(e)) { panel.open(); return; }
  canvas.setPointerCapture(e.pointerId); canvas.classList.add('dragging');
  cig.grabbed = true; cig.yawVel = 0; px = e.clientX; py = e.clientY; pt = performance.now();
});
canvas.addEventListener('pointermove', (e) => {
  if (!cig.grabbed) { canvas.style.cursor = overPack(e) ? 'pointer' : ''; return; }
  const now = performance.now(), dts = Math.max(0.004, (now - pt) / 1000);
  const dy = (e.clientX - px) * 0.008;
  cig.yaw += dy;
  cig.yawVel = cig.yawVel * 0.6 + (dy / dts) * 0.4;
  cig.tilt = Math.min(0.75, Math.max(-0.6, cig.tilt - (e.clientY - py) * 0.005));
  px = e.clientX; py = e.clientY; pt = now;
});
for (const ev of ['pointerup', 'pointercancel']) canvas.addEventListener(ev, () => {
  cig.grabbed = false; canvas.classList.remove('dragging');
  if (performance.now() - pt > 80) cig.yawVel = 0;
  cig.yawVel = Math.max(-9, Math.min(9, cig.yawVel));
});

let shown = '';
let hudAt = 0;
function syncHud(now) {
  if (now - hudAt < 400) return;
  hudAt = now;
  const s = tracker.snapshot().session, b = getBrand(tracker.brand);
  hud.innerHTML = `<b>${s.cigs}</b> cig${s.cigs === 1 ? '' : 's'} · <b>${(s.cigs / 20).toFixed(2)}</b> packs · <b>${fmtDur(s.activeMs)}</b> scrolling · <b>${s.tar.toFixed(1)}</b> mg tar`
    + `<span>${b.name} · ${tracker.left()} / 20 left in pack</span>`;
}
function syncUi() {
  const pop = cig.canPop;
  if (btn.pop.hidden === pop) btn.pop.hidden = !pop;
  if (cig.state === shown) return;
  shown = cig.state;
  const lit = shown === 'lit';
  btn.light.textContent = shown === 'out' ? 'New' : 'Light';
  btn.light.disabled = !(shown === 'fresh' || shown === 'out');
  btn.drag.disabled = btn.ash.disabled = btn.stub.disabled = !lit;
}

/* ------------------------------------------------------------------- loop */
const sim = { speed: 1, zoom: 1, lookX: 0 };
let last = performance.now(), time = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 1 / 24) * sim.speed;
  last = now; time += dt; timeU.value = time;

  input.energy *= Math.exp(-dt / 0.28);
  const target = Math.max(input.hold, 1 - Math.exp(-input.energy / 260));
  cig.update(dt, time, target);
  pack.update(dt, time);
  fx.update(dt, time);
  stage.k += (stage.target - stage.k) * (1 - Math.exp(-dt / 0.09));
  cig.yawG.scale.setScalar(Math.max(1e-3, stage.k));
  cig.yawG.visible = stage.k > 0.01;

  if (now - lastActive < 2500 && !document.hidden) tracker.active(dt / sim.speed * 1000);
  tracker.flush();
  syncHud(now);

  const dist = baseDist * sim.zoom * (1 - 0.035 * cig.inhale);
  LOOK.x = sim.lookX;
  camera.position.set(sim.lookX, 2.2, dist);
  camera.lookAt(LOOK);
  bloom.strength = 0.5 + 0.2 * cig.inhale;

  syncUi();
  composer.render();
}
requestAnimationFrame(frame);
addEventListener('pagehide', () => tracker.flush(true));

// first visit: shake one out of the pack; a taken-but-unlit one survives a reload
if (tracker.hand) cig.setBrand(tracker.hand.brand);
else { stage.k = stage.target = 0; setTimeout(takeNew, 650); }

// handle for the extension layer (and the console)
window.cig = { cig, pack, tracker, panel, sim, pull, setBrand, takeNew, hold: (v) => (v ? holdOn() : holdOff()) };
