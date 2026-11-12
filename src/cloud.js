// Full-viewport exhale: soft 2D puffs that billow up from the bottom of the screen. Lives in its own
// canvas (pointer-events: none) so it can cover the whole page, X included. Only animates while puffs exist.
const rnd = (a, b) => a + Math.random() * (b - a);

function sprites(color) {
  return Array.from({ length: 4 }, () => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    for (let i = 0; i < 10; i++) {
      const x = 128 + rnd(-50, 50), y = 128 + rnd(-50, 50), r = rnd(45, 85);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(${color},.3)`); gr.addColorStop(0.6, `rgba(${color},.1)`); gr.addColorStop(1, `rgba(${color},0)`);
      g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    }
    return c;
  });
}

export function createCloud(parent, { z = 2147483645, before = null } = {}) {
  const c = document.createElement('canvas');
  c.setAttribute('aria-hidden', 'true');
  Object.assign(c.style, { position: 'fixed', left: '0', top: '0', width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: String(z) });
  parent.insertBefore(c, before);
  const g = c.getContext('2d');
  const SPR = { dark: sprites('236,236,240'), light: sprites('120,122,130') };
  let parts = [], emitters = [], raf = 0, last = 0, light = false, dpr = 1;

  function resize() { dpr = Math.min(devicePixelRatio || 1, 1.5); c.width = Math.round(innerWidth * dpr); c.height = Math.round(innerHeight * dpr); }
  addEventListener('resize', resize); resize();

  function spawn(e) {
    const vh = innerHeight / 900, a = rnd(-e.spread, e.spread), sp = rnd(420, 980) * e.power * vh;
    parts.push({
      x: e.x + rnd(-70, 70), y: e.y, vx: Math.sin(a) * sp, vy: -Math.cos(a) * sp, age: 0, life: rnd(2.4, 4.4) + e.amount * 0.7,
      s0: rnd(70, 120) * vh, s1: rnd(360, 640) * vh * (0.8 + 0.25 * e.amount), rot: rnd(0, 6.3), vr: rnd(-0.5, 0.5),
      a: rnd(0.1, 0.2), img: Math.floor(Math.random() * 4), seed: Math.random() * 10,
    });
  }

  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    for (const e of emitters) { e.acc += e.rate * dt; while (e.acc >= 1 && e.left > 0) { e.acc -= 1; e.left--; spawn(e); } }
    emitters = emitters.filter((e) => e.left > 0);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, innerWidth, innerHeight);
    const set = light ? SPR.light : SPR.dark;
    parts = parts.filter((p) => (p.age += dt) < p.life);
    for (const p of parts) {
      const k = Math.exp(-dt * 1.7);
      p.vx = p.vx * k + Math.sin(p.age * 1.3 + p.seed) * 40 * dt; p.vy = p.vy * k - 34 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      const q = p.age / p.life, s = p.s0 + (p.s1 - p.s0) * (1 - Math.exp(-p.age * 1.4));
      g.globalAlpha = p.a * Math.min(1, p.age / 0.15) * (1 - q) * (1 - q);
      g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.drawImage(set[p.img], -s / 2, -s / 2, s, s); g.restore();
    }
    g.globalAlpha = 1;
    raf = parts.length || emitters.length ? requestAnimationFrame(frame) : 0;
    if (!raf) g.clearRect(0, 0, innerWidth, innerHeight);
  }

  return {
    el: c,
    get active() { return !!raf; },
    setLight(v) { light = !!v; },
    // amount ~ 0.2 (quick hit) … 3+ (a blinker after a long scroll)
    burst(amount, origin = {}) {
      const a = Math.max(0.15, Math.min(amount, 4.5)), n = Math.round(14 + 36 * a), dur = 0.45 + 0.4 * a;
      emitters.push({ x: origin.x ?? innerWidth / 2, y: origin.y ?? innerHeight + 60, left: n, rate: n / dur, acc: 1,
        spread: 0.35 + 0.16 * Math.min(a, 3), power: 0.7 + 0.22 * Math.min(a, 3), amount: a });
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    },
    clear() { parts = []; emitters = []; },
  };
}
