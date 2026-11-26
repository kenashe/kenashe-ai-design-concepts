// Direction B · shared page boot: loads the graph, mounts the universe with its controls,
// supports ?demo=build,essay,video, and wires click-to-load YouTube players.
import { buildGraph, hrefFor, fmtDate } from '../../../lib/graph.js';
import { applyDemo, patchDemoImages } from '../../../lib/publish-demo.js';
import { rerender, pageContext } from '../../../lib/regions.js';
import { regions, BUILT } from '../render.js';
import { mountUniverse, capabilities } from './universe.js';
import { lazyImages } from './lazy.js';

export const DIR = 'b-living-universe';

/** Relative path from this page to round-2/, read from the concept flag link (always `<base>`). */
export function baseOf() { return document.querySelector('.concept-flag a')?.getAttribute('href') ?? '../../'; }

export async function loadSources(base) { const r = await fetch(`${base}data/sources.json`); if (!r.ok) throw new Error('sources'); return r.json(); }

export function graphFrom(src, base, keys = []) {
  const s = keys.length ? applyDemo(src, keys) : src;
  const g = buildGraph(s, { base });
  if (keys.length) patchDemoImages(g, base);
  return g;
}

export function demoKeys() {
  const q = new URLSearchParams(location.search).get('demo');
  return q ? q.split(',').map((x) => x.trim()).filter((k) => ['build', 'essay', 'video'].includes(k)) : [];
}

export { wirePlayers } from './players.js';

const ICON = {
  pause: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 2h2v8H3zM7 2h2v8H7z" fill="currentColor"/></svg>',
  play: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5v9l7-4.5z" fill="currentColor"/></svg>',
};

