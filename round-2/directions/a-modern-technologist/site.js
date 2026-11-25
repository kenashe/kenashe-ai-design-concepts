// Round 2 · Direction A · The Modern Technologist — progressive enhancement.
// The pages are complete without this file. It adds: the orbit's readout, relationship highlighting,
// sector focus and month-by-month rewind; the Receipts layer; the in-page video player; the rail
// buttons; and the ?demo= homepage. Normal page views never fetch sources.json.
import { esc } from '../../lib/graph.js';
import { regions, placeAt, rOfAge, ORBIT, glyph, ringLabelAt } from './render.js';

const DIR = 'a-modern-technologist';
const BASE = (document.querySelector('link[href$="lib/concept-flag.css"]')?.getAttribute('href') || '../../').replace('lib/concept-flag.css', '');
const RM = matchMedia('(prefers-reduced-motion: reduce)');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const MONTH = 30.4375 * 86400000;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const lowPower = (navigator.hardwareConcurrency || 8) <= 2 || (navigator.deviceMemory || 8) <= 2 || navigator.connection?.saveData;

/* ------------------------------------------------------------ Receipts */
function receipts() {
  const b = $('[data-receipts]');
  if (!b) return;
  b.hidden = false;
  b.addEventListener('click', () => {
    const on = document.documentElement.classList.toggle('receipts');
    b.setAttribute('aria-pressed', String(on));
  });
}

/* ------------------------------------------------------------ video player (click to load) */
function player() {
  const dlg = $('[data-player]');
  if (!dlg || typeof dlg.showModal !== 'function') return;
  const frame = $('[data-player-frame]', dlg);
  const close = () => { dlg.close(); };
  dlg.addEventListener('close', () => { frame.textContent = ''; });
  $('[data-player-close]', dlg).addEventListener('click', close);
  dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.classList.contains('player-in')) close(); });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-yt]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    e.preventDefault();
    const id = a.dataset.yt;
    const f = document.createElement('iframe');
    f.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
    f.title = a.dataset.ytTitle || 'YouTube video';
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    if (a.hasAttribute('data-yt-inline')) {
      const box = a.closest('[data-screen]') || a.parentElement;
      box.classList.add('is-playing'); box.textContent = ''; box.append(f); f.focus();
      return;
    }
    frame.textContent = ''; frame.append(f);
    dlg.showModal();
  });
}

/* ------------------------------------------------------------ video rail buttons */
function rails() {
  for (const r of $$('[data-rail]')) {
    const track = $('.rail-track', r), prev = $('[data-rail-prev]', r), next = $('[data-rail-next]', r);
    if (!track || !prev) continue;
    prev.hidden = next.hidden = false;
    const sync = () => {
      prev.disabled = track.scrollLeft < 8;
      next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 8;
    };
    const go = (d) => track.scrollBy({ left: d * track.clientWidth * 0.8, behavior: RM.matches ? 'auto' : 'smooth' });
    prev.onclick = () => go(-1); next.onclick = () => go(1);
    track.addEventListener('scroll', sync, { passive: true }); sync();
  }
}

