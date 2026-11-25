// Publishing demo: applies DEMO_STEPS to a copy of sources.json, rebuilds the graph and redraws
// this direction's real region functions (the same ones the prerender used). Nothing is saved.
import './site.js';
import { getGraph, pageCtx, BASE } from './data.js';
import { mountEdit } from './edit.js';
import { regions } from '../render.js';
import { buildGraph } from '../../../lib/graph.js';
import { applyDemo, patchDemoImages, describeChanges, DEMO_STEPS } from '../../../lib/publish-demo.js';
import { rerender } from '../../../lib/regions.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

(async () => {
  const { src, graph: base } = await getGraph();
  const ctx = pageCtx();
  const edit = mountEdit({ graph: base, ctx, syncHash: false });
  window.__edit = edit;
  let keys = [];
  const stepsHost = $('[data-region="demo-steps"]');

  function run() {
    const g = buildGraph(applyDemo(src, keys), { base: BASE });
    patchDemoImages(g, BASE);
    const ids = g.items.filter((i) => i.demo).map((i) => i.id);
    // Redraw every region except the step cards themselves.
    const { 'demo-steps': _skip, ...live } = regions;
    rerender(live, g, ctx, { highlight: ids });
    edit.rebuild(g);
    const list = keys.length ? describeChanges(base, g) : ['Nothing yet. Apply a step to see what updates on its own.'];
    $('[data-changes]').innerHTML = list.map((t) => `<li>${t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</li>`).join('');
    $$('[data-apply]', stepsHost).forEach((b) => { const on = keys.includes(b.dataset.apply); b.setAttribute('aria-pressed', String(on)); $('.lbl', b).textContent = on ? 'Applied · undo' : 'Apply'; b.closest('.step').classList.toggle('is-done', on); });
    const link = $('[data-demo-link]'); if (link) link.href = `../?demo=${(keys.length ? keys : DEMO_STEPS.map((s) => s.key)).join(',')}`;
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-apply]');
    if (b) { const k = b.dataset.apply; keys = keys.includes(k) ? keys.filter((x) => x !== k) : [...keys, k]; run(); return; }
    if (e.target.closest('[data-apply-all]')) { keys = DEMO_STEPS.map((s) => s.key); run(); return; }
    if (e.target.closest('[data-reset-demo]')) { keys = []; run(); }
  });
})();
