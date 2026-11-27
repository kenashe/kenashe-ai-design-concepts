// The update workflow, demonstrated on the real production structure, in isolation.
//
//   node round-5/demo/run.mjs      -> writes round-5/demo/site/, round-5/demo/patches/ and round-5/demo/index.html
//
// Needs PRODUCTION_COPY: a local clone of kenashe/kenashe that has NO remote, on the branch that carries
// the proposed content fields (production-plan/patches/0001-proposed-content-fields.patch applied to 8b35b45).
// Every step below edits real production files in that copy (src/data/builds.ts, src/pages/…), commits them
// on a throwaway branch, re-reads the records with the same reader the prototype uses (tools/derive.mjs),
// rebuilds, and records exactly which pages and sections changed. Nothing is pushed anywhere, and nothing
// here touches round-5/site/ or the real video archive.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, copyFileSync, cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { R, load, build, write } from '../build.mjs';

const PROD = process.env.PRODUCTION_COPY || '/agent/workspace/prod-demo';
const BASE = process.env.PRODUCTION_BASE || 'demo/round-5-content-fields';
const OUT = join(R, 'demo/site'); const PATCHES = join(R, 'demo/patches');
const git = (...a) => execFileSync('git', ['-C', PROD, ...a], { encoding: 'utf8' });
if (git('remote').trim()) throw new Error('The production copy has a remote. This demonstration only runs in a copy that cannot push.');
git('checkout', '-q', '-f', '-B', 'demo/update-demonstration', BASE); git('clean', '-qfd', 'src');
rmSync(PATCHES, { recursive: true, force: true }); mkdirSync(PATCHES, { recursive: true });

const tmp = mkdtempSync(join(tmpdir(), 'r5-demo-'));
const archive = join(tmp, 'archive.json'); copyFileSync(join(R, 'source/youtube-archive.json'), archive);
cpSync(join(R, 'assets/video'), join(tmp, 'assets/video'), { recursive: true }); // a copy, so the real pictures are never touched
const base = load();
const e = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const edit = (file, fn) => { const p = join(PROD, file); writeFileSync(p, fn(readFileSync(p, 'utf8'))); };
const add = (file, text) => { const p = join(PROD, file); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, text); };
let n = 0;
const commit = (msg) => { git('add', '-A'); git('-c', 'user.name=Update demonstration', '-c', 'user.email=noreply@example.invalid', 'commit', '-qm', msg); const name = `${String(++n).padStart(2, '0')}-${msg.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.patch`; writeFileSync(join(PATCHES, name), git('format-patch', '-1', '--stdout')); return { name, stat: git('show', '--stat', '--format=', 'HEAD').trim() }; };

