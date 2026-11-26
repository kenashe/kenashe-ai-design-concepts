// KenAshe.ai Round 3 · content graph (evolved from the approved Round 2 architecture).
// Pure ES module, no dependencies. Same code in Node (build/tests) and the browser (demos).
// Input: data/sources.json from tools/derive.mjs. Output: everything the site renders.
//
// What changed since Round 2
//   · Themes are no longer a fixed list. Seed rules still file the known vocabulary, but items
//     can also inherit a theme from what they link to, from the stack they share with earlier
//     builds, from an optional `topic`, and new themes EMERGE when several unfiled items share a tag.
//   · Sectors are sized by how much work each theme holds, so a new theme makes its own room.
//   · Level-of-detail clusters (theme × year / quarter / month) keep the universe usable with
//     thousands of items.
//   · Videos read their thumbnail from the archive; a missing one is `null`, never a broken URL.
//   · Receipts (transactions, repositories, evidence files) come from the page sources.
//   · The Digest is summarised per week so it can sit quietly under the personal work.

// Seed vocabulary. First match wins. This list should rarely change: new kinds of work are
// handled by the mechanisms in classify() below, not by adding rules here.
export const THEME_RULES = [
  { id: 'film', label: 'Film & video', hue: 18,
    match: /(short film|filmmak|films?\b|ai video|video production|video lab|heygen|ffmpeg|ai-generated imagery|\bugc\b|explainer)/i },
  { id: 'onchain', label: 'Onchain', hue: 172,
    match: /(ethereum|\bens\b|ensv2|erc-8004|\.eth\b|onchain|mainnet|wallet)/i },
  { id: 'web', label: 'Web & search', hue: 42,
    match: /(\bseo\b|\bblog\b|digest|\bmdx\b|\bastro\b|pgvector|webp|image pipeline|knowledge panel|\bcited\b|x article|headline|\.com domain|indexing)/i },
  { id: 'agents', label: 'Agents & automation', hue: 78,
    match: /(ai agents?|\bagents?\b|multi-agent|hyperagent|cassidy|chatgpt skills|grok bot|werewolf|automation|\bn8n\b|github actions|gmail|google sheets|airtable|python|chatbot|cloudflare)/i },
];
export const FALLBACK_THEME = { id: 'life', label: 'Life & curiosity', hue: 30 };
export const EMERGE_AT = 4; // unfiled items sharing one tag before that tag becomes its own theme

const ASSET = (p) => (p ? `assets/${p}` : null);
const toWebp = (f) => f?.replace(/\.(jpe?g|png)$/i, '.webp');
const monthDate = (m) => (m ? `${m}-15` : null);
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const titleCase = (s) => String(s).replace(/[-_]+/g, ' ').replace(/\b[a-z]/g, (c) => c.toUpperCase());
export const hash = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967295; };

/**
 * File every item under a theme. Order of authority:
 *   1 topic    an optional `topic` on the entry (typed once, only when wanted)
 *   2 rule     the seed vocabulary above
 *   3 stack    the theme that builds with the same stack tags were filed under by topic or rule
 *   4 emerged  a tag shared by EMERGE_AT or more still-unfiled items becomes a new theme
 *   5 linked   the theme of the work it documents a relationship with (a video about a build)
 *   6 fallback Life & curiosity
 * Returns the theme list actually in use (with counts) and how each item was filed.
 */
