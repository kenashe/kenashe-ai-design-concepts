// Video sync: the only step that talks to YouTube. Safe to run any time, any number of times.
//
//   node round-5/tools/sync-videos.mjs                 # normal run
//   node round-5/tools/sync-videos.mjs --all           # also re-check thumbnails of videos that have left the feed
//   node round-5/tools/sync-videos.mjs --feed <url|file> --archive <json> --thumbs <dir>
//
// What it does
//   1. Reads the channel feed (the feed only ever lists the latest 15 uploads).
//   2. Merges it into an append-only archive file that is committed with the site.
//      Videos are never removed, so the archive outlives the feed's 15-item window.
//   3. Checks the thumbnail of every video in the feed on every run, by downloading it and comparing
//      its fingerprint with the one stored in the archive. A changed thumbnail replaces the local copy.
//      With --all it checks every archived video, including ones that have left the feed.
//      (The address of a YouTube thumbnail depends only on the video id, so no feed is needed for this.)
//   4. Accepts a download only if it is a complete, valid image of a sensible size. Anything else
//      (an error page, a truncated file, YouTube's grey placeholder) is rejected and the last good
//      picture stays in place. A temporary failure never downgrades a picture to a smaller size.
//   5. Prints a summary and sets `changed=true|false` for GitHub Actions, so the workflow
//      commits and triggers a rebuild only when something is actually different.
//
// What it never does: fail the build. Feed down, thumbnail host down, malformed XML: it logs
// the reason, leaves the archive untouched and exits 0. The site builds from the archive.
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync, renameSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const R = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const CHANNEL = process.env.YOUTUBE_CHANNEL_ID || 'UCD74fTmfkcY7J-0RMYyRIbw';
const FEED = arg('feed', `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL}`);
const ARCHIVE = arg('archive', join(R, 'source/youtube-archive.json'));
const THUMBS = arg('thumbs', join(R, 'assets/video'));
const THUMB_HOST = arg('thumb-host', 'https://i.ytimg.com');
const TIMEOUT = Number(arg('timeout', 15000));
const ALL = process.argv.includes('--all');

