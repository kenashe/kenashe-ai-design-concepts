// Proof that the "updates automatically" claims hold, against the real production files.
//   node --test round-2/tools/graph.test.mjs
// Uses only node:test. Each test mutates a scratch copy of the inputs, never the production repo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, cpSync, mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGraph } from '../lib/graph.js';
import { applyDemo, describeChanges } from '../lib/publish-demo.js';

const R2 = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROD = process.env.KENASHE_REPO || '/agent/workspace/src-ref';
const src = JSON.parse(readFileSync(join(R2, 'data/sources.json'), 'utf8'));
const g = buildGraph(src);

test('builds match production buildingCards exactly (order and count)', () => {
  assert.equal(g.stats.builds, src.builds.length);
  assert.deepEqual(g.featuredBuilds.map((b) => b.title), src.builds.slice(0, 3).map((b) => b.title));
});

test('every documented relationship points at real items', () => {
  for (const e of g.edges) { assert.ok(g.byId.has(e.from), e.from); assert.ok(g.byId.has(e.to), e.to); }
  assert.ok(g.edges.length >= 25);
});

test('every item has a theme and a computed layout; nothing is positioned by hand', () => {
  for (const it of g.items) {
    assert.ok(g.themes.some((t) => t.id === it.theme), it.id);
    assert.ok(Number.isFinite(it.layout.angle) && it.layout.radius > 0 && it.layout.radius <= 1, it.id);
  }
});

test('Digest is labelled automated and its status is derived', () => {
  const d = g.byId.get('digest');
  assert.equal(d.automated, true);
  assert.equal(g.digest.status, g.digest.publishingPaused ? 'paused' : 'publishing');
  assert.equal(Object.values(g.digest.perDay).reduce((a, b) => a + b, 0), g.digest.published);
});

test('adding a project, an essay and a video updates counts, featured builds, timeline and relationships', () => {
  const g2 = buildGraph(applyDemo(src, ['build', 'essay', 'video']));
  assert.equal(g2.stats.builds, g.stats.builds + 1);
  assert.equal(g2.stats.essays, g.stats.essays + 1);
  assert.equal(g2.stats.videos, g.stats.videos + 1);
  assert.equal(g2.featuredBuilds[0].title, 'Example project');
  assert.equal(g2.stats.relationships, g.stats.relationships + 2);
  assert.ok(g2.timeline[0].items.some((i) => i.id === 'writing:example-essay'));
  assert.ok(describeChanges(g, g2).length >= 6);
});

test('re-enabling the Digest schedule flips every direction to "publishing" (scratch copy of production)', { skip: !existsSync(PROD) }, () => {
  const tmp = mkdtempSync(join(tmpdir(), 'kenashe-'));
  try {
    for (const p of ['src/data', 'src/pages/building', 'src/pages/writing', 'src/utils', '.github/workflows']) cpSync(join(PROD, p), join(tmp, p), { recursive: true });
    cpSync(join(PROD, 'src/content/blog'), join(tmp, 'src/content/blog'), { recursive: true, filter: (f) => !f.includes('/assets/') });
    const wf = join(tmp, '.github/workflows/pipeline.yml');
    writeFileSync(wf, readFileSync(wf, 'utf8').replace('  # schedule:\n  #   - cron:', '  schedule:\n    - cron:'));
    const out = join(tmp, 'out'); cpSync(join(R2, 'tools'), join(out, 'tools'), { recursive: true }); cpSync(join(R2, 'source'), join(out, 'source'), { recursive: true });
    execFileSync('node', ['--import', join(out, 'tools/ts-resolve.mjs'), join(out, 'tools/derive.mjs'), tmp], { stdio: 'pipe' });
    const s2 = JSON.parse(readFileSync(join(out, 'data/sources.json'), 'utf8'));
    assert.equal(s2.digest.status, 'publishing');
    assert.match(buildGraph(s2).byId.get('digest').dek, /about ten posts a day/);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});
