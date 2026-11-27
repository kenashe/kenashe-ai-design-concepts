// Content layer: derive ONE normalized sources file from the production repo.
//
//   node --import ./round-5/tools/ts-resolve.mjs round-5/tools/derive.mjs <path-to-kenashe-repo>
//
// Reads production files exactly as they are (nothing is re-typed or duplicated):
//   src/data/builds.ts, building-cards.ts, writing.ts, credentials.ts, schema.ts  (imported as-is)
//   src/pages/building/*.astro, src/pages/writing/*/index.astro                 (scanned for links + video embeds)
//   src/content/blog/*.mdx frontmatter                                           (Digest counts, dates, latest)
//   .github/workflows/pipeline.yml + src/utils/indexing.ts                       (Digest publishing + indexing status)
//   source/youtube-archive.json (kept current by tools/sync-videos.mjs)          (videos + description links)
//
// In production this file would be an Astro data module (src/data/graph.ts) evaluated at build
// time with the same logic; there is no runtime API and no new dependency.
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const R2 = join(HERE, '..');
const REPO = process.argv[2] || '/agent/workspace/src-ref';
const CHANNEL = 'UCD74fTmfkcY7J-0RMYyRIbw';
const imp = (p) => import(pathToFileURL(join(REPO, p)).href);

const { projects } = await imp('src/data/builds.ts');
const { buildingCards } = await imp('src/data/building-cards.ts');
const { essays, authorshipOf } = await imp('src/data/writing.ts');
const { credentialTiers } = await imp('src/data/credentials.ts');
const { personKenAshe } = await imp('src/data/schema.ts');

