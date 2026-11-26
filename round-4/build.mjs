// Round 4 prototype builder. No dependencies, no network.
//
//   node round-4/build.mjs            -> writes round-4/site/
//
// Every page is produced from four inputs:
//   data/sources.json       one record per project, essay and video (derived from production + the video archive)
//   content/editorial.json  the homepage choices: featured item, hidden items, video corrections
//   content/copy.json       site wording (approved intro; draft summaries awaiting approval)
//   content/pages.json      page bodies copied from the live site (prototype stand-in; production keeps its own)
//
// In production the same three functions (load -> model -> pages) become one small Astro module
// (src/lib/site.ts) that the page templates read. See HANDOFF.md.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const R = dirname(fileURLToPath(import.meta.url));
const LIVE = 'https://kenashe.ai';
const json = (p) => JSON.parse(readFileSync(join(R, p), 'utf8'));
const e = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const day = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${MONTHS[m - 1]} ${d}, ${y}`; };

// ---------------------------------------------------------------- load
export function load() {
  return { src: json('data/sources.json'), editorial: json('content/editorial.json'), copy: json('content/copy.json'), pages: json('content/pages.json').pages };
}

// ---------------------------------------------------------------- model: one record per item, used everywhere
export function model({ src, editorial, copy, pages }) {
  const hidden = new Set(editorial.hide || []);
  const fix = editorial.corrections || {};
  const sized = (file) => (file && existsSync(join(R, 'assets', file)) ? file : null);
  const edgesOf = (id) => src.edges.filter((x) => x.from === id || x.to === id).map((x) => (x.from === id ? x.to : x.from));

  const videos = src.videos.map((v) => {
    const c = fix[v.id] || {};
    return { id: v.id, type: 'video', videoId: v.videoId, kind: v.kind, date: v.date, dateLabel: day(v.date),
      title: c.title || v.title.replace(/(\s+#[\w-]+)+\s*$/, '').trim(), summary: c.summary ?? v.summary,
      url: v.url, watch: `https://www.youtube.com/watch?v=${v.videoId}`, image: sized(c.thumbnail || v.thumbnail) };
  });
  const video = Object.fromEntries(videos.map((v) => [v.id, v]));

  const projects = src.builds.map((b) => {
    const own = b.pageImage ? sized(`build/${b.slug}.webp`) : null;
    // A project's picture: its own image, otherwise the thumbnail of a video about it, otherwise a title card.
    const vid = src.edges.filter((x) => (x.from === b.id && x.type === 'embeds') || (x.to === b.id && x.from.startsWith('video:'))).map((x) => video[x.from === b.id ? x.to : x.from]).find(Boolean) || null;
    const route = b.hasPage ? `/building/${b.slug}/` : null;
    return { id: b.id, type: 'project', slug: b.slug, title: b.title, summary: copy.draft.plain[b.slug] || b.dek, dek: b.dek,
      dateLabel: b.shippedAt, route, page: route ? pages[route] : null, image: own || vid?.image || null, imageAlt: own ? `${b.title}: project image` : vid ? `Still from the video “${vid.title}”` : '',
      video: vid, stack: b.stack || [], receipts: b.receipts || [], context: b.footer || [] };
  });
  const writing = src.writing.map((w) => ({ id: w.id, type: 'writing', slug: w.slug, title: w.title, summary: w.dek, date: w.date, dateLabel: w.displayDate,
    authorship: w.authorship, route: w.link, page: pages[w.link], image: sized(`writing/${w.slug}.webp`), imageAlt: w.image?.alt || '' }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const all = Object.fromEntries([...projects, ...writing, ...videos].map((i) => [i.id, i]));
  for (const i of Object.values(all)) i.related = [...new Set(edgesOf(i.id))].map((id) => all[id]).filter((x) => x && x.id !== i.id);

  // ---- homepage choices (content/editorial.json)
  const ok = (i) => i && !hidden.has(i.id);
  const long = videos.filter((v) => v.kind === 'video');
  const featured = (ok(all[editorial.featured]) && all[editorial.featured]) || long.find(ok) || projects.find((p) => ok(p) && p.route);
  const used = new Set([featured.id]); const usedImages = new Set([featured.image]);
  // Nothing appears twice on the homepage, and neither does the same subject: an item is skipped when it,
  // its picture, or the same subject in another form (a project and its video, an essay and its video) is already shown.
  const take = (list, n, { strict = true } = {}) => { const out = []; for (const i of list) { if (out.length >= n) break; if (!ok(i) || used.has(i.id) || (i.image && usedImages.has(i.image)) || (strict && i.related.some((r) => r.type !== i.type && used.has(r.id)))) continue; out.push(i); used.add(i.id); if (i.image) usedImages.add(i.image); } return out; };
  const fill = (list, n) => { const a = take(list, n); return a.length < n ? [...a, ...take(list, n - a.length, { strict: false })] : a; };
  const chosen = (editorial.homeProjects || []).map((id) => all[id]).filter((p) => p?.type === 'project');
  const homeProjects = [...take(chosen, 3, { strict: false }), ...fill(projects.filter((p) => p.route && p.image), 3)].slice(0, 3);
  const homeVideos = fill(long, 3);
  const homeWriting = fill(writing, 3);

  const d = src.digest;
  const digest = { href: LIVE + d.link, published: d.published, paused: d.publishingPaused,
    line: d.publishingPaused ? 'Automated articles. Publishing is paused.' : 'Automated articles, published daily.' };
  return { projects, writing, videos, all, featured, homeProjects, homeVideos, homeWriting, digest, copy, person: src.person, head: src._meta.head };
}

// ---------------------------------------------------------------- rendering helpers
function context(route, opts) {
  const depth = route.split('/').filter(Boolean).length;
  const root = depth ? '../'.repeat(depth) : './';
  const assets = root + opts.assets;
  const names = new Set();
  const cx = {
    route, root, assets,
    to: (r) => (opts.routes.has(r.split('#')[0]) ? (root + r.replace(/^\//, '')) || './' : LIVE + r),
    // The signature transition: an item's picture carries one name on every page it appears on,
    // so the browser can carry it from a card into the opening of its page. At most once per page.
    vt: (item) => { const n = `pic-${item.type[0]}-${item.slug}`; if (!item.slug || names.has(n)) return ''; names.add(n); return ` style="view-transition-name:${n}"`; },
    names,
  };
  return cx;
}
const WIDTH = { video: 1280, writing: 1280, build: 1280, page: 1280, portrait: 1280 };
function img(cx, file, alt, { sizes = '(min-width: 900px) 50vw, 100vw', eager = false, w = 1280, h = 720, cls = '' } = {}) {
  const base = file.replace(/\.\w+$/, '.webp');
  return `<img${cls ? ` class="${cls}"` : ''} src="${cx.assets}/r/880/${base}" srcset="${cx.assets}/r/480/${base} 480w, ${cx.assets}/r/880/${base} 880w, ${cx.assets}/${file} ${WIDTH[file.split('/')[0]] || 1280}w" sizes="${sizes}" width="${w}" height="${h}" alt="${e(alt)}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async">`;
}
const tone = (s) => 'tone-' + ([...s].reduce((a, c) => a + c.charCodeAt(0), 0) % 3);
// Picture for any item: its image, or a title card drawn from its own title (no extra artwork needed).
function picture(cx, item, o = {}) {
  const name = o.named === false ? '' : cx.vt(item);
  if (item.image) return `<span class="pic"${name}>${img(cx, item.image, item.imageAlt ?? '', o)}</span>`;
  return `<span class="pic plate ${tone(item.title)}"${name} aria-hidden="true"><span>${e(item.title)}</span></span>`;
}
const arrow = '<span class="arr" aria-hidden="true">→</span>';
const ext = '<span class="arr" aria-hidden="true">↗</span>';
// A video picture that plays when chosen. It is an ordinary link to YouTube until JavaScript upgrades it.
function player(cx, v, o = {}) {
  return `<a class="player" href="${v.watch}" data-yt="${v.videoId}" data-title="${e(v.title)}" aria-label="Play video: ${e(v.title)}">${picture(cx, { ...v, imageAlt: '' }, { ...o, named: false })}<span class="play" aria-hidden="true"></span></a>`;
}
const kindLabel = { project: 'Project', writing: 'Writing', video: 'Video' };
const hrefOf = (cx, i) => (i.type === 'video' ? cx.to(`/videos/#v-${i.videoId}`) : i.route ? cx.to(i.route) : null);

function shell(cx, m, { title, description, body, cls = '', current = '' }, opts) {
  const nav = [['Projects', '/building/'], ['Videos', '/videos/'], ['Writing', '/writing/'], ['About', '/about/']];
  const c = m.copy;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(title)}</title>
<meta name="description" content="${e(description)}">
<meta name="robots" content="noindex, nofollow, noarchive">
<!-- Design concept. Production keeps its own canonical, robots, sitemap and structured data; none are set here on purpose. -->
<meta name="color-scheme" content="dark light">
<link rel="icon" href="${cx.assets}/favicon.svg" type="image/svg+xml">
<link rel="preload" href="${cx.assets}/fonts/bricolage-grotesque.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${cx.assets}/fonts/hanken-grotesk.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${cx.assets}/site.css">
<script src="${cx.assets}/site.js"></script>
</head>
<body class="${cls}">
<a class="skip" href="#main">Skip to content</a>
<p class="concept">${opts.demo ? '<strong>Demonstration build.</strong> Contains example entries that are not real. <a href="' + cx.root + '../index.html">Back to the demonstration</a>' : '<strong>Design concept.</strong> Round 4. Not the live KenAshe.ai. <a href="' + cx.root + '../index.html">Review page</a>'}</p>
<header class="top">
  <a class="brand" href="${cx.to('/')}"${cx.route === '/' ? ' aria-current="page"' : ''}>Ken Ashe</a>
  <nav aria-label="Main">
    ${nav.map(([l, r]) => `<a href="${cx.to(r)}"${current === r ? ' aria-current="page"' : ''}>${l}</a>`).join('\n    ')}
  </nav>
</header>
<main id="main">
${body}
</main>
<footer class="foot">
  <div class="foot-in">
    <div class="foot-id">
      <a class="brand" href="${cx.to('/')}">Ken Ashe</a>
      <p>${c.intro.headline.join(' ')}</p>
    </div>
    <nav aria-label="Site">
      <h2>Site</h2>
      ${nav.map(([l, r]) => `<a href="${cx.to(r)}">${l}</a>`).join('\n      ')}
    </nav>
    <nav aria-label="Follow">
      <h2>Follow</h2>
      ${c.follow.map((f) => `<a href="${f.href}" rel="noopener">${f.label} ${ext}</a>`).join('\n      ')}
    </nav>
    <nav aria-label="More">
      <h2>More</h2>
      <a href="${LIVE}/newsroom/">Newsroom ${ext}</a>
      <a href="${m.digest.href}">Digest archive ${ext}</a>
      <p class="foot-note">${m.digest.line}</p>
      <a href="https://luckydomains.io/" rel="noopener">Lucky Domains ${ext}</a>
      <p class="foot-note">My separate business.</p>
    </nav>
  </div>
  <p class="foot-legal"><span>© 2026 Ken Ashe</span> <a href="${LIVE}/privacy/">Privacy</a> <a href="${LIVE}/terms/">Terms</a> <a href="${LIVE}/disclosure/">Disclosure</a> <a href="${LIVE}/writing/rss.xml">Writing RSS</a></p>
</footer>
</body>
</html>
`;
}

// ---------------------------------------------------------------- cards
function projectCard(cx, p, o = {}) {
  const href = hrefOf(cx, p);
  return `<article class="card">
  <a class="card-link" href="${href}">
    ${picture(cx, p, o)}
    <h3>${e(p.title)}</h3>
  </a>
  <p>${e(p.summary)}</p>
</article>`;
}
function videoCard(cx, v, o = {}) {
  const rel = v.related.find((r) => r.route);
  return `<article class="card vcard" id="v-${v.videoId}">
  ${player(cx, v, o)}
  <h3><a href="${v.watch}" data-yt="${v.videoId}" data-title="${e(v.title)}">${e(v.title)}</a></h3>
  ${o.summary !== false && v.summary ? `<p>${e(v.summary)}</p>` : ''}
  <p class="meta">${v.dateLabel}${rel && o.related !== false ? ` · <a href="${cx.to(rel.route)}">${rel.type === 'project' ? 'The project behind it' : 'Read the write-up'}</a>` : ''}</p>
</article>`;
}
function writingRow(cx, w) {
  return `<article class="row">
  <a class="row-link" href="${cx.to(w.route)}">
    ${picture(cx, w, { sizes: '(min-width: 700px) 240px, 34vw' })}
    <span class="row-text"><span class="meta">${w.dateLabel}</span><h3>${e(w.title)}</h3><span class="row-sum">${e(w.summary)}</span></span>
  </a>
</article>`;
}
const section = (name, cls, inner) => `<section class="${cls}" data-section="${name}">\n${inner}\n</section>`;

// ---------------------------------------------------------------- pages
function home(cx, m) {
  const c = m.copy.intro; const f = m.featured;
  const fHref = hrefOf(cx, f);
  const fAction = f.type === 'video' ? `<a class="btn solid" href="${f.watch}" data-yt="${f.videoId}" data-title="${e(f.title)}">Watch the video</a>` : `<a class="btn solid" href="${fHref}">${f.type === 'project' ? 'See the project' : 'Read it'} ${arrow}</a>`;
  const fMore = f.type === 'video' && f.related.find((r) => r.route);
  return [
    section('introduction', 'hero', `  <div class="hero-in">
    <div class="hero-text">
      <p class="eyebrow">${c.short}</p>
      <h1>${c.name}</h1>
      <p class="headline">${c.headline.map((l) => `<span>${l}</span>`).join(' ')}</p>
      <p class="lede">${c.text}</p>
      <p class="actions"><a class="btn solid" href="${cx.to('/videos/')}">${c.primary} ${arrow}</a> <a class="btn line" href="${cx.to('/building/')}">${c.secondary} ${arrow}</a></p>
    </div>
    <figure class="hero-photo">
      ${img(cx, 'portrait/ken-black-polo-1280.webp', 'Ken Ashe, smiling, in a black polo shirt', { eager: true, w: 1122, h: 1402, sizes: '(min-width: 900px) 34vw, 70vw' })}
      <figcaption>${c.aside}</figcaption>
    </figure>
  </div>`),
    section('featured', 'band featured', `  <div class="wrap">
    <div class="feature">
      <div class="feature-pic">${f.type === 'video' ? player(cx, f, { sizes: '(min-width: 900px) 58vw, 100vw' }) : `<a href="${fHref}" tabindex="-1" aria-hidden="true">${picture(cx, f, { sizes: '(min-width: 900px) 58vw, 100vw' })}</a>`}</div>
      <div class="feature-text">
        <p class="eyebrow">${f.type === 'video' ? 'Latest video' : 'Featured ' + kindLabel[f.type].toLowerCase()}${f.type === 'video' ? ' · ' + f.dateLabel : ''}</p>
        <h2>${e(f.title)}</h2>
        <p>${e(f.summary)}</p>
        <p class="actions">${fAction}${fMore ? ` <a class="text-link" href="${cx.to(fMore.route)}">${fMore.type === 'project' ? 'The project behind it' : 'Read the write-up'} ${arrow}</a>` : ''}</p>
      </div>
    </div>
  </div>`),
    section('projects', 'band', `  <div class="wrap">
    <div class="band-head"><h2>Things I’ve made</h2><a class="text-link" href="${cx.to('/building/')}">All projects ${arrow}</a></div>
    <div class="grid three">
${m.homeProjects.map((p) => projectCard(cx, p, { sizes: '(min-width: 900px) 31vw, 100vw' })).join('\n')}
    </div>
  </div>`),
    section('recent', 'band tint', `  <div class="wrap">
    <div class="band-head"><h2>More to watch</h2><a class="text-link" href="${cx.to('/videos/')}">All videos ${arrow}</a></div>
    <div class="grid three">
${m.homeVideos.map((v) => videoCard(cx, v, { sizes: '(min-width: 900px) 31vw, 100vw', summary: false, related: false })).join('\n')}
    </div>
    <div class="band-head second"><h2>And to read</h2><a class="text-link" href="${cx.to('/writing/')}">All writing ${arrow}</a></div>
    <div class="rows">
${m.homeWriting.map((w) => writingRow(cx, w)).join('\n')}
    </div>
  </div>`),
    section('about', 'band dark about-strip', `  <div class="wrap about-in">
    <figure>${img(cx, 'portrait/ken-hoodie-1280.webp', 'Ken Ashe in a navy hoodie', { w: 1280, h: 1370, sizes: '(min-width: 900px) 280px, 50vw' })}</figure>
    <div>
      <h2>Hi, I’m Ken.</h2>
      ${m.copy.draft.homeAbout.map((p, i) => `<p>${i === 0 ? e(p).replace(/^I’m Ken\. /, '') : e(p)}</p>`).join('\n      ')}
      <p class="actions"><a class="btn line" href="${cx.to('/about/')}">More about me ${arrow}</a></p>
      <p class="follow"><span>Follow along</span> ${m.copy.follow.map((x) => `<a href="${x.href}" rel="noopener">${x.label}</a>`).join(' ')}</p>
    </div>
  </div>`),
  ].join('\n');
}

function projectsIndex(cx, m) {
  const withPage = m.projects.filter((p) => p.route); const rest = m.projects.filter((p) => !p.route);
  return `<section class="page-head" data-section="head">
  <div class="wrap"><h1>Projects</h1><p class="lede">Things I’ve made with AI: apps, agents, videos and a few experiments that got out of hand. Each one says what it is and what happened.</p></div>
</section>
<section class="band" data-section="projects">
  <div class="wrap">
    <div class="grid two">
${withPage.map((p) => projectCard(cx, p, { sizes: '(min-width: 900px) 46vw, 100vw' })).join('\n')}
    </div>
  </div>
</section>
${rest.length ? `<section class="band tint" data-section="more">
  <div class="wrap narrow-list">
    <h2>Smaller builds</h2>
    <ul class="plain-list">
${rest.map((p) => `      <li><h3>${e(p.title)}</h3><p>${e(p.summary)}</p>${p.dateLabel || p.context.length ? `<p class="meta">${[...new Set([p.dateLabel, ...p.context])].filter(Boolean).map(e).join(' · ')}</p>` : ''}</li>`).join('\n')}
    </ul>
  </div>
</section>` : ''}`;
}

function videosIndex(cx, m) {
  const long = m.videos.filter((v) => v.kind === 'video'); const shorts = m.videos.filter((v) => v.kind === 'short');
  const [first, ...others] = long;
  const rel = first.related.find((r) => r.route);
  return `<section class="page-head" data-section="head">
  <div class="wrap head-split"><div><h1>Videos</h1><p class="lede">AI explained in plain English, and what happens when I put it to work. New videos appear here as they go up on YouTube.</p></div>
  <p><a class="btn solid" href="https://www.youtube.com/@KenAshe" rel="noopener">Subscribe on YouTube ${ext}</a></p></div>
</section>
<section class="band featured" data-section="latest">
  <div class="wrap">
    <div class="feature" id="v-${first.videoId}">
      <div class="feature-pic">${player(cx, first, { eager: true, sizes: '(min-width: 900px) 58vw, 100vw' })}</div>
      <div class="feature-text">
        <p class="eyebrow">Latest video · ${first.dateLabel}</p>
        <h2>${e(first.title)}</h2>
        <p>${e(first.summary)}</p>
        <p class="actions"><a class="btn solid" href="${first.watch}" data-yt="${first.videoId}" data-title="${e(first.title)}">Watch the video</a>${rel ? ` <a class="text-link" href="${cx.to(rel.route)}">${rel.type === 'project' ? 'The project behind it' : 'Read the write-up'} ${arrow}</a>` : ''}</p>
      </div>
    </div>
  </div>
</section>
<section class="band" data-section="videos">
  <div class="wrap">
    <div class="band-head"><h2>All videos</h2></div>
    <div class="grid three">
${others.map((v) => videoCard(cx, v, { sizes: '(min-width: 900px) 31vw, 100vw' })).join('\n')}
    </div>
  </div>
</section>
${shorts.length ? `<section class="band tint" data-section="shorts">
  <div class="wrap">
    <div class="band-head"><h2>Shorts</h2><p>Under a minute each.</p></div>
    <div class="grid four">
${shorts.map((v) => videoCard(cx, v, { sizes: '(min-width: 900px) 23vw, 50vw', summary: false })).join('\n')}
    </div>
  </div>
</section>` : ''}`;
}

function writingIndex(cx, m) {
  return `<section class="page-head" data-section="head">
  <div class="wrap"><h1>Writing</h1><p class="lede">Longer thoughts, lessons from projects and the occasional story that has nothing to do with AI. All written by me.</p></div>
</section>
<section class="band" data-section="writing">
  <div class="wrap">
    <div class="rows wide">
${m.writing.map((w) => writingRow(cx, w)).join('\n')}
    </div>
  </div>
</section>`;
}

// Page bodies come from production. Links are pointed at the prototype where the page exists, otherwise at the live site.
function body(cx, m, html) {
  return html.replaceAll('{{assets}}', cx.assets)
    .replace(/<img ([^>]*?)src="([^"]+)\/page\/([^"]+)\.webp"/g, (_, a, base, name) => `<img ${a}src="${base}/r/880/page/${name}.webp" srcset="${base}/r/480/page/${name}.webp 480w, ${base}/r/880/page/${name}.webp 880w, ${base}/page/${name}.webp 1280w" sizes="(min-width: 800px) 720px, 100vw"`)
    .replace(/<div data-title="([^"]*)" data-video="([\w-]{11})"><\/div>/g, (_, t, id) => { const v = m.all[`video:${id}`]; return v ? `<figure class="embed">${player(cx, v, { sizes: '(min-width: 800px) 720px, 100vw' })}<figcaption><a href="${v.watch}" rel="noopener">Watch on YouTube ${ext}</a></figcaption></figure>` : `<p><a href="https://www.youtube.com/watch?v=${id}" rel="noopener">Watch on YouTube ${ext}</a></p>`; })
    .replace(/<a href="(\/[^"]*)"/g, (_, r) => `<a href="${cx.to(r)}"`)
    .replace(/<a href="(https?:\/\/(?!kenashe\.ai)[^"]+)"/g, '<a href="$1" rel="noopener"')
    .replace(/<table>/g, '<div class="scroll" tabindex="0" role="region" aria-label="Table"><table>').replace(/<\/table>/g, '</table></div>')
    .replace(/<pre>/g, '<pre tabindex="0">');
}
function relatedBlock(cx, items, heading) {
  const list = items.filter((i) => hrefOf(cx, i));
  if (!list.length) return '';
  return `<section class="band tint" data-section="related">
  <div class="wrap">
    <div class="band-head"><h2>${heading}</h2></div>
    <div class="grid three">
${list.slice(0, 3).map((i) => (i.type === 'video' ? videoCard(cx, i, { sizes: '(min-width: 900px) 31vw, 100vw', summary: false, related: false }) : `<article class="card"><a class="card-link" href="${hrefOf(cx, i)}">${picture(cx, i, { sizes: '(min-width: 900px) 31vw, 100vw' })}<span class="meta">${kindLabel[i.type]}</span><h3>${e(i.title)}</h3></a></article>`)).join('\n')}
    </div>
  </div>
</section>`;
}

function projectPage(cx, m, p) {
  const pg = p.page; const idx = m.projects.filter((x) => x.route); const next = idx[(idx.indexOf(p) + 1) % idx.length];
  const inBody = p.video && pg.body.includes(`data-video="${p.video.videoId}"`); // the page already shows this video further down
  const hero = p.video && !inBody ? `${player(cx, { ...p.video, slug: p.slug, type: 'project', image: p.image }, { eager: true, sizes: '(min-width: 1100px) 1040px, 100vw' }).replace(/<span class="pic( plate[^"]*)?"/, (x) => x + cx.vt(p))}` : picture(cx, p, { eager: true, sizes: '(min-width: 1100px) 1040px, 100vw' });
  const links = [...(p.video ? [{ label: 'Watch on YouTube', href: p.video.watch }] : []), ...(pg.links || []).map((l) => ({ label: l.label.replace(/\s*[↗→]\s*$/, ''), href: l.href })), ...p.receipts.filter((r) => r.kind === 'repository').map((r) => ({ label: `Code: ${r.label}`, href: r.url }))];
  const seen = new Set(); const uniq = links.filter((l) => !seen.has(l.href) && seen.add(l.href));
  const proof = p.receipts.filter((r) => r.kind !== 'repository');
  const others = p.related.filter((r) => r.id !== p.video?.id);
  return `<article class="detail project">
  <header class="detail-head" data-section="head">
    <div class="wrap">
      <p class="crumb"><a href="${cx.to('/building/')}"><span aria-hidden="true">←</span> Projects</a></p>
      <h1>${e(pg.h1)}</h1>
      <p class="lede">${e(p.summary)}</p>
      ${pg.meta ? `<p class="meta">${e(pg.meta)}</p>` : ''}
      <div class="detail-pic">${hero}</div>
      ${p.video ? `<p class="actions"><a class="btn solid" href="${p.video.watch}" data-yt="${p.video.videoId}" data-title="${e(p.video.title)}">Watch the video</a></p>` : ''}
    </div>
  </header>
  <div class="wrap reading" data-section="body">
    ${pg.summary && pg.summary !== p.summary ? `<p class="standfirst">${e(pg.summary)}</p>` : ''}
    <div class="prose">
${body(cx, m, pg.body)}
    </div>
    ${uniq.length || proof.length || p.stack.length ? `<aside class="further" aria-labelledby="further">
      <h2 id="further">Explore further</h2>
      ${uniq.length ? `<ul class="links">${uniq.map((l) => `<li><a href="${l.href.startsWith('/') ? cx.to(l.href) : l.href}" rel="noopener">${e(l.label)} ${l.href.startsWith('/') ? arrow : ext}</a></li>`).join('')}</ul>` : ''}
      ${proof.length ? `<details><summary>The receipts (${proof.length})</summary><p>Public records you can check for yourself.</p><ul class="receipts">${proof.map((r) => `<li><span>${e(r.label)}</span> <a href="${r.url}" rel="noopener">${e(r.value ? r.value.slice(0, 10) + '…' + r.value.slice(-6) : r.url.replace(/^https?:\/\//, ''))} ${ext}</a></li>`).join('')}</ul></details>` : ''}
      ${p.stack.length ? `<p class="built">Tools and topics: ${p.stack.map(e).join(', ')}.</p>` : ''}
    </aside>` : ''}
  </div>
</article>
${relatedBlock(cx, others, 'Connected to this project')}
<section class="band next" data-section="next">
  <div class="wrap">
    <a class="next-link" href="${cx.to(next.route)}">
      <span class="next-text"><span class="meta">Next project</span><span class="next-title">${e(next.title)}</span><span class="next-sum">${e(next.summary)}</span></span>
      ${picture(cx, next, { sizes: '(min-width: 900px) 420px, 100vw' })}
    </a>
  </div>
</section>`;
}

function writingPage(cx, m, w) {
  const pg = w.page; const i = m.writing.indexOf(w); const next = m.writing[(i + 1) % m.writing.length];
  return `<article class="detail essay">
  <header class="detail-head" data-section="head">
    <div class="wrap reading">
      <p class="crumb"><a href="${cx.to('/writing/')}"><span aria-hidden="true">←</span> Writing</a></p>
      <h1>${e(pg.h1)}</h1>
      <p class="lede">${e(w.summary)}</p>
      <p class="meta">${e(pg.meta || `By Ken Ashe · ${w.dateLabel}`)}</p>
    </div>
    ${w.image ? `<div class="wrap essay-pic"><div class="detail-pic">${picture(cx, w, { eager: true, sizes: '(min-width: 1000px) 920px, 100vw' })}</div></div>` : ''}
  </header>
  <div class="wrap reading" data-section="body">
    <div class="prose">
${body(cx, m, pg.body)}
    </div>
  </div>
</article>
${relatedBlock(cx, w.related, 'Connected to this piece')}
<section class="band next" data-section="next">
  <div class="wrap">
    <a class="next-link" href="${cx.to(next.route)}">
      <span class="next-text"><span class="meta">Read next</span><span class="next-title">${e(next.title)}</span><span class="next-sum">${e(next.summary)}</span></span>
      ${picture(cx, next, { sizes: '(min-width: 900px) 420px, 100vw' })}
    </a>
  </div>
</section>`;
}

function about(cx, m) {
  const d = m.copy.draft; const c = m.copy.intro;
  const sections = [...m.all['__about'].body.matchAll(/<section>([\s\S]*?)<\/section>/g)].map((x) => x[1]);
  const pick = (h) => sections.find((s) => s.includes(`<h2>${h}`)) || '';
  return `<section class="about-hero" data-section="head">
  <div class="wrap about-top">
    <div>
      <p class="eyebrow">${c.short}</p>
      <h1>Ken Ashe</h1>
      <p class="headline small">${c.headline.map((l) => `<span>${l}</span>`).join(' ')}</p>
      <p class="lede">${e(d.aboutLead)}</p>
      <p class="follow"><span>Follow along</span> ${m.copy.follow.map((x) => `<a href="${x.href}" rel="noopener">${x.label}</a>`).join(' ')}</p>
    </div>
    <figure>${img(cx, 'portrait/ken-hoodie-1280.webp', 'Ken Ashe in a navy hoodie', { eager: true, w: 1280, h: 1370, sizes: '(min-width: 900px) 36vw, 80vw' })}</figure>
  </div>
</section>
<section class="band" data-section="pillars">
  <div class="wrap">
    <div class="band-head"><h2>What you’ll find here</h2></div>
    <div class="grid two pillars">
${d.pillars.map((p) => `      <div class="pillar"><h3>${e(p.title)}</h3><p>${e(p.text)}</p><p><a class="text-link" href="${cx.to(p.link)}">${p.cta} ${arrow}</a></p></div>`).join('\n')}
    </div>
  </div>
</section>
<section class="band tint" data-section="story">
  <div class="wrap reading">
    <h2>How I got here</h2>
    <div class="prose">
      ${d.aboutBackground.map((p) => `<p>${e(p)}</p>`).join('\n      ')}
      <p>Lucky Domains is my separate business, a digital presence studio. You can read about that side of my work on the <a href="https://luckydomains.io/founder/ken-ashe/" rel="noopener">Lucky Domains founder page</a>.</p>
    </div>
  </div>
</section>
<section class="band" data-section="record">
  <div class="wrap reading">
    <div class="prose record">
${body(cx, m, pick('Speaking'))}
${body(cx, m, pick('Credentials'))}
    </div>
    <p class="contact">Say hello: <a href="mailto:hello@kenashe.ai">hello@kenashe.ai</a></p>
  </div>
</section>`;
}

// ---------------------------------------------------------------- site
export function pagesOf(m, opts = {}) {
  opts = { assets: '../assets', demo: false, ...opts };
  m.all['__about'] = m.all['__about'] || { body: opts.aboutBody };
  const routes = new Set(['/', '/building/', '/videos/', '/writing/', '/about/', ...m.projects.filter((p) => p.route).map((p) => p.route), ...m.writing.map((w) => w.route)]);
  opts.routes = routes;
  const out = new Map(); const names = {};
  const add = (route, title, description, cls, current, fn) => {
    const cx = context(route, opts);
    out.set(route, shell(cx, m, { title, description, cls, current, body: fn(cx) }, opts)); names[route] = [...cx.names];
  };
  const c = m.copy.intro;
  add('/', `Ken Ashe · ${c.headline.join(' ')}`, c.text, 'home', '', (cx) => home(cx, m));
  add('/building/', 'Projects · Ken Ashe', 'Things Ken Ashe has made with AI: apps, agents, videos and experiments.', '', '/building/', (cx) => projectsIndex(cx, m));
  add('/videos/', 'Videos · Ken Ashe', 'Every video from Ken Ashe: AI explained in plain English, and what happens when he puts it to work.', '', '/videos/', (cx) => videosIndex(cx, m));
  add('/writing/', 'Writing · Ken Ashe', 'Original writing by Ken Ashe.', '', '/writing/', (cx) => writingIndex(cx, m));
  add('/about/', 'About · Ken Ashe', m.copy.draft.aboutLead, '', '/about/', (cx) => about(cx, m));
  for (const p of m.projects.filter((x) => x.route)) add(p.route, `${p.page.h1} · Ken Ashe`, p.summary, '', '/building/', (cx) => projectPage(cx, m, p));
  for (const w of m.writing) add(w.route, `${w.page.h1} · Ken Ashe`, w.summary, '', '/writing/', (cx) => writingPage(cx, m, w));
  return { pages: out, names };
}

export function build(content = load(), opts = {}) {
  const m = model(content);
  return { model: m, ...pagesOf(m, { ...opts, aboutBody: content.pages['/about/'].body }) };
}

export function write(outDir, pages) {
  rmSync(outDir, { recursive: true, force: true });
  for (const [route, html] of pages) { const f = join(outDir, route, 'index.html'); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, html); }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = join(R, 'site');
  const { pages, model: m } = build(load(), { assets: relative(out, join(R, 'assets')).replace(/\\/g, '/') });
  write(out, pages);
  console.log(`built ${pages.size} pages -> round-4/site/ · featured: ${m.featured.id} · home projects: ${m.homeProjects.map((p) => p.slug).join(', ')}`);
}
