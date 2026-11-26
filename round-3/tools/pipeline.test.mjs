// Round 3 architecture tests: each one proves a claim Ken asked to see demonstrated.
//   node --test round-3/tools/pipeline.test.mjs
// Uses only node:test and a local HTTP server that plays the part of YouTube. Works in scratch
// folders; never touches the production repo or the real archive.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, cpSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGraph, searchIndex, search } from '../lib/graph.js';
import { applyDemo } from '../lib/publish-demo.js';

const run = promisify(execFile);
const R = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROD = process.env.KENASHE_REPO || '/agent/workspace/src-ref';
const real = JSON.parse(readFileSync(join(R, 'data/sources.json'), 'utf8'));

// ---- a fake YouTube: /feed serves whatever `state.feed` says; /vi/<id>/<size>.jpg serves thumbnails
const state = { feed: '', feedStatus: 200, thumbs: 'ok', hits: [] };
const JPG = Buffer.alloc(6000, 7); // "big enough" image body
const server = http.createServer((req, res) => {
  state.hits.push(req.url);
  if (req.url.startsWith('/feed')) { res.writeHead(state.feedStatus, { 'content-type': 'application/xml' }); return res.end(state.feed); }
  const m = req.url.match(/^\/vi\/([\w-]{11})\/(\w+)\.jpg/);
  if (m) {
    if (state.thumbs === 'down') { res.writeHead(503); return res.end(); }
    if (state.thumbs === 'hq-only' && m[2] !== 'hqdefault') { res.writeHead(404); return res.end(); }
    if (state.thumbs === 'grey' && m[2] === 'maxresdefault') { res.writeHead(200); return res.end(Buffer.alloc(900)); } // YouTube's tiny placeholder
    res.writeHead(200, { 'content-type': 'image/jpeg' }); return res.end(JPG);
  }
  res.writeHead(404); res.end();
});
let PORT;
before(async () => { await new Promise((r) => server.listen(0, '127.0.0.1', r)); PORT = server.address().port; });
after(() => server.close());

const vid = (n) => `VID${String(n).padStart(8, '0')}`;
const entry = (n, { short = false, desc = '' } = {}) => `<entry><id>yt:video:${vid(n)}</id><yt:videoId>${vid(n)}</yt:videoId><title>Test upload ${n}</title>
<link rel="alternate" href="https://www.youtube.com/${short ? 'shorts/' : 'watch?v='}${vid(n)}"/><published>2027-01-${String(n).padStart(2, '0')}T12:00:00+00:00</published>
<media:group><media:description>A description long enough to count as a summary line. ${desc}</media:description></media:group></entry>`;
const feedOf = (ns, opts = {}) => `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">${ns.map((n) => entry(n, opts[n])).join('')}</feed>`;

function scratch() {
  const dir = mkdtempSync(join(tmpdir(), 'r3-'));
  mkdirSync(join(dir, 'assets/video'), { recursive: true });
  return { dir, archive: join(dir, 'archive.json'), thumbs: join(dir, 'assets/video') };
}
async function sync(s, extra = []) {
  const { stdout } = await run('node', [join(R, 'tools/sync-videos.mjs'), '--feed', `http://127.0.0.1:${PORT}/feed`, '--thumb-host', `http://127.0.0.1:${PORT}`,
    '--archive', s.archive, '--thumbs', s.thumbs, '--timeout', '1500', ...extra]);
  return JSON.parse(stdout.trim().split('\n').pop().replace('[videos] ', ''));
}
const archiveOf = (s) => JSON.parse(readFileSync(s.archive, 'utf8'));

test('1 · a new YouTube upload is picked up, archived with its thumbnail, and flags a rebuild', async () => {
  const s = scratch(); Object.assign(state, { feedStatus: 200, thumbs: 'ok' });
  state.feed = feedOf([1, 2, 3]); let r = await sync(s);
  assert.equal(r.changed, true); assert.equal(r.total, 3);
  r = await sync(s); assert.equal(r.changed, false, 'a second run with nothing new changes nothing (no commit, no rebuild)');
  state.feed = feedOf([1, 2, 3, 4], { 4: { desc: 'More at https://kenashe.ai/building/zerohuman/' } }); r = await sync(s);
  assert.deepEqual(r.added, [vid(4)]); assert.equal(r.changed, true);
  const v = archiveOf(s).find((x) => x.videoId === vid(4));
  assert.equal(v.thumbnail, `video/${vid(4)}.jpg`); assert.ok(existsSync(join(s.thumbs, `${vid(4)}.jpg`)), 'thumbnail file was downloaded');
  assert.deepEqual(v.mentions, ['/building/zerohuman'], 'the link in the description is stored, so the relationship survives');
  rmSync(s.dir, { recursive: true, force: true });
});

