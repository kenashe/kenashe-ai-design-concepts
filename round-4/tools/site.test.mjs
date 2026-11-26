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
import { build, load, model } from '../build.mjs';

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
  const dir = mkdtempSync(join(tmpdir(), 'r4-'));
  mkdirSync(join(dir, 'assets/video'), { recursive: true });
  return { dir, archive: join(dir, 'archive.json'), thumbs: join(dir, 'assets/video') };
}
async function sync(s, extra = []) {
  const { stdout } = await run('node', [join(R, 'tools/sync-videos.mjs'), '--feed', `http://127.0.0.1:${PORT}/feed`, '--thumb-host', `http://127.0.0.1:${PORT}`,
    '--archive', s.archive, '--thumbs', s.thumbs, '--timeout', '1500', ...extra]);
  return JSON.parse(stdout.trim().split('\n').pop().replace('[videos] ', ''));
}
const archiveOf = (s) => JSON.parse(readFileSync(s.archive, 'utf8'));

test('sync 1 · a new YouTube upload is picked up, archived with its thumbnail, and flags a rebuild', async () => {
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

test('sync 2 · the archive keeps every video after it leaves the feed’s 15-item window', async () => {
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

test('sync 3 · thumbnails are acquired without anyone doing anything, with fallbacks and retries', async () => {
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

test('sync 4 · YouTube unavailable: the run changes nothing, exits cleanly, and the site still builds from the archive', async () => {
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
  assert.ok(!/\bfetch\(|https?\.request|node:http/.test(readFileSync(join(R, 'build.mjs'), 'utf8')), 'build.mjs makes no network requests');
  rmSync(s.dir, { recursive: true, force: true });
});


// ---------------------------------------------------------------- the site itself
const fresh = () => structuredClone(load());
const site = (c) => build(c, { assets: '../assets' });
const sectionOf = (html, name) => html.match(new RegExp(`<section[^>]*data-section="${name}"[\\s\\S]*?</section>`))?.[0] ?? '';

test('site 1 · with no choice made, the newest full-length video is featured; one setting changes it', () => {
  const c = fresh(); c.editorial.featured = null;
  let m = model(c); assert.equal(m.featured.id, c.src.videos.find((v) => v.kind === 'video').id);
  c.editorial.featured = 'building:zerohuman'; m = model(c); assert.equal(m.featured.id, 'building:zerohuman');
  const home = site(c).pages.get('/');
  assert.match(sectionOf(home, 'featured'), /ZeroHuman/); assert.match(sectionOf(home, 'featured'), /See the project/);
  c.editorial.featured = 'writing:ai-editor-trusted-least'; assert.equal(model(c).featured.type, 'writing');
  c.editorial.featured = 'building:not-a-real-thing'; assert.equal(model(c).featured.type, 'video', 'a mistyped id falls back instead of breaking the page');
});

test('site 2 · nothing is shown twice on the homepage, and a subject is not repeated', () => {
  for (const featured of [null, 'building:returning-your-things', 'building:ai-agent-economy', 'writing:bambu-lab-burr-puzzle-solution']) {
    const c = fresh(); c.editorial.featured = featured; const m = model(c);
    const shown = [m.featured, ...m.homeProjects, ...m.homeVideos, ...m.homeWriting];
    assert.equal(new Set(shown.map((i) => i.id)).size, shown.length, 'no item twice');
    const pics = shown.map((i) => i.image).filter(Boolean); assert.equal(new Set(pics).size, pics.length, 'no picture twice');
    assert.equal(m.homeProjects.length, 3); assert.equal(m.homeVideos.length, 3); assert.equal(m.homeWriting.length, 3);
  }
});

test('site 3 · hiding an item removes it from featured areas and keeps its page and archive entry', () => {
  const c = fresh(); const before = model(c);
  const hide = [before.featured.id, before.homeProjects[0].id]; c.editorial.hide = hide; const s = site(c); const m = s.model;
  const shown = [m.featured, ...m.homeProjects, ...m.homeVideos, ...m.homeWriting].map((i) => i.id);
  for (const id of hide) assert.ok(!shown.includes(id));
  assert.ok(s.pages.has(before.homeProjects[0].route), 'the project page still exists');
  assert.ok(s.pages.get('/videos/').includes(before.featured.videoId), 'the video is still in the archive');
  assert.ok(s.pages.get('/building/').includes(before.homeProjects[0].title), 'the project is still in the index');
});

test('site 4 · a title or thumbnail is corrected in one place and changes everywhere', () => {
  const c = fresh(); const v = c.src.videos.find((x) => x.kind === 'video');
  c.editorial.corrections = { [v.id]: { title: 'A Corrected Title For Testing' } };
  const s = site(c); assert.ok(s.pages.get('/').includes('A Corrected Title For Testing')); assert.ok(s.pages.get('/videos/').includes('A Corrected Title For Testing'));
  const c2 = fresh(); c2.src.builds.find((b) => b.slug === 'ai-agent-economy').title = 'Renamed Project';
  const s2 = site(c2); for (const r of ['/', '/building/', '/building/zerohuman/']) assert.ok(s2.pages.get(r).includes('Renamed Project'), `${r} shows the new title`);
});

test('site 5 · a new project record appears in the index (and on the homepage when it has a picture) with no other edit', () => {
  const c = fresh();
  c.src.builds.unshift({ id: 'building:example', slug: 'example', title: 'Example Project', status: 'SHIPPED', dek: 'An example.', stack: [], shippedAt: 'Dec 2026', hasPage: false, link: null, pageImage: null, receipts: [], footer: null });
  const s = site(c); assert.ok(s.pages.get('/building/').includes('Example Project')); assert.equal(s.pages.size, site(fresh()).pages.size, 'no page file, no page');
});

test('site 6 · a video with no thumbnail yet gets a title card, never a broken picture', () => {
  const c = fresh(); c.src.videos.unshift({ id: 'video:AAAAAAAAAAA', videoId: 'AAAAAAAAAAA', title: 'Brand New Upload #ai', date: '2026-12-01', kind: 'video', url: 'https://www.youtube.com/watch?v=AAAAAAAAAAA', summary: 'A new one.', thumbnail: null });
  const s = site(c); assert.equal(s.model.featured.videoId, 'AAAAAAAAAAA'); assert.equal(s.model.featured.title, 'Brand New Upload', 'trailing hashtags are trimmed');
  const f = sectionOf(s.pages.get('/'), 'featured'); assert.match(f, /class="pic plate/); assert.ok(!/src="[^"]*AAAAAAAAAAA/.test(f));
});

test('site 7 · the picture transition needs no setup: names are unique on every page and match between card and page', () => {
  const s = site(fresh());
  for (const [route, html] of s.pages) {
    const names = [...html.matchAll(/view-transition-name:([\w-]+)/g)].map((x) => x[1]);
    assert.equal(new Set(names).size, names.length, `${route}: a duplicate name would cancel the transition`);
  }
  for (const p of s.model.projects.filter((x) => x.route)) {
    assert.ok(s.pages.get('/building/').includes(`view-transition-name:pic-p-${p.slug}`)); assert.ok(s.pages.get(p.route).includes(`view-transition-name:pic-p-${p.slug}`));
  }
  for (const w of s.model.writing) assert.ok(s.pages.get(w.route).includes(`view-transition-name:pic-w-${w.slug}`));
});

test('site 8 · every internal link leads to a page that exists; nothing links to a missing local file', () => {
  const s = site(fresh()); let n = 0;
  for (const [route, html] of s.pages) {
    for (const [, href] of html.matchAll(/<(?:a|link)\b[^>]*?href="([^"]+)"/g)) {
      if (/^(https?:|mailto:|#)/.test(href)) continue;
      const target = new URL(href, 'http://x/site' + route).pathname;
      if (target.startsWith('/site/')) { n++; assert.ok(s.pages.has(target.replace(/^\/site/, '').replace(/index\.html$/, '')), `${route} -> ${href}`); }
      else if (target.startsWith('/assets/')) assert.ok(existsSync(join(R, target)), `${route} -> ${href}`);
    }
    for (const [, src] of html.matchAll(/<(?:img|script)\b[^>]*?\ssrc(?:set)?="([^"]+)"/g)) for (const u of src.split(',').map((x) => x.trim().split(' ')[0])) {
      if (/^https?:/.test(u)) continue; assert.ok(existsSync(join(R, new URL(u, 'http://x/site' + route).pathname)), `${route} -> ${u}`);
    }
  }
  assert.ok(n > 300);
});

test('site 9 · the Digest: out of the navigation and homepage, archive linked from the footer, status read from production', () => {
  const c = fresh(); const s = site(c); const home = s.pages.get('/');
  const nav = home.match(/<nav aria-label="Main">[\s\S]*?<\/nav>/)[0]; assert.ok(!/digest|blog/i.test(nav));
  assert.deepEqual([...nav.matchAll(/>([^<]+)<\/a>/g)].map((x) => x[1]), ['Projects', 'Videos', 'Writing', 'About']);
  const main = home.slice(home.indexOf('<main'), home.indexOf('</main>'));
  assert.ok(!/kenashe\.ai\/blog|data-section="digest"/i.test(main), 'no Digest feed or Digest links in the homepage sections');
  assert.match(home, /href="https:\/\/kenashe\.ai\/blog\/">Digest archive/); assert.match(home, /Publishing is paused/);
  c.src.digest.publishingPaused = false; assert.ok(!site(c).pages.get('/').includes('Publishing is paused'), 'the wording follows the data, it is not typed in');
});

test('site 10 · approved wording is used exactly, and the prototype is kept out of search', () => {
  const s = site(fresh()); const home = s.pages.get('/'); const text = home.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  for (const t of ['Ken Ashe', 'Making sense of AI.', 'Making things with it.', 'I explain AI in plain English and put it to work on real projects, from apps and videos to new business ideas. Follow along to learn something useful and see what I try next.', 'Watch my videos', 'Explore my projects']) assert.ok(text.includes(t), t);
  const headline = home.match(/<p class="headline">([\s\S]*?)<\/p>/)[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  assert.equal(headline, 'Making sense of AI. Making things with it. Occasionally getting carried away.');
  assert.equal(text.split('Occasionally getting carried away.').length - 1, 1, 'the aside appears once');
  assert.ok(!/universe/i.test(home));
  for (const [route, html] of s.pages) { assert.match(html, /<meta name="robots" content="noindex, nofollow, noarchive">/, route); assert.ok(!/rel="canonical"/.test(html), route); assert.equal((html.match(/<h1/g) || []).length, 1, `${route}: one h1`); }
});
