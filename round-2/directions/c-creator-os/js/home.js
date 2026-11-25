// Homepage: mounts the edit suite. With ?demo=build,essay,video the page re-renders with the
// publishing demo's example entries applied, using the same region functions as the prerender.
import './site.js';
import { getGraph, pageCtx } from './data.js';
import { mountEdit } from './edit.js';
import { regions } from '../render.js';
import { rerender } from '../../../lib/regions.js';

(async () => {
  let data;
  try { data = await getGraph(); } catch (err) { console.warn('Graph unavailable; the prerendered page stays as is.', err); return; }
  const { graph, keys } = data;
  const ctx = pageCtx();
  if (keys.length) {
    const ids = graph.items.filter((i) => i.demo).map((i) => i.id);
    rerender(regions, graph, ctx, { highlight: ids });
    const b = document.createElement('div');
    b.className = 'demo-banner'; b.setAttribute('role', 'status');
    b.innerHTML = `<div class="wrap">Publishing demo view: ${keys.length} example ${keys.length === 1 ? 'entry' : 'entries'} (${keys.join(', ')}) applied in your browser. They are placeholders, marked with dashed outlines. <a href="./">Back to the real homepage</a> · <a href="publish/">See how they were added</a></div>`;
    document.querySelector('.top').after(b);
  }
  const edit = mountEdit({ graph, ctx });
  window.__edit = edit;
  const m = location.hash.match(/^#cue=(.+)$/);
  if (m && graph.byId.has(decodeURIComponent(m[1]))) edit.cue(decodeURIComponent(m[1]), { hash: false });
})();
