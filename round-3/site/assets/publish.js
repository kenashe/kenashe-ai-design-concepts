// Publishing demonstration (prototype-only route /publish/). Enhances a page that is complete without it.
// Applying a step rebuilds the graph from the same sources plus that step's placeholder entry
// (applyDemo in lib/publish-demo.js), re-renders every region on the page with the site's own region
// functions (applyRegions), and prints what changed, computed by describeChanges(). Nothing is saved.
import { boot, graphFrom, applyRegions, demoKeys, DEMO_KEYS } from './boot.js';
import { describeChanges, DEMO_STEPS } from '../../lib/publish-demo.js';
import './search.js';   // the global search overlay

const { src, base, ctx } = await boot({ rerenderDemo: false });
const $ = (s, el = document) => el.querySelector(s); const $$ = (s, el = document) => [...el.querySelectorAll(s)];

// The step cards hold their own state (pressed buttons, change lists), so they are prerendered once and not re-rendered.
$('[data-region="publish-steps"]')?.removeAttribute('data-region');

const applied = new Set(demoKeys());
const order = () => DEMO_KEYS.filter((k) => applied.has(k));
const real = graphFrom(src, base, []);
const label = (k) => DEMO_STEPS.find((s) => s.key === k)?.label ?? k;
const fill = (ul, lines) => ul.replaceChildren(...lines.map((t) => { const li = document.createElement('li'); li.textContent = t; return li; }));

function render({ announce = true } = {}) {
  const keys = order(); const graph = graphFrom(src, base, keys);
  applyRegions(graph, ctx);
  for (const step of $$('.pub-step')) {
    const k = step.dataset.step; const on = applied.has(k);
    step.classList.toggle('is-on', on);
    const btn = $('[data-apply]', step); btn.setAttribute('aria-pressed', String(on)); $('span', btn).textContent = on ? 'Applied. Undo this step' : 'Apply this step';
    $('.pub-applied', step).hidden = !on;
    const box = $('[data-changes]', step); box.hidden = !on;
    // what this one step changed, given the other steps that are on
    if (on) fill($('ul', box), describeChanges(graphFrom(src, base, keys.filter((x) => x !== k)), graph));
  }
  const total = $('[data-pub-total]'); total.hidden = !keys.length;
  const q = keys.length ? `?demo=${keys.join(',')}` : '';
  if (keys.length) {
    const added = graph.items.filter((i) => i.demo).length; const themes = graph.themes.length - real.themes.length;
    $('[data-pub-total-h]').textContent = `${added} placeholder ${added === 1 ? 'entry' : 'entries'} added${themes > 0 ? `, ${themes} new theme${themes === 1 ? '' : 's'}` : ''}. Every count, position and list on this page was recomputed.`;
  }
  $('[data-pub-home]').href = `../${q}`; $('[data-pub-universe]').href = `../universe/${q}`;
  if (announce) $('[data-pub-state]').textContent = keys.length ? `Applied: ${keys.map(label).join(', ')}. Placeholders only; nothing is saved.` : 'Nothing applied. This is the real site as it is today.';
  history.replaceState(null, '', `${location.pathname}${q}${location.hash}`);
}

document.addEventListener('click', (e) => {
  const b = e.target.closest?.('[data-apply]');
  if (b) { const k = b.dataset.apply; applied.has(k) ? applied.delete(k) : applied.add(k); render(); return; }
  if (e.target.closest?.('[data-apply-all]')) { DEMO_KEYS.forEach((k) => applied.add(k)); render(); return; }
  if (e.target.closest?.('[data-reset]')) { applied.clear(); render(); }
});

if (applied.size) render({ announce: true });