const log = (...a) => console.log('[videos]', ...a);
const unesc = (s = '') => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const tag = (s, t) => s.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`))?.[1];

async function readFeed() {
  if (!/^https?:/.test(FEED)) return readFileSync(FEED, 'utf8');
  const r = await fetch(FEED, { signal: AbortSignal.timeout(TIMEOUT) });
  if (!r.ok) throw new Error(`feed HTTP ${r.status}`);
  return r.text();
}

function parse(xml) {
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => {
    const videoId = tag(e, 'yt:videoId'); const href = e.match(/<link rel="alternate" href="([^"]+)"/)?.[1] || '';
    const desc = unesc(tag(e, 'media:description') || '');
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId || '')) return null;
    return {
      id: `video:${videoId}`, videoId, title: unesc(tag(e, 'title') || '').trim(),
      date: (tag(e, 'published') || '').slice(0, 10), published: tag(e, 'published'), updated: tag(e, 'updated') || null,
      kind: href.includes('/shorts/') ? 'short' : 'video', url: href,
      summary: desc.split('\n').find((l) => l.trim().length > 30)?.trim() ?? '',
      // Links back to the site are kept in the archive, so relationships survive after the
      // video leaves the feed. Hashtags are kept as optional topic hints.
      mentions: [...new Set([...desc.matchAll(/kenashe\.ai(\/(?:building|writing|blog)(?:\/[a-z0-9-]+)?)/g)].map((m) => m[1]))],
      hashtags: [...new Set([...desc.matchAll(/(?:^|\s)#([A-Za-z][\w-]{2,30})/g)].map((m) => m[1].toLowerCase()))].slice(0, 8),
      source: 'YouTube channel feed',
    };
  }).filter(Boolean);
  if (!entries.length && !/<feed/.test(xml)) throw new Error('feed is not Atom XML');
  return entries;
}

// ---- thumbnails
const SIZES = ['maxresdefault', 'sddefault', 'hqdefault']; // best first
const rank = (q) => (SIZES.includes(q) ? SIZES.length - SIZES.indexOf(q) : 0);
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

// A download counts as a picture only if it is a complete image file with real dimensions.
export function imageInfo(buf) {
  if (!buf || buf.length < 2500) return null; // YouTube serves a tiny grey placeholder for missing sizes
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) { // JPEG: must end with the end-of-image marker
    let end = buf.length - 1; while (end > 2 && buf[end] === 0) end--;
    if (buf[end - 1] !== 0xff || buf[end] !== 0xd9) return null;
    for (let i = 2; i + 9 < buf.length;) {
      if (buf[i] !== 0xff) return null;
      const m = buf[i + 1]; const len = buf.readUInt16BE(i + 2);
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { type: 'jpg', height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      if (m === 0xda || len < 2) return null;
      i += 2 + len;
    }
    return null;
  }
  if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') { // WebP: declared length must match
    if (buf.readUInt32LE(4) + 8 !== buf.length) return null;
    const c = buf.toString('latin1', 12, 16);
    if (c === 'VP8X') return { type: 'webp', width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
    if (c === 'VP8 ') return { type: 'webp', width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    if (c === 'VP8L') { const b = buf.readUInt32LE(21); return { type: 'webp', width: 1 + (b & 0x3fff), height: 1 + ((b >> 14) & 0x3fff) }; }
    return null;
  }
  if (buf.readUInt32BE(0) === 0x89504e47 && buf.toString('latin1', buf.length - 8, buf.length - 4) === 'IEND') return { type: 'png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  return null;
}
const usable = (buf) => { const i = imageInfo(buf); return i && i.width >= 320 && i.height >= 180 ? i : null; };

// Download the best available size. Returns { buf, size, hash }, or { kept: reason } when the current picture should stay.
async function download(v) {
  let unsure = null; // a better size failed for a reason that may be temporary
  for (const q of SIZES) {
    let r;
    try { r = await fetch(`${THUMB_HOST}/vi/${v.videoId}/${q}.jpg`, { signal: AbortSignal.timeout(TIMEOUT) }); } catch (e) { unsure ??= `${q}: ${e.name === 'TimeoutError' ? 'timed out' : 'unreachable'}`; continue; }
    if (r.status === 404) continue; // this size does not exist for this video
    if (!r.ok) { unsure ??= `${q}: HTTP ${r.status}`; continue; }
    const buf = Buffer.from(await r.arrayBuffer());
    if (!usable(buf)) { if (buf.length >= 2500) unsure ??= `${q}: not a valid image`; continue; }
    if (unsure && rank(q) < rank(v.thumbSize)) return { kept: `${unsure}; not replacing a ${v.thumbSize} picture with a smaller one` };
    return { buf, size: q, hash: sha(buf) };
  }
  return { kept: unsure || 'no thumbnail available' };
}
async function store(videoId, buf) {
  let name = `${videoId}.jpg`, out = buf;
  // Production has sharp (an Astro dependency) and stores a resized WebP. Without it, keep the JPEG.
  try { const sharp = (await import('sharp')).default; out = await sharp(buf).resize({ width: 1280, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer(); name = `${videoId}.webp`; } catch { /* keep the JPEG */ }
  const tmp = join(THUMBS, `.${name}.tmp`);
  writeFileSync(tmp, out); renameSync(tmp, join(THUMBS, name)); // written whole, then swapped in
  for (const x of ['webp', 'jpg']) if (!name.endsWith(x)) rmSync(join(THUMBS, `${videoId}.${x}`), { force: true });
  return `video/${name}`;
}

const archive = existsSync(ARCHIVE) ? JSON.parse(readFileSync(ARCHIVE, 'utf8')) : [];
const byId = new Map(archive.map((v) => [v.videoId, v]));
const summary = { feed: 'ok', inFeed: 0, added: [], updated: [], thumbnails: [], thumbnailsChanged: [], thumbnailsKept: [], thumbnailsPending: [], checked: 0, total: archive.length };
const inFeed = new Set();

try {
  const entries = parse(await readFeed());
  summary.inFeed = entries.length;
  for (const v of entries) {
    inFeed.add(v.videoId);
    const old = byId.get(v.videoId);
    if (!old) { byId.set(v.videoId, { ...v, firstSeen: new Date().toISOString() }); summary.added.push(v.videoId); continue; }
    const changed = ['title', 'kind', 'url', 'summary'].some((k) => old[k] !== v[k]) || JSON.stringify(old.mentions || []) !== JSON.stringify(v.mentions);
    if (changed) { byId.set(v.videoId, { ...old, ...v, firstSeen: old.firstSeen }); summary.updated.push(v.videoId); }
  }
} catch (e) {
  summary.feed = `unavailable (${e.message}); kept the archive as it is`;
  log(summary.feed);
}

mkdirSync(THUMBS, { recursive: true });
for (const v of byId.values()) {
  const has = v.thumbnail && existsSync(join(dirname(THUMBS), v.thumbnail));
  if (!has) { // an image file that is already there (committed by hand, or from an older run) is adopted
    const local = ['webp', 'jpg'].find((x) => existsSync(join(THUMBS, `${v.videoId}.${x}`)));
    if (local && v.thumbnail !== `video/${v.videoId}.${local}`) { v.thumbnail = `video/${v.videoId}.${local}`; summary.thumbnails.push(v.videoId); }
  }
  const present = v.thumbnail && existsSync(join(dirname(THUMBS), v.thumbnail));
  if (present && !ALL && !inFeed.has(v.videoId)) continue; // older videos are checked by --all
  summary.checked++;
  const got = await download(v);
  if (got.kept) { // nothing usable came back: keep the last good picture, or retry next run if there is none
    if (present) summary.thumbnailsKept.push(`${v.videoId} (${got.kept})`); else { v.thumbnail = null; summary.thumbnailsPending.push(v.videoId); }
    continue;
  }
  if (present && v.thumbHash === got.hash) continue; // same picture as last time
  const first = !present; const baseline = present && !v.thumbHash; // baseline: first check of a picture stored before fingerprints existed
  v.thumbnail = await store(v.videoId, got.buf); v.thumbHash = got.hash; v.thumbSize = got.size;
  if (!first && !baseline) v.thumbUpdated = new Date().toISOString();
  (first || baseline ? summary.thumbnails : summary.thumbnailsChanged).push(v.videoId);
}

const merged = [...byId.values()].sort((a, b) => ((a.published || a.date) < (b.published || b.date) ? 1 : -1));
const changed = summary.added.length + summary.updated.length + summary.thumbnails.length + summary.thumbnailsChanged.length > 0;
if (changed) writeFileSync(ARCHIVE, JSON.stringify(merged, null, 1) + '\n');
summary.total = merged.length; summary.changed = changed;
log(JSON.stringify(summary));
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\nadded=${summary.added.join(',')}\nthumbnails=${summary.thumbnailsChanged.join(',')}\n`);
