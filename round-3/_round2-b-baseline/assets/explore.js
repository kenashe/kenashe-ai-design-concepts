// /universe/ (proposed route): the full-screen explore view.
import { baseOf, ctxFor, loadSources, graphFrom, demoKeys, mountStage, applyRegions } from './boot.js';

const base = baseOf(); const ctx = ctxFor(base);
const stage = document.getElementById('universe');
const copy = document.querySelector('.u-full-copy');
const keepOut = () => { const s = stage.getBoundingClientRect(); const r = copy.getBoundingClientRect(); return [{ x: r.left - s.left - 8, y: r.top - s.top - 8, w: r.width + 16, h: r.height + 16 }]; };
try {
  const src = await loadSources(base);
  const keys = demoKeys();
  const graph = graphFrom(src, base);
  const api = mountStage(stage, { graph, ctx, full: true, keepOut, maxLabels: 34 });
  if (keys.length && api) { const demo = graphFrom(src, base, keys); const born = applyRegions(demo, ctx); setTimeout(() => api.setGraph(demo, { born }), 700); }
  // deep link: /universe/#building:zerohuman flies to that body
  const id = decodeURIComponent(location.hash.slice(1)); if (id && api) setTimeout(() => api.select(id), 600);
} catch (e) { console.info('Universe stayed as the static poster:', e.message); }
