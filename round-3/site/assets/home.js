// Homepage entry: enhance the prerendered page. Everything here is optional; the page is complete without it.
import { boot, mountStage } from './boot.js';

const { graph, ctx, born } = await boot();
const stage = document.getElementById('stage');
if (stage) {
  const q = (s) => document.querySelector(s);
  const wide = () => matchMedia('(min-width: 900px)').matches;
  const api = await mountStage(stage, {
    graph, ctx, mode: 'hero',
    // labels keep clear of the copy and the newest-video card when they share the frame (desktop)
    keepOut: () => (wide() ? [q('.hero-copy'), q('.hero-latest'), q('.plate figcaption')] : [q('.plate figcaption')]),
    leader: () => (wide() ? q('.hero-latest') : null),
  });
  if (api && born.length) api.setGraph(graph, { born });
}
