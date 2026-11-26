// Round 3 · design-system components (see STYLEGUIDE.md for markup and usage).
// Pure ES module: runs in Node (tools/prerender.mjs) and in the browser (?demo=, the universe card).
// Every page composes its regions from these helpers; none of them invents content. Lists, counts,
// dates, statuses, colours and relationships all come from the graph.
import { esc, fmtDate, hrefFor, typeLabel, hash } from '../lib/graph.js';
import { themeColors, DIGEST_TINT, periodLabel } from './assets/universe/scene.js';
import { COPY } from './copy.js';

/** Every production path the finished prototype implements. Everything else opens the live kenashe.ai page. */
export const BUILT = ['/', '/universe/', '/videos/', '/building/', '/writing/', '/about/',
  '/building/zerohuman/', '/building/returning-your-things/', '/building/autonomous-ai-blog/', '/building/ai-agent-economy/',
  '/writing/4-tips-for-making-ai-videos-that-feel-like-films/'];
const SITE = 'site';

// ---------- small utilities ----------
export const n = (x) => Number(x).toLocaleString('en-US');
export const plural = (k, one, many = one + 's') => `${n(k)} ${k === 1 ? one : many}`;
export const when = (it) => fmtDate(it.date, it.precision);
/** Display title: YouTube titles keep their words but lose trailing hashtags ("… #domains #domainnames"). */
export const titleOf = (it) => (it.type === 'video' || it.type === 'short' ? String(it.title).replace(/(\s+#[\w-]+)+\s*$/, '') || it.title : it.title);
const extAttrs = (url) => (/^https?:/.test(url) ? ' target="_blank" rel="noopener noreferrer"' : '');
/** A production path (`/building/zerohuman/`) → its place in the prototype, or the live site if not built. */
export const href = (path, ctx) => hrefFor(path, { ...ctx, root: SITE }, BUILT);
/** A file inside the prototype (`universe/`, `assets/site.css`). */
export const local = (path, ctx) => `${ctx.base}${SITE}/${path}`;
/** Where an item's card links. Videos and shorts open in the video archive (`/videos/#v-<videoId>`). */
export function itemHref(it, ctx) {
  if (it.demo || it.synthetic) return '#';
  if (it.type === 'digest') return href(it.href || '/blog/', ctx);
  if (it.type === 'video' || it.type === 'short') return `${href('/videos/', ctx)}#v-${it.videoId}`;
  return href(it.href, ctx);
}

/** Stamp each item with its theme colour (derived from theme.hue) once per graph. Region wrappers call this. */
const prepped = new WeakSet();
export function prep(graph) {
  if (prepped.has(graph)) return graph;
  const colors = themeColors(graph.themes);
  for (const it of graph.items) it.tint = it.type === 'digest' ? DIGEST_TINT[it.status] ?? DIGEST_TINT.paused : colors.get(it.theme) ?? '#f4efe4';
  for (const t of graph.themes) t.tint = colors.get(t.id);
  prepped.add(graph); return graph;
}
export const themeOf = (graph, it) => graph.sector[it.theme] ?? graph.themes[0];
const tc = (it) => ` style="--tc:${it.tint ?? '#f4efe4'}"`;

// ---------- icons ----------
export const ICON = {
  play: '<svg class="i" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>',
  pause: '<svg class="i" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 3h3v10H4zM9 3h3v10H9z" fill="currentColor"/></svg>',
  arrow: '<svg class="i" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  out: '<svg class="i" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 11l6-6M6 5h5v5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  search: '<svg class="i" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  menu: '<svg class="i" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4.5h12M2 8h12M2 11.5h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  close: '<svg class="i" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  youtube: '<svg class="i" viewBox="0 0 16 16" aria-hidden="true"><rect x="1" y="3" width="14" height="10" rx="3" fill="currentColor"/><path d="M6.6 5.8v4.4L10.4 8z" fill="var(--void,#0a0908)"/></svg>',
  x: '<svg class="i" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 2.5l11 11M13.5 2.5l-11 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  rss: '<svg class="i" viewBox="0 0 16 16" aria-hidden="true"><circle cx="3.5" cy="12.5" r="1.5" fill="currentColor"/><path d="M2 7.5a6.5 6.5 0 016.5 6.5M2 3a11 11 0 0111 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  list: '<svg class="i" viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 4h8M5.5 8h8M5.5 12h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="2.5" cy="4" r="1" fill="currentColor"/><circle cx="2.5" cy="8" r="1" fill="currentColor"/><circle cx="2.5" cy="12" r="1" fill="currentColor"/></svg>',
  expand: '<svg class="i" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

/**
 * The kind of light an item is, as a small inline glyph. Same visual language as the universe:
 * build = a star with diffraction spikes, essay = a planet lit from "now", video = a ringed body,
 * short = a small ringed body, digest = an ash band. Colour comes from the item's theme (--tc).
 */
export function glyph(it, size = 22) {
  const c = 'var(--tc,currentColor)'; let body;
  if (it.type === 'build') body = `<path d="M12 1.5v21M1.5 12h21" stroke="${c}" stroke-width="1.1" opacity=".8"/><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke="${c}" stroke-width=".8" opacity=".45"/><circle cx="12" cy="12" r="3.1" fill="#fff8ec"/>`;
  else if (it.type === 'essay') body = `<circle cx="12" cy="12" r="6.6" fill="none" stroke="${c}" stroke-width="1.2"/><path d="M12 5.4a6.6 6.6 0 010 13.2a3.4 6.6 0 000-13.2z" fill="${c}"/>`;
  else if (it.type === 'video') body = `<ellipse cx="12" cy="12" rx="10" ry="3.4" fill="none" stroke="${c}" stroke-width="1.1" transform="rotate(-18 12 12)"/><circle cx="12" cy="12" r="4.6" fill="${c}"/>`;
  else if (it.type === 'short') body = `<ellipse cx="12" cy="12" rx="7.6" ry="2.6" fill="none" stroke="${c}" stroke-width="1.1" transform="rotate(-18 12 12)"/><circle cx="12" cy="12" r="3.1" fill="${c}"/>`;
  else body = `<path d="M3 9h18M5 12.5h14M8 16h8" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="1 3.2"/>`;
  return `<svg class="glyph" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${body}</svg>`;
}

// ---------- badges, kickers, chips ----------
/** Demo entries always look like placeholders. */
export const placeholderBadge = () => '<span class="badge-ph">Placeholder</span>';
/** The quiet "Automated" mark that accompanies the Digest everywhere. */
export const automatedBadge = () => '<span class="badge-auto">Automated</span>';

/** Kind · status · date line above a title. */
export function kicker(it, { date = true } = {}) {
  const bits = [typeLabel[it.type] ?? it.type];
  if (it.type === 'build' && it.status) bits.push(it.statusLabel ?? it.status[0] + it.status.slice(1).toLowerCase());
  if (date && it.date && it.type !== 'digest') bits.push(when(it));
  return `<p class="kicker"${tc(it)}>${glyph(it, 20)}<span>${bits.map(esc).join(' · ')}</span>${it.demo ? placeholderBadge() : ''}</p>`;
}
/** Theme name with its light. */
export const themeChip = (graph, it) => { const t = themeOf(graph, it); return `<span class="theme" style="--tc:${t.tint ?? it.tint}">${esc(t.label)}</span>`; };

/**
 * Filter chips. items: [{label, value, count?, pressed?, href?}]. With `href` they are links (works without
 * JS); otherwise buttons with aria-pressed that the page script toggles.
 */
export function chips(items, { label = 'Filter', name = 'filter' } = {}) {
  return `<div class="chips" role="group" aria-label="${esc(label)}" data-chips="${esc(name)}">${items.map((c) => {
    const inner = `${c.tint ? `<i style="--tc:${c.tint}"></i>` : ''}${esc(c.label)}${c.count != null ? `<span class="chip-n">${n(c.count)}</span>` : ''}`;
    return c.href
      ? `<a class="chip" href="${esc(c.href)}"${c.pressed ? ' aria-current="true"' : ''}>${inner}</a>`
      : `<button class="chip" type="button" data-value="${esc(c.value ?? '')}" aria-pressed="${c.pressed ? 'true' : 'false'}">${inner}</button>`;
  }).join('')}</div>`;
}

// ---------- buttons and headings ----------
/** variant: 'primary' (amber, one per view), 'solid', 'ghost' (outlined), 'quiet' (text link with arrow). */
export function button(label, url, { variant = 'ghost', icon = '', iconAfter = '', attrs = '' } = {}) {
  return `<a class="btn btn--${variant}" href="${esc(url)}"${extAttrs(url)}${attrs ? ' ' + attrs : ''}>${icon}<span>${esc(label)}</span>${iconAfter}</a>`;
}
/** Section heading: serif title, optional lede, optional link to the section's index page. */
export function sectionHead(title, { id = '', lede = '', link = null, level = 2 } = {}) {
  return `<header class="sec-head"><div><h${level}${id ? ` id="${esc(id)}"` : ''}>${title}</h${level}>${lede ? `<p class="sec-lede">${lede}</p>` : ''}</div>${link ? `<a class="more" href="${esc(link.href)}"${extAttrs(link.href)}>${esc(link.label)}${ICON.arrow}</a>` : ''}</header>`;
}

// ---------- the data-derived visual for image-less items ----------
/**
 * Never a fake screenshot. A small plate of the item's own place in the universe, computed only from the item:
 * its theme light (--tc), its kind (the glyph shape), its direction (layout.angle), its distance from "now"
 * (layout.t picks which time arcs cross the plate), one thread per documented relationship, and one tick per
 * stack tag or hashtag. Stable between builds, unique per item.
 */
export function visual(it, { cls = '' } = {}) {
  const L = it.layout ?? { angle: 0, t: 0.5 }; const W = 320, H = 180;
  const a = L.angle; const px = W * (0.5 + 0.16 * Math.cos(a)), py = H * (0.52 + 0.14 * Math.sin(a));
  // "now" lies off the plate, in the direction opposite to the item's angle; time arcs are centred there
  const D = 150 + (1 - L.t) * 260; const ox = px - Math.cos(a) * D, oy = py - Math.sin(a) * D * 0.62;
  let arcs = '';
  for (let k = -2; k <= 3; k++) { const r = D + k * 38; if (r > 20) arcs += `<ellipse cx="${ox.toFixed(1)}" cy="${oy.toFixed(1)}" rx="${r.toFixed(1)}" ry="${(r * 0.62).toFixed(1)}"/>`; }
  let th = '';
  (it.related || []).slice(0, 7).forEach((id, i) => {
    const ang = hash(id + it.id) * Math.PI * 2; const len = 120 + hash(id) * 120; const ex = px + Math.cos(ang) * len, ey = py + Math.sin(ang) * len * 0.62;
    const mx = (px + ex) / 2, my = (py + ey) / 2 - 26 - i * 3;
    th += `<path d="M${px.toFixed(1)} ${py.toFixed(1)}Q${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}"/><circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="2.2"/>`;
  });
  const tags = (it.stack || it.hashtags || []).length; let ticks = '';
  for (let i = 0; i < Math.min(tags, 9); i++) ticks += `<path d="M${16 + i * 9} ${H - 14}v-7"/>`;
  const big = { ...it, type: it.type }; const g = glyph(big, 24).replace('<svg class="glyph"', `<svg x="${(px - 27).toFixed(1)}" y="${(py - 27).toFixed(1)}"`).replace('width="24" height="24"', 'width="54" height="54"');
  return `<span class="vis${cls ? ' ' + cls : ''}${it.demo ? ' vis--ph' : ''}" style="--tc:${it.tint ?? '#f4efe4'};--vx:${((px / W) * 100).toFixed(1)}%;--vy:${((py / H) * 100).toFixed(1)}%" role="img" aria-label="${esc(`${typeLabel[it.type] ?? 'Item'} with no image: drawn from its place in the universe${it.related?.length ? `, ${plural(it.related.length, 'documented thread')}` : ''}`)}"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g class="vis-arcs">${arcs}</g><g class="vis-threads">${th}</g><g class="vis-ticks">${ticks}</g>${g}</svg></span>`;
}

/** Image if the item has one, otherwise its data-derived visual. `size`: 'thumb' (480 px derivative) or 'full'. */
export function media(it, { size = 'thumb', lazy = true, w = 480, h = 270, alt = '' } = {}) {
  const src = it.demo ? null : size === 'full' ? it.image : it.thumb ?? it.image;
  if (!src) return visual(it);
  return `<img src="${esc(src)}" alt="${esc(alt)}" width="${w}" height="${h}"${lazy ? ' loading="lazy"' : ''} decoding="async">`;
}

// ---------- cards and rows ----------
const counts = (it) => {
  const out = [];
  if (it.receipts?.length) out.push(`<span class="ct ct--receipts">${plural(it.receipts.length, 'receipt')}</span>`);
  if (it.related?.length) out.push(`<span class="ct ct--threads">${plural(it.related.length, 'thread')}</span>`);
  return out.join('');
};
/**
 * Item card. Works for builds, essays, videos and shorts. opts: { level: heading level (3), size: 'md' | 'lg',
 * dek: true, lazy: true, graph: pass it to show the theme name }.
 */
export function card(it, ctx, { level = 3, size = 'md', dek = true, lazy = true, graph = null } = {}) {
  const url = itemHref(it, ctx); const portrait = it.type === 'short';
  return `<article class="card card--${it.type} card--${size}${it.demo ? ' is-ph' : ''}" data-id="${esc(it.id)}"${tc(it)}>
<div class="card-media${portrait ? ' card-media--short' : ''}">${media(it, { size: size === 'lg' ? 'full' : 'thumb', lazy, w: size === 'lg' ? 1280 : 480, h: size === 'lg' ? 720 : 270 })}${it.type === 'video' || it.type === 'short' ? `<span class="card-play" aria-hidden="true">${ICON.play}</span>` : ''}</div>
<div class="card-body">${kicker(it)}
<h${level} class="card-title"><a href="${esc(url)}"${extAttrs(url)}>${esc(titleOf(it))}</a></h${level}>
${dek && it.dek ? `<p class="card-dek">${esc(it.dek)}</p>` : ''}
${counts(it) || graph ? `<p class="card-meta">${graph ? themeChip(graph, it) : ''}${counts(it)}</p>` : ''}</div>
</article>`;
}
/** Compact list row (inside `<ul class="rows">`). opts: { thumb: true, dek: false, graph }. */
export function row(it, ctx, { thumb = true, dek = false, graph = null } = {}) {
  const url = itemHref(it, ctx);
  return `<li class="row row--${it.type}${it.demo ? ' is-ph' : ''}" data-id="${esc(it.id)}"${tc(it)}>
${thumb ? `<span class="row-media">${media(it, { w: 160, h: 90 })}</span>` : `<span class="row-glyph">${glyph(it, 26)}</span>`}
<span class="row-body"><a class="row-title" href="${esc(url)}"${extAttrs(url)}>${esc(titleOf(it))}</a>${dek && it.dek ? `<span class="row-dek">${esc(it.dek)}</span>` : ''}
<span class="row-meta">${esc([typeLabel[it.type], it.type === 'build' && it.status ? it.statusLabel ?? it.status[0] + it.status.slice(1).toLowerCase() : null, when(it)].filter(Boolean).join(' · '))}${graph ? ` · ${esc(themeOf(graph, it).label)}` : ''}${it.related?.length ? ` · ${plural(it.related.length, 'thread')}` : ''}${it.demo ? placeholderBadge() : ''}</span></span></li>`;
}

// ---------- video player (click to load, youtube-nocookie) ----------
/**
 * Poster is the local thumbnail; the iframe is only created on click (assets/boot.js → wirePlayers).
 * Without JS it is a plain link to YouTube. Demo and thumbnail-less videos get the data-derived visual.
 */
export function player(it, ctx, { lazy = true, label = '' } = {}) {
  const yt = it.videoId && !it.demo && !it.synthetic ? `https://www.youtube.com/watch?v=${it.videoId}` : null;
  const embed = yt ? `https://www.youtube-nocookie.com/embed/${it.videoId}` : null;
  const poster = media(it, { size: 'full', lazy, w: 1280, h: 720 });
  if (!yt) return `<div class="player player--off"${tc(it)}>${poster}<span class="player-note">${it.demo ? 'Placeholder video. Nothing to play.' : 'No video to play.'}</span></div>`;
  return `<div class="player" data-player data-embed="${esc(embed)}" data-title="${esc(it.title)}"${tc(it)}>
<a class="player-link" href="${esc(yt)}" target="_blank" rel="noopener noreferrer">${poster}<span class="player-btn" aria-hidden="true">${ICON.play}</span><span class="player-cap"><strong>${esc(label || 'Play')}</strong><span class="vh">: ${esc(it.title)}.</span> <span class="player-sub">Plays here. YouTube loads only when you press play.</span></span></a></div>`;
}

// ---------- receipts ----------
const shortHash = (v) => (v && v.length > 18 ? `${v.slice(0, 8)}…${v.slice(-6)}` : v);
/** Technical receipts (transactions, repositories, evidence files) exactly as documented on the item. */
export function receipts(it, { limit = 0, empty = false } = {}) {
  const list = it.receipts || [];
  if (!list.length) return empty ? '<p class="empty">No receipts are documented for this item yet.</p>' : '';
  const shown = limit ? list.slice(0, limit) : list;
  return `<ul class="receipts">${shown.map((r) => `<li><span class="rc-kind">${esc(r.kind)}</span>${r.url ? `<a href="${esc(r.url)}"${extAttrs(r.url)}>${esc(r.label)}</a>` : `<span>${esc(r.label)}</span>`}${r.value ? `<code title="${esc(r.value)}">${esc(shortHash(r.value))}</code>` : ''}</li>`).join('')}</ul>${limit && list.length > limit ? `<p class="receipts-more">and ${n(list.length - limit)} more on the build page</p>` : ''}`;
}

// ---------- documented relationships ("threads") ----------
const VERB = { 'links-to': ['links to', 'is linked from'], embeds: ['embeds', 'is embedded in'], mentions: ['mentions', 'is mentioned by'] };
/** The item's documented relationships with their evidence. opts: { limit, follow: render buttons for the universe card, evidence: true }. */
export function threads(it, graph, ctx, { limit = 0, follow = false, evidence = true, empty = false } = {}) {
  const edges = graph.edges.filter((e) => e.from === it.id || e.to === it.id);
  if (!edges.length) return empty ? '<p class="empty">No documented relationships yet. Threads appear when a page links to other work.</p>' : '';
  const shown = limit ? edges.slice(0, limit) : edges;
  return `<ul class="threads">${shown.map((e) => {
    const out = e.from === it.id; const o = graph.byId.get(out ? e.to : e.from); const verb = (VERB[e.type] ?? [e.type, e.type])[out ? 0 : 1];
    const inner = `<span class="th-glyph">${glyph(o, 22)}</span><span class="th-body"><span class="th-verb">${esc(verb)}</span> <span class="th-title">${esc(titleOf(o))}</span>${evidence && e.evidence ? `<span class="th-ev">Documented in ${esc(e.evidence)}</span>` : ''}</span>`;
    return `<li style="--tc:${o.tint ?? '#f4efe4'}">${follow ? `<button type="button" data-to="${esc(o.id)}">${inner}</button>` : `<a href="${esc(itemHref(o, ctx))}"${extAttrs(itemHref(o, ctx))}>${inner}</a>`}</li>`;
  }).join('')}</ul>${limit && edges.length > limit ? `<p class="receipts-more">and ${n(edges.length - limit)} more</p>` : ''}`;
}

// ---------- the Digest: always automated, always quiet, status derived ----------
export const digestWord = (graph) => { const s = String(graph.digest.status || ''); return s ? s[0].toUpperCase() + s.slice(1) : 'Unknown'; };
/** Weekly volume as a tiny ash sparkline (graph.digest.perWeek). Aggregated, so it stays small at any volume. */
export function digestSpark(graph, { w = 280, h = 44 } = {}) {
  let weeks = graph.digest.perWeek || []; if (!weeks.length) return '';
  const N = Math.min(weeks.length, 70); const per = weeks.length / N; const bins = Array.from({ length: N }, (_, i) => weeks.slice(Math.floor(i * per), Math.floor((i + 1) * per) || undefined).reduce((s, x) => s + x.n, 0));
  const max = Math.max(...bins, 1); const bw = w / N;
  return `<svg class="digest-spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(`Automated posts per week from ${fmtDate(graph.digest.first)} to ${fmtDate(graph.digest.last)}`)}">${bins.map((v, i) => `<rect x="${(i * bw + 0.5).toFixed(1)}" y="${(h - Math.max(1, (v / max) * (h - 2))).toFixed(1)}" width="${Math.max(1, bw - 1.5).toFixed(1)}" height="${Math.max(1, (v / max) * (h - 2)).toFixed(1)}"/>`).join('')}</svg>`;
}
/** Digest status block. opts: { compact: one quiet strip (homepage), heading level }. */
export function digestStatus(graph, ctx, { compact = false, level = 2 } = {}) {
  const d = graph.digest; const build = graph.byId.get(d.relatedBuild);
  const archive = href(d.link || '/blog/', ctx);
  const facts = `${n(d.published)} automated posts, ${fmtDate(d.first)} to ${fmtDate(d.last)}.${d.noindex ? ' Hidden from search engines (noindex).' : ''}`;
  return `<section class="digest-status${compact ? ' digest-status--compact' : ''}" data-status="${esc(d.status)}" aria-label="The Digest, automated">
<div class="ds-head">${automatedBadge()}<h${level} class="ds-title">${esc(d.name)}</h${level}><span class="ds-state">${esc(digestWord(graph))}</span></div>
<p class="ds-line">${esc(d.statusLine)} ${esc(facts)}</p>
${digestSpark(graph)}
<p class="ds-links"><a href="${esc(archive)}"${extAttrs(archive)}>Open the archive${ICON.arrow}</a>${build ? `<a href="${esc(itemHref(build, ctx))}"${extAttrs(itemHref(build, ctx))}>How it was built${ICON.arrow}</a>` : ''}</p>
</section>`;
}

// ---------- follow ----------
const socialIcon = (id) => ICON[id] ?? '';
/** Follow links from the real profiles (YouTube first, then X), plus the writing RSS. opts: { limit, rss: true, variant: 'buttons' | 'inline' }. */
export function followLinks(ctx, { limit = 2, rss = false, variant = 'buttons' } = {}) {
  const list = COPY.socials.slice(0, limit).concat(rss ? [COPY.rss] : []);
  if (variant === 'inline') return `<ul class="follow follow--inline">${list.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer me">${socialIcon(s.id)}<span>${esc(s.label)}</span>${s.handle ? `<span class="follow-h">${esc(s.handle)}</span>` : ''}</a></li>`).join('')}</ul>`;
  return `<ul class="follow">${list.map((s) => `<li><a class="btn btn--ghost" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer me">${socialIcon(s.id)}<span>${s.id === 'rss' ? esc(s.label) : `Follow on ${esc(s.label)}`}</span></a></li>`).join('')}</ul>`;
}

// ---------- page shell ----------
const NAV = [
  { id: 'universe', label: 'Universe', path: '/universe/' },
  { id: 'building', label: 'Building', path: '/building/' },
  { id: 'videos', label: 'Videos', path: '/videos/' },
  { id: 'writing', label: 'Writing', path: '/writing/' },
  { id: 'digest', label: 'Digest', path: '/blog/', automated: true },
  { id: 'about', label: 'About', path: '/about/' },
];
/** Which nav entry a page belongs to, from its path inside the prototype. */
export const activeOf = (ctx) => { const p = String(ctx.page || ''); return p === 'index.html' ? 'home' : NAV.find((x) => p.startsWith(x.id + '/'))?.id ?? ''; };
/**
 * Site header. Conventional navigation: nobody needs the universe to find content.
 * The Search control is a link to the Building index that scripts upgrade: it dispatches a cancelable
 * `r3:search` CustomEvent on document; a listener that opens an overlay calls event.preventDefault().
 */
export function header(ctx, active = activeOf(ctx)) {
  const links = NAV.map((x) => { const u = href(x.path, ctx); return `<li><a href="${esc(u)}"${extAttrs(u)}${x.id === active ? ' aria-current="page"' : ''}>${esc(x.label)}${x.automated ? '<span class="nav-auto">automated</span>' : ''}</a></li>`; }).join('');
  const search = `<a class="search-btn" href="${esc(href('/building/', ctx))}" data-search>${ICON.search}<span>Search</span></a>`;
  return `<header class="site-head">
<a class="brand" href="${esc(local('', ctx))}"${active === 'home' ? ' aria-current="page"' : ''}><svg class="brand-mark" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1v22M1 12h22" stroke="currentColor" stroke-width="1"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg><span>${esc(COPY.name)}</span></a>
<nav class="nav" aria-label="Primary"><ul>${links}</ul></nav>
${search}
<details class="nav-menu"><summary>${ICON.menu}<span>Menu</span></summary><nav aria-label="Primary, menu"><ul>${links}</ul></nav></details>
</header>`;
}
/** Site footer: follow links, the same navigation, the automated Digest kept separate and labelled. */
export function footer(graph, ctx) {
  const d = graph.digest; const ext = (p) => href(p, ctx);
  return `<footer class="site-foot">
<div class="foot-top"><div class="foot-brand"><p class="foot-name">${esc(COPY.name)}</p><p class="foot-line">${esc(COPY.footerLine)}</p></div>
<div class="foot-follow"><p class="foot-h">Follow the work</p>${followLinks(ctx, { limit: 2, rss: true })}</div></div>
<div class="foot-cols">
<nav aria-label="Footer"><p class="foot-h">Explore</p><ul>${NAV.filter((x) => !x.automated).map((x) => `<li><a href="${esc(href(x.path, ctx))}">${esc(x.label)}</a></li>`).join('')}</ul></nav>
<div><p class="foot-h">Elsewhere</p><ul>${COPY.socials.slice(2).map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer me">${esc(s.label)}</a></li>`).join('')}</ul></div>
<div><p class="foot-h">More</p><ul><li><a href="${esc(ext('/newsroom/'))}" target="_blank" rel="noopener noreferrer">Newsroom</a></li><li><a href="${esc(ext('/work/'))}" target="_blank" rel="noopener noreferrer">Work with Ken</a></li><li><a href="mailto:${esc(COPY.email)}">${esc(COPY.email)}</a></li></ul></div>
<div class="foot-digest"><p class="foot-h">The Digest ${automatedBadge()}</p><p>${esc(d.statusLine)}</p><p><a href="${esc(ext(d.link || '/blog/'))}" target="_blank" rel="noopener noreferrer">Open the archive${ICON.arrow}</a></p></div>
</div>
<p class="foot-note">${esc(COPY.site)} · Design concept, Round 3. Not the live site.</p>
</footer>`;
}

/** JSON-LD Person, as production emits it (from graph.person). */
export function jsonLdPerson(graph) {
  const p = graph.person;
  const data = { '@context': 'https://schema.org', '@type': 'Person', name: p.name, url: 'https://kenashe.ai/', jobTitle: p.jobTitle, description: p.description, image: p.image, knowsAbout: p.knowsAbout, sameAs: p.sameAs };
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

export { esc, fmtDate, typeLabel, periodLabel, COPY };