/* ------------------------------------------------------------ the orbit */
const ease = (t) => 1 - Math.pow(1 - t, 3);
function edgeD(a, b) {
  const { C } = ORBIT;
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, cx = C + (mx - C) * 0.3, cy = C + (my - C) * 0.3;
  return `M${a.x.toFixed(1)} ${a.y.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}

function readoutHTML(d, lead) {
  if (!d) return '';
  const m = d.img
    ? `<span class="media ro-m"><img src="${esc(d.img)}" alt="" decoding="async" width="1280" height="720"></span>`
    : `<span class="media media--glyph ro-m">${d.g || ''}</span>`;
  const yt = d.yt ? ` data-yt="${esc(d.yt)}" data-yt-title="${esc(d.ti)}"` : '';
  const ex = /^https?:/.test(d.h) ? ' rel="noopener"' : '';
  return `<p class="eyebrow">${lead ? `<span class="ro-lead">${esc(lead)}</span>` : ''}${esc(d.k)} · ${esc(d.dt)} · ${esc(d.th)}</p>`
    + `<a class="ro-a" href="${esc(d.h)}"${ex}${yt}>${m}<span class="ro-t">${esc(d.ti)}</span></a>`
    + (d.rel.length ? `<p class="ro-rel">Linked to ${d.rel.map(esc).join(', ')}</p>` : '');
}

let orbitStop = null;
function orbit() {
  orbitStop?.();
  const root = $('[data-orbit]');
  if (!root) return;
  const svg = $('.orbit-svg', root);
  const W = +svg.dataset.w, tNow0 = +svg.dataset.now;
  const data = JSON.parse($('.orbit-data', root).textContent);
  const cum = JSON.parse($('.orbit-cum', svg).textContent);
  const ro = $('[data-ro-item]');
  const count = $('[data-orbit-count]', root);
  const asOfEl = $('[data-orbit-asof]', root);
  const marks = $$('.m', svg).map((el) => {
    const m = { el, g: $('.mk', el), id: el.dataset.id, t: el.dataset.t, th: el.dataset.th, d: +el.dataset.d, a: +el.dataset.a, j: +el.dataset.j, s: +el.dataset.s, d0: +(el.dataset.d0 || el.dataset.d), rel: el.dataset.rel.split(' ').filter(Boolean) };
    const tr = m.g.getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\)/);
    m.x = +tr[1]; m.y = +tr[2];
    return m;
  });
  const byId = new Map(marks.map((m) => [m.id, m]));
  const edges = $$('.e', svg).map((el) => ({ el, a: byId.get(el.dataset.a), b: byId.get(el.dataset.b) })).filter((e) => e.a && e.b);
  const rings = $$('.ring', svg).map((el) => ({ el, c: $('circle', el), tx: $('text', el), m: el.dataset.m }));
  const chips = $$('.chip', root);
  const playBtn = $('[data-orbit-play]', root);
  let sel = null, sector = null, tNow = tNow0, raf = 0, timer = 0, lastPointer = 'mouse';

  /* focus: an item and its documented relationships */
  const highlight = (id) => {
    root.classList.toggle('is-focus', !!id);
    const on = new Set(id ? [id, ...(byId.get(id)?.rel || [])] : []);
    for (const m of marks) m.el.classList.toggle('is-on', on.has(m.id) || (!id && sector && m.th === sector));
    for (const e of edges) e.el.classList.toggle('is-on', !!id && (e.a.id === id || e.b.id === id));
  };
  const show = (id, lead) => { if (ro && data[id]) { ro.innerHTML = readoutHTML(data[id], lead); ro.closest('[data-readout]')?.classList.add('has-sel'); } };
  for (const m of marks) {
    m.el.addEventListener('pointerenter', (e) => { lastPointer = e.pointerType; if (e.pointerType === 'mouse') { highlight(m.id); show(m.id); } });
    m.el.addEventListener('pointerleave', () => { if (!sel) highlight(null); else highlight(sel); });
    m.el.addEventListener('focus', () => { highlight(m.id); show(m.id); });
    m.el.addEventListener('blur', () => { highlight(sel); });
    m.el.addEventListener('pointerdown', (e) => { lastPointer = e.pointerType; });
    m.el.addEventListener('click', (e) => {
      // Touch: first tap selects and explains, second tap opens.
      if (lastPointer !== 'mouse' && sel !== m.id) {
        e.preventDefault();
        marks.forEach((x) => x.el.classList.toggle('is-sel', x === m));
        sel = m.id; highlight(m.id); show(m.id);
        ro?.closest('[data-readout]')?.scrollIntoView({ block: 'nearest', behavior: RM.matches ? 'auto' : 'smooth' });
      }
    });
  }

  /* sectors: focus one theme */
  for (const s of $$('.sec', svg)) {
    s.setAttribute('role', 'button');
    s.setAttribute('aria-pressed', 'false');
    s.addEventListener('click', (e) => {
      e.preventDefault();
      sector = sector === s.dataset.theme ? null : s.dataset.theme;
      if (sector) root.dataset.sector = sector; else delete root.dataset.sector;
      $$('.sec', svg).forEach((x) => { x.classList.toggle('is-on', x.dataset.theme === sector); x.setAttribute('aria-pressed', String(x.dataset.theme === sector)); });
      highlight(null);
    });
    s.addEventListener('keydown', (e) => { if (e.key === ' ') { e.preventDefault(); s.click(); } });
  }

  /* time: rebuild the orbit as it looked from any month */
  const digestSize = (t) => {
    const mon = new Date(t).toISOString().slice(0, 7);
    const ks = Object.keys(cum).filter((k) => k <= mon).sort();
    const n = ks.length ? cum[ks.at(-1)] : 0;
    return { n, s: n ? 5 + Math.sqrt(n) * 0.62 : 0 };
  };
  const layout = (t) => {
    const dg = digestSize(t);
    return marks.map((m) => {
      const vis = (m.t === 'digest' ? m.d0 : m.d) <= t + 86400000;
      const s = m.t === 'digest' ? Math.max(dg.s, 3) : m.s;
      return { m, vis, s, ...placeAt({ t: m.t, a: m.a, j: m.j, d: m.d, s }, t, W) };
    });
  };
  const ringsAt = (t) => {
    let prev = ORBIT.R0;
    for (const r of rings) {
      const age = (t - Date.parse(r.m + '-01')) / MONTH;
      const vis = age >= 0;
      const rr = rOfAge(Math.max(0, age), W);
      r.el.style.opacity = vis ? '' : '0';
      r.c.setAttribute('r', rr.toFixed(1));
      const L = ringLabelAt((rr + prev) / 2);
      r.tx.setAttribute('x', L.x.toFixed(1)); r.tx.setAttribute('y', L.y.toFixed(1));
      if (vis) prev = rr;
    }
  };
  const applyFrame = (pos, k) => {
    for (const p of pos) {
      const m = p.m;
      const x = m.x0 + (p.x - m.x0) * k, y = m.y0 + (p.y - m.y0) * k;
      m.x = x; m.y = y;
      m.g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      if (m.t === 'digest') {
        const s = m.s0 + (p.s - m.s0) * k;
        const [c1, c2] = m.g.querySelectorAll('circle.sh, circle.sh-dr');
        c1?.setAttribute('r', s.toFixed(1)); c2?.setAttribute('r', (s * 0.42).toFixed(1));
        m.g.querySelector('.halo')?.setAttribute('r', (s + 9).toFixed(1));
        m.cs = s;
      }
    }
    for (const e of edges) e.el.setAttribute('d', edgeD(e.a, e.b));
  };
  const counts = (pos, t) => {
    if (!count) return;
    const n = { build: 0, essay: 0, video: 0 };
    for (const p of pos) if (p.vis && p.m.t !== 'digest') n[p.m.t === 'short' ? 'video' : p.m.t]++;
    const live = t >= tNow0;
    const d = new Date(t);
    const label = live ? 'Now' : `${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    count.querySelector('.cnt-as').textContent = label;
    for (const k of Object.keys(n)) count.querySelector(`[data-c="${k}"]`).textContent = n[k];
    count.querySelector('[data-c="digest"]').textContent = digestSize(t).n.toLocaleString('en-US');
    root.classList.toggle('is-past', !live);
    if (asOfEl) asOfEl.textContent = live ? asOfEl.dataset.now || asOfEl.textContent : label;
  };
  if (asOfEl) asOfEl.dataset.now = asOfEl.textContent;
  const goTo = (t, instant) => {
    tNow = t;
    cancelAnimationFrame(raf);
    const pos = layout(t);
    for (const p of pos) { p.m.x0 = p.m.x; p.m.y0 = p.m.y; p.m.s0 = p.m.cs ?? p.m.s; p.m.el.classList.toggle('is-hidden', !p.vis); p.m.el.toggleAttribute('inert', !p.vis); }
    for (const e of edges) e.el.classList.toggle('is-hidden', e.a.el.classList.contains('is-hidden') || e.b.el.classList.contains('is-hidden'));
    ringsAt(t);
    counts(pos, t);
    if (instant || RM.matches) return applyFrame(pos, 1);
    const t0 = performance.now(), dur = lowPower ? 1 : 700;
    const step = (now) => { const k = Math.min(1, (now - t0) / dur); applyFrame(pos, ease(k)); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
  };
  const monthEnd = (m) => { const [y, mo] = m.split('-').map(Number); return Math.min(tNow0, Date.UTC(y, mo, 1) - 1); };
  const pick = (i, instant) => {
    chips.forEach((c, j) => c.setAttribute('aria-pressed', String(j === i)));
    goTo(monthEnd(chips[i].dataset.month), instant);
  };
  chips.forEach((c, i) => c.addEventListener('click', () => { stopPlay(); pick(i); }));

  /* play the year: month by month from the first ring to now (user-started, pausable) */
  const stopPlay = () => { clearTimeout(timer); timer = 0; playBtn?.setAttribute('aria-pressed', 'false'); playBtn?.setAttribute('aria-label', 'Play the year'); };
  const startPlay = () => {
    playBtn.setAttribute('aria-pressed', 'true'); playBtn.setAttribute('aria-label', 'Pause');
    let i = 0;
    const cur = chips.findIndex((c) => c.getAttribute('aria-pressed') === 'true');
    if (cur > -1 && cur < chips.length - 1) i = cur + 1;
    const tick = () => { pick(i); i++; if (i < chips.length) timer = setTimeout(tick, 1100); else stopPlay(); };
    tick();
  };
  if (playBtn) {
    playBtn.hidden = false;
    playBtn.onclick = () => (timer ? stopPlay() : startPlay());
  }
  /* Intro, once: every mark leaves Ken and travels outward to its age. It shows the rule
     "distance is time" before anyone reads the legend. Under 2 s; skipped for reduced motion. */
  const intro = () => {
    if (RM.matches || lowPower || root.dataset.intro) return;
    root.dataset.intro = '1';
    const { C, R0 } = ORBIT;
    const pos = layout(tNow);
    for (const p of pos) { const a = p.m.a - Math.PI / 2; p.m.x0 = C + Math.cos(a) * (R0 - 6); p.m.y0 = C + Math.sin(a) * (R0 - 6); p.m.s0 = p.s; p.k = (p.r - R0) / (ORBIT.RE - R0); }
    root.classList.add('is-intro');
    const t0 = performance.now();
    const step = (now) => {
      const el = now - t0; let done = true;
      for (const p of pos) {
        const k = Math.min(1, Math.max(0, (el - 120) / (700 + p.k * 900)));
        if (k < 1) done = false;
        const e = ease(k);
        const x = p.m.x0 + (p.x - p.m.x0) * e, y = p.m.y0 + (p.y - p.m.y0) * e;
        p.m.x = x; p.m.y = y; p.m.g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      }
      for (const e of edges) e.el.setAttribute('d', edgeD(e.a, e.b));
      if (!done) raf = requestAnimationFrame(step); else root.classList.remove('is-intro');
    };
    raf = requestAnimationFrame(step);
  };
  const seen = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { seen.disconnect(); intro(); } }, { threshold: 0.35 });
  if (!new URLSearchParams(location.search).has('demo')) seen.observe(root);
  const onVis = () => { if (document.hidden) stopPlay(); };
  document.addEventListener('visibilitychange', onVis);
  const io = new IntersectionObserver((es) => es.forEach((en) => { if (!en.isIntersecting) stopPlay(); }));
  io.observe(root);
  orbitStop = () => { stopPlay(); seen.disconnect(); cancelAnimationFrame(raf); io.disconnect(); document.removeEventListener('visibilitychange', onVis); };
}

