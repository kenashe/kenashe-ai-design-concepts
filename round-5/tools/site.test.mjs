// Round 5 tests: each one proves a claim in the handoff.
//   node --test round-5/tools/site.test.mjs
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
const e = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const run = promisify(execFile);
const R = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROD = process.env.KENASHE_REPO || '/agent/workspace/src-ref';
const real = JSON.parse(readFileSync(join(R, 'data/sources.json'), 'utf8'));

// ---- a fake YouTube: /feed serves whatever `state.feed` says; /vi/<id>/<size>.jpg serves thumbnails
// Real image files: A is the first thumbnail, B is a different picture, SMALL is a valid but smaller size.
const FX = (n) => readFileSync(join(R, 'tools/fixtures', `thumb-${n}.jpg`));
const A = FX('a'), B = FX('b'), SMALL = FX('small');
const state = { feed: '', feedStatus: 200, thumbs: 'ok', hits: [], pictures: {} };
const server = http.createServer((req, res) => {
  state.hits.push(req.url);
  if (req.url.startsWith('/feed')) { res.writeHead(state.feedStatus, { 'content-type': 'application/xml' }); return res.end(state.feed); }
  const m = req.url.match(/^\/vi\/([\w-]{11})\/(\w+)\.jpg/);
  if (m) {
    const pic = state.pictures[m[1]] || A; const jpeg = { 'content-type': 'image/jpeg' };
    if (state.thumbs === 'down') { res.writeHead(503); return res.end(); }
    if (state.thumbs === 'hq-only' && m[2] !== 'hqdefault') { res.writeHead(404); return res.end(); }
    if (state.thumbs === 'grey' && m[2] === 'maxresdefault') { res.writeHead(200, jpeg); return res.end(Buffer.alloc(900)); } // YouTube's tiny placeholder
    if (state.thumbs === 'truncated') { res.writeHead(200, jpeg); return res.end(pic.subarray(0, Math.floor(pic.length * 0.6))); } // connection cut part-way
    if (state.thumbs === 'error-page') { res.writeHead(200, jpeg); return res.end(Buffer.from('<html><body>' + 'Service temporarily unavailable. '.repeat(200) + '</body></html>')); }
    if (state.thumbs === 'best-size-down') { if (m[2] === 'maxresdefault') { res.writeHead(503); return res.end(); } res.writeHead(200, jpeg); return res.end(SMALL); }
    res.writeHead(200, jpeg); return res.end(pic);
  }
  res.writeHead(404); res.end();
});
let PORT;
before(async () => { await new Promise((r) => server.listen(0, '127.0.0.1', r)); PORT = server.address().port; });
after(() => server.close());

const vid = (n) => `VID${String(n).padStart(8, '0')}`;
const entry = (n, { short = false, desc = '', title = `Test upload ${n}` } = {}) => `<entry><id>yt:video:${vid(n)}</id><yt:videoId>${vid(n)}</yt:videoId><title>${title}</title>
<link rel="alternate" href="https://www.youtube.com/${short ? 'shorts/' : 'watch?v='}${vid(n)}"/><published>2027-01-${String(n).padStart(2, '0')}T12:00:00+00:00</published>
<media:group><media:description>A description long enough to count as a summary line. ${desc}</media:description></media:group></entry>`;
const feedOf = (ns, opts = {}) => `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">${ns.map((n) => entry(n, opts[n])).join('')}</feed>`;

