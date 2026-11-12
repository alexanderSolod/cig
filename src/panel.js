// The stats screen, laid out like the back of the current brand's pack: session / today / all-time numbers, a 14-day chart, recent sessions,
// a tar calculator and the brand picker. Plain DOM so it works in a page or a shadow root.
import { BRANDS, brand as getBrand } from './brands.js';
import { PACK_SIZE, dayKey } from './stats.js';

const LIFE_MIN_PER_CIG = 20;          // rough published estimate of life lost per cigarette
const PX_TO_M = 0.0254 / 96;          // CSS px are 1/96 inch
const JAR_G = 250;                    // the tar jar holds about a cup

const CSS = `
.cp-scrim{position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:18px;
  background:rgba(8,7,6,.62);opacity:0;transition:opacity .18s ease}
.cp-scrim.on{opacity:1}
.cp-scrim[hidden]{display:none}
.cp-card{--bg:#222;--bg2:#111;--ink:#eee;--acc:#c9a24a;--word:Georgia,serif;
  width:min(780px,100%);max-height:calc(100vh - 36px);overflow:auto;border-radius:3px;color:var(--ink);
  font:13px/1.35 "Helvetica Neue",Helvetica,Arial,sans-serif;font-variant-numeric:tabular-nums;
  background:linear-gradient(180deg,var(--bg),var(--bg2));box-shadow:0 30px 80px rgba(0,0,0,.55),inset 0 0 0 1px rgba(255,255,255,.08);
  transform:translateY(10px);transition:transform .2s ease;scrollbar-width:thin}
.cp-scrim.on .cp-card{transform:none}
.cp-card button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;padding:0}
.cp-lid{display:flex;align-items:center;gap:18px;padding:12px 22px 11px;border-bottom:1px solid rgba(0,0,0,.45);
  box-shadow:0 1px 0 rgba(255,255,255,.12);font-size:11px;letter-spacing:.14em;text-transform:uppercase}
.cp-tabs{display:flex;gap:16px;flex:1}
.cp-tabs button{opacity:.55;padding-bottom:2px;border-bottom:1.5px solid transparent;letter-spacing:inherit;text-transform:inherit}
.cp-tabs button.on{opacity:1;border-color:currentColor}
.cp-x{opacity:.7}.cp-x:hover,.cp-tabs button:hover{opacity:1}
.cp-body{padding:18px 22px 20px}
.cp-mast{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:14px}
.cp-word{font:600 30px/1 var(--word);letter-spacing:.01em}
.cp-count{font-size:11px;letter-spacing:.12em;text-transform:uppercase;opacity:.75;white-space:nowrap}
.cp-warn{background:#fff;color:#000;border:6px solid #000;outline:8px solid #fff;margin:8px 8px 22px;padding:16px 18px;
  font:700 21px/1.22 "Helvetica Neue",Helvetica,Arial,sans-serif;text-align:center;text-wrap:balance}
.cp-cols{display:grid;grid-template-columns:1fr 1fr;gap:18px}
@media (max-width:660px){.cp-cols{grid-template-columns:1fr}}
.cp-panel{background:#fbfaf6;color:#151515;padding:12px 14px 13px;border-radius:1px}
.cp-panel+.cp-panel{margin-top:14px}
.cp-panel h3{margin:0 0 8px;font:700 10.5px/1 "Helvetica Neue",Arial,sans-serif;letter-spacing:.16em;text-transform:uppercase;
  padding-bottom:6px;border-bottom:2px solid #151515}
.cp-tbl{width:100%;border-collapse:collapse}
.cp-tbl td{padding:4px 0;border-bottom:1px solid #d9d6cc;vertical-align:baseline}
.cp-tbl tr:last-child td{border-bottom:0}
.cp-tbl td:nth-child(2){text-align:right;font-weight:700;white-space:nowrap;padding-left:10px}
.cp-tbl small{display:block;color:#6d6a62;font-size:11px}
.cp-tbl tr.hi td{font-size:15px}
.cp-in{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px}
.cp-in label{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#6d6a62}
.cp-in input{display:block;width:100%;box-sizing:border-box;margin-top:3px;border:0;border-bottom:1.5px solid #151515;background:none;
  font:700 17px "Helvetica Neue",Arial,sans-serif;color:#151515;padding:2px 0;outline:0}
.cp-in input:focus{border-color:#b3261e}
.cp-calc{display:flex;gap:12px;align-items:flex-start}
.cp-jar{flex:none}
.cp-res{flex:1}
.cp-note{margin-top:8px;font-size:10.5px;color:#6d6a62}
.cp-bars{display:flex;align-items:flex-end;gap:3px;height:70px;padding-top:14px;border-bottom:1.5px solid #151515}
.cp-bar{flex:1;background:#151515;min-height:1px;position:relative}
.cp-bar.today{background:#b3261e}
.cp-bar span{position:absolute;bottom:100%;left:0;right:0;text-align:center;font-size:9px;margin-bottom:2px}
.cp-days{display:flex;gap:3px;font-size:9px;color:#6d6a62;margin-top:3px}.cp-days div{flex:1;text-align:center}
.cp-sess div{display:flex;gap:8px;padding:4px 0;border-bottom:1px solid #d9d6cc;align-items:baseline}
.cp-sess div:last-child{border-bottom:0}
.cp-sess span{flex:1}.cp-sess em{color:#6d6a62;font-style:normal;font-size:11px}
.cp-brands{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.cp-brand{display:flex;flex-direction:column;align-items:center;gap:5px;padding:4px 2px 6px;text-align:center;border:1.5px solid transparent;border-radius:2px}
.cp-brand.on{border-color:#151515}
.cp-brand:hover{background:rgba(0,0,0,.04)}
.cp-sw{width:30px;height:44px;border-radius:1.5px;position:relative;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.35)}
.cp-sw i{position:absolute;left:0;right:0;top:0;height:30%}
.cp-sw b{position:absolute;left:4px;right:4px;bottom:4px;height:22%;background:#fff;outline:1.5px solid #000;outline-offset:-2px}
.cp-bn{font-size:11px;font-weight:700;line-height:1.15}
.cp-bl{font-size:10px;color:#6d6a62}
.cp-split{display:flex;height:6px;margin-top:10px;background:#e7e4da}
.cp-foot{display:grid;grid-template-columns:auto 1fr auto;gap:16px;align-items:end;margin-top:20px}
.cp-code{background:#fff;padding:6px 8px 3px;color:#000;font-size:9px;letter-spacing:.2em;text-align:center}
.cp-code svg{display:block}
.cp-fine{font-size:10px;line-height:1.45;opacity:.72}
.cp-stamp{border:1.5px solid currentColor;padding:5px 8px;font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;text-align:center;line-height:1.3;opacity:.85}
.cp-reset{text-decoration:underline;opacity:.8}
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
    <g clip-path="url(#cpjar)"><rect x="0" y="0" width="64" height="96" fill="rgba(0,0,0,.04)"/>
    <rect x="0" y="${y.toFixed(1)}" width="64" height="96" fill="url(#cptar)"/>
    <rect x="9" y="26" width="5" height="54" rx="2.5" fill="rgba(255,255,255,.18)"/></g>
    <path d="M12 14h40v6c6 3 8 8 8 14v52a6 6 0 0 1-6 6H10a6 6 0 0 1-6-6V34c0-6 2-11 8-14z" fill="none" stroke="#151515" stroke-width="1.5"/>
    <rect x="10" y="6" width="44" height="9" rx="2" fill="#6b6b72"/></svg>`;
}