/** Mount the universe in `stage` with a card, caption and controls. Returns the universe api. */
export function mountStage(stage, { graph, ctx, controls = true, full = false, keepOut, camera, onSelect, maxLabels } = {}) {
  const cap = capabilities();
  if (!('getContext' in document.createElement('canvas'))) return null;
  const card = document.createElement('div'); card.className = 'u-card'; card.hidden = true; card.setAttribute('role', 'region'); card.setAttribute('aria-label', 'Selected item'); card.setAttribute('aria-live', 'polite');
  const caption = document.createElement('p'); caption.className = 'u-caption'; caption.setAttribute('aria-live', 'polite');
  const hrefOf = (it) => hrefFor(it.href, ctx, BUILT);
  let api;
  const bar = document.createElement('div'); bar.className = 'u-controls';
  const scrub = document.createElement('label'); scrub.className = 'scrub';
  const onReplay = (r) => {
    if (r.done) { caption.textContent = `${graph.digest.statusLine} Last automated post ${fmtDate(graph.digest.last)}.`; caption.classList.add('on'); setTimeout(() => caption.classList.remove('on'), 5000); replayBtn.setAttribute('aria-pressed', 'false'); replayBtn.lastChild.textContent = 'Replay growth'; range.value = range.max; out.textContent = 'Today'; return; }
    const m = r.month; if (!m) return;
    out.textContent = fmtDate(`${m.month}-15`, 'month');
    caption.textContent = `${fmtDate(`${m.month}-15`, 'month')} · ${m.items} new piece${m.items === 1 ? '' : 's'}${m.digestPosts ? ` · ${m.digestPosts.toLocaleString('en-US')} automated posts` : ''}`;
    caption.classList.add('on');
    if (api?.replaying) range.value = Math.min(r.p, +range.max);
  };
  // Labels also keep clear of the controls and caption that sit over the universe.
  const keep = () => { const s = stage.getBoundingClientRect(); const extra = [bar, caption.classList.contains('on') ? caption : null].filter(Boolean).map((el) => el.getBoundingClientRect()).filter((r) => r.width)
    .map((r) => ({ x: r.left - s.left - 6, y: r.top - s.top - 6, w: r.width + 12, h: r.height + 12 })); return [...(keepOut?.() || []), ...extra]; };
  api = mountUniverse(stage, { graph, ctx, hrefOf, card, caption, cap, onReplay, wheelZoom: full, keepOut: keep, camera, onSelect, maxLabels });
  stage.append(card, caption);
  if (!controls) return api;

  const pause = document.createElement('button'); pause.type = 'button'; pause.className = 'ubtn';
  const setPauseUI = () => { pause.innerHTML = api.paused ? `${ICON.play}<span>Play motion</span>` : `${ICON.pause}<span>Pause motion</span>`; pause.setAttribute('aria-pressed', String(api.paused)); };
  pause.onclick = () => { api.setPaused(!api.paused); setPauseUI(); };
  if (cap.saveData && !cap.reduced) pause.title = 'Motion starts paused when Data Saver is on';
  setPauseUI();

  const range = document.createElement('input'); range.type = 'range'; range.min = 0; range.max = String(api.months.length - 0.4); range.step = 'any'; range.value = range.max;
  range.setAttribute('aria-label', 'Scrub through time, month by month');
  const out = document.createElement('output'); out.textContent = 'Today';
  const replayBtn = document.createElement('button'); replayBtn.type = 'button'; replayBtn.className = 'ubtn';
  replayBtn.innerHTML = `${ICON.play}<span>Replay growth</span>`; replayBtn.setAttribute('aria-pressed', 'false');
  replayBtn.onclick = () => {
    if (api.replaying) { api.replayStop(); replayBtn.setAttribute('aria-pressed', 'false'); replayBtn.lastChild.textContent = 'Replay growth'; return; }
    if (cap.reduced) { api.replaySeek(0); range.value = 0; range.focus(); caption.textContent = 'Reduced motion: use the slider or arrow keys to step through the months.'; caption.classList.add('on'); return; }
    api.replayStart(); if (api.paused) { api.setPaused(false); setPauseUI(); }
    replayBtn.setAttribute('aria-pressed', 'true'); replayBtn.lastChild.textContent = 'Stop replay';
  };
  range.addEventListener('input', () => {
    const p = +range.value; if (p >= +range.max - 0.01) { api.replayEnd(); return; }
    api.replaySeek(p);
  });
  range.addEventListener('keydown', (e) => { if (['ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); const v = Math.round(+range.value) + (e.key === 'ArrowRight' ? 1 : -1); range.value = Math.max(0, Math.min(+range.max, v)); range.dispatchEvent(new Event('input')); } });
  scrub.append(replayBtn, range, out);

  const zin = document.createElement('button'); zin.type = 'button'; zin.className = 'ubtn icon'; zin.textContent = '+'; zin.setAttribute('aria-label', 'Zoom in'); zin.onclick = () => api.zoom(0.8);
  const zout = document.createElement('button'); zout.type = 'button'; zout.className = 'ubtn icon'; zout.textContent = '−'; zout.setAttribute('aria-label', 'Zoom out'); zout.onclick = () => api.zoom(1.25);
  const reset = document.createElement('button'); reset.type = 'button'; reset.className = 'ubtn'; reset.textContent = 'Reset'; reset.onclick = () => api.reset();
  bar.append(scrub, pause);
  if (full) bar.append(zout, zin, reset);
  if (!full) { const ex = document.createElement('a'); ex.className = 'ubtn'; ex.href = `${ctx.base}directions/${DIR}/universe/`; ex.textContent = 'Full screen'; bar.append(ex); }
  stage.parentElement.append(bar);
  return api;
}

export function ctxFor(base) { return { ...pageContext(base, DIR), base }; }

/** Rerender all regions with a graph and mark the new demo items. */
export function applyRegions(graph, ctx) {
  const ids = graph.items.filter((i) => i.demo).map((i) => i.id);
  rerender(regions, graph, ctx, { highlight: ids });
  lazyImages();
  return ids;
}
