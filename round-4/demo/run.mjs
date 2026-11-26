// The ordinary update workflow, demonstrated in isolation.
//
//   node round-4/demo/run.mjs      -> writes round-4/demo/site/ and round-4/demo/index.html
//
// Starts from the real content, applies five ordinary updates one after another, rebuilds after each,
// and records exactly which pages and sections changed. Nothing here touches round-4/site/ or the
// real video archive: example entries exist only inside round-4/demo/.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { R, load, build, write } from '../build.mjs';

const OUT = join(R, 'demo/site');
const content = load();
const e = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const NOTE = '<p><strong>This is an example entry made for the demonstration. It is not real.</strong> It exists only to show where a new item appears.</p>';
const SECTION = { introduction: 'Introduction', featured: 'Featured piece', projects: 'Project cards', recent: 'More to watch / And to read', about: 'Personal introduction', head: 'Page opening', latest: 'Latest video', videos: 'All videos', shorts: 'Shorts', writing: 'Writing list', more: 'Smaller builds', body: 'Page body', related: 'Connected items', next: 'Next item' };

const steps = [
  { title: 'Add a project', does: 'Add one record to the project list (src/data/builds.ts) and, if it deserves a write-up, one page file. (It joins the three homepage projects once it has a picture, or when it is chosen in the settings file.)',
    change: `{ title: 'Example project: recipe card maker', description: 'An example entry…', status: 'SHIPPED', shippedAt: 'Dec 2026', link: '/building/example-recipe-card-maker/' }`,
    apply(c) {
      c.src.builds.unshift({ id: 'building:example-recipe-card-maker', slug: 'example-recipe-card-maker', title: 'Example project: recipe card maker', status: 'SHIPPED',
        dek: 'An example entry for the demonstration: a small app that turns a photo of a handwritten recipe into a tidy card.', stack: ['Example'], shippedAt: 'Dec 2026', footer: null, hasPage: true, link: '/building/example-recipe-card-maker/', pageImage: null, receipts: [] });
      c.pages['/building/example-recipe-card-maker/'] = { h1: 'Example project: recipe card maker', summary: '', meta: 'Example entry · December 2026', links: [], body: NOTE + '<h2>What it is</h2><p>The page body is written in the page file, exactly as project pages are written today.</p>' };
    } },
  { title: 'Publish writing', does: 'Use the existing writing workflow: one record in src/data/writing.ts and the essay page.',
    change: `{ slug: 'example-a-week-of-asking-ai-first', title: 'Example essay: a week of asking AI first', date: '2026-12-02', … }`,
    apply(c) {
      c.src.writing.push({ id: 'writing:example-a-week-of-asking-ai-first', slug: 'example-a-week-of-asking-ai-first', title: 'Example essay: a week of asking AI first', date: '2026-12-02', displayDate: 'December 2, 2026',
        dek: 'An example entry for the demonstration.', authorship: 'Example', image: null, link: '/writing/example-a-week-of-asking-ai-first/' });
      c.pages['/writing/example-a-week-of-asking-ai-first/'] = { h1: 'Example essay: a week of asking AI first', summary: '', meta: 'Example entry · December 2, 2026', links: [], body: NOTE + '<p>The essay text lives in its own page, as it does today.</p>' };
    } },
  { title: 'Publish a video on YouTube', does: 'Nothing on the website. The video sync reads the channel feed, adds the video to the archive and fetches its thumbnail.',
    change: 'node tools/sync-videos.mjs   (run here against an example feed with one new upload; YouTube’s image server is unreachable for the made-up video, so the title-card fallback shows)',
    apply(c) {
      const tmp = mkdtempSync(join(tmpdir(), 'r4-demo-')); const archive = join(tmp, 'archive.json'); const feed = join(tmp, 'feed.xml');
      copyFileSync(join(R, 'source/youtube-archive.json'), archive);
      writeFileSync(feed, `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><entry><id>yt:video:EXAMPLE0001</id><yt:videoId>EXAMPLE0001</yt:videoId><title>Example video: five AI terms in five minutes #ai</title>
<link rel="alternate" href="https://www.youtube.com/watch?v=EXAMPLE0001"/><published>2026-12-03T15:00:00+00:00</published>
<media:group><media:description>An example upload for the demonstration, not a real video. The project: https://kenashe.ai/building/example-recipe-card-maker/</media:description></media:group></entry></feed>`);
      const before = JSON.parse(readFileSync(archive, 'utf8')).length;
      const log = execFileSync('node', [join(R, 'tools/sync-videos.mjs'), '--feed', feed, '--archive', archive, '--thumbs', join(R, 'assets/video'), '--thumb-host', 'http://127.0.0.1:9', '--timeout', '800'], { encoding: 'utf8' }).trim().split('\n').pop();
      const all = JSON.parse(readFileSync(archive, 'utf8')); const v = all.find((x) => x.videoId === 'EXAMPLE0001');
      this.result = `Sync output: ${log.replace('[videos] ', '')}. The archive went from ${before} to ${all.length} videos; the ${before} older videos stayed even though this feed listed only one.`;
      // the same mapping tools/derive.mjs applies to every archived video
      c.src.videos.unshift({ id: v.id, videoId: v.videoId, title: v.title, date: v.date, published: v.published, kind: v.kind, url: v.url, summary: v.summary, hashtags: v.hashtags, thumbnail: v.thumbnail });
      for (const m of v.mentions) c.src.edges.push({ from: v.id, to: `building:${m.split('/')[2]}`, type: 'mentions', evidence: 'YouTube description' });
      rmSync(tmp, { recursive: true, force: true });
    } },
  { title: 'Change the homepage feature', does: 'Change one line in the homepage settings file.',
    change: `"featured": "building:example-recipe-card-maker"`,
    apply(c) { c.editorial.featured = 'building:example-recipe-card-maker'; } },
  { title: 'Hide an item from featured areas', does: 'Add its id to the hide list in the same settings file. Its page and archive entry stay.',
    change: `"hide": ["writing:example-a-week-of-asking-ai-first"]`,
    apply(c) { c.editorial.hide = ['writing:example-a-week-of-asking-ai-first']; } },
];

