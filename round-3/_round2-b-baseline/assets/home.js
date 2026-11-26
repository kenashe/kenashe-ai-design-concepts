// Homepage entry: mounts the hero universe. Everything else on the page is already prerendered.
import { baseOf, ctxFor, loadSources, graphFrom, demoKeys, wirePlayers, mountStage, applyRegions } from './boot.js';

const base = baseOf(); const ctx = ctxFor(base);
wirePlayers();
const stage = document.getElementById('universe');
const keys = demoKeys();

// Labels never sit under the headline, the "newest" list or the controls.
let rects = null;
const keepOut = () => {
  if (rects) return rects;
  const s = stage.getBoundingClientRect();
  rects = [...document.querySelectorAll('.hero-copy > *, .hero-now, .u-read, .u-controls, .u-caption.on')].map((el) => el.getBoundingClientRect())
    .filter((r) => r.width && r.height).map((r) => ({ x: r.left - s.left - 6, y: r.top - s.top - 6, w: r.width + 12, h: r.height + 12 }));
  return rects;
};
addEventListener('resize', () => (rects = null));

try {
  const src = await loadSources(base);
  const graph = graphFrom(src, base);
  const api = mountStage(stage, { graph, ctx, keepOut });
  setTimeout(() => (rects = null), 400);
  if (keys.length && api) {
    const demo = graphFrom(src, base, keys);
    const born = applyRegions(demo, ctx);
    const note = document.createElement('p'); note.className = 'demo-note'; note.setAttribute('role', 'status');
    note.innerHTML = `Showing the homepage with example entries applied (${keys.join(', ')}). They are placeholders, marked in amber. <a href="./">Remove them</a> · <a href="publish/">See the publishing demo</a>`;
    document.querySelector('main').prepend(note);
    setTimeout(() => { api.setGraph(demo, { born }); const first = born.find((id) => id.startsWith('building:')) || born[0]; if (first) api.select(first, { quiet: innerWidth < 860 }); }, 900);
  }
} catch (e) {
  // The prerendered poster and lists stay in place; nothing else is needed.
  console.info('Universe stayed as the static poster:', e.message);
}
