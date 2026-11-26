// Writes one stress page per dataset from stress/_template.html, then run tools/prerender.mjs.
//   node round-3/stress/tools/make-pages.mjs && node round-3/tools/prerender.mjs stress
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DATASETS } from '../render.js';
const dir = join(dirname(fileURLToPath(import.meta.url)), '..');
const tpl = readFileSync(join(dir, '_template.html'), 'utf8');
for (const d of DATASETS) {
  const depth = d.dir ? 2 : 1; const base = '../'.repeat(depth); const here = d.dir ? '../' : '';
  const out = join(dir, d.dir, 'index.html'); mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, tpl.replaceAll('{{BASE}}', base).replaceAll('{{HERE}}', here).replaceAll('{{SOURCES}}', d.file).replaceAll('{{LABEL}}', d.label));
  console.log('wrote', out);
}
