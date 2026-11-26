// Round 3 · The Living Universe · region registry.
// Pure ES module: runs in Node (tools/prerender.mjs) and in the browser (?demo=, publishing demo).
//
// How pages are built: every page's HTML holds `<div data-region="name"><!--@name--><!--/@name--></div>`
// placeholders; prerender fills them with regions[name](graph, ctx). Components live in ./components.js
// (documented in STYLEGUIDE.md) and are re-exported here.
//
// To add a page: create site/regions/<page>.js exporting an object of region functions built from the
// components, import it below and spread it into `regions`. Add its production path to BUILT in components.js
// if it is not there yet.
import { prep } from './components.js';
import { shell } from './regions/shell.js';
import { home } from './regions/home.js';
import { universe } from './regions/universe.js';
import { discovery } from './regions/discovery.js';
import { pages } from './regions/pages.js';

export * from './components.js';
export { posterSVG, sceneOf, VIEWS } from './assets/universe/poster.js';
export { itemCard, clusterCard, digestCard } from './assets/universe/cards.js';
export { yearItems } from './regions/universe.js';

/** Every region runs with a prepared graph (theme colours stamped on items and themes). */
const withPrep = (obj) => Object.fromEntries(Object.entries(obj).map(([k, fn]) => [k, (graph, ctx) => fn(prep(graph), ctx)]));

export const regions = withPrep({
  ...shell,
  ...home,
  ...universe,
  ...discovery,
  ...pages,
});