export function classify(items, edges) {
  const themes = new Map(THEME_RULES.map((t) => [t.id, { id: t.id, label: t.label, hue: t.hue, seed: true }]));
  const ensure = (label, how) => {
    const id = slug(label); const known = [...themes.values()].find((t) => t.id === id || slug(t.label) === id);
    if (known) return known.id;
    themes.set(id, { id, label: /[A-Z ]/.test(label) ? label : titleCase(label), hue: Math.round((hash(id) * 360 + 200) % 360), seed: false, origin: how });
    return id;
  };
  const filed = new Map(); // id -> { theme, how }
  const text = (i) => `${i.title} ${(i.stack || []).join(' ')} ${i.dek || ''}`;
  const pending = [];
  for (const it of items) {
    if (it.type === 'digest') { filed.set(it.id, { theme: 'web', how: 'rule' }); continue; }
    if (it.topic) { filed.set(it.id, { theme: ensure(it.topic, 'topic'), how: 'topic' }); continue; }
    const r = THEME_RULES.find((t) => t.match.test(text(it)));
    if (r) filed.set(it.id, { theme: r.id, how: 'rule' }); else pending.push(it);
  }
  // 3 stack: what themes did builds using these tags land in? Learns only from strong evidence
  // (topic or rule), so a mis-filed item can never teach the vote.
  const tagTheme = {};
  for (const it of items) { const f = filed.get(it.id); if (f && f.how !== 'linked' && it.stack) for (const s of it.stack) ((tagTheme[s] ??= {})[f.theme] = (tagTheme[s][f.theme] || 0) + 1); }
  for (const it of [...pending]) {
    if (!it.stack?.length) continue; const c = {};
    for (const s of it.stack) for (const [th, n] of Object.entries(tagTheme[s] || {})) c[th] = (c[th] || 0) + n;
    const best = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
    if (best) { filed.set(it.id, { theme: best[0], how: 'stack' }); pending.splice(pending.indexOf(it), 1); }
  }
  // 4 emerged: a tag shared by enough still-unfiled items (stack tags for builds, hashtags for videos)
  const tagsOf = (i) => [...(i.stack || []), ...(i.hashtags || [])];
  for (;;) {
    const c = {}; for (const it of pending) for (const t of new Set(tagsOf(it).map((x) => x.toLowerCase()))) (c[t] ??= []).push(it);
    const best = Object.entries(c).filter(([, v]) => v.length >= EMERGE_AT).sort((a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : 1))[0];
    if (!best) break;
    const original = tagsOf(best[1][0]).find((x) => x.toLowerCase() === best[0]);
    const id = ensure(original, 'emerged');
    for (const it of best[1]) { filed.set(it.id, { theme: id, how: 'emerged' }); pending.splice(pending.indexOf(it), 1); }
  }
  // 5 linked: majority theme among documented neighbours (two passes so chains resolve)
  const nb = new Map(items.map((i) => [i.id, []]));
  for (const e of edges) { nb.get(e.from)?.push(e.to); nb.get(e.to)?.push(e.from); }
  const majority = (ids) => { const c = {}; for (const id of ids) { const f = filed.get(id); if (f && id !== 'digest') c[f.theme] = (c[f.theme] || 0) + 1; } return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0]; };
  for (let pass = 0; pass < 2; pass++) for (const it of [...pending]) {
    const m = majority(nb.get(it.id) || []); if (m) { filed.set(it.id, { theme: m, how: 'linked' }); pending.splice(pending.indexOf(it), 1); }
  }
  // 6 fallback
  if (pending.length || true) themes.set(FALLBACK_THEME.id, { ...FALLBACK_THEME, seed: true });
  for (const it of pending) filed.set(it.id, { theme: FALLBACK_THEME.id, how: 'fallback' });
  return { themes, filed };
}

