// Publishing demo (prototype-only page). Applies the shared DEMO_STEPS to a copy of sources.json,
// rebuilds the graph in the browser and re-renders this design's own region functions.
import { DEMO_STEPS, applyDemo, patchDemoImages, describeChanges, buildGraph } from '../../lib/publish-demo.js';
import { rerender, pageContext } from '../../lib/regions.js';
import { esc } from '../../lib/graph.js';
import { regions } from './render.js';
import { boot } from './site.js';

const BASE = '../../../';
const DIR = 'a-modern-technologist';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const src = await (await fetch(`${BASE}data/sources.json`)).json();
const base = buildGraph(src, { base: BASE });
const on = new Set();
const ctl = $('[data-pub-ctl]'); ctl.hidden = false;
document.documentElement.classList.add('pub-ready');

const REGION_OF = { build: 'builds', essay: 'writing', video: 'videos' };
function reveal(key) {
  const pane = $('.pv');
  const el = $(`[data-region="${REGION_OF[key]}"] [data-new]`);
  if (!pane || !el || pane.scrollHeight <= pane.clientHeight + 4) return;
  const top = el.getBoundingClientRect().top - pane.getBoundingClientRect().top + pane.scrollTop - 80;
  pane.scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

function run(last) {
  const keys = DEMO_STEPS.map((s) => s.key).filter((k) => on.has(k));
  const graph = keys.length ? patchDemoImages(buildGraph(applyDemo(src, keys), { base: BASE }), BASE) : buildGraph(src, { base: BASE });
  const ids = graph.items.filter((i) => !base.byId.has(i.id)).map((i) => i.id);
  // Keep the step cards (their region is static) and re-render everything else.
  const steps = $('[data-region="demo-steps"]'); steps.removeAttribute('data-region');
  const changed = rerender(regions, graph, pageContext(BASE, DIR), { highlight: ids });
  steps.setAttribute('data-region', 'demo-steps');
  boot();
  // Computed change list
  const list = $('[data-changes]');
  const lines = keys.length ? describeChanges(base, graph) : [];
  list.innerHTML = lines.length ? lines.map((l) => `<li>${esc(l)}</li>`).join('') : '<li class="chg-0">Nothing yet. Apply a step.</li>';
  if (keys.length) list.insertAdjacentHTML('beforeend', `<li class="chg-r">${changed.length} page regions re-rendered by the same functions that prerendered them</li>`);
  // UI state
  $$('[data-apply]').forEach((b) => { const k = b.dataset.apply; b.setAttribute('aria-pressed', String(on.has(k))); b.textContent = on.has(k) ? 'Applied ✓' : 'Apply'; b.closest('.ds-s').classList.toggle('is-on', on.has(k)); });
  $('[data-pv-state]').textContent = keys.length ? `${ids.length} placeholder ${ids.length === 1 ? 'entry' : 'entries'} applied` : 'Current data';
  $('[data-pv-state]').classList.toggle('is-on', keys.length > 0);
  if (last && on.has(last)) reveal(last);
  $('[data-home-link]').href = `../?demo=${(keys.length ? keys : DEMO_STEPS.map((s) => s.key)).join(',')}`;
}

$$('[data-apply]').forEach((b) => {
  b.hidden = false;
  b.addEventListener('click', () => { const k = b.dataset.apply; on.has(k) ? on.delete(k) : on.add(k); run(k); });
});
$('[data-apply-all]').addEventListener('click', () => { DEMO_STEPS.forEach((s) => on.add(s.key)); run(); });
$('[data-reset]').addEventListener('click', () => { on.clear(); run(); });
