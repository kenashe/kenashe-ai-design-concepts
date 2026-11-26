// /universe/ entry (also used by the stress test): mount the full-screen universe and connect it to the list view.
import { boot, mountStage } from './boot.js';
import { yearItems, prep } from '../render.js';

export async function startUniversePage({ budget } = {}) {
  const state = await boot();
  const { graph, ctx, born } = state;
  const stage = document.getElementById('stage'); const list = document.getElementById('list');
  const toList = () => { list?.scrollIntoView({ block: 'start' }); list?.focus({ preventScroll: true }); };
  const api = stage ? await mountStage(stage, { graph, ctx, mode: 'full', budget, onList: toList, keepOut: () => [document.querySelector('.u-intro')] }) : null;
  if (api && born.length) api.setGraph(graph, { born });

  // list view: years fill in when opened (keeps the DOM small at any scale); "Show in universe" selects the light
  const fill = (d) => { const ul = d.querySelector('ul[data-lazy]'); if (ul) { ul.innerHTML = yearItems(prep(graph), ctx, d.dataset.year); ul.removeAttribute('data-lazy'); } };
  document.addEventListener('toggle', (e) => { if (e.target.matches?.('.ul-year[open]')) fill(e.target); }, true);
  document.addEventListener('click', (e) => {
    const b = e.target.closest?.('[data-show]'); if (!b || !api) return;
    stage.scrollIntoView({ block: 'start' }); api.select(b.dataset.show); api.focus();
  });
  // deep link: /universe/#i=building:zerohuman
  const fromHash = () => { const m = decodeURIComponent(location.hash).match(/^#i=(.+)$/); if (m && api && graph.byId.has(m[1])) api.select(m[1]); };
  addEventListener('hashchange', fromHash); fromHash();
  return { ...state, api, stage };
}

if (document.documentElement.dataset.root !== 'stress') startUniversePage();
