// Concept 02 · The Living Lab — progressive enhancement for the bench.
// Live data: ZeroHuman /api/status + GitHub commits (once per page view, with timeout, honest snapshot fallback).
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const RM = matchMedia('(prefers-reduced-motion: reduce)');
const MO = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const SVGNS = 'http://www.w3.org/2000/svg';
const pad = n => String(n).padStart(2, '0');
const utcTime = d => `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
const utcDate = d => `${MO[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
const ago = s => s < 90 ? `${Math.round(s)} s` : s < 5400 ? `${Math.round(s / 60)} min` : `${(s / 3600).toFixed(1)} h`;
const el = (tag, attrs = {}, ns) => { const n = ns ? document.createElementNS(SVGNS, tag) : document.createElement(tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };

async function getJSON(url, ms = 7000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (err) { throw new Error(err.name === 'AbortError' ? 'timed out' : (err.message || 'network error')); }
  finally { clearTimeout(t); }
}

function setBadge(inst, live) {
  const b = $('[data-badge]', inst);
  if (!b) return;
  b.className = `st ${live ? 'st--live' : 'st--snap'}`;
  b.textContent = live ? 'Live' : 'Snapshot';
}
function markRead(inst) {
  inst.style.setProperty('--w', inst.offsetWidth + 'px');
  inst.classList.remove('is-read'); void inst.offsetWidth; inst.classList.add('is-read');
}

/* ---------- Instrument 1: ZeroHuman worker heartbeat ---------- */
async function zerohuman() {
  const inst = $('[data-inst="zh"]');
  const probes = [$('[data-rail-probe]'), $('[data-mprobe-t]')];
  const mprobe = $('[data-mprobe]');
  if (!inst) { // interior pages may carry a compact probe only
    return getJSON('https://zerohuman-production.up.railway.app/api/status').then(s => {
      $$('[data-zh-mini]').forEach(n => { n.dataset.state = 'live'; });
      fillMini(s); return s;
    }).catch(err => fillMiniFail(err));
  }
  const v = k => $(`[data-v="${k}"]`, inst);
  try {
    const s = await getJSON('https://zerohuman-production.up.railway.app/api/status');
    const now = new Date();
    const tick = new Date(s.lastTickAt);
    const age = Math.max(0, (now - tick) / 1000);
    v('health').textContent = s.healthy ? (s.paused ? 'PAUSED' : 'HEALTHY') : 'UNHEALTHY';
    v('mode').textContent = s.mode ?? '—';
    v('head').textContent = s.head ? Number(s.head).toLocaleString('en-US') : '—';
    v('tick').textContent = isNaN(tick) ? '—' : `${utcDate(tick).replace(/, \d{4}$/, '')}, ${utcTime(tick)}`;
    v('orders').textContent = s.orders?.fulfilled ?? '—';
    const needle = $('[data-needle]', inst);
    const deg = Math.min(age / 600, 1) * 180;
    requestAnimationFrame(() => { needle.style.transform = `rotate(${deg}deg)`; });
    $('[data-stamp]', inst).textContent = `Live · read ${utcTime(now)} · last tick ${ago(age)} before this reading`;
    setBadge(inst, true); markRead(inst);
    probes.forEach(p => p && (p.textContent = s.healthy ? 'live · healthy' : 'live · unhealthy'));
    mprobe && mprobe.classList.add('is-live');
  } catch (err) {
    $('[data-stamp]', inst).textContent = `Live read ${err.message} · showing snapshot from Nov 25, 2026, 12:40 UTC · needle parked`;
    probes.forEach(p => p && (p.textContent = 'snapshot'));
  }
}
function fillMini(s) {
  const n = $('[data-zh-mini]'); if (!n) return;
  const tick = new Date(s.lastTickAt), now = new Date();
  $('[data-m="state"]', n).textContent = s.healthy ? 'Healthy' : 'Unhealthy';
  $('[data-m="head"]', n).textContent = Number(s.head).toLocaleString('en-US');
  $('[data-m="orders"]', n).textContent = s.orders?.fulfilled ?? '—';
  $('[data-m="mode"]', n).textContent = s.mode ?? '—';
  if (Array.isArray(s.services) && s.services.length) {
    $('[data-m="menu"]', n).textContent = s.services.map(x => x.id).join(' · ');
    const wei = [...new Set(s.services.map(x => x.priceWei))];
    $('[data-m="price"]', n).textContent = wei.length === 1 ? `${Number(wei[0]) / 1e18} ETH` : 'varies';
  }
  $('[data-m="stamp"]', n).textContent = `Live · read ${utcTime(now)} · last tick ${ago((now - tick) / 1000)} earlier`;
  const b = $('[data-badge]', n); b.className = 'st st--live'; b.textContent = 'Live';
}
function fillMiniFail(err) {
  const n = $('[data-zh-mini]'); if (!n) return;
  $('[data-m="stamp"]', n).textContent = `Live read ${err.message} · snapshot from Nov 25, 2026, 12:40 UTC`;
}

/* ---------- Instrument 2: Digest pipeline commits ---------- */
const PIPE = /^pipeline:\s*(\d+)\s*posts?,\s*(\d+)\s*drafts?/i;
function drawSpark(svg, runs) {
  if (!svg) return;
  svg.replaceChildren();
  const max = Math.max(10, ...runs.map(r => r.posts));
  const w = 200, h = 48, n = runs.length, bw = Math.min(22, (w - (n - 1) * 4) / Math.max(n, 1));
  runs.forEach((r, i) => {
    const bh = Math.max(2, (r.posts / max) * (h - 12));
    const x = w - (n - i) * (bw + 4) + 4;
    svg.append(el('rect', { x, y: h - bh, width: bw, height: bh, fill: i === n - 1 ? '#151512' : '#B9B6AC' }, 1));
    if (r.drafts) svg.append(el('rect', { x, y: h - bh - 3, width: bw, height: 2, fill: '#2340C8' }, 1));
  });
  svg.append(el('line', { x1: 0, x2: w, y1: h - .5, y2: h - .5, stroke: '#151512', 'stroke-width': 1 }, 1));
  svg.setAttribute('aria-hidden', 'true');
}
async function pipeline() {
  const inst = $('[data-inst="gh"]');
  if (!inst) return;
  const v = k => $(`[data-v="${k}"]`, inst);
  const spark = $('[data-spark]', inst);
  drawSpark(spark, [{ posts: 9, drafts: 1 }]);
  try {
    const list = await getJSON('https://api.github.com/repos/kenashe/kenashe/commits?per_page=10');
    const runs = list.map(c => ({ c, m: (c.commit?.message || '').split('\n')[0] }))
      .map(o => ({ ...o, p: o.m.match(PIPE) })).filter(o => o.p);
    const latest = runs[0] || { c: list[0], m: (list[0]?.commit?.message || '').split('\n')[0], p: null };
    const d = new Date(latest.c.commit.committer?.date || latest.c.commit.author?.date);
    v('msg').textContent = latest.m;
    v('sha').textContent = latest.c.sha.slice(0, 7);
    v('date').textContent = `${utcDate(d)}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
    if (latest.p) {
      v('posts').innerHTML = `${latest.p[1]}<small>posts</small> ${latest.p[2]}<small>draft${latest.p[2] === '1' ? '' : 's'}</small>`;
      const p2 = $('[data-v="pipe2"]'); const p2d = $('[data-v="pipe2d"]');
      if (p2) { p2.firstChild.textContent = `${latest.p[1]} posts`; p2d.textContent = `${latest.m} · live`; }
    } else {
      v('posts').innerHTML = `—<small>no pipeline run in last 10 commits</small>`;
    }
    drawSpark(spark, runs.slice().reverse().map(o => ({ posts: +o.p[1], drafts: +o.p[2] })));
    spark.setAttribute('aria-hidden', 'true');
    $('[data-stamp]', inst).textContent = `Live · read ${utcTime(new Date())} · bars: posts per pipeline run in the last ${list.length} commits`;
    setBadge(inst, true); markRead(inst);
  } catch (err) {
    $('[data-stamp]', inst).textContent = `Live read ${err.message} · showing snapshot from Nov 25, 2026 · machine-published Digest`;
  }
}

/* ---------- Instrument 3: daily email, computed ---------- */
function dailyEmail() {
  const inst = $('[data-inst="mail"]');
  if (!inst) return;
  const start = Date.UTC(2026, 4, 4);
  const t = new Date();
  const today = Date.UTC(t.getFullYear(), t.getMonth(), t.getDate());
  const days = Math.floor((today - start) / 864e5);
  if (days >= 0) {
    $('[data-v="days"]', inst).textContent = days;
    $('[data-stamp]', inst).textContent = `Computed on your device: ${days} days from May 4, 2026 to ${MO[t.getMonth()]} ${t.getDate()}, ${t.getFullYear()}. Not a delivery log.`;
  }
  // elapsed bar: May 2026 → today, month ticks
  const svg = $('[data-mailbar]', inst);
  const endM = (t.getFullYear() - 2026) * 12 + t.getMonth();
  const months = Math.max(endM - 4 + 1, 1);
  const w = 200, x0 = 0, scale = (w - 2) / months;
  const frac = (Math.min(Math.max(days, 0), 9999) / ((today - start) / 864e5 || 1));
  const xNow = Math.min(w - 1, x0 + (months - 1) * scale + (t.getDate() / 31) * scale);
  const xStart = x0 + (3 / 31) * scale;
  svg.replaceChildren(
    el('line', { x1: 0, x2: w, y1: 30, y2: 30, stroke: '#151512', 'stroke-width': 1 }, 1),
    el('rect', { x: xStart, y: 24, width: Math.max(0, (xNow - xStart) * (frac || 1)), height: 6, fill: '#151512' }, 1),
    el('rect', { x: xNow - 1, y: 18, width: 2, height: 16, fill: '#E8541A' }, 1)
  );
  for (let i = 0; i < months; i++) {
    const x = x0 + i * scale;
    svg.append(el('line', { x1: x, x2: x, y1: 30, y2: 36, stroke: '#151512', 'stroke-width': 1 }, 1));
    const mi = (4 + i) % 12;
    if (months <= 8 || i % 2 === 0) { const tx = el('text', { x: x + 2, y: 46, 'font-size': 8, fill: '#4A4A43', 'font-family': 'Martian Mono' }, 1); tx.textContent = MO[mi][0] + (mi === 4 ? 'ay' : ''); svg.append(tx); }
  }
}

/* ---------- Plate 01: experiment chart ---------- */
function chart() {
  const host = $('[data-chart]');
  const dataEl = $('#builds-data');
  if (!host || !dataEl) return;
  const builds = JSON.parse(dataEl.textContent);
  const card = $('[data-card]');
  const readout = $('[data-readout]');
  const months = []; for (let i = 0; i < 12; i++) { const m = (11 + i) % 12; months.push({ y: m === 11 ? 2025 : 2026, m }); }
  const key = (y, m) => `${y}-${m}`;
  const byMonth = new Map(months.map(o => [key(o.y, o.m), []]));
  builds.slice().sort((a, b) => a.no - b.no).forEach(b => byMonth.get(key(b.y, b.m))?.push(b));
  const chrono = builds.slice().sort((a, b) => a.no - b.no);
  let tags = [], selected = builds[0].no, plotted = false;
  const btns = new Map();

  function render() {
    const W = host.clientWidth, H = host.clientHeight - 0;
    const L = 46, R = 18, colW = (W - L - R) / 12;
    const cumTop = 34, cumBot = 128, base = H - 64, step = Math.min(56, (base - 200) / 4);
    host.querySelector('svg')?.remove();
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' }, 1);
    const defs = el('defs', {}, 1);
    const pat = el('pattern', { id: 'hatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, 1);
    pat.append(el('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: 'rgba(21,21,18,.12)', 'stroke-width': 1 }, 1));
    defs.append(pat); svg.append(defs);
    const t = (x, y, s, cls = '', anchor = 'start') => { const n = el('text', { x, y, class: cls, 'text-anchor': anchor }, 1); n.textContent = s; svg.append(n); return n; };
    // band labels
    t(L, 20, 'CUMULATIVE EXPERIMENTS');
    t(L, 160, 'EXPERIMENTS PER MONTH · STATUS');
    // cumulative axis
    [0, 10, 20].forEach(v => { const y = cumBot - (v / 20) * (cumBot - cumTop); svg.append(el('line', { x1: L, x2: W - R, y1: y, y2: y, class: 'gl' }, 1)); t(L - 8, y + 3, String(v), '', 'end'); });
    svg.append(el('line', { x1: L, x2: W - R, y1: 144, y2: 144, class: 'ax', 'stroke-dasharray': '2 3' }, 1));
    // month columns
    let cum = 0; const pts = [];
    months.forEach((o, i) => {
      const x = L + i * colW, cx = x + colW / 2;
      const list = byMonth.get(key(o.y, o.m));
      svg.append(el('line', { x1: x, x2: x, y1: 168, y2: base + 6, class: 'gl' }, 1));
      if (!list.length) svg.append(el('rect', { x: x + 3, y: 172, width: colW - 6, height: base - 176, class: 'gap' }, 1));
      t(cx, base + 22, MO[o.m].toUpperCase(), 'mo', 'middle');
      if (i === 0 || o.m === 0) t(cx, base + 38, String(o.y), '', 'middle');
      if (list.length) t(cx, base - list.length * step - 10, `n=${list.length}`, '', 'middle');
      cum += list.length; pts.push([cx, cumBot - (cum / 20) * (cumBot - cumTop), cum]);
    });
    svg.append(el('line', { x1: L, x2: W - R, y1: base + 6, y2: base + 6, class: 'ax' }, 1));
    svg.append(el('line', { x1: L, x2: L, y1: cumTop - 6, y2: base + 6, class: 'ax' }, 1));
    // cumulative step path
    let d = `M${L} ${cumBot}`;
    pts.forEach(([x, y], i) => { const xl = L + i * colW; d += ` H${xl} V${y} H${x}`; });
    d += ` H${W - R}`;
    const path = el('path', { d, class: 'cum' }, 1); svg.append(path);
    pts.forEach(([x, y, c], i) => { if (i === 0 || c !== pts[i - 1][2]) { svg.append(el('circle', { cx: x, cy: y, r: 3, class: 'cumdot' }, 1)); t(x, y - 8, String(c), '', 'middle'); } });
    host.prepend(svg);
    const len = path.getTotalLength(); path.style.setProperty('--len', len);
    // glyph buttons
    months.forEach((o, i) => {
      const cx = L + i * colW + colW / 2;
      byMonth.get(key(o.y, o.m)).forEach((b, k) => {
        let btn = btns.get(b.no);
        if (!btn) {
          btn = el('button', { type: 'button', class: 'glyph', 'data-status': b.status, 'data-no': b.no, 'aria-pressed': 'false', tabindex: '-1' });
          btn.setAttribute('aria-label', `EXP-${pad(b.no)}: ${b.title}, ${b.status}, ${b.when}`);
          btn.innerHTML = `<i aria-hidden="true">${pad(b.no)}</i>`;
          btn.addEventListener('click', () => select(b.no, false));
          btn.addEventListener('focus', () => select(b.no, false));
          btn.addEventListener('mouseenter', () => select(b.no, false));
          btn.addEventListener('keydown', onKey);
          if (!RM.matches) btn.style.transitionDelay = `${300 + chrono.indexOf(b) * 70}ms`;
          host.append(btn); btns.set(b.no, btn);
        }
        btn.style.left = `${cx}px`;
        btn.style.top = `${base - 20 - k * step}px`;
      });
    });
    applyFilter(false);
  }
  const matches = b => !tags.length || b.stack.some(s => tags.includes(s));
  function applyFilter(announce = true) {
    let shown = 0, live = 0;
    builds.forEach(b => { const m = matches(b); btns.get(b.no)?.classList.toggle('is-dim', !m); if (m) { shown++; if (b.status === 'LIVE') live++; } });
    if (!matches(builds.find(b => b.no === selected))) { const f = builds.find(matches); if (f) select(f.no, false); }
    else select(selected, false);
    if (announce) readout.textContent = `Showing ${shown} of ${builds.length} experiments · ${live} live${tags.length ? ` · stack tags: ${tags.join(', ')}` : ''}.`;
  }
  function select(no, focus) {
    selected = no;
    btns.forEach((b, n) => { b.setAttribute('aria-pressed', String(n === no)); b.tabIndex = n === no ? 0 : -1; });
    if (focus) btns.get(no)?.focus();
    card.innerHTML = cardHTML(builds.find(b => b.no === no));
  }
  function onKey(ev) {
    const vis = chrono.filter(matches);
    const i = vis.findIndex(b => b.no === selected);
    let n = null;
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') n = vis[Math.min(vis.length - 1, i + 1)];
    if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') n = vis[Math.max(0, i - 1)];
    if (ev.key === 'Home') n = vis[0];
    if (ev.key === 'End') n = vis[vis.length - 1];
    if (n) { ev.preventDefault(); select(n.no, true); btns.get(n.no).scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function cardHTML(b) {
    const chips = b.stack.map(s => `<span class="chip${tags.includes(s) ? ' is-hit' : ''}">${esc(s)}</span>`).join('');
    let meta = `<dt>Logged</dt><dd>${esc(b.when)}</dd>`;
    if (b.metric) meta += `<dt>Reading</dt><dd>${esc(b.metric)}</dd>`;
    if (b.extra.length) meta += `<dt>Context</dt><dd>${esc(b.extra.join(' · '))}</dd>`;
    const link = b.link
      ? `<a class="btn btn--ghost" href="${esc(b.link)}"${b.local ? '' : ' rel="noopener"'}>${b.local ? 'Read the lab report →' : esc(b.cta || 'Read the build log') + ' ↗'}</a>`
      : '<p class="card__none">No public write-up yet. Logged on the build index only.</p>';
    return `<div class="card__top"><span>Specimen EXP-${pad(b.no)}</span><span class="st st--${b.status.toLowerCase()}">${b.status}</span></div>
<div class="card__body"><h3>${esc(b.title)}</h3><p>${esc(b.dek)}</p><dl class="card__meta">${meta}</dl><div class="card__chips">${chips}</div><div class="card__link">${link}</div></div>`;
  }
  $$('[data-filter]').forEach(f => f.addEventListener('click', () => {
    $$('[data-filter]').forEach(o => o.setAttribute('aria-pressed', String(o === f)));
    tags = f.dataset.tags ? f.dataset.tags.split('|') : [];
    applyFilter();
  }));
  render();
  const sc = host.parentElement; if (sc && sc.scrollWidth > sc.clientWidth) sc.scrollLeft = sc.scrollWidth;
  let rw; new ResizeObserver(() => { cancelAnimationFrame(rw); rw = requestAnimationFrame(render); }).observe(host);
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting && !plotted) { plotted = true; host.classList.add('is-plotted'); setTimeout(() => btns.forEach(b => b.style.transitionDelay = ''), 3500); io.disconnect(); } }), { threshold: .3 });
  io.observe(host);
}

/* ---------- YouTube click-to-load (nocookie) ---------- */
function youtube() {
  document.addEventListener('click', ev => {
    const a = ev.target.closest('[data-yt-play]');
    if (!a) return;
    const box = a.closest('[data-yt]');
    if (!box) return;
    ev.preventDefault();
    const f = el('iframe', {
      src: `https://www.youtube-nocookie.com/embed/${box.dataset.yt}?autoplay=1&rel=0`,
      title: box.dataset.title || 'YouTube video', allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
      allowfullscreen: '', referrerpolicy: 'strict-origin-when-cross-origin'
    });
    box.replaceChildren(f); f.focus();
  });
}