/** Build the graph. `opts.base` prefixes asset paths (e.g. '../' from interior pages). */
export function buildGraph(src, opts = {}) {
  const base = opts.base ?? '';
  const A = (p) => (p ? base + ASSET(p) : null);
  const items = [];
  const byId = new Map();
  const add = (it) => { items.push(it); byId.set(it.id, it); return it; };

  const thumbOf = new Map(src.videos.map((v) => [v.videoId, v.thumbnail ? A(v.thumbnail) : null]));
  const embedOf = (id) => src.edges.find((e) => e.from === id && e.type === 'embeds')?.to?.slice(6) ?? null;

  for (const b of src.builds) {
    const vid = embedOf(b.id);
    add({
      id: b.id, type: 'build', title: b.title, dek: b.dek, date: monthDate(b.month), precision: 'month',
      month: b.month, status: b.status, stack: b.stack, metric: b.metric, footer: b.footer,
      href: b.link, hasPage: b.hasPage, cta: b.cta || (b.hasPage ? 'Read the build' : null),
      image: b.pageImage ? A(`build/${b.slug}.webp`) : vid ? thumbOf.get(vid) ?? null : null,
      video: vid, order: b.order, topic: b.topic ?? null, receipts: b.receipts ?? [], source: b.source, synthetic: !!b.synthetic,
    });
  }
  for (const w of src.writing) {
    const vid = embedOf(w.id);
    add({
      id: w.id, type: 'essay', title: w.title, dek: w.dek, date: w.date, precision: 'day', month: w.date.slice(0, 7),
      displayDate: w.displayDate, authorship: w.authorship, href: w.link,
      image: w.image ? A(`writing/${toWebp(w.image.thumbnail || w.image.file)}`) : vid ? thumbOf.get(vid) ?? null : null,
      heroImage: w.image ? A(`writing/${toWebp(w.image.file)}`) : null, imageAlt: w.image?.alt ?? '',
      video: vid, topic: w.topic ?? null, receipts: w.receipts ?? [], source: w.source, synthetic: !!w.synthetic,
    });
  }
  for (const v of src.videos) {
    add({
      id: v.id, type: v.kind === 'short' ? 'short' : 'video', title: v.title, dek: v.summary, date: v.date, precision: 'day',
      month: v.date.slice(0, 7), published: v.published, href: v.url, videoId: v.videoId, image: thumbOf.get(v.videoId) ?? null,
      embed: `https://www.youtube-nocookie.com/embed/${v.videoId}`, hashtags: v.hashtags ?? [], topic: v.topic ?? null,
      receipts: [], source: v.source, synthetic: !!v.synthetic,
    });
  }
  const d = src.digest;
  add({
    id: 'digest', type: 'digest', title: d.name, dek: d.statusLine, date: d.last, precision: 'day', month: d.last?.slice(0, 7),
    href: d.link, label: d.label, status: d.status, automated: true, receipts: [],
  });

  // Display status. builds.ts is the source, with one derived exception: the build that runs the Digest
  // reads "Publishing paused" while the workflow schedule is off (production's own project page does the same).
  for (const it of items) if (it.type === 'build' && it.status) it.statusLabel = it.id === d.relatedBuild && d.publishingPaused ? 'Publishing paused' : it.status[0] + it.status.slice(1).toLowerCase();

  // Small derivative for lists and cards (assets/thumb/…, made by tools/thumbs.py; astro:assets in production).
  for (const it of items) it.thumb = it.image ? it.image.replace('assets/', 'assets/thumb/').replace(/\.(jpe?g|png)$/i, '.webp') : null;

  // Documented relationships only.
  const edges = src.edges.filter((e) => byId.has(e.from) && byId.has(e.to));
  const neighbours = new Map(items.map((i) => [i.id, new Set()]));
  for (const e of edges) { neighbours.get(e.from).add(e.to); neighbours.get(e.to).add(e.from); }
  for (const it of items) it.related = [...neighbours.get(it.id)];

  // Themes
  const { themes: themeMap, filed } = classify(items, edges);
  for (const it of items) { const f = filed.get(it.id); it.theme = f.theme; it.filedBy = f.how; }
  const personal = items.filter((i) => i.type !== 'digest');
  const themes = [...themeMap.values()].map((t) => ({ ...t, count: personal.filter((i) => i.theme === t.id).length })).filter((t) => t.count > 0 || t.id === 'web');

  // Sectors: each theme gets an arc sized by how much work it holds (softened, with a floor),
  // so a new theme makes its own room and nothing is positioned by hand.
  const wsum = themes.reduce((s, t) => s + Math.max(1, t.count) ** 0.55, 0);
  let a0 = -Math.PI / 2;
  for (const t of themes) { const span = (Math.max(1, t.count) ** 0.55 / wsum) * Math.PI * 2; t.start = a0; t.span = span; t.mid = a0 + span / 2; a0 += span; }
  const sector = Object.fromEntries(themes.map((t) => [t.id, t]));

  const dated = items.filter((i) => i.date).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (a.order ?? 0) - (b.order ?? 0)));
  const human = dated.filter((i) => i.type !== 'digest');

  // Time. t = 0 at the first personal item of the modern record, 1 at "now" (newest item or Digest post).
  const newest = human[0]?.date ?? d.last;
  const tEnd = Date.parse(d.last && d.last > newest ? d.last : newest);
  const modern = human.filter((i) => i.date >= '2025-01-01');
  const tStart = Date.parse((modern.at(-1) ?? human.at(-1)).date) - 20 * 86400000;
  const DAY = 86400000;
  for (const it of items) {
    const ms = it.date ? Date.parse(it.date) : tStart;
    const age = Math.max(0, tEnd - ms) / DAY;                  // days before "now"
    const t = Math.min(1, Math.max(0, (ms - tStart) / Math.max(DAY, tEnd - tStart)));
    const s = sector[it.theme] ?? themes[0];
    const typeW = it.type === 'build' ? 1 + (it.hasPage ? 0.6 : 0) : it.type === 'essay' ? 0.9 : it.type === 'video' ? 0.75 : it.type === 'digest' ? 2.2 : 0.5;
    it.layout = {
      angle: s.start + s.span * (0.1 + 0.8 * hash(it.id)),
      t, ageDays: Math.round(age),
      // legacy radius: newest near the centre, each older year compressed (log), so years of work still fit
      radius: 0.12 + 0.88 * (Math.log1p(age / 30) / Math.log1p(Math.max(1, (tEnd - tStart) / DAY) / 30)),
      jitter: hash(it.id + '#'),
      weight: typeW + it.related.length * 0.15,
    };
    // Label / detail priority: connected, substantial and recent work first.
    it.priority = typeW * 2 + it.related.length * 0.6 + Math.max(0, 1 - age / 365) * 2;
  }

  // Timeline (newest first). Digest volume from real pubDates.
  const months = [...new Set(dated.map((i) => i.month).concat(Object.keys(d.perDay).map((k) => k.slice(0, 7))))].sort().reverse();
  const timeline = months.map((m) => ({
    month: m, items: human.filter((i) => i.month === m),
    digestPosts: Object.entries(d.perDay).filter(([k]) => k.startsWith(m)).reduce((s, [, n]) => s + n, 0),
  }));
  const years = [...new Set(human.map((i) => i.date.slice(0, 4)))].sort().reverse();

  // Digest per week (Monday start): the quiet, aggregated view of the automated posts.
  const weekStart = (iso) => { const x = new Date(iso + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x.toISOString().slice(0, 10); };
  const wk = {}; for (const [day, n] of Object.entries(d.perDay)) wk[weekStart(day)] = (wk[weekStart(day)] || 0) + n;
  const perWeek = Object.entries(wk).sort().map(([start, n]) => ({ start, n, t: Math.min(1, Math.max(0, (Date.parse(start) - tStart) / (tEnd - tStart))) }));

  // Level of detail. Clusters summarise personal work by theme × period; the renderer shows clusters
  // when zoomed out or when there are too many items to draw individually, and items when close.
  const periodOf = { year: (i) => i.date.slice(0, 4), quarter: (i) => `${i.date.slice(0, 4)}-Q${Math.floor((+i.date.slice(5, 7) - 1) / 3) + 1}`, month: (i) => i.month };
  const clusterCache = {};
  const clusters = (level = 'quarter') => (clusterCache[level] ??= (() => {
    const m = new Map();
    for (const it of human) {
      const key = `${it.theme}|${periodOf[level](it)}`;
      const c = m.get(key) ?? m.set(key, { id: `cluster:${key}`, theme: it.theme, period: periodOf[level](it), level, ids: [], byType: {}, t: 0, weight: 0, top: it }).get(key);
      c.ids.push(it.id); c.byType[it.type] = (c.byType[it.type] || 0) + 1; c.t += it.layout.t; c.weight += it.layout.weight;
      if (it.priority > c.top.priority) c.top = it;
    }
    return [...m.values()].map((c) => {
      const s = sector[c.theme]; const count = c.ids.length; const t = c.t / count;
      return { ...c, count, top: c.top.id, layout: { angle: s.mid + s.span * 0.3 * (hash(c.id) - 0.5), t, radius: 0, weight: Math.sqrt(count) } };
    }).sort((a, b) => (a.period < b.period ? 1 : -1));
  })());

  const latest = (type, n) => human.filter((i) => (Array.isArray(type) ? type.includes(i.type) : i.type === type)).slice(0, n);
  const featuredBuilds = items.filter((i) => i.type === 'build').sort((a, b) => a.order - b.order).slice(0, 3);
  const how = {}; for (const it of personal) how[it.filedBy] = (how[it.filedBy] || 0) + 1;

  return {
    items, byId, edges, timeline, years, themes, sector, clusters,
    person: src.person, credentials: src.credentials,
    digest: { ...d, perWeek, shareOfSite: d.published / (d.published + personal.length) },
    latest, featuredBuilds,
    latestVideo: latest('video', 1)[0] ?? null,
    now: human.slice(0, 4),
    time: { start: new Date(tStart).toISOString().slice(0, 10), end: new Date(tEnd).toISOString().slice(0, 10) },
    stats: {
      builds: personal.filter((i) => i.type === 'build').length, essays: personal.filter((i) => i.type === 'essay').length,
      videos: personal.filter((i) => i.type === 'video').length, shorts: personal.filter((i) => i.type === 'short').length,
      personal: personal.length, digestPublished: d.published, relationships: edges.length, themes: themes.length,
      receipts: personal.reduce((s, i) => s + (i.receipts?.length || 0), 0),
      firstMonth: months.at(-1), lastDate: dated[0]?.date, filedBy: how,
      missingThumbnails: personal.filter((i) => (i.type === 'video' || i.type === 'short') && !i.image).length,
    },
    meta: src._meta,
  };
}