test('2 · the archive keeps every video after it leaves the feed’s 15-item window', async () => {
  const s = scratch(); Object.assign(state, { feedStatus: 200, thumbs: 'ok' });
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  state.feed = feedOf(range(1, 15)); await sync(s);
  state.feed = feedOf(range(6, 20)); await sync(s);         // 1–5 have fallen off the feed
  state.feed = feedOf(range(14, 28)); const r = await sync(s); // 6–13 too
  assert.equal(r.total, 28);
  const ids = archiveOf(s).map((v) => v.videoId);
  for (const n of range(1, 28)) assert.ok(ids.includes(vid(n)), `video ${n} is still archived`);
  assert.equal(ids[0], vid(28), 'newest first');
  rmSync(s.dir, { recursive: true, force: true });
});

test('3 · thumbnails are acquired without anyone doing anything, with fallbacks and retries', async () => {
  const s = scratch(); Object.assign(state, { feedStatus: 200 });
  state.feed = feedOf([1]); state.thumbs = 'hq-only'; state.hits = [];
  let r = await sync(s); assert.deepEqual(r.thumbnails, [vid(1)], 'falls back from maxres to hqdefault');
  assert.ok(state.hits.some((h) => h.includes('maxresdefault')) && state.hits.some((h) => h.includes('hqdefault')));
  state.feed = feedOf([1, 2]); state.thumbs = 'grey';
  r = await sync(s); assert.deepEqual(r.thumbnails, [vid(2)], 'rejects YouTube’s tiny grey placeholder and uses the next size');
  state.feed = feedOf([1, 2, 3]); state.thumbs = 'down';
  r = await sync(s); assert.deepEqual(r.thumbnailsPending, [vid(3)], 'thumbnail host down: the video is archived without one');
  assert.equal(archiveOf(s).find((v) => v.videoId === vid(3)).thumbnail, null);
  state.thumbs = 'ok'; r = await sync(s);
  assert.deepEqual(r.thumbnails, [vid(3)], 'the next run retries and gets it'); assert.equal(r.changed, true);
  rmSync(s.dir, { recursive: true, force: true });
});