/* ---------- navigation: rail / mobile bar / drawer ---------- */
function navigation() {
  const secs = $$('[data-plate-sec]');
  const links = $$('[data-plate]');
  const cur = $('[data-mcur]'), curN = $('[data-mcur-n]'), curT = $('[data-mcur-t]');
  const setActive = id => {
    links.forEach(a => a.setAttribute('aria-current', String(a.dataset.plate === id)));
    const a = links.find(l => l.dataset.plate === id);
    if (a && cur) { cur.href = `#${id}`; curN.textContent = (cur.dataset.prefix || 'PL.') + a.querySelector('.n').textContent; curT.textContent = a.querySelector('.n + span').firstChild.textContent; }
  };
  if (secs.length) {
    const io = new IntersectionObserver(es => es.forEach(en => en.isIntersecting && setActive(en.target.id)), { rootMargin: '-35% 0px -60% 0px' });
    secs.forEach(s => io.observe(s));
  }
  const meter = $('[data-meter]');
  if (meter) {
    let raf;
    const flag = document.querySelector('.concept-flag');
    const upd = () => { const h = document.documentElement; if (flag) h.style.setProperty('--flag-h', Math.max(0, flag.offsetHeight - h.scrollTop) + 'px'); meter.style.width = `${Math.min(100, (h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)) * 100)}%`; };
    addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(upd); }, { passive: true }); upd();
  }
  const btn = $('[data-drawer-btn]'), drawer = $('[data-drawer]');
  if (btn && drawer) {
    const close = (refocus = true) => { drawer.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); btn.textContent = 'Index'; if (refocus) btn.focus(); };
    btn.addEventListener('click', () => {
      const open = !drawer.classList.contains('is-open');
      if (!open) return close();
      drawer.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); btn.textContent = 'Close';
      ($('a[aria-current="true"]', drawer) || $('a', drawer))?.focus({ preventScroll: true });
    });
    drawer.addEventListener('click', ev => { if (ev.target.closest('a')) close(false); });
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && drawer.classList.contains('is-open')) close(); });
  }
}