function scratch() {
  const dir = mkdtempSync(join(tmpdir(), 'r5-')); state.pictures = {};
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


const fileOf = (s, n) => readFileSync(join(s.thumbs, `${vid(n)}.jpg`));
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

test('sync 5 · a thumbnail changed on YouTube (title untouched) replaces the picture on the site', async () => {
  const s = scratch(); Object.assign(state, { feedStatus: 200, thumbs: 'ok' });
  state.feed = feedOf([1, 2]); await sync(s);
  assert.ok(fileOf(s, 1).equals(A), 'starts with picture A');
  const title = archiveOf(s).find((v) => v.videoId === vid(1)).title;
  state.pictures[vid(1)] = B;                       // only the thumbnail changes; the feed is identical
  let r = await sync(s);
  assert.deepEqual(r.thumbnailsChanged, [vid(1)]); assert.deepEqual(r.updated, [], 'no title or description change was reported');
  assert.equal(r.changed, true, 'the change is committed and the site rebuilds');
  assert.ok(fileOf(s, 1).equals(B), 'the local picture is now B'); assert.ok(fileOf(s, 2).equals(A), 'the other video is untouched');
  const v = archiveOf(s).find((x) => x.videoId === vid(1));
  assert.equal(v.title, title); assert.ok(v.thumbUpdated, 'the archive records when the picture changed');
  r = await sync(s); assert.equal(r.changed, false, 'the next run sees the same picture and does nothing');
  rmSync(s.dir, { recursive: true, force: true });
});

test('sync 6 · a title changed on YouTube (thumbnail untouched) updates the title and leaves the picture alone', async () => {
  const s = scratch(); Object.assign(state, { feedStatus: 200, thumbs: 'ok' });
  state.feed = feedOf([1, 2]); await sync(s); const hash = archiveOf(s).find((v) => v.videoId === vid(1)).thumbHash;
  state.feed = feedOf([1, 2], { 1: { title: 'A better title' } });
  const r = await sync(s);
  assert.deepEqual(r.updated, [vid(1)]); assert.deepEqual(r.thumbnailsChanged, []); assert.deepEqual(r.thumbnails, []);
  const v = archiveOf(s).find((x) => x.videoId === vid(1));
  assert.equal(v.title, 'A better title'); assert.equal(v.thumbHash, hash); assert.equal(v.thumbUpdated, undefined);
  assert.equal(v.thumbnail, `video/${vid(1)}.jpg`, 'the picture reference survives a title change'); assert.ok(fileOf(s, 1).equals(A));
  rmSync(s.dir, { recursive: true, force: true });
});

test('sync 7 · a corrupt or failed thumbnail download is rejected and the last good picture stays', async () => {
  const s = scratch(); Object.assign(state, { feedStatus: 200, thumbs: 'ok' });
  state.feed = feedOf([1]); await sync(s); const before = readFileSync(s.archive, 'utf8');
  state.pictures[vid(1)] = B;
  for (const mode of ['truncated', 'error-page', 'down', 'best-size-down']) {
    state.thumbs = mode; const r = await sync(s);
    assert.equal(r.changed, false, `${mode}: nothing is committed`); assert.equal(r.thumbnailsKept.length, 1, `${mode}: reported as kept`);
    assert.ok(fileOf(s, 1).equals(A), `${mode}: picture A is still in place`); assert.equal(readFileSync(s.archive, 'utf8'), before, `${mode}: archive untouched`);
    assert.deepEqual(readdirSync(s.thumbs), [`${vid(1)}.jpg`], `${mode}: no partial files left behind`);
  }
  state.thumbs = 'ok'; const r = await sync(s);
  assert.deepEqual(r.thumbnailsChanged, [vid(1)], 'once YouTube answers properly, the new picture is taken'); assert.ok(fileOf(s, 1).equals(B));
  rmSync(s.dir, { recursive: true, force: true });
});

test('sync 8 · an older video outside the feed window: its thumbnail is refreshed by --all, not by the ordinary run', async () => {
  const s = scratch(); Object.assign(state, { feedStatus: 200, thumbs: 'ok' });
  state.feed = feedOf(range(1, 15)); await sync(s);
  state.feed = feedOf(range(2, 16)); await sync(s);            // video 1 has left the feed
  state.pictures[vid(1)] = B;
  let r = await sync(s);
  assert.equal(r.checked, 15, 'the ordinary run checks the 15 videos in the feed'); assert.equal(r.changed, false); assert.ok(fileOf(s, 1).equals(A));
  r = await sync(s, ['--all']);
  assert.equal(r.checked, 16); assert.deepEqual(r.thumbnailsChanged, [vid(1)]); assert.ok(fileOf(s, 1).equals(B));
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

test('site 5 · a new project record appears in the index with no other edit', () => {
  const c = fresh();
  c.src.builds.unshift({ id: 'building:example', slug: 'example', title: 'Example Project', status: 'SHIPPED', dek: 'An example.', stack: [], shippedAt: 'Dec 2026', hasPage: false, link: null, pageImage: null, receipts: [], footer: null });
  const s = site(c); assert.ok(s.pages.get('/building/').includes('Example Project')); assert.equal(s.pages.size, site(fresh()).pages.size, 'no page file, no page');
});

test('site 6 · a video with no thumbnail yet gets a plain frame behind its play button, never a broken picture', () => {
  const c = fresh(); c.src.videos.unshift({ id: 'video:AAAAAAAAAAA', videoId: 'AAAAAAAAAAA', title: 'Brand New Upload #ai', date: '2026-12-01', kind: 'video', url: 'https://www.youtube.com/watch?v=AAAAAAAAAAA', summary: 'A new one.', thumbnail: null });
  const s = site(c); assert.equal(s.model.featured.videoId, 'AAAAAAAAAAA'); assert.equal(s.model.featured.title, 'Brand New Upload', 'trailing hashtags are trimmed');
  const f = sectionOf(s.pages.get('/'), 'featured'); assert.match(f, /class="pic blank/); assert.ok(!/src="[^"]*AAAAAAAAAAA/.test(f));
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

const textOf = (html) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const noBrokenLinks = (s, why) => { for (const [route, html] of s.pages) { assert.ok(!/href="(null|undefined|)"/.test(html), `${why}: ${route} has an empty or null link`); assert.ok(!/>\s*(null|undefined)\s*</.test(html), `${why}: ${route} prints null`); } };

test('site 11 · “Latest video” is only the automatic choice; a chosen piece is “Featured”, with its own date', () => {
  const c = fresh(); c.editorial.featured = null; let f = sectionOf(site(c).pages.get('/'), 'featured');
  const newest = c.src.videos.find((v) => v.kind === 'video'); const older = c.src.videos.filter((v) => v.kind === 'video').at(-1);
  assert.match(f, /Latest video · /); assert.ok(!/Featured/.test(f)); assert.ok(f.includes(model(c).all[newest.id].dateLabel));
  c.editorial.featured = older.id; let m = model(c); f = sectionOf(site(c).pages.get('/'), 'featured');
  assert.match(f, /Featured video · /); assert.ok(!/Latest video/.test(f), 'an older pinned video is not called the latest');
  assert.ok(f.includes(m.all[older.id].dateLabel), 'the date shown is the pinned video’s own'); assert.ok(!f.includes(m.all[newest.id].dateLabel));
  c.editorial.featured = newest.id; assert.match(sectionOf(site(c).pages.get('/'), 'featured'), /Featured video/, 'choosing it by hand is still a choice');
  c.editorial.featured = 'building:returning-your-things'; f = sectionOf(site(c).pages.get('/'), 'featured'); assert.match(f, /Featured project/); assert.ok(!/video/i.test(f.match(/class="eyebrow">[^<]*/)[0]));
  c.editorial.featured = 'writing:ai-editor-trusted-least'; f = sectionOf(site(c).pages.get('/'), 'featured'); assert.match(f, /Featured essay · September 25, 2026/);
});

test('site 12 · homepage settings always produce a valid page: with a page, without a write-up, mistyped, hidden', () => {
  const noPage = real.builds.find((b) => !b.hasPage); const withPage = real.builds.find((b) => b.hasPage && b.slug !== 'zerohuman');
  // a normal project with a page
  let c = fresh(); c.editorial.homeProjects = [withPage.id]; c.editorial.featured = 'building:zerohuman'; let s = site(c);
  assert.equal(s.model.homeProjects[0].id, withPage.id); assert.match(sectionOf(s.pages.get('/'), 'featured'), /href="\.\/building\/zerohuman\/"/); assert.deepEqual(s.model.warnings, []); noBrokenLinks(s, 'with a page');
  // a project without a write-up: shown, deliberately without a link
  c = fresh(); c.editorial.homeProjects = [noPage.id]; s = site(c); let cards = sectionOf(s.pages.get('/'), 'projects');
  assert.equal(s.model.homeProjects[0].id, noPage.id); assert.ok(cards.includes(noPage.title)); assert.match(cards, /<article class="card note still">\s*<div class="card-link">/, 'drawn as an unlinked card');
  assert.equal(s.model.homeProjects.length, 3, 'the other two places are filled automatically'); noBrokenLinks(s, 'without a write-up');
  c = fresh(); c.editorial.featured = noPage.id; s = site(c); let f = sectionOf(s.pages.get('/'), 'featured');
  assert.ok(f.includes(noPage.title)); assert.match(f, /Featured project/); assert.match(f, /All projects/); assert.ok(!/See the project/.test(f)); noBrokenLinks(s, 'featured without a write-up');
  // an id that does not exist
  c = fresh(); c.editorial.featured = 'building:no-such-thing'; c.editorial.homeProjects = ['building:also-missing', 'video:DcXaGn-NsgY', withPage.id]; c.editorial.hide = ['writing:nope']; s = site(c);
  assert.equal(s.model.featuredMode, 'automatic'); assert.match(sectionOf(s.pages.get('/'), 'featured'), /Latest video/, 'falls back to the automatic choice and labels it as such');
  assert.equal(s.model.homeProjects[0].id, withPage.id); assert.equal(s.model.homeProjects.length, 3);
  assert.equal(s.model.warnings.length, 4, 'each ignored setting is reported in the build output'); assert.match(s.model.warnings.join(' '), /does not match any/); assert.match(s.model.warnings.join(' '), /is not a project/); noBrokenLinks(s, 'mistyped ids');
  // an item that is also hidden
  c = fresh(); c.editorial.featured = withPage.id; c.editorial.homeProjects = [withPage.id, 'building:zerohuman']; c.editorial.hide = [withPage.id]; s = site(c);
  assert.notEqual(s.model.featured.id, withPage.id); assert.ok(!s.model.homeProjects.some((p) => p.id === withPage.id)); assert.equal(s.model.homeProjects[0].id, 'building:zerohuman');
  assert.match(s.model.warnings.join(' '), /listed under hide/); assert.ok(s.pages.has(`/building/${withPage.slug}/`), 'hiding does not remove the page');
  assert.ok(s.pages.get('/building/').includes(withPage.title), 'or the entry in the project list'); noBrokenLinks(s, 'hidden');
  // every project in every slot
  for (const b of real.builds) { c = fresh(); c.editorial.featured = b.id; c.editorial.homeProjects = [b.id]; noBrokenLinks(site(c), b.id); }
});

test('site 13 · projects without a picture: eligible for the homepage, drawn as text cards, no substitute cover on their page', () => {
  const c = fresh(); c.editorial.homeProjects = []; c.editorial.featured = null; const s = site(c); const m = s.model;
  const plain = m.projects.filter((p) => p.route && !p.image); assert.ok(plain.length >= 5, 'the real content has several');
  const auto = m.projects.filter((p) => p.route && !p.related.some((r) => r.id === m.featured.id)).slice(0, 3).map((p) => p.id);
  assert.deepEqual(m.homeProjects.map((p) => p.id), auto, 'automatic order is the project list’s own order (newest first), picture or not');
  assert.ok(m.homeProjects.some((p) => !p.image), 'a project without a picture is on the homepage today');
  for (const html of s.pages.values()) assert.ok(!/class="pic plate/.test(html), 'no title-card covers anywhere');
  const index = s.pages.get('/building/');
  for (const p of plain) {
    const card = index.match(new RegExp(`<article class="card note">\\s*<a class="card-link" href="[^"]*/${p.slug}/">[\\s\\S]*?</article>`))?.[0]; assert.ok(card, `${p.slug} is a text card`);
    assert.equal(card.split(e(p.title)).length - 1, 1, 'its title appears once'); assert.ok(card.includes(e(p.summary)), 'with its summary');
    const page = s.pages.get(p.route); const head = page.slice(page.indexOf('<header class="detail-head"'), page.indexOf('</header>', page.indexOf('<header class="detail-head"')));
    assert.ok(!/class="detail-pic"|class="pic/.test(head), `${p.slug}: the page opens with its text, not a substitute picture`); assert.match(head, /class="mark"/);
  }
  const pictured = m.projects.find((p) => p.route && p.image); assert.match(s.pages.get(pictured.route), /class="detail-pic"/, 'real pictures are kept');
});

test('site 14 · each editable field has one source: the record’s title and summary travel everywhere, the page heading stays with the page', () => {
  const c = fresh(); const b = c.src.builds.find((x) => x.slug === 'vetstack'); const h1 = c.pages['/building/vetstack/'].h1;
  b.title = 'VetStack Renamed'; b.summary = 'A new plain summary for the test.'; const s = site(c);
  const next = [...s.pages].find(([r, html]) => r.startsWith('/building/') && sectionOf(html, 'next').includes('building') && sectionOf(html, 'next').includes('VetStack Renamed'));
  assert.ok(s.pages.get('/building/').includes('VetStack Renamed') && s.pages.get('/building/').includes('A new plain summary for the test.'), 'project list');
  assert.ok(next, 'the “next project” link on the neighbouring page'); assert.ok(next[1].includes('A new plain summary for the test.'));
  const page = s.pages.get('/building/vetstack/');
  assert.match(page, /<p class="lede">A new plain summary for the test\.<\/p>/, 'the page’s opening line is the record’s summary');
  assert.match(page, /<meta name="description" content="A new plain summary for the test\.">/);
  assert.ok(page.includes(`<h1>${e(h1)}</h1>`), 'the page heading belongs to the page file and does not change');
  assert.ok(!JSON.stringify(load().copy).includes('"plain"'), 'summaries are no longer kept in a separate copy file');
  for (const x of real.builds) assert.ok(x.summary, `${x.slug} has its summary in its record`);
});

test('site 15 · wording: Digest status, Lucky Domains, authorship labels, Facebook, no stray formatting marks', () => {
  const s = site(fresh()); const home = textOf(s.pages.get('/')); const all = [...s.pages].map(([r, h]) => [r, textOf(h.slice(h.indexOf('<body')))]);
  for (const [r, t] of all) {
    assert.ok(!/my separate business|separate business|All written by me|willing to defend/i.test(t), `${r}: retired wording`);
    assert.ok(!/\*\*|(^|\s)\*\S[^*]{0,80}\S\*(\s|[.,;:!?]|$)|(^|\s)_[A-Za-z][^_]{0,80}_(\s|[.,;:!?]|$)|\]\(https?:/.test(t), `${r}: raw Markdown in visible text`);
  }
  assert.ok(home.includes('A look back at my autonomous AI blog and its results. Publishing is currently paused.'));
  assert.ok(!/researches, writes, reviews and publishes|publishes articles without/i.test(home), 'the video description no longer reads as if publishing were running');
  assert.match(textOf(s.pages.get('/building/')), /Publishing is currently paused\./);
  assert.ok(home.replace(/ ,/g, ',').includes('I also run Lucky Domains, a digital presence studio for the AI era.')); assert.ok(home.includes('Digital presence studio.'));
  assert.ok(!home.includes('—') || !/Lucky Domains[^.]*—/.test(home));
  for (const p of s.pages.values()) assert.match(p, /href="https:\/\/www\.facebook\.com\/kenasheai\/"/);
  for (const w of s.model.writing) { assert.ok(textOf(s.pages.get(w.route)).includes(w.authorship), `${w.slug} keeps its authorship label`); assert.ok(textOf(s.pages.get('/writing/')).includes(w.authorship)); }
  assert.match(textOf(s.pages.get('/writing/')), /Essays, lessons from projects and personal stories\./);
});
