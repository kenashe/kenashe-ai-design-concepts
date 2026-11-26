// Fails if the interior pages drift from their sources.
//   node round-3/site/tools/check-pages-copy.mjs
// 1. Page copy: every line of round-3/data/page-text/<file> must appear in the page's visible text
//    (whitespace, link arrows and markdown marks are ignored). Lines the design deliberately replaces with
//    graph-derived regions are listed in REPLACED with the reason.
// 2. About, film, publishing demo: every string taken from round-3/data/pages.json must appear verbatim.
// 3. The recorded sync run on /publish/ must equal production-plan/evidence/live-sync-run.txt exactly.
// 4. Lucky Domains copy must not contain an em dash; credentials must not carry "verify" links.
// 5. No transaction hash may be typed in a page outside a prerendered region (hashes come from item.receipts).
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..'); const R3 = join(SITE, '..');
const read = (p) => readFileSync(join(R3, p), 'utf8');
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
const norm = (s) => decode(s).replace(/[↗→←]/g, ' ').replace(/[*`]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' ').replace(/\s+([.,;:!?)])/g, '$1').replace(/\(\s+/g, '(').trim();
const textOf = (html) => norm(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' '));
/** The page with its prerendered regions removed: what was typed into the page file by hand. */
const typedOf = (html) => html.replace(/<!--@([\w-]+)-->[\s\S]*?<!--\/@\1-->/g, ' ');
let failures = 0; const fail = (m) => { failures++; console.error('  ✗ ' + m); };

// Lines of the source that the design shows through graph-derived regions or the shared shell instead.
const REPLACED = [
  [/^Follow Ken's builds and experiments\.?$/, 'follow links are in the footer on every page'], [/^Follow on X$/, 'footer'], [/^Watch on YouTube$/, 'the player links to YouTube'],
  [/^Related builds$/, 'threads region (graph.edges with evidence)'], [/^(AI agent economy on Ethereum|Autonomous SEO agent|ZeroHuman|AI explainer producer|AI werewolf \/ social deduction lab)$/, 'threads region'],
  [/^: (the first experiment|another agent|the follow-up|an agent that|AI agents playing)/, 'threads region'], [/^·$/, 'separator'], [/^↕$/, 'decorative'],
  [/^(Order|Delivery) 0x[0-9a-f]+…[0-9a-f]+$/, 'receipts region (item.receipts)'], [/^0x[0-9a-f]+…[0-9a-f]+ on Etherscan$/, 'receipts region (item.receipts)'],
  [/^Watch the full experiment on YouTube$/, 'the player links to YouTube'], [/^More on my YouTube channel$/, null],
  [/^Watch the finished film: Returning Your Things$/, 'essay-film region (title and call to action from the graph)'],
  [/^Autonomous AI Blog$/, 'title comes from the graph'], [/^(Decision|Encouragement), 0\.0001 ETH\.$/, 'set as a heading and a price line'], [/^(Film by|Music|Piano):$/, 'credit labels are set without the colon'], [/^Status: shown on the project page/, 'status is derived from graph.digest in blog-status'], [/^Date: /, 'date comes from the graph'], [/^Stack: (GitHub Actions|AI Agents)/, 'stack comes from the graph'],
  [/^Block 2638526\d$/, null], [/^14:58:\d\d UTC$/, null],
];
const PAGES = [
  ['building/zerohuman/index.html', 'data/page-text/building_zerohuman.txt'],
  ['building/ai-agent-economy/index.html', 'data/page-text/building_ai-agent-economy.txt'],
  ['building/returning-your-things/index.html', 'data/page-text/building_returning-your-things.txt'],
  ['building/autonomous-ai-blog/index.html', 'data/page-text/autonomous-ai-blog.md'],
  ['writing/4-tips-for-making-ai-videos-that-feel-like-films/index.html', 'data/page-text/writing_4-tips-for-making-ai-videos-that-feel-like-films.txt'],
];
for (const [page, source] of PAGES) {
  const html = readFileSync(join(SITE, page), 'utf8'); const text = textOf(html);
  // page-text .txt files break lines at inline tags, so a sentence can be split over several lines: check each fragment
  const lines = read(source).split('\n').map((l) => norm(l.replace(/^#+\s*/, ''))).filter(Boolean); let ok = 0, replaced = 0;
  for (const line of lines) {
    if (text.includes(line)) { ok++; continue; }
    const r = REPLACED.find(([re]) => re.test(line));
    if (r) { replaced++; continue; }
    // markdown paragraphs carrying a pipeline arrow list or a trailing "Related:" label are checked piecewise
    const parts = line.split(/\s*(?:→|\u2192)\s*| {2,}/).map((x) => x.trim()).filter(Boolean);
    if (parts.length > 1 && parts.every((x) => text.includes(x))) { ok++; continue; }
    fail(`${page}: source line not found: "${line.slice(0, 110)}"`);
  }
  console.log(`${page}: ${ok} source lines present, ${replaced} shown through regions or the shell`);
  // no typed transaction hashes
  const typed = typedOf(html).match(/0x[0-9a-fA-F]{64}/g);
  if (typed) fail(`${page}: transaction hash typed outside a region: ${typed[0]}`);
}

// ---- pages.json strings ----
const P = JSON.parse(read('data/pages.json'));
const need = (page, strings) => { const text = textOf(readFileSync(join(SITE, page), 'utf8')); let ok = 0; for (const s of strings) { if (text.includes(norm(s))) ok++; else fail(`${page}: pages.json string not found: "${String(s).slice(0, 100)}"`); } console.log(`${page}: ${ok} of ${strings.length} pages.json strings present`); };
const a = P.about;
need('about/index.html', [P.identity.tagline, P.identity.trustLine, P.identity.approach, a.bio, ...a.background, a.technicalBackground.split('. ')[0] + '.', a.veteran,
  ...P.whatIBring.flatMap((w) => [w.title, w.body]), ...a.speaking.flatMap((s) => [s.event, s.role, s.detail, ...s.links.map((l) => l.label)]),
  ...a.credentials.flatMap((c) => [c.name, c.issuer]), ...a.availableForComment, ...P.press.profiles.flatMap((p) => [p.date, p.outlet, p.title, p.summary]), ...P.press.commentary.flatMap((p) => [p.date, p.outlet, p.title]),
  P.luckyDomains.description, P.luckyDomains.role, P.work.headline, P.work.subhead, P.work.intro, ...P.work.includes, P.work.doesNotBuy, P.work.notInDigest, ...P.socials.map((s) => s.label)]);
const f = P.films.returningYourThings;
need('building/returning-your-things/index.html', [f.title, f.logline, f.runtime, f.directorsNote, ...f.credits.flat()]);

// ---- hrefs from pages.json ----
const aboutHtml = readFileSync(join(SITE, 'about/index.html'), 'utf8');
for (const url of [...a.speaking.flatMap((s) => s.links.map((l) => l.url)), P.luckyDomains.url, P.work.url, P.press.newsroomUrl, ...P.socials.map((s) => s.url)]) if (!aboutHtml.includes(`href="${url}"`)) fail(`about: link missing: ${url}`);

// ---- rules ----
const lucky = aboutHtml.match(/<section class="about-sec" aria-labelledby="lucky-h">[\s\S]*?<\/section>/)?.[0] ?? '';
if (!lucky) fail('about: Lucky Domains section not found');
for (const [name, chunk] of [['Lucky Domains section', lucky], ...[...textOf(aboutHtml).matchAll(/[^.]*Lucky Domains[^.]*\./g)].map((m) => ['a sentence naming Lucky Domains', m[0]])]) if (/[—–]/.test(textOf(chunk).replace(/\(2026–Present\)/g, ''))) fail(`about: em or en dash in ${name}: "${textOf(chunk).slice(0, 80)}"`);
const creds = aboutHtml.match(/<section class="about-sec" aria-labelledby="creds-h">[\s\S]*?<\/section>/)?.[0] ?? '';
if (/<a\b/i.test(creds) || /verif/i.test(creds)) fail('about: credentials must not carry links or the word "verify"');
if (/20 years of professional software engineering/i.test(textOf(aboutHtml))) fail('about: forbidden technical-background wording');
if (/featured in forbes/i.test(textOf(aboutHtml))) fail('about: "Featured in Forbes" is not allowed');

// ---- the recorded run ----
const pub = readFileSync(join(SITE, 'publish/index.html'), 'utf8');
const run = pub.match(/<pre class="code code--scroll"[^>]*data-evidence="([^"]+)"[^>]*>([\s\S]*?)<\/pre>/);
if (!run) fail('publish: recorded run block not found');
else if (decode(run[2]) !== read(run[1]).replace(/\n+$/, '')) fail('publish: the recorded run differs from ' + run[1]);
else console.log('publish/index.html: recorded run is byte-identical to ' + run[1]);

console.log(failures ? `\n${failures} problem(s)` : '\nAll interior page copy matches its sources.');
process.exit(failures ? 1 : 0);