/* ---------- registration marks reveal ---------- */
function marks() {
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }), { threshold: .15 });
  $$('.reg').forEach(n => io.observe(n));
}

/* ---------- lab report: 36-second replay ---------- */
function replay() {
  const fig = $('[data-replay]');
  if (!fig) return;
  const cursor = $('[data-cursor]', fig), out = $('output', fig), btns = $$('[data-speed]', fig), stop = $('[data-stop]', fig);
  const x0 = +fig.dataset.x0, x1 = +fig.dataset.x1;
  const events = $$('[data-at]', fig);
  let raf = null, t0 = 0, speed = 1;
  const draw = sec => {
    const s = Math.min(36, Math.max(0, sec));
    cursor.setAttribute('transform', `translate(${x0 + (x1 - x0) * s / 36} 0)`);
    out.textContent = `t = ${s.toFixed(RM.matches ? 0 : 1)} s · 14:58:${pad(11 + Math.floor(s))} UTC`;
    events.forEach(e => e.classList.toggle('is-past', s >= +e.dataset.at));
  };
  const end = () => { fig.classList.remove('is-playing'); cancelAnimationFrame(raf); raf = null; stop.disabled = true; btns.forEach(b => b.disabled = false); };
  const frame = now => {
    let s = ((now - t0) / 1000) * speed;
    if (RM.matches) s = Math.floor(s); // reduced motion: discrete one-second ticks
    draw(s);
    if (s >= 36) return end();
    raf = requestAnimationFrame(frame);
  };
  btns.forEach(b => b.addEventListener('click', () => { speed = +b.dataset.speed; t0 = performance.now(); btns.forEach(x => x.disabled = true); stop.disabled = false; fig.classList.add('is-playing'); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); }));
  stop.addEventListener('click', () => { end(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && raf) end(); });
  draw(36);
}

navigation(); marks(); youtube(); dailyEmail(); chart(); replay();
zerohuman(); pipeline();
