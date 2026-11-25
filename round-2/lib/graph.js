// KenAshe.ai Round 2 · shared content graph.
// Pure ES module, no dependencies. Runs in the browser (prototypes) and in Node (tests,
// or an Astro build in production). Input: data/sources.json (made by tools/derive.mjs from
// production files). Output: everything the three directions render — unified items,
// documented relationships, timeline, themes, "now", Digest status, layout seeds.
//
// Nothing in here is hand-positioned or hand-entered. Add a build to builds.ts, an essay to
// writing.ts, or upload a video, re-run the build, and every derived view updates.

export const THEMES = [
  // Checked in this order; the first match wins. Edit a pattern to re-file everything at once.
  { id: 'film', label: 'Film & video', hint: 'Short films and AI video',
    match: /(short film|filmmak|films?\b|ai video|video production|video lab|heygen|ffmpeg|ai-generated imagery|\bugc\b|explainer)/i },
  { id: 'onchain', label: 'Onchain', hint: 'Ethereum, ENS and agent payments',
    match: /(ethereum|\bens\b|ensv2|erc-8004|\.eth\b|onchain|mainnet|wallet)/i },
  { id: 'web', label: 'Web & search', hint: 'Publishing, SEO, domains and getting found',
    match: /(\bseo\b|\bblog\b|digest|\bmdx\b|\bastro\b|pgvector|webp|image pipeline|knowledge panel|\bcited\b|x article|headline|\.com domain|indexing)/i },
  { id: 'agents', label: 'Agents & automation', hint: 'AI agents and systems doing real work',
    match: /(ai agents?|\bagents?\b|multi-agent|hyperagent|cassidy|chatgpt skills|grok bot|werewolf|automation|\bn8n\b|github actions|gmail|google sheets|airtable|python|chatbot|cloudflare)/i },
  { id: 'life', label: 'Life & curiosity', hint: 'Family history, gadgets, puzzles and learning', match: /.^/ },
];

const ASSET = (p) => (p ? `assets/${p}` : null);
const toWebp = (f) => f?.replace(/\.(jpe?g|png)$/i, '.webp');
const monthDate = (m) => (m ? `${m}-15` : null); // month-precision items sit mid-month

export function themeOf(text) {
  for (const t of THEMES.slice(0, -1)) if (t.match.test(text)) return t.id;
  return 'life';
}