test('4 · YouTube unavailable: the run changes nothing, exits cleanly, and the site still builds from the archive', async () => {
  const s = scratch(); Object.assign(state, { feedStatus: 200, thumbs: 'ok' });
  state.feed = feedOf([1, 2, 3]); await sync(s); const before = readFileSync(s.archive, 'utf8');
  state.feedStatus = 500; let r = await sync(s);
  assert.match(r.feed, /unavailable/); assert.equal(r.changed, false); assert.equal(readFileSync(s.archive, 'utf8'), before);
  state.feedStatus = 200; state.feed = '<html>rate limited</html>'; r = await sync(s);
  assert.match(r.feed, /unavailable/); assert.equal(readFileSync(s.archive, 'utf8'), before, 'garbage is not mistaken for an empty channel');
  const { stdout } = await run('node', [join(R, 'tools/sync-videos.mjs'), '--feed', 'http://127.0.0.1:1/feed', '--archive', s.archive, '--thumbs', s.thumbs, '--timeout', '800']);
  assert.match(stdout, /unavailable/); assert.equal(readFileSync(s.archive, 'utf8'), before, 'unreachable host: same result');
  // The build step itself never uses the network.
  assert.ok(!/\bfetch\(/.test(readFileSync(join(R, 'tools/derive.mjs'), 'utf8')), 'derive.mjs makes no network requests');
  rmSync(s.dir, { recursive: true, force: true });
});

test('5 · a video without a thumbnail yet still renders (image is null, never a broken path)', () => {
  const src = structuredClone(real); src.videos[0].thumbnail = null;
  const g = buildGraph(src); assert.equal(g.latestVideo.image, null); assert.equal(g.latestVideo.thumb, null); assert.equal(g.stats.missingThumbnails, 1);
});

test('6 · new kinds of work make their own theme without editing a rule', () => {
  const g0 = buildGraph(real); const g = buildGraph(applyDemo(real, ['category']));
  const t = g.themes.find((x) => x.id === 'robotics');
  assert.ok(t && !t.seed && t.count === 4, 'four builds sharing an unused stack tag became a theme');
  assert.equal(g.themes.length, g0.themes.length + 1);
  const spans = g.themes.reduce((s, x) => s + x.span, 0); assert.ok(Math.abs(spans - Math.PI * 2) < 1e-9, 'sectors still fill the circle exactly');
  for (const it of g.items.filter((i) => i.theme === 'robotics')) assert.ok(it.layout.angle >= t.start && it.layout.angle <= t.start + t.span, 'placed inside the new sector by itself');
  // an explicit, optional topic wins over everything
  const s2 = structuredClone(real); s2.builds[0].topic = 'Hardware';
  assert.equal(buildGraph(s2).byId.get(s2.builds[0].id).theme, 'hardware');
  // existing work does not move themes when a new theme appears
  for (const it of g0.items) assert.equal(g.byId.get(it.id).theme, it.theme);
});

test('7 · thousands of items: the graph, clusters and search stay fast and bounded', () => {
  const big = JSON.parse(readFileSync(join(R, 'stress/data/sources-3000-digest-on.json'), 'utf8'));
  const t0 = performance.now(); const g = buildGraph(big); const ms = performance.now() - t0;
  assert.ok(g.stats.personal >= 3000); assert.ok(ms < 3000, `graph built in ${ms.toFixed(0)} ms`);
  assert.ok(g.clusters('year').length < 200 && g.clusters('quarter').length < 600, 'level-of-detail clusters are far fewer than items');
  assert.equal(g.clusters('month').reduce((s, c) => s + c.count, 0), g.stats.personal, 'every item belongs to exactly one cluster');
  assert.ok(g.digest.perWeek.length < 900, 'a 55,000-post Digest is summarised in under 900 weekly values');
  const idx = searchIndex(g); const t1 = performance.now(); const r = search(idx, 'synthetic build 2031', { type: 'build' }); const sms = performance.now() - t1;
  assert.ok(r.total > 0 && sms < 50, `search over ${idx.length} items took ${sms.toFixed(1)} ms`);
  assert.ok(g.themes.some((t) => t.origin === 'emerged') && g.themes.some((t) => t.origin === 'topic'));
});

test('8 · real data: production order, resolved relationships, derived Digest status, receipts from page sources', () => {
  const g = buildGraph(real);
  assert.deepEqual(g.featuredBuilds.map((b) => b.title), real.builds.slice(0, 3).map((b) => b.title));
  for (const e of g.edges) assert.ok(g.byId.has(e.from) && g.byId.has(e.to));
  assert.equal(g.digest.status, g.digest.publishingPaused ? 'paused' : 'publishing');
  assert.equal(g.digest.perWeek.reduce((s, w) => s + w.n, 0), g.digest.published);
  assert.ok(g.byId.get('building:zerohuman').receipts.some((r) => r.kind === 'transaction' && /^0x[0-9a-f]{64}$/.test(r.value)));
  assert.equal(g.latestVideo.id, real.videos.find((v) => v.kind === 'video').id);
  assert.equal(g.stats.missingThumbnails, 0);
});

test('9 · resuming the Digest schedule flips the derived status (scratch copy of production)', { skip: !existsSync(PROD) }, async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'kenashe-'));
  try {
    for (const p of ['src/data', 'src/pages/building', 'src/pages/writing', 'src/utils', '.github/workflows']) cpSync(join(PROD, p), join(tmp, p), { recursive: true });
    cpSync(join(PROD, 'src/content/blog'), join(tmp, 'src/content/blog'), { recursive: true });
    const wf = join(tmp, '.github/workflows/pipeline.yml');
    writeFileSync(wf, readFileSync(wf, 'utf8').replace('  # schedule:\n  #   - cron:', '  schedule:\n    - cron:'));
    const out = join(tmp, 'out');
    for (const d of ['tools', 'source', 'assets/video']) cpSync(join(R, d), join(out, d), { recursive: true });
    await run('node', ['--import', join(out, 'tools/ts-resolve.mjs'), join(out, 'tools/derive.mjs'), tmp]);
    const s2 = JSON.parse(readFileSync(join(out, 'data/sources.json'), 'utf8'));
    assert.equal(s2.digest.status, 'publishing');
    assert.equal(s2.videos.length, real.videos.length, 'same archive, same videos, no network');
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});
