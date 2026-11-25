// The signature interaction: a playhead over Ken's whole record.
// Scrub, step (← → / J L), switch tracks (↑ ↓), play the year (Space), solo a theme. Every cue
// re-tunes the program monitor and the "Tuned to" workspace below to that moment.
// Everything the playhead can land on comes from the graph, so new work joins automatically.
import { monitorHTML, tunedHTML, editRange, tc } from '../render.js';
import { fmtDate, typeLabel } from '../../../lib/graph.js';
import { reduced } from './data.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const STEP_MS = 2400;

export function mountEdit({ graph, ctx, root = document, monitor = $('#monitor'), tuned = $('[data-region="tuned"]'), syncHash = true }) {
  let G = graph, R = editRange(G), order = [], cur = null, solo = null, timer = null, month = null;
  const el = () => $('[data-edit]', root);

  function rebuild(g) {
    G = g || G; R = editRange(G);
    order = G.items.filter((i) => i.date && i.type !== 'digest')
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (b.order ?? 0) - (a.order ?? 0)));
    const e = el(); if (!e) return;
    const curEl = $('.clip[aria-current="true"]', e);
    cur = (curEl && G.byId.get(curEl.dataset.id)) || G.now[0];
    month = $('.tuned', tuned || document)?.dataset.month || cur.month;
    $$('.clip', e).forEach((c) => c.setAttribute('tabindex', c.dataset.id === cur.id ? '0' : '-1'));
    if (solo) e.dataset.solo = solo;
    syncPlayButton();
  }
  const pool = () => (solo ? order.filter((i) => i.theme === solo) : order);
  const xOf = (it) => (it.type === 'digest' ? R.pct(G.digest.last) : it.month < R.first ? null : R.pct(it.date));

  function placeHead(x, label) {
    const ph = $('[data-playhead]', el());
    if (!ph) return;
    if (x == null) { ph.setAttribute('data-arch', ''); ph.removeAttribute('data-end'); ph.removeAttribute('data-start'); }
    else { ph.removeAttribute('data-arch'); ph.style.setProperty('--x', x.toFixed(3)); ph.toggleAttribute('data-end', x > 92); ph.toggleAttribute('data-start', x < 6); }
    if (label != null) $('.ph__tag', ph).textContent = label;
  }

  function cue(id, { focus = false, scroll = false, announce = true, hash = true } = {}) {
    const it = G.byId.get(id); if (!it) return;
    cur = it;
    const e = el();
    placeHead(xOf(it), tc(it));
    $$('.clip', e).forEach((c) => { const on = c.dataset.id === id; c.toggleAttribute('aria-current', on); if (on) c.setAttribute('aria-current', 'true'); c.setAttribute('tabindex', on ? '0' : '-1'); });
    $$('.ruler__m', e).forEach((m) => m.classList.toggle('is-on', m.dataset.month === it.month));
    if (monitor) monitor.innerHTML = `<!--@edit-monitor-->${monitorHTML(it, G, ctx)}<!--/@edit-monitor-->`;
    if (monitor && it.demo) $('.mon', monitor)?.setAttribute('data-new', '');
    if (tuned && it.month !== month) setMonth(it.month);
    if (focus) { const c = $(`.clip[data-id="${CSS.escape(id)}"]`, e); c?.focus({ preventScroll: true }); revealClip(c); }
    else revealClip($(`.clip[data-id="${CSS.escape(id)}"]`, e));
    if (announce) { const r = $('[data-readout]', e); if (r) r.textContent = `On the monitor: ${typeLabel[it.type]}, ${it.title}, ${fmtDate(it.date, it.precision)}.`; }
    if (scroll && monitor) { const top = monitor.getBoundingClientRect().top; if (top < 60 || top > innerHeight * 0.5) monitor.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); }
    if (hash && syncHash) history.replaceState(null, '', `#cue=${encodeURIComponent(id)}`);
  }
  function revealClip(c) {
    if (!c) return;
    const sc = $('.edit__scroll', el());
    if (!sc || sc.scrollWidth <= sc.clientWidth) return;
    const cr = c.getBoundingClientRect(), sr = sc.getBoundingClientRect();
    const head = parseFloat(getComputedStyle(el()).getPropertyValue('--head')) || 0;
    if (cr.left < sr.left + head + 10 || cr.right > sr.right - 10) sc.scrollTo({ left: sc.scrollLeft + (cr.left - sr.left) - sr.width / 2 - head / 2, behavior: reduced ? 'auto' : 'smooth' });
  }
  function setMonth(m) {
    if (!tuned) return;
    month = m;
    tuned.innerHTML = `<!--@tuned-->${tunedHTML(G, ctx, m)}<!--/@tuned-->`;
    $$('[data-demo]', tuned).forEach((n) => n.closest('li')?.setAttribute('data-new', ''));
  }

  function step(dir) {
    const p = pool(); if (!p.length) return;
    let i = p.findIndex((x) => x.id === cur?.id);
    if (i < 0) i = dir > 0 ? -1 : p.length;
    const n = p[Math.max(0, Math.min(p.length - 1, i + dir))];
    if (n && n.id !== cur?.id) cue(n.id, { focus: el().contains(document.activeElement) });
    return n;
  }
  function edge(last) { const p = pool(); if (p.length) cue(p[last ? p.length - 1 : 0].id, { focus: el().contains(document.activeElement) }); }
  function trackJump(dir) {
    const tracks = $$('.trk', el()).filter((t) => $('.clip', t));
    const curClip = $('.clip[aria-current="true"]', el());
    let ti = tracks.indexOf(curClip?.closest('.trk')); ti = Math.max(0, Math.min(tracks.length - 1, ti + dir));
    const target = Date.parse(cur.date);
    const cands = $$('.clip', tracks[ti]).filter((c) => !solo || c.dataset.theme === solo);
    if (!cands.length) return;
    const best = cands.reduce((a, c) => (Math.abs(Date.parse(c.dataset.date) - target) < Math.abs(Date.parse(a.dataset.date) - target) ? c : a));
    cue(best.dataset.id, { focus: true });
  }

  /* play the year */
  function syncPlayButton() {
    const b = $('[data-act="play"]', el()); if (!b) return;
    b.setAttribute('aria-pressed', String(!!timer));
    $('.lbl', b).textContent = timer ? 'Pause' : 'Play the year';
  }
  function play() {
    if (timer) return pause();
    const p = pool();
    if (cur?.id === p.at(-1)?.id) cue(p.find((x) => x.month >= R.first)?.id || p[0].id);
    timer = setInterval(() => { const before = cur?.id; const n = step(1); if (!n || n.id === before) pause(); }, STEP_MS);
    syncPlayButton();
  }
  function pause() { clearInterval(timer); timer = null; syncPlayButton(); }
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  if ('IntersectionObserver' in window) new IntersectionObserver((es) => es.forEach((x) => { if (!x.isIntersecting) pause(); })).observe(monitor || el());

  function setSolo(theme) {
    solo = solo === theme ? null : theme;
    const e = el();
    if (solo) e.dataset.solo = solo; else delete e.dataset.solo;
    $$('[data-solo]', e).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.solo === solo)));
    if (solo && cur?.theme !== solo) { const p = pool(); if (p.length) cue(p.at(-1).id); }
    const r = $('[data-readout]', e); if (r) r.textContent = solo ? `Solo: ${G.themes.find((t) => t.id === solo).label}. ${pool().length} clips.` : 'All themes.';
  }

  /* scrubbing: drag (mouse/pen) or tap (touch) anywhere on the tracks */
  let scrub = null;
  const areaRect = () => $('.ruler__area', el()).getBoundingClientRect();
  function nearest(clientX) {
    const r = areaRect(); const pct = ((clientX - r.left) / r.width) * 100;
    const p = pool().filter((i) => i.month >= R.first);
    let best = null, bd = Infinity;
    for (const it of p) { const d = Math.abs(R.pct(it.date) - pct); if (d < bd) { bd = d; best = it; } }
    return { pct: Math.max(0, Math.min(100, pct)), best };
  }
  const dateAt = (pct) => new Date(R.start + (pct / 100) * (R.end - R.start)).toISOString().slice(0, 10).replace(/-/g, '·');
  root.addEventListener('pointerdown', (e) => {
    const area = e.target.closest('.trk__area, .ruler__area');
    if (!area || !el()?.contains(area) || e.target.closest('.clip, .dtrack') || e.button > 0 || e.pointerType === 'touch') return;
    e.preventDefault(); pause();
    scrub = { id: e.pointerId, last: null };
    el().classList.add('is-scrubbing');
    area.setPointerCapture?.(e.pointerId);
    moveScrub(e);
  });
  function moveScrub(e) {
    const { pct, best } = nearest(e.clientX);
    placeHead(pct, dateAt(pct));
    if (best && best.id !== scrub.last) { scrub.last = best.id; cue(best.id, { announce: false, hash: false }); placeHead(pct, dateAt(pct)); }
  }
  root.addEventListener('pointermove', (e) => { if (scrub && e.pointerId === scrub.id) moveScrub(e); });
  const endScrub = (e) => { if (!scrub || e.pointerId !== scrub.id) return; el().classList.remove('is-scrubbing'); const id = scrub.last; scrub = null; if (id) cue(id); };
  root.addEventListener('pointerup', endScrub); root.addEventListener('pointercancel', endScrub);
  root.addEventListener('click', (e) => {
    const e0 = el(); if (!e0 || !e0.contains(e.target)) return;
    const area = e.target.closest('.trk__area, .ruler__area');
    if (area && !e.target.closest('.clip, .dtrack') && e.pointerType === 'touch') { const { best } = nearest(e.clientX); if (best) cue(best.id); }
  });

  /* clicks: first click cues, a second click on the cued clip opens it */
  root.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
    const clip = e.target.closest('.clip, .dtrack');
    const e0 = el();
    if (clip && e0?.contains(clip)) {
      const id = clip.dataset.id;
      if (cur?.id === id && clip.getAttribute('href') !== '#') return; // second click: follow the link
      e.preventDefault(); pause(); cue(id, { focus: true }); return;
    }
    const t = e.target.closest('[data-cue]');
    if (t && t.closest('.suite, .monitor, [data-cue-scope]') && G.byId.has(t.dataset.cue)) { e.preventDefault(); pause(); cue(t.dataset.cue, { scroll: !t.closest('.monitor') }); return; }
    const b = e.target.closest('[data-act]');
    if (b && e0?.contains(b)) { const a = b.dataset.act; if (a === 'play') play(); else { pause(); a === 'prev' ? step(-1) : a === 'next' ? step(1) : edge(a === 'last'); } return; }
    const s = e.target.closest('[data-solo]'); if (s && e0?.contains(s)) { setSolo(s.dataset.solo); return; }
    const m = e.target.closest('[data-month-go]');
    if (m && tuned?.contains(m)) { const target = m.dataset.monthGo; setMonth(target); placeMonth(target); $(`[data-month-go]`, tuned)?.focus(); }
  });
  function placeMonth(m) {
    const items = pool().filter((i) => i.month === m);
    if (items.length) cue(items.at(-1).id, { announce: true });
    else { const x = R.months.includes(m) ? R.pct(`${m}-15`) : null; placeHead(x, m.replace('-', '·')); $$('.ruler__m', el()).forEach((r) => r.classList.toggle('is-on', r.dataset.month === m)); }
  }

  /* keyboard */
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || document.querySelector('dialog[open]')) return;
    const inEdit = el()?.contains(e.target), inSuite = inEdit || monitor?.contains(e.target);
    const k = e.key;
    if (inEdit && (k === 'ArrowLeft' || k === 'ArrowRight')) { e.preventDefault(); pause(); step(k === 'ArrowLeft' ? -1 : 1); }
    else if (inEdit && (k === 'ArrowUp' || k === 'ArrowDown') && e.target.closest('.clip')) { e.preventDefault(); trackJump(k === 'ArrowUp' ? -1 : 1); }
    else if (inEdit && (k === 'Home' || k === 'End')) { e.preventDefault(); pause(); edge(k === 'End'); }
    else if (inEdit && k === ' ' && !e.target.closest('button')) { e.preventDefault(); play(); }
    else if ((k === 'j' || k === 'J' || k === 'l' || k === 'L') && (inSuite || e.target === document.body)) { e.preventDefault(); pause(); step(k.toLowerCase() === 'j' ? -1 : 1); }
    else if ((k === 'k' || k === 'K') && (inSuite || e.target === document.body)) { pause(); }
  });

  rebuild();
  const api = {
    cue, rebuild, has: (id) => G.byId.has(id),
    action: (a) => { if (a === 'play') { el().scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }); play(); } else if (a.startsWith('solo:')) setSolo(a.slice(5)); },
    get current() { return cur; },
  };
  return api;
}
