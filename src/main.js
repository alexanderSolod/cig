import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Cigarette } from './cigarette.js';
import { createFx } from './fx.js';

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
const cig = new Cigarette(scene, fx, timeU);

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
}
addEventListener('resize', resize); resize();

/* ------------------------------------------------------------------ input */
const input = { hold: 0, energy: 0 };
const $ = (id) => document.getElementById(id);
const btn = { light: $('light'), drag: $('drag'), ash: $('ash'), stub: $('stub') };

// scrolling = dragging on it. Wheel energy leaks away, so the pull follows the scroll.
function pull(px) { input.energy = Math.min(input.energy + Math.min(Math.abs(px), 160), 900); }
addEventListener('wheel', (e) => { e.preventDefault(); pull(e.deltaY * (e.deltaMode === 1 ? 16 : 1)); }, { passive: false });

function fresh() {
  canvas.classList.add('fade');
  setTimeout(() => { cig.reset(); canvas.classList.remove('fade'); }, 360);
}
function lightOrNew() { if (cig.state === 'fresh') cig.light(); else if (cig.state === 'out') fresh(); }
const holdOn = () => { input.hold = 1; btn.drag.classList.add('on'); };
const holdOff = () => { input.hold = 0; btn.drag.classList.remove('on'); };

btn.light.addEventListener('click', lightOrNew);
btn.ash.addEventListener('click', () => cig.ash());
btn.stub.addEventListener('click', () => cig.stub());
btn.drag.addEventListener('pointerdown', (e) => { btn.drag.setPointerCapture(e.pointerId); holdOn(); });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) btn.drag.addEventListener(ev, holdOff);

addEventListener('keydown', (e) => {
  if (e.repeat || e.metaKey || e.ctrlKey) return;
  if (e.code === 'Space') { e.preventDefault(); holdOn(); }
  else if (e.code === 'KeyL') lightOrNew();
  else if (e.code === 'KeyA') cig.ash();
  else if (e.code === 'KeyS') cig.stub();
});
addEventListener('keyup', (e) => { if (e.code === 'Space') holdOff(); });
addEventListener('blur', holdOff);

// grab to spin it
let px = 0, py = 0, pt = 0;
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId); canvas.classList.add('dragging');
  cig.grabbed = true; cig.yawVel = 0; px = e.clientX; py = e.clientY; pt = performance.now();
});
canvas.addEventListener('pointermove', (e) => {
  if (!cig.grabbed) return;
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
function syncUi() {
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
  fx.update(dt, time);

  const dist = baseDist * sim.zoom * (1 - 0.035 * cig.inhale);
  LOOK.x = sim.lookX;
  camera.position.set(sim.lookX, 2.2, dist);
  camera.lookAt(LOOK);
  bloom.strength = 0.5 + 0.2 * cig.inhale;

  syncUi();
  composer.render();
}
requestAnimationFrame(frame);

// handle for the extension layer (and the console)
window.cig = { cig, sim, pull, hold: (v) => (v ? holdOn() : holdOff()) };
