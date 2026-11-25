// Loads data/sources.json once, applies ?demo= example entries if asked, and builds the graph.
import { buildGraph } from '../../../lib/graph.js';
import { applyDemo, patchDemoImages, DEMO_STEPS } from '../../../lib/publish-demo.js';
import { DIR } from '../render.js';

export const BASE = document.documentElement.dataset.base || '../../';
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function demoKeys() {
  const q = new URLSearchParams(location.search).get('demo');
  if (!q) return [];
  const valid = DEMO_STEPS.map((s) => s.key);
  return q.split(',').map((s) => s.trim()).filter((k) => valid.includes(k));
}

let pending = null;
/** { src, graph, keys } — the graph with any ?demo= entries applied. */
export function getGraph() {
  if (!pending) pending = (async () => {
    const r = await fetch(`${BASE}data/sources.json`);
    if (!r.ok) throw new Error(`sources.json ${r.status}`);
    const src = await r.json();
    const keys = demoKeys();
    const graph = buildGraph(keys.length ? applyDemo(src, keys) : src, { base: BASE });
    if (keys.length) patchDemoImages(graph, BASE);
    return { src, graph, keys };
  })();
  return pending;
}

export function pageCtx(extra = {}) {
  const item = document.querySelector('meta[name="r2:item"]')?.content ?? null;
  return { base: BASE, page: location.pathname, item, dir: DIR, browser: true, ...extra };
}