/* ------------------------------------------------------------ ?demo=build,essay,video on the homepage */
async function demo() {
  const q = new URLSearchParams(location.search).get('demo');
  if (!q) return;
  const keys = q.split(',').map((s) => s.trim()).filter(Boolean);
  const [{ buildGraph }, pd, { rerender, pageContext }] = await Promise.all([
    import('../../lib/graph.js'), import('../../lib/publish-demo.js'), import('../../lib/regions.js'),
  ]);
  const src = await (await fetch(`${BASE}data/sources.json`)).json();
  const before = buildGraph(src, { base: BASE });
  const after = pd.patchDemoImages(buildGraph(pd.applyDemo(src, keys), { base: BASE }), BASE);
  const ids = after.items.filter((i) => !before.byId.has(i.id)).map((i) => i.id);
  rerender(regions, after, pageContext(BASE, DIR), { highlight: ids });
  const bar = document.createElement('div');
  bar.className = 'demo-bar';
  bar.setAttribute('role', 'status');
  bar.innerHTML = `<strong>Publishing demo</strong><span>${ids.length} placeholder ${ids.length === 1 ? 'entry' : 'entries'} applied (${keys.map(esc).join(', ')}). Dashed outlines mark what is new. Nothing is saved.</span><a href="./">Reset</a><a href="publish/">How it works</a>`;
  document.querySelector('.concept-flag')?.after(bar);
  boot();
}

/* ------------------------------------------------------------ deferred images (see render.js deferImg) */
let imgIO = null;
function images() {
  const imgs = $$('img[data-src]');
  const load = (img) => { img.src = img.dataset.src; img.removeAttribute('data-src'); };
  if (!('IntersectionObserver' in window)) return imgs.forEach(load);
  imgIO?.disconnect();
  imgIO = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { load(e.target); imgIO.unobserve(e.target); } }), { rootMargin: '600px 0px' });
  imgs.forEach((i) => imgIO.observe(i));
}

function boot() { images(); orbit(); rails(); }
receipts(); player(); boot(); demo();
export { glyph, boot };