/** Build the graph. `opts.base` prefixes asset paths (e.g. '../' from interior pages). */
export function buildGraph(src, opts = {}) {
  const base = opts.base ?? '';
  const A = (p) => (p ? base + ASSET(p) : null);
  const items = [];
  const byId = new Map();
  const add = (it) => { items.push(it); byId.set(it.id, it); return it; };

  const videoThumb = (vid) => A(`video/${vid}.webp`);
  const embedOf = (id) => src.edges.find((e) => e.from === id && e.type === 'embeds')?.to?.slice(6) ?? null;

  for (const b of src.builds) {
    const vid = embedOf(b.id);
    add({
      id: b.id, type: 'build', title: b.title, dek: b.dek, date: monthDate(b.month), precision: 'month',
      month: b.month, status: b.status, stack: b.stack, metric: b.metric, footer: b.footer,
      href: b.link, hasPage: b.hasPage, cta: b.cta || (b.hasPage ? 'Read the build' : null),
      image: b.pageImage ? A(`build/${b.slug}.webp`) : vid ? videoThumb(vid) : null,
      video: vid, order: b.order, theme: themeOf(`${b.title} ${b.stack.join(' ')} ${b.dek}`), source: b.source,
    });
  }
  for (const w of src.writing) {
    const vid = embedOf(w.id);
    add({
      id: w.id, type: 'essay', title: w.title, dek: w.dek, date: w.date, precision: 'day', month: w.date.slice(0, 7),
      displayDate: w.displayDate, authorship: w.authorship, href: w.link,
      image: w.image ? A(`writing/${toWebp(w.image.thumbnail || w.image.file)}`) : vid ? videoThumb(vid) : null,
      heroImage: w.image ? A(`writing/${toWebp(w.image.file)}`) : null, imageAlt: w.image?.alt ?? '',
      video: vid, theme: themeOf(`${w.title} ${w.dek}`), source: w.source,
    });
  }
  for (const v of src.videos) {
    add({
      id: v.id, type: v.kind === 'short' ? 'short' : 'video', title: v.title, dek: v.summary, date: v.date, precision: 'day',
      month: v.date.slice(0, 7), href: v.url, videoId: v.videoId, image: videoThumb(v.videoId),
      embed: `https://www.youtube-nocookie.com/embed/${v.videoId}`, theme: themeOf(`${v.title} ${v.summary}`), source: v.source,
    });
  }
  const d = src.digest;
  add({
    id: 'digest', type: 'digest', title: d.name, dek: d.statusLine, date: d.last, precision: 'day', month: d.last?.slice(0, 7),
    href: d.link, label: d.label, status: d.status, theme: 'web', automated: true,
  });

  // Documented relationships only: links between pages, embeds, links in video descriptions.
  const edges = src.edges.filter((e) => byId.has(e.from) && byId.has(e.to));
  // Undirected neighbour lists.
  const neighbours = new Map(items.map((i) => [i.id, new Set()]));
  for (const e of edges) { neighbours.get(e.from).add(e.to); neighbours.get(e.to).add(e.from); }
  for (const it of items) it.related = [...neighbours.get(it.id)];

  const dated = items.filter((i) => i.date).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (a.order ?? 0) - (b.order ?? 0)));
  const human = dated.filter((i) => i.type !== 'digest');

  // Timeline buckets by month (newest first), across all types. Digest counts come from real pubDates.
  const months = [...new Set(dated.map((i) => i.month).concat(Object.keys(d.perDay).map((k) => k.slice(0, 7))))].sort().reverse();
  const timeline = months.map((m) => ({
    month: m, items: human.filter((i) => i.month === m),
    digestPosts: Object.entries(d.perDay).filter(([k]) => k.startsWith(m)).reduce((s, [, n]) => s + n, 0),
  }));

  // Layout seeds: deterministic coordinates from data (theme → angle, age → radius).
  // New content lands in the right place automatically; nobody positions anything.
  const t0 = Date.parse('2025-12-01'), t1 = Date.parse(d.last > human[0].date ? d.last : human[0].date);
  const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967295; };
  const themeIndex = Object.fromEntries(THEMES.map((t, i) => [t.id, i]));
  for (const it of items) {
    const age = it.date ? (t1 - Date.parse(it.date)) / (t1 - t0) : 1;
    const sector = (Math.PI * 2) / THEMES.length;
    it.layout = {
      angle: themeIndex[it.theme] * sector + (hash(it.id) - 0.5) * sector * 0.8,
      radius: 0.18 + Math.min(1, Math.max(0, age)) * 0.82, // newest near the centre
      jitter: hash(it.id + '#'),
      weight: it.type === 'build' ? 1 + (it.hasPage ? 0.6 : 0) + it.related.length * 0.15 : it.type === 'digest' ? 2.2 : 0.7 + it.related.length * 0.15,
    };
  }

  const latest = (type, n) => human.filter((i) => (Array.isArray(type) ? type.includes(i.type) : i.type === type)).slice(0, n);
  const featuredBuilds = items.filter((i) => i.type === 'build').sort((a, b) => a.order - b.order).slice(0, 3);

  return {
    items, byId, edges, timeline, themes: THEMES,
    person: src.person, credentials: src.credentials, digest: d,
    latest, featuredBuilds,
    now: human.slice(0, 4),
    stats: {
      builds: items.filter((i) => i.type === 'build').length,
      essays: items.filter((i) => i.type === 'essay').length,
      videos: items.filter((i) => i.type === 'video').length,
      shorts: items.filter((i) => i.type === 'short').length,
      digestPublished: d.published, relationships: edges.length,
      firstMonth: months.at(-1), lastDate: dated[0]?.date,
    },
    meta: src._meta,
  };
}

/** Load sources.json relative to the page and build the graph. */
export async function loadGraph(base = '', opts = {}) {
  const r = await fetch(`${base}data/sources.json`);
  const src = await r.json();
  return { src, graph: buildGraph(src, { base, ...opts }) };
}

// ---------- shared helpers ----------
export const fmtDate = (iso, precision = 'day') => {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00Z');
  return precision === 'month'
    ? d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
};
export const typeLabel = { build: 'Build', essay: 'Writing', video: 'Video', short: 'Short', digest: 'Digest · automated' };
export const LIVE_SITE = 'https://kenashe.ai';
/** Production paths stay production paths; prototypes link out to the live page unless they built it. */
export const liveHref = (href) => (href && href.startsWith('/') ? LIVE_SITE + href : href);

/**
 * Where a production path should point inside a prototype.
 * `built` lists the production paths this direction actually implements (e.g. ['/', '/building/zerohuman/']).
 * Built pages resolve inside the prototype; everything else opens the real page on kenashe.ai.
 */
export function hrefFor(href, ctx, built = []) {
  if (!href || href === '#') return '#';
  if (!href.startsWith('/')) return href; // already external (YouTube etc.)
  const path = href.split('#')[0];
  if (built.includes(path)) return `${ctx.base}directions/${ctx.dir}/${path.slice(1)}${href.includes('#') ? '#' + href.split('#')[1] : ''}`;
  return LIVE_SITE + href;
}
export const isExternal = (url) => /^https?:/.test(url);
export const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
