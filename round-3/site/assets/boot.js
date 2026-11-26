// Round 3 · shared page boot. Every page can use this module:
//   boot()                  loads the graph (honouring ?demo= and <meta name="r3:sources">), wires the shell
//                           (search event, menu, click-to-load players) and returns { graph, src, ctx, base, demo }
//   mountStage(stage, …)    mounts the interactive universe over a prerendered poster, with card and controls
//   applyRegions(graph, ctx) re-renders every [data-region] on the page (used by ?demo= and the publishing demo)
import { buildGraph, fmtDate } from '../../lib/graph.js';
import { applyDemo, patchDemoImages, DEMO_STEPS } from '../../lib/publish-demo.js';
import { rerender, pageContext } from '../../lib/regions.js';
import { regions, prep, itemHref, local, ICON } from '../render.js';

export const DEMO_KEYS = DEMO_STEPS.map((s) => s.key); // build, essay, video, category

/** Relative path from this page to round-3/, read from the concept flag link (always `<base>`). */
export const baseOf = () => document.querySelector('.concept-flag a')?.getAttribute('href') ?? '../';
/** 'site' for the prototype, 'stress' for the stress test (set on <html data-root>). */
export const rootOf = () => document.documentElement.dataset.root || 'site';

export function ctxFor(base = baseOf(), root = rootOf()) {
  const c = pageContext(base, root);
  // same `page` value the prerender uses: the path inside the root, e.g. 'universe/index.html'
  const tail = location.pathname.split(`/${root}/`).pop() || ''; c.page = !tail || tail.endsWith('/') ? `${tail}index.html` : tail;
  return c;
}
export async function loadSources(base, file = 'data/sources.json') { const r = await fetch(`${base}${file}`); if (!r.ok) throw new Error(`could not load ${file}`); return r.json(); }
export function demoKeys() { const q = new URLSearchParams(location.search).get('demo'); return q ? q.split(',').map((x) => x.trim()).filter((k) => DEMO_KEYS.includes(k)) : []; }
/** Build the graph, optionally with demo steps applied (placeholders, marked as such). */
export function graphFrom(src, base, keys = []) {
  const g = buildGraph(keys.length ? applyDemo(src, keys) : src, { base });
  if (keys.length) patchDemoImages(g);
  return prep(g);
}
/** Re-render all regions with a graph and mark the new demo items. Returns the ids of demo items. */
export function applyRegions(graph, ctx) {
  const ids = graph.items.filter((i) => i.demo).map((i) => i.id);
  rerender(regions, prep(graph), ctx, { highlight: ids });
  return ids;
}

// ---------- shell behaviour (idempotent, delegated so re-rendered regions keep working) ----------
let shellWired = false;
export function wireShell() {
  if (shellWired) return; shellWired = true;
  document.documentElement.classList.add('js');
  document.addEventListener('click', (e) => {
    // Search: other scripts attach the overlay by listening for `r3:search` and calling preventDefault().
    const s = e.target.closest?.('[data-search]');
    if (s) { const ev = new CustomEvent('r3:search', { cancelable: true, detail: { trigger: s } }); if (!document.dispatchEvent(ev)) e.preventDefault(); return; }
    // click-to-load video
    const p = e.target.closest?.('[data-player] .player-link');
    if (p && !e.metaKey && !e.ctrlKey) { e.preventDefault(); loadPlayer(p.closest('[data-player]')); return; }
    // "watch the latest" jumps to the feature and starts it
    const l = e.target.closest?.('[data-latest]');
    if (l) { const target = document.getElementById('latest'); const pl = target?.querySelector('[data-player]'); if (target && pl) { e.preventDefault(); target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); loadPlayer(pl); history.replaceState(null, '', '#latest'); } return; }
    // menu closes after a choice or an outside click
    const menu = document.querySelector('.nav-menu[open]'); if (menu && (!menu.contains(e.target) || e.target.closest('a'))) menu.removeAttribute('open');
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { const m = document.querySelector('.nav-menu[open]'); if (m) { m.removeAttribute('open'); m.querySelector('summary')?.focus(); } } });
}
export function loadPlayer(el) {
  if (!el || el.dataset.loaded) return; el.dataset.loaded = '1';
  const f = document.createElement('iframe');
  f.src = `${el.dataset.embed}?autoplay=1&rel=0`; f.title = el.dataset.title || 'Video'; f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen'; f.allowFullscreen = true; f.loading = 'eager'; f.referrerPolicy = 'strict-origin-when-cross-origin';
  el.querySelector('.player-link')?.replaceWith(f); f.focus?.();
}

