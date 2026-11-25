// Prerender Round 2 pages: the prototype stand-in for an Astro static build.
//
//   node round-2/tools/prerender.mjs            # all directions
//   node round-2/tools/prerender.mjs c-creator-os
//
// Each direction has a `render.js` exporting `regions = { name: (graph, ctx) => htmlString }`.
// Any element in its HTML marked like this:
//
//   <div data-region="latest-builds"><!--@latest-builds-->…<!--/@latest-builds--></div>
//
// gets its contents replaced with regions['latest-builds'](graph, ctx). The same functions run in
// the browser for the publishing demo, so the server output and the live demo can never diverge.
//
// ctx = { base, page, item, dir }
//   base : relative path from the page to round-2/ (e.g. '../../' or '../../../../'); asset URLs in
//          the graph are already prefixed with it.
//   page : the page path inside the direction, e.g. 'index.html' or 'building/zerohuman/index.html'
//   item : the graph id from <meta name="r2:item" content="building:zerohuman">, or null
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildGraph } from '../lib/graph.js';

const R2 = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = JSON.parse(readFileSync(join(R2, 'data/sources.json'), 'utf8'));
const only = process.argv[2];

const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f); if (f.startsWith('_') || f === 'node_modules') return [];
  return statSync(p).isDirectory() ? walk(p) : f.endsWith('.html') ? [p] : [];
});

let total = 0;
for (const dir of readdirSync(join(R2, 'directions'))) {
  if (only && dir !== only) continue;
  const root = join(R2, 'directions', dir);
  const renderPath = join(root, 'render.js');
  if (!existsSync(renderPath)) continue;
  const { regions } = await import(pathToFileURL(renderPath).href + `?t=${Date.now()}`);
  for (const file of walk(root)) {
    let html = readFileSync(file, 'utf8');
    const depth = relative(R2, dirname(file)).split(sep).length;
    const base = '../'.repeat(depth);
    const graph = buildGraph(src, { base });
    const item = html.match(/<meta name="r2:item" content="([^"]+)"/)?.[1] ?? null;
    const ctx = { base, page: relative(root, file).split(sep).join('/'), item, dir };
    let n = 0;
    html = html.replace(/<!--@([\w-]+)-->[\s\S]*?<!--\/@\1-->/g, (m, name) => {
      const fn = regions[name];
      if (!fn) { console.warn(`  ! ${dir}/${ctx.page}: no region "${name}" in render.js`); return m; }
      n++; return `<!--@${name}-->${fn(graph, ctx)}<!--/@${name}-->`;
    });
    writeFileSync(file, html);
    total += n;
    console.log(`${dir}/${ctx.page}: ${n} regions`);
  }
}
console.log(`prerendered ${total} regions from data/sources.json`);