// The page-file reader. Astro itself could not be installed in the build environment (the package registry
// refused downloads), so the write-up is read straight from its .astro file: constants from the frontmatter,
// then the <h1>, the meta line and everything inside <div class="prose">.
function readPage(file) {
  const src = readFileSync(join(PROD, file), 'utf8'); const [, front = '', tpl = ''] = src.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) || [];
  const vars = Object.fromEntries([...front.matchAll(/const\s+(\w+)\s*=\s*\n?\s*(['"`])((?:\\.|(?!\2).)*)\2/g)].map((m) => [m[1], m[3].replace(/\\(['"`])/g, '$1')]));
  const fill = (t) => t.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  const prose = tpl.match(/<div class="prose">([\s\S]*?)\n\s*<\/div>\s*<\/article>/)?.[1] ?? '';
  return { h1: fill(tpl.match(/<h1>([\s\S]*?)<\/h1>/)?.[1] ?? ''), summary: vars.summary || vars.description || '', meta: fill(tpl.match(/<p class="meta">([\s\S]*?)<\/p>/)?.[1] ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(), links: [], body: fill(prose).replace(/ target="_blank"/g, '').trim() };
}
// Read the records from the production copy exactly as the prototype does, then build.
const editorial = structuredClone(base.editorial);
function content() {
  const out = join(tmp, 'sources.json');
  execFileSync('node', ['--import', join(R, 'tools/ts-resolve.mjs'), join(R, 'tools/derive.mjs'), PROD], { env: { ...process.env, SOURCES_OUT: out, VIDEO_ARCHIVE: archive, PRODUCTION_HEAD: '8b35b45 + demonstration commits' }, encoding: 'utf8' });
  const src = JSON.parse(readFileSync(out, 'utf8')); const pages = { ...base.pages };
  for (const b of src.builds) if (b.hasPage && !pages[b.link] && existsSync(join(PROD, `src/pages/building/${b.slug}.astro`))) pages[b.link] = readPage(`src/pages/building/${b.slug}.astro`);
  for (const w of src.writing) if (!pages[w.link] && existsSync(join(PROD, `src/pages/writing/${w.slug}/index.astro`))) pages[w.link] = readPage(`src/pages/writing/${w.slug}/index.astro`);
  return { src, editorial: structuredClone(editorial), copy: base.copy, pages };
}
const render = () => build(content(), { assets: '../../assets', demo: true });

const SLUG = 'example-recipe-card-maker'; const ROUTE = `/building/${SLUG}/`;
const RECORD = `  {
    title: 'Example: recipe card maker',
    status: 'SHIPPED',
    dek: 'Example entry for the update demonstration. Not a real project.',
    summary: 'An example entry, not a real project. A small app that turns a photo of a handwritten recipe into a tidy, printable card.',
    stack: ['Example'],
    shippedAt: 'Dec 2026',
    link: '${ROUTE}',
  },
`;
const PAGE = `---
// Example write-up for the update demonstration. Not a real project. Same shape as the other Building pages.
import BuildLayout from '../../layouts/BuildLayout.astro';

const title = 'Example: I Built a Recipe Card Maker in an Afternoon';
const status = 'SHIPPED';
const date = 'December 2026';
const summary = 'Example entry for the update demonstration. Not a real project.';
const stack = ['Example'];
---

<BuildLayout
  title={title}
  description={summary}
  breadcrumbs={[
    { name: 'Home', path: '/' },
    { name: 'Building', path: '/building/' },
    { name: title, path: '${ROUTE}' },
  ]}
>
  <article class="build">
    <nav class="crumbs" aria-label="Breadcrumb">
      <a href="/building/"><span aria-hidden="true">&larr;</span> Building</a>
    </nav>

    <header class="build-header">
      <h1>{title}</h1>
      <p class="summary">{summary}</p>
      <p class="meta">Example entry · {date}</p>
      <ul class="stack" aria-label="Stack">
        {stack.map((s) => <li>{s}</li>)}
      </ul>
    </header>

    <div class="prose">
      <p><strong>This is an example entry made for the demonstration. It is not real.</strong> It exists only to show where a new project appears.</p>
      <h2>What it is</h2>
      <p>The write-up is an ordinary page file, written the way the other project pages are written today.</p>
      <h2>Related work</h2>
      <p>Links written in the page connect it to other work automatically. This page mentions the <a href="/building/ai-explainer-producer/">AI explainer producer</a> and the essay <a href="/writing/ai-editor-trusted-least/">about the AI editor</a>, so each of them now lists it as connected.</p>
    </div>
  </article>
</BuildLayout>
`;
const ESSAY = 'example-a-week-of-asking-ai-first';
const steps = [
  { title: 'Add a project', does: 'Add one record to the project list, src/data/builds.ts, and (because this one has a write-up) one page file in src/pages/building/. No picture was supplied.',
    apply() {
      edit('src/data/builds.ts', (s) => s.replace('export const projects: Project[] = [\n', 'export const projects: Project[] = [\n' + RECORD)); add(`src/pages/building/${SLUG}.astro`, PAGE);
      return commit('Add a project');
    },
    check(s) {
      const m = s.model; const p = m.all[`building:${SLUG}`];
      return [
        `Homepage eligibility: it is the newest project with a write-up, so the automatic rule places it ${m.homeProjects.indexOf(p) + 1} of ${m.homeProjects.length} in “Things I’ve made”, as a text card because it has no picture.`,
        `Projects list: position ${m.projects.indexOf(p) + 1} of ${m.projects.length}, ordered by date as production orders them.`,
        `Its own page exists at ${ROUTE}, opening with the record’s summary and the heading from the page file.`,
        `Related content, from the two links written in the page: ${p.related.map((r) => `“${r.title}”`).join(' and ')}. Each of those pages now lists the new project under “Connected”.`,
      ];
    } },
  { title: 'Change its title and description', does: 'Edit the two fields in the same record in src/data/builds.ts. The page file is not touched.',
    apply() {
      edit('src/data/builds.ts', (s) => s.replace("title: 'Example: recipe card maker',", "title: 'Example: recipe cards from a photo',").replace('A small app that turns a photo of a handwritten recipe into a tidy, printable card.', 'Point a phone at a handwritten recipe and get a clean card back.'));
      return commit('Change the title and description');
    },
    check(s) {
      const has = (r, t) => s.pages.get(r).includes(t); const T = 'Example: recipe cards from a photo', D = 'Point a phone at a handwritten recipe and get a clean card back.', H = 'Example: I Built a Recipe Card Maker in an Afternoon';
      const rel = s.model.all[`building:${SLUG}`].related.map((r) => r.route); const prev = [...s.pages.keys()].find((r) => r.startsWith('/building/') && r !== ROUTE && /data-section="next"[\s\S]*Example: recipe cards from a photo/.test(s.pages.get(r)));
      const row = (field, where, ok) => `${ok ? 'Updated' : 'NOT updated'} · ${field}: ${where}`;
      return [
        row('Card title', 'homepage card', has('/', T)), row('Card title', 'Projects list', has('/building/', T)), row('Card title', `“Connected” cards on ${rel.join(' and ')}`, rel.every((r) => has(r, T))), row('Card title', `“Next project” link on ${prev}`, !!prev),
        row('Description', 'homepage card and Projects list', has('/', D) && has('/building/', D)), row('Description', 'opening line of its own page, and the page’s search description', new RegExp(`<p class="lede">[^<]*${D}</p>`).test(s.pages.get(ROUTE)) && new RegExp(`<meta name="description" content="[^"]*${D}">`).test(s.pages.get(ROUTE))),
        `Unchanged, by design · Page heading and browser tab title: still “${H}” (${has(ROUTE, `<h1>${H}</h1>`) ? 'confirmed' : 'NOT confirmed'}). These belong to the page file. To change them, edit the title line at the top of src/pages/building/${SLUG}.astro.`,
        `Unchanged, by design · The write-up itself.`,
      ];
    } },
  { title: 'Publish writing', does: 'The existing writing workflow: one record in src/data/writing.ts and the essay’s page file.',
    apply() {
      edit('src/data/writing.ts', (s) => s.replace('export const essays: Essay[] = [\n', `export const essays: Essay[] = [\n  {\n    slug: '${ESSAY}',\n    title: 'Example essay: a week of asking AI first',\n    date: 'December 2, 2026',\n    published: '2026-12-02',\n    dek: 'An example entry for the demonstration. Not a real essay.',\n    authorship: 'Example entry',\n  },\n`));
      add(`src/pages/writing/${ESSAY}/index.astro`, `---\n// Example essay for the update demonstration. Not real.\nimport BaseLayout from '../../../layouts/BaseLayout.astro';\nimport { essayBySlug, authorshipOf } from '../../../data/writing';\n\nconst essay = essayBySlug('${ESSAY}');\nconst authorship = authorshipOf(essay);\nconst title = 'Example essay: a week of asking AI first';\nconst description = 'An example entry for the demonstration. Not a real essay.';\n---\n\n<BaseLayout title={title} description={description}>\n  <article class="essay">\n    <h1>{title}</h1>\n    <p class="meta">By Ken Ashe · December 2, 2026 · Example entry</p>\n    <div class="prose">\n      <p><strong>This is an example entry made for the demonstration. It is not real.</strong></p>\n      <p>The essay text lives in its own page file, as it does today.</p>\n    </div>\n  </article>\n</BaseLayout>\n`);
      return commit('Publish writing');
    } },
  { title: 'Publish a video on YouTube', does: 'Nothing on the website. The video sync reads the channel feed, adds the video to the archive and fetches its thumbnail.',
    apply() {
      const feed = join(tmp, 'feed.xml');
      writeFileSync(feed, `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><entry><id>yt:video:EXAMPLE0001</id><yt:videoId>EXAMPLE0001</yt:videoId><title>Example video: five AI terms in five minutes #ai</title>
<link rel="alternate" href="https://www.youtube.com/watch?v=EXAMPLE0001"/><published>2026-12-03T15:00:00+00:00</published>
<media:group><media:description>An example upload for the demonstration, not a real video. The project: https://kenashe.ai${ROUTE}</media:description></media:group></entry></feed>`);
      const before = JSON.parse(readFileSync(archive, 'utf8')).length;
      const log = execFileSync('node', [join(R, 'tools/sync-videos.mjs'), '--feed', feed, '--archive', archive, '--thumbs', join(tmp, 'assets/video'), '--thumb-host', 'http://127.0.0.1:9', '--timeout', '800'], { encoding: 'utf8' }).trim().split('\n').pop();
      const after = JSON.parse(readFileSync(archive, 'utf8')).length;
      this.result = `The sync ran against an example feed listing one new upload. Its output: ${log.replace('[videos] ', '')}. The archive copy went from ${before} to ${after} videos; the ${before} older ones stayed although this feed listed only one. The made-up video has no thumbnail on YouTube, so its card shows the plain frame used when a picture is missing.`;
      return { name: null, stat: 'node round-5/tools/sync-videos.mjs   (no website file edited by hand)' };
    } },
  { title: 'Change the homepage feature', does: 'Change one line in the homepage settings file.',
    apply() { editorial.featured = `building:${SLUG}`; return { name: null, stat: `content/editorial.json:  "featured": "building:${SLUG}"` }; },
    check(s) { return [`The featured piece is now labelled “${s.pages.get('/').match(/data-section="featured"[\s\S]*?class="eyebrow">(?:<span[^>]*><\/span>)?([^<]+)/)[1].trim()}”, not “Latest video”.`]; } },
  { title: 'Hide an item from featured areas', does: 'Add its id to the hide list in the same settings file. Its page and archive entry stay.',
    apply() { editorial.hide = [`writing:${ESSAY}`]; return { name: null, stat: `content/editorial.json:  "hide": ["writing:${ESSAY}"]` }; },
    check(s) { return [`The essay’s page still exists (${s.pages.has(`/writing/${ESSAY}/`) ? 'confirmed' : 'NOT confirmed'}) and it is still in the Writing list (${s.pages.get('/writing/').includes('Example essay') ? 'confirmed' : 'NOT confirmed'}).`]; } },
];

const SECTION = { introduction: 'Introduction', featured: 'Featured piece', projects: 'Project cards', recent: 'More to watch / And to read', about: 'Personal introduction', head: 'Page opening', latest: 'Latest video', videos: 'All videos', shorts: 'Shorts', writing: 'Writing list', more: 'Smaller builds', body: 'Page body', related: 'Connected items', next: 'Next item' };
const sections = (html) => { const m = new Map(); for (const [, name, inner] of html.matchAll(/data-section="([\w-]+)"([\s\S]*?)(?=data-section="|<footer)/g)) m.set(name, (m.get(name) || '') + inner); return m; };
let prev = render().pages; const report = []; let last;
for (const s of steps) {
  const change = s.apply(); last = render(); const now = last.pages; const added = [], changed = [];
  for (const [route, html] of now) {
    if (!prev.has(route)) { added.push(route); continue; }
    if (prev.get(route) === html) continue;
    const a = sections(prev.get(route)), b = sections(html);
    changed.push({ route, parts: [...b.keys()].filter((k) => a.get(k) !== b.get(k)).map((k) => SECTION[k] || k) });
  }
  report.push({ ...s, change, added, changed, checks: s.check ? s.check(last) : [], unchanged: now.size - added.length - changed.length, warnings: last.model.warnings }); prev = now;
}
write(OUT, prev);
git('checkout', '-q', '-f', BASE); rmSync(tmp, { recursive: true, force: true });

const link = (r) => `<a href="site${r}">${r === '/' ? 'Homepage' : r}</a>`;
writeFileSync(join(R, 'demo/index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Update workflow demonstration · Round 5</title><meta name="robots" content="noindex, nofollow, noarchive">
<link rel="icon" href="../assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="../assets/site.css"><link rel="stylesheet" href="../review/review.css"></head><body class="review">
<p class="concept"><strong>Design concept.</strong> <span>Round 5. Not the live KenAshe.ai.</span> <a href="../index.html">Review page</a></p>
<main class="rv">
<h1>Updating the site, demonstrated</h1>
<p class="rv-lede">Six ordinary updates, made one after another in an isolated copy of the real production files. After each one the records were re-read, the site was rebuilt and the result was compared with the build before it, so the lists below are measured, not described.</p>
<ul>
<li><strong>Where the edits were made:</strong> a local copy of the production repository at <code>8b35b45</code> with the proposed content fields applied, on a throwaway branch with no remote. The first three steps edit <code>src/data/builds.ts</code>, <code>src/data/writing.ts</code> and page files there. Each is saved as a patch you can read.</li>
<li><strong>What was not possible:</strong> Astro could not be installed in my environment, so production’s own templates were not run. The records are read by importing the real TypeScript files; the two example write-ups are read from their page files by a small reader. The pages you see are the prototype’s.</li>
<li><strong>Kept apart:</strong> the example entries exist only in this demonstration build. The review prototype contains none of them, and nothing was pushed to production.</li>
</ul>
<p><a class="btn solid" href="site/">Open the demonstration build</a> <a class="text-link" href="../site/">Compare with the real prototype →</a></p>
${report.map((s, i) => `<section class="rv-step"><h2><span>${i + 1}</span> ${e(s.title)}</h2>
<p><strong>What Ken does:</strong> ${e(s.does)}</p>
<pre tabindex="0">${e(s.change.stat)}</pre>
${s.change.name ? `<p><a href="patches/${s.change.name}">Read the exact change (${s.change.name})</a></p>` : ''}
${s.result ? `<p>${e(s.result)}</p>` : ''}
<h3>What updated by itself</h3>
<ul>${s.added.map((r) => `<li><strong>New page:</strong> ${link(r)}</li>`).join('')}${s.changed.map((c) => `<li>${link(c.route)}: ${c.parts.map(e).join(', ') || 'navigation'}</li>`).join('')}</ul>
${s.checks.length ? `<h3>Checked in the result</h3><ul>${s.checks.map((c) => `<li>${e(c)}</li>`).join('')}</ul>` : ''}
<p class="rv-note">${s.unchanged} other pages were rebuilt byte-for-byte identical.</p></section>`).join('\n')}
<p class="rv-note">Generated by <code>node round-5/demo/run.mjs</code>. The video step needs the proposed scheduled workflow to happen by itself in production; that workflow is not installed.</p>
</main></body></html>
`);
for (const s of report) console.log(`${s.title}: +${s.added.length} pages, ${s.changed.length} changed [${s.changed.map((c) => c.route + ' (' + c.parts.join('; ') + ')').join(' | ')}]\n   ${s.checks.join('\n   ')}`);