export function createPanel(root, tracker, { onBrand } = {}) {
  const style = document.createElement('style');
  style.textContent = CSS;
  (root instanceof ShadowRoot ? root : document.head).appendChild(style);

  const scrim = document.createElement('div');
  scrim.className = 'cp-scrim'; scrim.hidden = true;
  scrim.innerHTML = `<div class="cp-card" role="dialog" aria-modal="true" aria-label="Smoking stats">
    <div class="cp-lid"><div class="cp-tabs" role="tablist">
        <button data-tab="session" role="tab">This session</button>
        <button data-tab="today" role="tab">Today</button>
        <button data-tab="total" role="tab">All time</button>
      </div><button class="cp-x" title="Close (Esc)">Close</button></div>
    <div class="cp-body">
      <div class="cp-mast"><div class="cp-word"></div><div class="cp-count"></div></div>
      <div class="cp-warn" role="status"></div>
      <div class="cp-cols">
        <div>
          <section class="cp-panel"><h3>Contents</h3><table class="cp-tbl"></table></section>
          <section class="cp-panel"><h3>Tar calculator</h3>
            <div class="cp-in">
              <label>Cigs a day<input type="number" min="0" max="200" step="1" data-k="perDay"></label>
              <label>Years<input type="number" min="0" max="80" step="1" data-k="years"></label>
              <label>$ a pack<input type="number" min="0" max="100" step="0.5" data-k="price"></label>
            </div>
            <div class="cp-calc"><div class="cp-jar"></div><table class="cp-tbl cp-res"></table></div>
            <div class="cp-note"></div></section>
        </div>
        <div>
          <section class="cp-panel"><h3>Last 14 days</h3><div class="cp-bars"></div><div class="cp-days"></div></section>
          <section class="cp-panel"><h3>Recent sessions</h3><div class="cp-sess"></div></section>
          <section class="cp-panel"><h3>Brand</h3><div class="cp-brands"></div><div class="cp-split"></div></section>
        </div>
      </div>
      <div class="cp-foot"><div class="cp-code"></div>
        <div class="cp-fine">Made by your thumb under licence from the feed. Figures are estimates from brand averages; life cost uses a rough 20 minutes per cigarette and is not medical advice.
          <button class="cp-reset" title="Wipe all stats">Reset ledger</button></div>
        <div class="cp-stamp"></div></div>
    </div>
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

  const WORD = { roof: 'Georgia, "Times New Roman", serif', wave: '"Helvetica Neue", Arial, sans-serif', stars: '"Times New Roman", Times, serif',
    arc: 'Optima, Candara, "Gill Sans", sans-serif', devil: '"Chalkduster", "Marker Felt", fantasy', kretek: 'Georgia, serif' };
  const WHEN = { session: 'This session', today: 'Today', total: 'Since you started' };

  function barcode(seed) {
    let x = 0, out = '', r = seed >>> 0 || 7;
    for (let i = 0; i < 46; i++) { r = (r * 1103515245 + 12345) >>> 0; const w = 1 + (r >>> 29) % 3; if (i % 2 === 0) out += `<rect x="${x}" y="0" width="${w}" height="34"/>`; x += w; }
    return `<svg viewBox="0 0 ${x} 34" width="${x * 1.4}" height="34" aria-hidden="true">${out}</svg>`;
  }

  function renderNumbers(snap) {
    const s = snap[tab], now = Date.now(), b = getBrand(snap.brand);
    const span = tab === 'session' ? now - s.start : null;
    const pace = s.activeMs > 60e3 ? (s.cigs / (s.activeMs / 3.6e6)) : null;
    const m = s.scrollPx * PX_TO_M;
    const card = $('.cp-card');
    card.style.setProperty('--bg', b.pack.bg); card.style.setProperty('--bg2', b.pack.bg2 || b.pack.bg);
    card.style.setProperty('--ink', b.pack.ink); card.style.setProperty('--word', WORD[b.pack.style] || WORD.roof);
    $('.cp-word').textContent = b.name;
    $('.cp-count').textContent = `${tracker.left()} of ${PACK_SIZE} cigarettes left`;
    $('.cp-warn').innerHTML = `${WHEN[tab]} you smoked ${s.cigs} cigarette${s.cigs === 1 ? '' : 's'} (${fmtPacks(s.cigs)} pack${s.cigs === PACK_SIZE ? '' : 's'}) in ${fmtDur(s.activeMs)} of scrolling`;
    const row = (k, v, note, hi) => `<tr${hi ? ' class="hi"' : ''}><td>${k}${note ? `<small>${note}</small>` : ''}</td><td>${v}</td></tr>`;
    $('.cp-tbl').innerHTML = [
      row('Cigarettes', s.cigs, `${s.smoked.toFixed(1)} actually burnt`, 1),
      row('Packs', fmtPacks(s.cigs), `${s.packs} opened`, 1),
      row('Tar', fmtMg(s.tar), `${((s.tar / 1000) / JAR_G * 100).toFixed(2)}% of a jar`, 1),
      row('Nicotine', fmtMg(s.nic)), row('Carbon monoxide', fmtMg(s.co)),
      row('Drags', s.drags, s.cigs ? `${(s.drags / s.cigs).toFixed(1)} per cigarette` : ''),
      row('Capsules popped', s.pops),
      row('Time scrolling', fmtDur(s.activeMs), span != null ? `session open ${fmtDur(span)}` : ''),
      row('Distance scrolled', fmtDist(s.scrollPx), m > 33 ? `${(m / 330).toFixed(2)} Eiffel Towers` : `${Math.round(m * 100 / 1.75)}% of your height`),
      row('Pace', pace == null ? '—' : `${pace.toFixed(1)} an hour`),
      row('Spent', fmtMoney((s.cigs / PACK_SIZE) * (snap.settings.price || 0))),
      row('Life, est.', fmtLife(s.smoked * LIFE_MIN_PER_CIG)),
    ].join('');
    const lot = `${dayKey(s.start).replace(/-/g, '')}${String(snap.total.cigs).padStart(4, '0')}`;
    $('.cp-code').innerHTML = `${barcode(snap.total.cigs * 31 + snap.total.packs + 5)}${lot}`;
    $('.cp-stamp').innerHTML = `Scroll duty paid<br>${b.tar} mg tar · ${b.nic} mg nic · ${b.co} mg CO`;
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
    const r = (k, v) => `<tr><td>${k}</td><td>${v}</td></tr>`;
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
    $$('[data-tab]').forEach((b) => { b.classList.toggle('on', b.dataset.tab === tab); b.setAttribute('aria-selected', b.dataset.tab === tab); });
    renderBrands(snap); renderNumbers(snap); renderHistory(snap);
    if (full) renderCalc(true);
  }

  function open() {
    if (scrim.classList.contains('on')) return;
    clearInterval(timer);
    scrim.hidden = false; calc.perDay = null;
    render(true);
    requestAnimationFrame(() => scrim.classList.add('on'));
    timer = setInterval(() => render(false), 1000);
  }
  function close() {
    if (!scrim.classList.contains('on')) return;
    clearInterval(timer);
    scrim.classList.remove('on');
    setTimeout(() => { if (!scrim.classList.contains('on')) scrim.hidden = true; }, 200);
  }
  return { open, close, toggle: () => (scrim.hidden ? open() : close()), get isOpen() { return !scrim.hidden; }, render };
}