// ---------- demo banner ----------
export function demoBanner(keys) {
  if (!keys.length || document.querySelector('.demo-banner')) return;
  const b = document.createElement('p'); b.className = 'demo-banner'; b.setAttribute('role', 'status');
  const names = DEMO_STEPS.filter((s) => keys.includes(s.key)).map((s) => s.verb.toLowerCase());
  b.innerHTML = `<strong>Publishing demo.</strong> <span>Placeholder entries applied: ${names.join(', ')}. Nothing is saved.</span> <a href="${location.pathname}">Reset</a>`;
  document.querySelector('.concept-flag')?.after(b);
}

/** Load everything a page needs. Pages call this once. */
export async function boot({ rerenderDemo = true } = {}) {
  wireShell();
  const base = baseOf(); const ctx = ctxFor(base); const keys = demoKeys();
  const src = await loadSources(base, ctx.sourcesFile);
  const graph = graphFrom(src, base, keys);
  let born = [];
  if (keys.length && rerenderDemo) { born = applyRegions(graph, ctx); demoBanner(keys); }
  return { base, ctx, src, graph, demo: keys, born };
}

// ---------- the universe stage: poster -> canvas, with its card and controls ----------
/**
 * stage: an element containing `.u-poster` (the prerendered SVG) and optionally `.plate` (Ken's photograph).
 * opts: { graph, ctx, mode: 'hero' | 'full', keepOut: () => elements whose boxes labels must avoid,
 *         leader: () => element tied to the newest light, controlsHost: element for the control bar, onList }.
 * Returns the universe api (see assets/universe/universe.js), or null when the still tier is forced or canvas is missing.
 */