/** Load sources.json relative to the page and build the graph. */
export async function loadGraph(base = '', opts = {}) {
  const r = await fetch(`${base}${opts.file ?? 'data/sources.json'}`);
  const src = await r.json();
  return { src, graph: buildGraph(src, { base, ...opts }) };
}

// ---------- search and filter (used by the index pages and the search box) ----------
/** Compact index: one small record per item. Written to data/search.json at build time. */
export function searchIndex(graph) {
  return graph.items.filter((i) => i.type !== 'digest').map((i) => ({
    id: i.id, t: i.title, k: i.type, th: i.theme, d: i.date, h: i.href, i: i.thumb, s: i.status ?? null,
    x: `${i.title} ${i.dek || ''} ${(i.stack || []).join(' ')} ${(i.hashtags || []).join(' ')}`.toLowerCase(),
  }));
}
/** Every query word must match (prefix match on words). Filters: { type, theme, year, status }. */
export function search(index, query = '', filters = {}, limit = 50) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const out = [];
  for (const r of index) {
    if (filters.type && !(Array.isArray(filters.type) ? filters.type.includes(r.k) : r.k === filters.type)) continue;
    if (filters.theme && r.th !== filters.theme) continue;
    if (filters.year && !r.d?.startsWith(filters.year)) continue;
    if (filters.status && r.s !== filters.status) continue;
    let score = 0; let ok = true;
    for (const w of words) {
      const inTitle = r.t.toLowerCase().includes(w); const at = r.x.indexOf(w);
      if (at < 0) { ok = false; break; }
      score += (inTitle ? 4 : 1) + (at === 0 || r.x[at - 1] === ' ' ? 1 : 0);
    }
    if (ok) out.push([score, r]);
  }
  out.sort((a, b) => b[0] - a[0] || (a[1].d < b[1].d ? 1 : -1));
  return { total: out.length, results: out.slice(0, limit).map((x) => x[1]) };
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
export const liveHref = (href) => (href && href.startsWith('/') ? LIVE_SITE + href : href);
/**
 * Where a production path points inside the prototype. `built` lists the production paths the
 * prototype implements; those stay inside it, everything else opens the real page on kenashe.ai.
 * ctx.root is the prototype's folder relative to round-3/ (e.g. 'site').
 */
export function hrefFor(href, ctx, built = []) {
  if (!href || href === '#') return '#';
  if (!href.startsWith('/')) return href;
  const path = href.split('#')[0]; const frag = href.includes('#') ? '#' + href.split('#')[1] : '';
  if (built.includes(path)) return `${ctx.base}${ctx.root}/${path.slice(1)}${frag}`;
  return LIVE_SITE + href;
}
export const isExternal = (url) => /^https?:/.test(url);
export const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