const render = () => build(structuredClone(content), { assets: '../../assets', demo: true }).pages;
const sections = (html) => { const m = new Map(); for (const [, name, inner] of html.matchAll(/data-section="([\w-]+)"([\s\S]*?)(?=data-section="|<footer)/g)) m.set(name, (m.get(name) || '') + inner); return m; };
let prev = render(); const report = [];
for (const s of steps) {
  s.apply(content); const now = render(); const added = [], changed = [];
  for (const [route, html] of now) {
    if (!prev.has(route)) { added.push(route); continue; }
    if (prev.get(route) === html) continue;
    const a = sections(prev.get(route)), b = sections(html);
    changed.push({ route, parts: [...b.keys()].filter((k) => a.get(k) !== b.get(k)).map((k) => SECTION[k] || k) });
  }
  report.push({ ...s, added, changed, unchanged: now.size - added.length - changed.length }); prev = now;
}
write(OUT, prev);

const link = (r) => `<a href="site${r}">${r === '/' ? 'Homepage' : r}</a>`;
writeFileSync(join(R, 'demo/index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Update workflow demonstration · Round 4</title><meta name="robots" content="noindex, nofollow, noarchive">
<link rel="stylesheet" href="../assets/site.css"><link rel="stylesheet" href="../review/review.css"></head><body class="review">
<p class="concept"><strong>Design concept.</strong> Round 4. Not the live KenAshe.ai. <a href="../index.html">Review page</a></p>
<main class="rv">
<h1>Updating the site, demonstrated</h1>
<p class="rv-lede">Five ordinary updates, applied one after another to a separate copy of the site. After each one the site was rebuilt and compared with the build before it, so the lists below are measured, not described. The example entries exist only in this demonstration build; the review prototype contains none of them.</p>
<p><a class="btn solid" href="site/">Open the demonstration build</a> <a class="text-link" href="../site/">Compare with the real prototype →</a></p>
${report.map((s, i) => `<section class="rv-step"><h2><span>${i + 1}</span> ${e(s.title)}</h2>
<p><strong>What Ken does:</strong> ${e(s.does)}</p>
<pre tabindex="0">${e(s.change)}</pre>
${s.result ? `<p>${e(s.result)}</p>` : ''}
<h3>What updated by itself</h3>
<ul>${s.added.map((r) => `<li><strong>New page:</strong> ${link(r)}</li>`).join('')}${s.changed.map((c) => `<li>${link(c.route)}: ${c.parts.map(e).join(', ') || 'navigation'}</li>`).join('')}</ul>
<p class="rv-note">${s.unchanged} other pages were rebuilt byte-for-byte identical.</p></section>`).join('\n')}
<p class="rv-note">Generated by <code>node round-4/demo/run.mjs</code>. This demonstrates the prototype’s build. In production the same records feed Astro’s build; the video step additionally needs the proposed scheduled workflow, which is not installed.</p>
</main></body></html>
`);
for (const s of report) console.log(`${s.title}: +${s.added.length} pages, ${s.changed.length} changed [${s.changed.map((c) => c.route + ' (' + c.parts.join('; ') + ')').join(' | ')}]`);