export async function mountStage(stage, { graph, ctx, mode = 'hero', keepOut = () => [], leader = null, controlsHost = null, onList = null, budget, onReplay: onReplayExtra } = {}) {
  const { mountUniverse, capabilities } = await import('./universe/universe.js');
  const cap = capabilities(); stage.dataset.tier = cap.tier;
  if (cap.still || !document.createElement('canvas').getContext) return null;
  const full = mode === 'full';
  const card = document.createElement('aside'); card.className = 'u-card'; card.hidden = true; card.setAttribute('aria-label', 'Selected item');
  const caption = document.createElement('p'); caption.className = 'u-caption'; caption.setAttribute('role', 'status');
  const bar = document.createElement('div'); bar.className = 'u-controls'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Universe controls');

  let rects = null; let rectsAt = 0;
  const measure = () => {
    const now = performance.now(); if (rects && now - rectsAt < 400) return rects; rectsAt = now;
    const s = stage.getBoundingClientRect();
    rects = [...keepOut(), bar, caption.classList.contains('on') ? caption : null, card.hidden ? null : card].filter(Boolean).map((el) => el.getBoundingClientRect()).filter((r) => r.width && r.height)
      .map((r) => ({ x: r.left - s.left - 10, y: r.top - s.top - 8, w: r.width + 20, h: r.height + 16 })).filter((r) => r.x < s.width && r.y < s.height && r.x + r.w > 0 && r.y + r.h > 0);
    return rects;
  };
  const lead = leader ? () => { const el = leader(); if (!el || !el.offsetWidth || !el.dataset.id) return null; const s = stage.getBoundingClientRect(), r = el.getBoundingClientRect(); if (r.left > s.right || r.right < s.left) return null; return { id: el.dataset.id, x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height }; } : null;

  const monthName = (iso) => fmtDate(iso.slice(0, 7) + '-15', 'month');
  let api;
  const onReplay = (r) => {
    onReplayExtra?.(r);
    if (r.done) { caption.classList.remove('on'); replayBtn.setAttribute('aria-pressed', 'false'); replayBtn.querySelector('span').textContent = 'Replay growth'; range.value = 1; out.textContent = 'Today'; range.setAttribute('aria-valuetext', 'Today'); return; }
    out.textContent = monthName(r.iso); range.setAttribute('aria-valuetext', monthName(r.iso));
    caption.textContent = `${monthName(r.iso)} · ${r.count.toLocaleString('en-US')} piece${r.count === 1 ? '' : 's'} so far${r.digest ? ` · ${r.digest.toLocaleString('en-US')} automated Digest posts` : ''}`;
    caption.classList.add('on');
    if (api?.replaying) range.value = r.t;
  };
  api = mountUniverse(stage, { graph, ctx, mode, view: stage.dataset.view || mode, card, cap, keepOut: measure, leader: lead, hrefOf: (it) => itemHref(it, ctx), onReplay, onList, budget, onSelect: () => { rects = null; } });
  stage.append(caption); stage.parentElement.append(card); // the card sits beside the stage so the stage's edge mask never clips it

  const btn = (label, icon, cls = '') => { const b = document.createElement('button'); b.type = 'button'; b.className = `ubtn ${cls}`.trim(); b.innerHTML = `${icon || ''}<span>${label}</span>`; return b; };
  const replayBtn = btn('Replay growth', ICON.play); replayBtn.setAttribute('aria-pressed', 'false');
  const range = document.createElement('input'); range.type = 'range'; range.min = 0; range.max = 1; range.step = 'any'; range.value = 1; range.className = 'u-range';
  range.setAttribute('aria-label', 'Move through time, from the first work to today'); range.setAttribute('aria-valuetext', 'Today');
  const out = document.createElement('output'); out.textContent = 'Today';
  const pause = btn('Pause', ICON.pause);
  const setPause = () => { pause.innerHTML = api.paused ? `${ICON.play}<span>Play motion</span>` : `${ICON.pause}<span>Pause motion</span>`; pause.setAttribute('aria-pressed', String(api.paused)); };
  setPause();
  pause.onclick = () => { api.setPaused(!api.paused); setPause(); };
  replayBtn.onclick = () => {
    if (api.replaying) { api.replayEnd(); return; }
    if (cap.reduced) { api.replaySeek(0); range.value = 0; range.focus(); caption.textContent = 'Reduced motion: drag the slider or use the arrow keys to move through time.'; caption.classList.add('on'); return; }
    api.replayStart(); setPause(); replayBtn.setAttribute('aria-pressed', 'true'); replayBtn.querySelector('span').textContent = 'Stop replay';
  };
  const stepT = 1 / Math.max(12, Math.round(api.scene.tm.span / 30.4));
  range.addEventListener('input', () => { const t = +range.value; if (t >= 0.999) api.replayEnd(); else api.replaySeek(t); });
  range.addEventListener('keydown', (e) => { const d = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[e.key]; if (!d) return; e.preventDefault(); range.value = Math.max(0, Math.min(1, +range.value + d * stepT)); range.dispatchEvent(new Event('input')); });
  const time = document.createElement('div'); time.className = 'u-time'; time.append(replayBtn, range, out);
  bar.append(time, pause);
  if (full) {
    const zout = btn('Zoom out', '', 'ubtn--icon'); zout.innerHTML = '<span aria-hidden="true">−</span><span class="vh">Zoom out</span>'; zout.onclick = () => api.zoom(1.3);
    const zin = btn('Zoom in', '', 'ubtn--icon'); zin.innerHTML = '<span aria-hidden="true">+</span><span class="vh">Zoom in</span>'; zin.onclick = () => api.zoom(0.75);
    const reset = btn('Reset view', ''); reset.onclick = () => api.reset();
    const dg = btn('Show the Digest', ''); dg.setAttribute('aria-pressed', 'false'); dg.onclick = () => { const on = dg.getAttribute('aria-pressed') !== 'true'; api.showDigest(on); dg.setAttribute('aria-pressed', String(on)); };
    bar.append(zout, zin, reset, dg);
    if (onList) { const li = btn('List view', ICON.list); li.onclick = () => onList(); bar.append(li); }
  } else {
    const ex = document.createElement('a'); ex.className = 'ubtn'; ex.href = local('universe/', ctx); ex.innerHTML = `${ICON.expand}<span>Full screen</span>`; bar.append(ex);
  }
  (controlsHost || stage).append(bar);
  api.ui = { card, caption, bar, setPause };
  return api;
}
