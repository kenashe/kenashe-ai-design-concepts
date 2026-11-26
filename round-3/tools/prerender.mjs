// Prerender Round 3 pages: the prototype stand-in for an Astro static build.
//
//   node round-3/tools/prerender.mjs            # site + stress
//   node round-3/tools/prerender.mjs site
//
// The prototype (round-3/site) has a `render.js` exporting `regions = { name: (graph, ctx) => htmlString }`.
// Any element in its HTML marked like this:
//
//   <div data-region="latest-builds"><!--@latest-builds-->…<!--/@latest-builds--></div>
//
// gets its contents replaced with regions['latest-builds'](graph, ctx). The same functions run in
// the browser for the publishing demo, so the server output and the live demo can never diverge.
//
// ctx = { base, root, page, item, sourcesFile }
//   base : relative path from the page to round-3/ (e.g. '../' from site/index.html); asset URLs in
//          the graph are already prefixed with it.
//   root : 'site' or 'stress'
//   page : the page path inside the root, e.g. 'index.html' or 'building/zerohuman/index.html'
//   item : the graph id from <meta name="r3:item" content="building:zerohuman">, or null
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildGraph, searchIndex } from '../lib/graph.js';

const R3 = join(dirname(fileURLToPath(import.meta.url)), '..');
const only = process.argv[2];
const sourcesCache = {};
const load = (rel) => (sourcesCache[rel] ??= JSON.parse(readFileSync(join(R3, rel), 'utf8')));

const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f); if (f.startsWith('_') || f === 'node_modules' || f === 'data') return [];
  return statSync(p).isDirectory() ? walk(p) : f.endsWith('.html') ? [p] : [];
});

// Roots: every folder in round-3/ that has a render.js ("site" is the prototype; "stress" re-exports
// the site's regions and points its pages at synthetic data with <meta name="r3:sources">).
let total = 0;
for (const root of readdirSync(R3)) {
  if (root.startsWith('_') || (only && root !== only)) continue;
  const dir = join(R3, root); const renderPath = join(dir, 'render.js');
  if (!statSync(dir).isDirectory() || !existsSync(renderPath)) continue;
  const { regions } = await import(pathToFileURL(renderPath).href + `?t=${Date.now()}`);
  for (const file of walk(dir)) {
    let html = readFileSync(file, 'utf8');
    const depth = relative(R3, dirname(file)).split(sep).length;
    const base = '../'.repeat(depth);
    const sourcesFile = html.match(/<meta name="r3:sources" content="([^"]+)"/)?.[1] ?? 'data/sources.json';
    const graph = buildGraph(load(sourcesFile), { base });
    const item = html.match(/<meta name="r3:item" content="([^"]+)"/)?.[1] ?? null;
    const ctx = { base, root, page: relative(dir, file).split(sep).join('/'), item, sourcesFile };
    let n = 0; const t0 = performance.now();
    html = html.replace(/<!--@([\w-]+)-->[\s\S]*?<!--\/@\1-->/g, (m, name) => {
      const fn = regions[name];
      if (!fn) { console.warn(`  ! ${root}/${ctx.page}: no region "${name}" in render.js`); return m; }
      n++; return `<!--@${name}-->${fn(graph, ctx)}<!--/@${name}-->`;
    });
    writeFileSync(file, html);
    total += n;
    console.log(`${root}/${ctx.page}: ${n} regions, ${(html.length / 1024).toFixed(0)} KB, ${(performance.now() - t0).toFixed(0)} ms`);
  }
}
// Search index for the real site (lazy-loaded by the search box and the index pages).
const g = buildGraph(load('data/sources.json'), { base: '' });
writeFileSync(join(R3, 'data/search.json'), JSON.stringify(searchIndex(g)));
console.log(`prerendered ${total} regions; data/search.json: ${g.stats.personal} items`);
