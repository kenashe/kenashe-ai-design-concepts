// Video sync: the only step that talks to YouTube. Safe to run any time, any number of times.
//
//   node round-4/tools/sync-videos.mjs                 # normal run
//   node round-4/tools/sync-videos.mjs --feed <url|file> --archive <json> --thumbs <dir>
//
// What it does
//   1. Reads the channel feed (the feed only ever lists the latest 15 uploads).
//   2. Merges it into an append-only archive file that is committed with the site.
//      Videos are never removed, so the archive outlives the feed's 15-item window.
//   3. Downloads a thumbnail for every archived video that does not have one yet
//      (maxresdefault, then sddefault, then hqdefault). A failed download is retried on the next run.
//   4. Prints a summary and sets `changed=true|false` for GitHub Actions, so the workflow
//      commits and triggers a rebuild only when something is actually new.
//
// What it never does: fail the build. Feed down, thumbnail host down, malformed XML: it logs
// the reason, leaves the archive untouched and exits 0. The site builds from the archive.
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
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

async function thumbnail(videoId) {
  for (const q of ['maxresdefault', 'sddefault', 'hqdefault']) {
    try {
      const r = await fetch(`${THUMB_HOST}/vi/${videoId}/${q}.jpg`, { signal: AbortSignal.timeout(TIMEOUT) });
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 2500) continue; // YouTube serves a tiny grey placeholder for missing sizes
      // Production has sharp (an Astro dependency) and stores a resized WebP. Without it, keep the JPEG.
      try {
        const sharp = (await import('sharp')).default;
        writeFileSync(join(THUMBS, `${videoId}.webp`), await sharp(buf).resize({ width: 1280, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer());
        return `video/${videoId}.webp`;
      } catch { writeFileSync(join(THUMBS, `${videoId}.jpg`), buf); return `video/${videoId}.jpg`; }
    } catch { /* try the next size */ }
  }
  return null;
}

const archive = existsSync(ARCHIVE) ? JSON.parse(readFileSync(ARCHIVE, 'utf8')) : [];
const byId = new Map(archive.map((v) => [v.videoId, v]));
const summary = { feed: 'ok', inFeed: 0, added: [], updated: [], thumbnails: [], thumbnailsPending: [], total: archive.length };

try {
  const entries = parse(await readFeed());
  summary.inFeed = entries.length;
  for (const v of entries) {
    const old = byId.get(v.videoId);
    if (!old) { byId.set(v.videoId, { ...v, firstSeen: new Date().toISOString() }); summary.added.push(v.videoId); continue; }
    const changed = ['title', 'kind', 'url', 'summary'].some((k) => old[k] !== v[k]) || JSON.stringify(old.mentions || []) !== JSON.stringify(v.mentions);
    if (changed) { byId.set(v.videoId, { ...old, ...v, thumbnail: old.thumbnail, firstSeen: old.firstSeen }); summary.updated.push(v.videoId); }
  }
} catch (e) {
  summary.feed = `unavailable (${e.message}); kept the archive as it is`;
  log(summary.feed);
}

mkdirSync(THUMBS, { recursive: true });
for (const v of byId.values()) {
  const has = v.thumbnail && existsSync(join(dirname(THUMBS), v.thumbnail));
  if (has) continue;
  const local = ['webp', 'jpg'].find((x) => existsSync(join(THUMBS, `${v.videoId}.${x}`)));
  if (local) { if (v.thumbnail !== `video/${v.videoId}.${local}`) { v.thumbnail = `video/${v.videoId}.${local}`; summary.thumbnails.push(v.videoId); } continue; }
  const t = await thumbnail(v.videoId);
  if (t) { v.thumbnail = t; summary.thumbnails.push(v.videoId); } else { v.thumbnail = null; summary.thumbnailsPending.push(v.videoId); }
}

const merged = [...byId.values()].sort((a, b) => ((a.published || a.date) < (b.published || b.date) ? 1 : -1));
const changed = summary.added.length + summary.updated.length + summary.thumbnails.length > 0;
if (changed) writeFileSync(ARCHIVE, JSON.stringify(merged, null, 1) + '\n');
summary.total = merged.length; summary.changed = changed;
log(JSON.stringify(summary));
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\nadded=${summary.added.join(',')}\n`);
