// The stats screen: session / today / all-time numbers, a 14-day chart, recent sessions,
// a tar calculator and the brand picker. Plain DOM so it works in a page or a shadow root.
import { BRANDS, brand as getBrand } from './brands.js';
import { PACK_SIZE, dayKey } from './stats.js';

const LIFE_MIN_PER_CIG = 20;          // rough published estimate of life lost per cigarette
const PX_TO_M = 0.0254 / 96;          // CSS px are 1/96 inch
const JAR_G = 250;                    // the tar jar holds about a cup

const CSS = `
.cp-scrim { position: fixed; inset: 0; z-index: 2147483647; display: flex; align-items: center; justify-content: center;
  background: rgba(4,4,6,.62); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); opacity: 0; transition: opacity .2s ease;
  font: 400 13px/1.35 ui-sans-serif, system-ui, -apple-system, "Helvetica Neue", sans-serif; color: rgba(255,255,255,.86); }
.cp-scrim.on { opacity: 1; }
.cp-scrim[hidden] { display: none; }
.cp-card { width: min(760px, calc(100vw - 24px)); max-height: calc(100vh - 24px); overflow: auto; box-sizing: border-box;
  background: linear-gradient(180deg, #17161a, #0d0d10); border: 1px solid rgba(255,255,255,.09); border-radius: 18px;
  box-shadow: 0 30px 80px rgba(0,0,0,.6); padding: 18px 20px 16px; transform: translateY(8px) scale(.985); transition: transform .2s ease; }
.cp-scrim.on .cp-card { transform: none; }
.cp-card * { box-sizing: border-box; }
.cp-head { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.cp-title { font-weight: 700; font-size: 17px; letter-spacing: .02em; color: #fff; }
.cp-title span { color: rgba(255,160,90,.9); font-weight: 500; }
.cp-tabs { display: flex; gap: 4px; margin-left: auto; background: rgba(255,255,255,.05); padding: 3px; border-radius: 999px; }
.cp-btn { font: inherit; color: rgba(255,255,255,.7); background: transparent; border: 0; padding: 6px 12px; border-radius: 999px; cursor: pointer; }
.cp-btn:hover { color: #fff; background: rgba(255,255,255,.07); }
.cp-btn.on { color: #fff; background: rgba(255,140,60,.25); }
.cp-x { font-size: 18px; line-height: 1; padding: 6px 10px; }
.cp-label { font-size: 10.5px; letter-spacing: .14em; text-transform: uppercase; color: rgba(255,255,255,.45); }
.cp-brands { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 14px; }
.cp-brand { font: inherit; color: inherit; text-align: left; cursor: pointer; border-radius: 12px; padding: 8px; border: 1px solid rgba(255,255,255,.08);
  background: rgba(255,255,255,.03); display: grid; grid-template-columns: 22px 1fr; gap: 8px; align-items: center; }
.cp-brand:hover { background: rgba(255,255,255,.07); }
.cp-brand.on { border-color: rgba(255,150,80,.65); background: rgba(255,140,60,.12); }
.cp-sw { width: 22px; height: 34px; border-radius: 4px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.18); position: relative; overflow: hidden; }
.cp-sw i { position: absolute; left: 0; right: 0; top: 0; height: 30%; border-bottom: 1px solid rgba(0,0,0,.35); }
.cp-sw b { position: absolute; left: 3px; right: 3px; bottom: 3px; height: 7px; background: #fff; border-radius: 1px; }
.cp-bn { font-weight: 600; font-size: 12px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cp-bl { font-size: 11px; color: rgba(255,255,255,.5); }
.cp-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.cp-tile { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.06); border-radius: 12px; padding: 10px 12px; min-width: 0; }
.cp-big { font-size: 26px; font-weight: 700; color: #fff; letter-spacing: -.01em; font-variant-numeric: tabular-nums; margin-top: 2px; }
.cp-sub { font-size: 11.5px; color: rgba(255,255,255,.5); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cp-mini { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-top: 8px; }
.cp-mini .cp-big { font-size: 16px; }
.cp-row { display: grid; grid-template-columns: 1.05fr 1fr; gap: 10px; margin-top: 12px; }
.cp-box { background: rgba(255,255,255,.035); border: 1px solid rgba(255,255,255,.06); border-radius: 14px; padding: 12px; min-width: 0; }
.cp-box h3 { margin: 0 0 10px; font-size: 12px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; color: rgba(255,255,255,.7); }
.cp-in { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 10px; }
.cp-in label { display: grid; gap: 4px; }
.cp-in input { font: inherit; color: #fff; background: rgba(0,0,0,.35); border: 1px solid rgba(255,255,255,.12); border-radius: 8px; padding: 6px 8px; width: 100%; }
.cp-in input:focus { outline: 1px solid rgba(255,170,110,.8); }
.cp-calc { display: grid; grid-template-columns: 64px 1fr; gap: 12px; align-items: center; }
.cp-res { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; }
.cp-res div { display: flex; justify-content: space-between; gap: 8px; border-bottom: 1px dashed rgba(255,255,255,.08); padding-bottom: 3px; }
.cp-res b { color: #fff; font-variant-numeric: tabular-nums; }
.cp-note { margin-top: 8px; font-size: 11px; color: rgba(255,255,255,.42); }
.cp-bars { display: grid; grid-template-columns: repeat(14, 1fr); gap: 4px; align-items: end; height: 92px; margin-bottom: 4px; }
.cp-bar { background: rgba(255,255,255,.14); border-radius: 3px 3px 1px 1px; min-height: 2px; position: relative; }
.cp-bar.today { background: linear-gradient(180deg, #ffb070, #ff6a2a); }
.cp-bar span { position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); font-size: 9.5px; color: rgba(255,255,255,.6); padding-bottom: 2px; }
.cp-days { display: grid; grid-template-columns: repeat(14, 1fr); gap: 4px; font-size: 9.5px; color: rgba(255,255,255,.35); text-align: center; margin-bottom: 10px; }
.cp-sess { display: grid; gap: 4px; }
.cp-sess div { display: grid; grid-template-columns: 1fr auto auto; gap: 10px; font-size: 12px; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,.05); }
.cp-sess em { font-style: normal; color: rgba(255,255,255,.5); }
.cp-foot { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
.cp-split { display: flex; flex: 1; height: 8px; border-radius: 4px; overflow: hidden; background: rgba(255,255,255,.06); }
.cp-split i { display: block; height: 100%; }
.cp-reset { color: rgba(255,120,100,.8); }
@media (max-width: 640px) {
  .cp-brands { grid-template-columns: repeat(3, 1fr); } .cp-grid { grid-template-columns: repeat(2, 1fr); }
  .cp-mini { grid-template-columns: repeat(3, 1fr); } .cp-row { grid-template-columns: 1fr; }
}
`;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function fmtDur(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, '0')}s`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ${String(m % 60).padStart(2, '0')}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}
const fmtMg = (mg) => (mg < 1000 ? `${mg.toFixed(mg < 10 ? 1 : 0)} mg` : `${(mg / 1000).toFixed(mg < 1e5 ? 2 : 1)} g`);
const fmtDist = (px) => { const m = px * PX_TO_M; return m < 1000 ? `${m.toFixed(m < 10 ? 1 : 0)} m` : `${(m / 1000).toFixed(2)} km`; };
const fmtMoney = (v) => `$${v < 100 ? v.toFixed(2) : Math.round(v).toLocaleString()}`;
const fmtPacks = (cigs) => (cigs / PACK_SIZE).toFixed(cigs % PACK_SIZE ? 2 : 0);
const fmtLife = (min) => (min < 120 ? `${Math.round(min)} min` : min < 2880 ? `${(min / 60).toFixed(1)} h` : `${(min / 1440).toFixed(1)} days`);

function jar(fill) {
  const h = 78, top = 14, y = top + (h - top) * (1 - Math.min(1, fill));
  return `<svg viewBox="0 0 64 96" width="64" height="96" aria-hidden="true">
    <defs><clipPath id="cpjar"><path d="M12 14h40v6c6 3 8 8 8 14v52a6 6 0 0 1-6 6H10a6 6 0 0 1-6-6V34c0-6 2-11 8-14z"/></clipPath>
    <linearGradient id="cptar" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#5a3a1c"/><stop offset="1" stop-color="#140b05"/></linearGradient></defs>
    <g clip-path="url(#cpjar)"><rect x="0" y="0" width="64" height="96" fill="rgba(255,255,255,.05)"/>
    <rect x="0" y="${y.toFixed(1)}" width="64" height="96" fill="url(#cptar)"/>
    <rect x="9" y="26" width="5" height="54" rx="2.5" fill="rgba(255,255,255,.12)"/></g>
    <path d="M12 14h40v6c6 3 8 8 8 14v52a6 6 0 0 1-6 6H10a6 6 0 0 1-6-6V34c0-6 2-11 8-14z" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.5"/>
    <rect x="10" y="6" width="44" height="9" rx="2" fill="#6b6b72"/></svg>`;
}

export function createPanel(root, tracker, { onBrand } = {}) {
  const style = document.createElement('style');
  style.textContent = CSS;
  (root instanceof ShadowRoot ? root : document.head).appendChild(style);

  const scrim = document.createElement('div');
  scrim.className = 'cp-scrim'; scrim.hidden = true;
  scrim.innerHTML = `<div class="cp-card" role="dialog" aria-modal="true" aria-label="Smoking stats">
    <div class="cp-head"><div class="cp-title">cig <span>ledger</span></div>
      <div class="cp-tabs" role="tablist">
        <button class="cp-btn" data-tab="session" role="tab">Session</button>
        <button class="cp-btn" data-tab="today" role="tab">Today</button>
        <button class="cp-btn" data-tab="total" role="tab">All time</button>
      </div>
      <button class="cp-btn cp-x" title="Close (Esc)" aria-label="Close">×</button></div>
    <div class="cp-brands"></div>
    <div class="cp-grid"></div>
    <div class="cp-mini"></div>
    <div class="cp-row">
      <div class="cp-box"><h3>Tar calculator</h3>
        <div class="cp-in">
          <label><span class="cp-label">Cigs / day</span><input type="number" min="0" max="200" step="1" data-k="perDay"></label>
          <label><span class="cp-label">Years</span><input type="number" min="0" max="80" step="1" data-k="years"></label>
          <label><span class="cp-label">$ / pack</span><input type="number" min="0" max="100" step="0.5" data-k="price"></label>
        </div>
        <div class="cp-calc"><div class="cp-jar"></div><div class="cp-res"></div></div>
        <div class="cp-note"></div>
      </div>
      <div class="cp-box"><h3>Last 14 days</h3><div class="cp-bars"></div><div class="cp-days"></div>
        <h3>Recent sessions</h3><div class="cp-sess"></div></div>
    </div>
    <div class="cp-foot"><span class="cp-label">By brand</span><div class="cp-split"></div>
      <button class="cp-btn cp-reset" title="Wipe all stats">Reset</button></div>
  </div>`;
  (root instanceof ShadowRoot ? root : document.body).appendChild(scrim);

  const $ = (s) => scrim.querySelector(s);
  const $$ = (s) => [...scrim.querySelectorAll(s)];
  let tab = 'session', timer = 0;
  const calc = { perDay: null, years: 1 };

  scrim.addEventListener('pointerdown', (e) => { if (e.target === scrim) close(); });
  $('.cp-x').addEventListener('click', () => close());
  $$('[data-tab]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; render(); }));
  $('.cp-reset').addEventListener('click', () => {
    if (confirm('Wipe every cigarette, pack and session from the ledger?')) { tracker.reset(); calc.perDay = null; render(true); }
  });
  $$('.cp-in input').forEach((inp) => inp.addEventListener('input', () => {
    const v = Math.max(0, Number(inp.value) || 0);
    if (inp.dataset.k === 'price') tracker.setSetting('price', v); else calc[inp.dataset.k] = v;
    renderCalc(false);
  }));
  // keep the host page (X's own shortcuts) out of it while typing
  for (const ev of ['keydown', 'keyup', 'keypress', 'wheel']) scrim.addEventListener(ev, (e) => {
    if (ev === 'keydown' && e.key === 'Escape') close();
    e.stopPropagation();
  });

  function brandsUsed(snap) {
    const n = Object.values(snap.brands).reduce((a, b) => a + b, 0);
    if (!n) return { tar: getBrand(snap.brand).tar, nic: getBrand(snap.brand).nic, n: 0 };
    let tar = 0, nic = 0;
    for (const [id, c] of Object.entries(snap.brands)) { tar += getBrand(id).tar * c; nic += getBrand(id).nic * c; }
    return { tar: tar / n, nic: nic / n, n };
  }
  function avgPerDay(snap) {
    const days = Object.values(snap.days).filter((d) => d.cigs > 0);
    return days.length ? days.reduce((a, d) => a + d.cigs, 0) / days.length : 0;
  }

  function renderBrands(snap) {
    $('.cp-brands').innerHTML = BRANDS.map((b) => {
      const left = snap.packs[b.id] == null ? 'sealed pack' : `${snap.packs[b.id]} / ${PACK_SIZE} left`;
      const top = b.pack.style === 'roof' ? b.pack.accent : b.pack.bg2 || b.pack.accent;
      return `<button class="cp-brand${b.id === snap.brand ? ' on' : ''}" data-brand="${b.id}" title="${esc(b.blurb)}">
        <div class="cp-sw" style="background:${b.pack.bg}"><i style="background:${top}"></i><b></b></div>
        <div><div class="cp-bn">${esc(b.name)}</div><div class="cp-bl">${left} · ${b.tar} mg</div></div></button>`;
    }).join('');
    $$('[data-brand]').forEach((el) => el.addEventListener('click', () => {
      if (el.dataset.brand === tracker.brand) return;
      onBrand ? onBrand(el.dataset.brand) : tracker.setBrand(el.dataset.brand);
      render(true);
    }));
  }

  function renderNumbers(snap) {
    const s = snap[tab], now = Date.now();
    const span = tab === 'session' ? now - s.start : null;
    const pace = s.activeMs > 60e3 ? (s.cigs / (s.activeMs / 3.6e6)) : null;
    const tile = (label, big, sub) => `<div class="cp-tile"><div class="cp-label">${label}</div><div class="cp-big">${big}</div><div class="cp-sub">${sub}</div></div>`;
    const m = s.scrollPx * PX_TO_M;
    $('.cp-grid').innerHTML = [
      tile('Cigarettes', s.cigs, `${s.smoked.toFixed(1)} actually burnt`),
      tile('Packs', fmtPacks(s.cigs), `${s.packs} opened · ${tracker.left()} left in this one`),
      tile('Drags', s.drags, s.cigs ? `${(s.drags / s.cigs).toFixed(1)} per cigarette` : 'scroll to drag'),
      tile('Time scrolling', fmtDur(s.activeMs), span != null ? `session open ${fmtDur(span)}` : tab === 'today' ? 'today' : 'all time'),
      tile('Scrolled', fmtDist(s.scrollPx), m > 33 ? `${(m / 330).toFixed(2)} Eiffel Towers` : `${Math.round(m * 100 / 1.75)}% of you, lying down`),
      tile('Tar', fmtMg(s.tar), `${((s.tar / 1000) / JAR_G * 100).toFixed(2)}% of a jar`),
    ].join('');
    const mini = (label, big) => `<div class="cp-tile"><div class="cp-label">${label}</div><div class="cp-big">${big}</div></div>`;
    $('.cp-mini').innerHTML = [
      mini('Nicotine', fmtMg(s.nic)), mini('CO', fmtMg(s.co)), mini('Capsules', s.pops),
      mini('Life, est.', fmtLife(s.smoked * LIFE_MIN_PER_CIG)), mini('Spent', fmtMoney((s.cigs / PACK_SIZE) * (snap.settings.price || 0))),
      mini('Pace', pace == null ? '—' : `${pace.toFixed(1)}/h`),
    ].join('');
  }

  function renderHistory(snap) {
    const days = [], now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      days.push({ k: dayKey(d.getTime()), d, v: (snap.days[dayKey(d.getTime())] || {}).cigs || 0 });
    }
    days[13].v = snap.today.cigs;
    const max = Math.max(5, ...days.map((d) => d.v));
    $('.cp-bars').innerHTML = days.map((d, i) =>
      `<div class="cp-bar${i === 13 ? ' today' : ''}" style="height:${(d.v / max) * 100}%" title="${d.k}: ${d.v} cigarettes (${fmtPacks(d.v)} packs)">${d.v ? `<span>${d.v}</span>` : ''}</div>`).join('');
    $('.cp-days').innerHTML = days.map((d) => `<div>${'SMTWTFS'[d.d.getDay()]}</div>`).join('');
    const sess = snap.sessions.filter((s) => s.cigs || s.activeMs > 5000).slice(0, 5);
    $('.cp-sess').innerHTML = sess.length ? sess.map((s, i) => {
      const d = new Date(s.start);
      const when = dayKey(s.start) === dayKey() ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      return `<div><span>${i === 0 && snap.sessions[0] === s ? 'Now' : when} <em>· ${fmtDur(s.last - s.start)} open, ${fmtDur(s.activeMs)} scrolling</em></span>
        <b>${s.cigs} cig${s.cigs === 1 ? '' : 's'}</b><em>${fmtPacks(s.cigs)} pk</em></div>`;
    }).join('') : '<div><em>No sessions yet. Go scroll something.</em></div>';
    const total = Object.values(snap.brands).reduce((a, b) => a + b, 0) || 1;
    $('.cp-split').innerHTML = BRANDS.filter((b) => snap.brands[b.id]).map((b) =>
      `<i style="width:${(snap.brands[b.id] / total) * 100}%;background:${b.pack.style === 'roof' ? b.pack.accent : b.pack.bg2 || b.pack.accent}" title="${esc(b.name)}: ${snap.brands[b.id]}"></i>`).join('');
  }

  function renderCalc(fillInputs) {
    const snap = tracker.snapshot();
    const avg = avgPerDay(snap), mix = brandsUsed(snap);
    if (calc.perDay == null) calc.perDay = Math.max(1, Math.round(avg) || 10);
    const price = snap.settings.price || 0;
    if (fillInputs) {
      scrim.querySelector('[data-k="perDay"]').value = calc.perDay;
      scrim.querySelector('[data-k="years"]').value = calc.years;
      scrim.querySelector('[data-k="price"]').value = price;
    }
    const cigs = calc.perDay * 365.25 * calc.years;
    const tarG = (cigs * mix.tar) / 1000;
    $('.cp-jar').innerHTML = jar(tarG / JAR_G);
    const r = (k, v) => `<div><span>${k}</span><b>${v}</b></div>`;
    $('.cp-res').innerHTML = [
      r('Cigarettes', Math.round(cigs).toLocaleString()), r('Packs', Math.round(cigs / PACK_SIZE).toLocaleString()),
      r('Tar', `${tarG.toFixed(tarG < 10 ? 1 : 0)} g`), r('Tar jars', (tarG / JAR_G).toFixed(2)),
      r('Nicotine', `${((cigs * mix.nic) / 1000).toFixed(1)} g`), r('Cost', fmtMoney((cigs / PACK_SIZE) * price)),
      r('Life, est.', fmtLife(cigs * LIFE_MIN_PER_CIG)), r('Pack-years', ((calc.perDay / PACK_SIZE) * calc.years).toFixed(2)),
    ].join('');
    $('.cp-note').textContent = `${mix.n ? `Your mix averages ${mix.tar.toFixed(1)} mg tar per cigarette` : `${getBrand(snap.brand).name}: ${mix.tar} mg tar per cigarette`}`
      + `${avg ? ` · you average ${avg.toFixed(1)} a day` : ''}. Jar ≈ ${JAR_G} g. Life ≈ ${LIFE_MIN_PER_CIG} min per cigarette, a rough estimate.`;
  }

  function render(full = false) {
    const snap = tracker.snapshot();
    $$('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    renderBrands(snap); renderNumbers(snap); renderHistory(snap);
    if (full) renderCalc(true);
  }

  function open() {
    if (!scrim.hidden) return;
    scrim.hidden = false; calc.perDay = null;
    render(true);
    requestAnimationFrame(() => scrim.classList.add('on'));
    timer = setInterval(() => render(false), 1000);
  }
  function close() {
    if (scrim.hidden) return;
    clearInterval(timer);
    scrim.classList.remove('on');
    setTimeout(() => { if (!scrim.classList.contains('on')) scrim.hidden = true; }, 200);
  }
  return { open, close, toggle: () => (scrim.hidden ? open() : close()), get isOpen() { return !scrim.hidden; }, render };
}