const read = (p) => readFileSync(join(REPO, p), 'utf8');
const slugOf = (href) => href?.match(/\/(building|writing)\/([a-z0-9-]+)/)?.[2] ?? null;
const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const monthOf = (s = '') => {
  s = s.toLowerCase(); const m = MONTHS.findIndex((x) => s.includes(x)); const y = s.match(/\d{4}/)?.[0];
  return m < 0 || !y ? null : `${y}-${String(m + 1).padStart(2, '0')}`;
};
const kebab = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ---------- pages: scan sources for documented relationships ----------
const YT = /(?:videoId\s*=\s*['"`]|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/g;
const HREF = /href=["'{`]+(\/(?:building|writing|blog)\/[a-z0-9-]*\/?)/g;
const pageFiles = [
  ...readdirSync(join(REPO, 'src/pages/building')).filter((f) => f.endsWith('.astro')).map((f) => ['building', f.replace('.astro', ''), `src/pages/building/${f}`]),
  ...readdirSync(join(REPO, 'src/pages/writing'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => ['writing', d.name, `src/pages/writing/${d.name}/index.astro`]),
];
const links = [];
const pageImage = {};
const receipts = {}; // per page: transaction hashes and evidence links found in the page source
const humanize = (n) => n.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\bTx\b/i, 'transaction').replace(/\benc\b/i, 'encouragement').toLowerCase().replace(/^./, (c) => c.toUpperCase());
for (const [kind, slug, file] of pageFiles) {
  const src = read(file);
  const from = `${kind}:${slug}`;
  const ids = new Set([...src.matchAll(YT)].map((m) => m[1]));
  // Pages also declare videos as data (const VIDEO = { id: '...' }, videoId: '...'); accept 11-char ids
  // that look like YouTube ids (contain a digit, capital, _ or -) in files that embed YouTube.
  if (/youtube/i.test(src)) for (const m of src.matchAll(/\b(?:id|videoId|VIDEO_ID)\s*[:=]\s*['"`]([A-Za-z0-9_-]{11})['"`]/g)) if (/[A-Z0-9_-]/.test(m[1])) ids.add(m[1]);
  for (const id of ids) links.push({ from, to: `video:${id}`, type: 'embeds', evidence: file });
  if (false) for (const m of src.matchAll(YT)) links.push({ from, to: `video:${m[1]}`, type: 'embeds', evidence: file });
  for (const m of src.matchAll(HREF)) {
    const t = m[1]; if (t.startsWith('/blog')) { links.push({ from, to: 'digest', type: 'links-to', evidence: file }); continue; }
    const k = t.split('/')[1], s = slugOf(t); if (s && `${k}:${s}` !== from) links.push({ from, to: `${k}:${s}`, type: 'links-to', evidence: file });
  }
  const img = src.match(/image\s*=\s*['"]([^'"]+\.(?:jpe?g|png|webp))['"]/)?.[1] || src.match(/image=["']([^"']+\.(?:jpe?g|png|webp))["']/)?.[1];
  if (img) pageImage[from] = img;
  const rc = [];
  for (const m of src.matchAll(/const\s+([A-Za-z]+)\s*=\s*['"`](0x[0-9a-f]{64})['"`]/g)) rc.push({ kind: 'transaction', label: humanize(m[1]), value: m[2], url: `https://etherscan.io/tx/${m[2]}` });
  for (const m of src.matchAll(/https:\/\/github\.com\/kenashe\/[A-Za-z0-9._-]+(?:\/blob\/[^"'`\s)<]+)?/g)) {
    const file = m[0].split('/blob/')[1]?.split('/').slice(1).join('/');
    if (!rc.some((r) => r.url === m[0])) rc.push({ kind: file ? 'evidence file' : 'repository', label: file || m[0].split('github.com/')[1], value: null, url: m[0] });
  }
  if (rc.length) receipts[from] = rc;
}

// ---------- builds (order and set exactly as production's buildingCards) ----------
const builds = buildingCards.map((p, i) => {
  const slug = slugOf(p.link) || kebab(p.title);
  const raw = projects.find((x) => x.title === p.title);
  return {
    id: `building:${slug}`, slug, title: p.title, status: p.status, dek: p.dek, summary: p.summary ?? null, stack: p.stack,
    shippedAt: p.shippedAt ?? null, footer: p.footer ?? null, metric: p.metric ?? null,
    month: monthOf(p.shippedAt ?? p.footer?.[0]), link: p.link ?? null, cta: p.cta ?? null,
    hasPage: !!p.link, order: i, source: raw ? 'src/data/builds.ts' : 'src/data/building-cards.ts',
    pageImage: pageImage[`building:${slug}`] ?? null,
    topic: p.topic ?? null, receipts: receipts[`building:${slug}`] ?? [],
  };
});

// ---------- essays ----------
const writing = essays.map((e) => ({
  id: `writing:${e.slug}`, slug: e.slug, title: e.title, date: e.published, displayDate: e.date, dek: e.dek,
  authorship: authorshipOf(e), image: e.image ? { file: e.image.file, thumbnail: e.image.thumbnail ?? null, alt: e.image.alt, caption: e.image.caption ?? null } : null,
  link: `/writing/${e.slug}/`, source: 'src/data/writing.ts', topic: e.topic ?? null, receipts: receipts[`writing:${e.slug}`] ?? [],
}));

// ---------- Digest: counts + status derived from files, never typed ----------
const fm = (txt) => { const m = txt.match(/^---\n([\s\S]*?)\n---/); return m ? m[1] : ''; };
const field = (f, k) => f.match(new RegExp(`^${k}:\\s*"?(.*?)"?\\s*$`, 'm'))?.[1];
const posts = readdirSync(join(REPO, 'src/content/blog')).filter((f) => /\.mdx?$/.test(f)).map((f) => {
  const f0 = fm(read(`src/content/blog/${f}`));
  return { slug: f.replace(/\.mdx?$/, ''), title: field(f0, 'title')?.replace(/\\"/g, '"'), date: field(f0, 'pubDate')?.slice(0, 10),
    draft: /^draft:\s*true/m.test(f0), tags: JSON.parse(f0.match(/^tags:\s*(\[.*\])/m)?.[1] ?? '[]'), image: f0.match(/^\s+src:\s*(.+)$/m)?.[1]?.trim() };
});
const pub = posts.filter((p) => !p.draft).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
const perDay = {}; for (const p of pub) perDay[p.date] = (perDay[p.date] || 0) + 1;
const tagCount = {}; for (const p of pub) for (const t of p.tags) tagCount[t] = (tagCount[t] || 0) + 1;
const workflow = read('.github/workflows/pipeline.yml');
const publishingPaused = !/^ {2}schedule:[ \t]*(?:#.*)?$/m.test(workflow); // same test production uses
const indexing = existsSync(join(REPO, 'src/utils/indexing.ts')) ? read('src/utils/indexing.ts') : '';
const noindex = /'\/blog'/.test(indexing.split('NOINDEX_PREFIXES')[1] || '');
const digest = {
  id: 'digest', name: 'The Digest', link: '/blog/', label: 'Automated', byline: 'KenAshe Digest (automated)',
  status: publishingPaused ? 'paused' : 'publishing', publishingPaused, noindex,
  statusLine: publishingPaused
    ? 'Automated publishing is paused. The archive stays public.'
    : 'Publishes automatically, about ten posts a day.',
  published: pub.length, drafts: posts.length - pub.length, total: posts.length,
  first: pub.at(-1)?.date, last: pub[0]?.date, perDay,
  topTags: Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([tag, n]) => ({ tag, n })),
  latest: pub.slice(0, 12).map((p) => ({ slug: p.slug, title: p.title, date: p.date, tags: p.tags.slice(0, 3), link: `/blog/${p.slug}/`, image: p.image ? `digest/${p.slug.slice(0, 50)}.webp` : null, imageSrc: p.image ? join('src/content/blog', p.image) : null })),
  evidence: ['.github/workflows/pipeline.yml (schedule trigger)', 'src/utils/indexing.ts (only tag listings with fewer than three published articles are noindex; Digest articles are index-eligible)', 'src/content/blog/*.mdx (draft flag, pubDate)'],
  relatedBuild: 'building:autonomous-ai-blog',
};

// ---------- videos: read the committed archive (tools/sync-videos.mjs keeps it current) ----------
// derive never touches the network: the site builds identically whether YouTube is up or down.
const archivePath = process.env.VIDEO_ARCHIVE || join(R2, 'source/youtube-archive.json');
const videos = (existsSync(archivePath) ? JSON.parse(readFileSync(archivePath, 'utf8')) : []).map((v) => {
  for (const m of v.mentions ?? []) {
    if (m.startsWith('/blog')) links.push({ from: v.id, to: 'digest', type: 'mentions', evidence: 'YouTube description' });
    else if (slugOf(m)) links.push({ from: v.id, to: `${m.split('/')[1]}:${slugOf(m)}`, type: 'mentions', evidence: 'YouTube description' });
  }
  const thumb = v.thumbnail && existsSync(join(R2, 'assets', v.thumbnail)) ? v.thumbnail : null;
  return { id: v.id, videoId: v.videoId, title: v.title, date: v.date, published: v.published, kind: v.kind, url: v.url,
    summary: v.summary ?? '', hashtags: v.hashtags ?? [], thumbnail: thumb, source: 'YouTube channel feed (archived)' };
}).sort((x, y) => ((x.published || x.date) < (y.published || y.date) ? 1 : -1));

// dedupe links
const seen = new Set();
const edges = links.filter((l) => { const k = `${l.from}|${l.to}|${l.type}`; if (seen.has(k)) return false; seen.add(k); return true; });

// ---------- assemble ----------
const commit = process.env.PRODUCTION_HEAD || (existsSync(join(REPO, '.git')) ? (() => { try { return readFileSync(join(REPO, '.git/HEAD'), 'utf8').trim(); } catch { return null; } })() : null);
const out = {
  _meta: {
    generatedBy: 'round-5/tools/derive.mjs', generatedAt: new Date().toISOString(), productionRepo: 'kenashe/kenashe', head: commit,
    structure: process.env.PRODUCTION_STRUCTURE || null,
    note: 'Everything here is read from production source files or the YouTube feed. The prototypes never type content by hand; Round 5 renders this file with round-5/build.mjs.',
  },
  person: { name: personKenAshe.name, jobTitle: personKenAshe.jobTitle, description: personKenAshe.description, knowsAbout: personKenAshe.knowsAbout, sameAs: personKenAshe.sameAs, image: personKenAshe.image },
  credentials: credentialTiers,
  builds, writing, videos, digest, edges,
};
const OUT = process.env.SOURCES_OUT || join(R2, 'data/sources.json');
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(`builds ${builds.length} · essays ${writing.length} · videos ${videos.length} · digest ${digest.published} published (${digest.status}) · edges ${edges.length}`);
