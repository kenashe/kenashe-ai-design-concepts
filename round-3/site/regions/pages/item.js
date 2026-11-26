// Regions shared by every item page (builds and essays). The page says which item it is with
// <meta name="r3:item" content="building:zerohuman">; everything below is read from that item in the graph.
import { esc, fmtDate, typeLabel, titleOf, when, n, plural, glyph, themeChip, themeOf, receipts, threads, player, card, button, followLinks, sectionHead, href, local, itemHref, placeholderBadge, ICON, COPY } from '../../components.js';
import { localSky, skyCaption, neighbours } from './sky.js';

export const itemOf = (graph, ctx) => graph.byId.get(ctx.item) ?? null;
const missing = (ctx) => `<p class="empty wrap">This page names an item (${esc(ctx.item ?? 'none')}) that is not in the content graph.</p>`;
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : '');
const INDEX = { build: ['/building/', 'Building'], essay: ['/writing/', 'Writing'], video: ['/videos/', 'Videos'], short: ['/videos/', 'Videos'] };
export const universeHref = (it, ctx) => `${local('universe/', ctx)}#i=${encodeURIComponent(it.id)}`;

/**
 * Status as the page shows it. A build's own status comes from builds.ts. The one build that IS the Digest's
 * publishing system reports the Digest's derived state instead (graph.digest.status), so it can never say
 * "Live" while publishing is paused, and flips by itself when the data says publishing.
 */
export function statusOf(graph, it) {
  if (graph.digest?.relatedBuild === it.id) return graph.digest.status === 'publishing' ? 'Publishing' : `Publishing ${graph.digest.status}`;
  return it.type === 'build' && it.status ? cap(it.status) : '';
}
/** Kind · status · date, with the item's kind of light. */
export function kickerLine(graph, it) {
  const bits = [typeLabel[it.type] ?? it.type, statusOf(graph, it), it.date ? when(it) : ''].filter(Boolean);
  return `<p class="kicker" style="--tc:${it.tint}">${glyph(it, 20)}<span>${bits.map(esc).join(' · ')}</span>${it.demo ? placeholderBadge() : ''}</p>`;
}
const crumb = (it, ctx) => { const [path, label] = INDEX[it.type] ?? INDEX.build; return `<p class="crumb"><a href="${esc(href(path, ctx))}">${ICON.arrow}<span>${esc(label)}</span></a></p>`; };
/** Theme and stack, in one quiet line. */
const facts = (graph, it) => `<div class="ip-facts">${themeChip(graph, it)}${it.stack?.length ? `<ul class="ip-stack" aria-label="Stack">${it.stack.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}</div>`;
/** Receipts and threads counts as links to those parts of the page. */
function ledger(graph, it, ctx, { place = '#threads' } = {}) {
  const out = [];
  if (it.receipts?.length) out.push(`<a class="ct ct--receipts" href="#receipts">${plural(it.receipts.length, 'receipt')}</a>`);
  if (it.related?.length) out.push(`<a class="ct ct--threads" href="${place}">${plural(it.related.length, 'documented thread')}</a>`);
  return out.length ? `<p class="ip-ledger">${out.join('')}</p>` : '';
}
/** "2 documented threads" as the cards count them (related pieces), plus how many links document them. */
const threadsLede = (it, edges) => (edges.length ? `${plural(it.related.length, 'documented thread')}${edges.length !== it.related.length ? `, ${plural(edges.length, 'link')} in all` : ''}. Each is a real link on a real page, listed with where it is documented.` : '');
/** The sky figure: the prerendered view, one derived sentence, and the way into the full universe. */
export function skyFigure(graph, it, ctx, { cls = '' } = {}) {
  return `<figure class="ip-sky${cls ? ' ' + cls : ''}" style="--tc:${it.tint}">${localSky(it, graph, ctx)}
<figcaption><span>${esc(skyCaption(it, graph))}</span> <a class="more" href="${esc(universeHref(it, ctx))}">Open the universe here${ICON.arrow}</a></figcaption></figure>`;
}
/** The video documented for an item: the one its page embeds (item.video), else a video that links to it. */
export function videoOf(graph, it) {
  if (it.video && graph.byId.get(`video:${it.video}`)) return graph.byId.get(`video:${it.video}`);
  return neighbours(it, graph).items.filter((o) => o.type === 'video').sort((a, b) => (a.date < b.date ? 1 : -1))[0] ?? null;
}

export const item = {
  /** The item's theme colour for the page's own markers and rules (derived from theme.hue, never typed in a page). */
  'item-tint': (graph, ctx) => { const it = itemOf(graph, ctx); return it ? `<style>.ip{--tc:${it.tint}}</style>` : ''; },
  /** Build page head: kind, status, date, title, dek, theme, stack, counts, and the item's place in the universe. */
  'item-head': (graph, ctx) => {
    const it = itemOf(graph, ctx); if (!it) return missing(ctx);
    return `<div class="ip-head-text" style="--tc:${it.tint}">${crumb(it, ctx)}${kickerLine(graph, it)}
<h1>${esc(it.title)}</h1>
${it.dek ? `<p class="ip-dek">${esc(it.dek)}</p>` : ''}
${facts(graph, it)}${ledger(graph, it, ctx)}</div>
${skyFigure(graph, it, ctx)}`;
  },
  /** Essay head: reading first. Kind, date, title, dek, byline with the authorship label, theme. */
  'essay-head': (graph, ctx) => {
    const it = itemOf(graph, ctx); if (!it) return missing(ctx);
    return `<div class="ip-head-text" style="--tc:${it.tint}">${crumb(it, ctx)}${kickerLine(graph, it)}
<h1>${esc(it.title)}</h1>
${it.dek ? `<p class="ip-dek">${esc(it.dek)}</p>` : ''}
<p class="byline"><span>By ${esc(graph.person.name)}</span><span>${esc(it.displayDate || when(it))}</span>${it.authorship ? `<span class="authorship">${esc(it.authorship)}</span>` : ''}</p>
<div class="ip-facts">${themeChip(graph, it)}</div>${ledger(graph, it, ctx, { place: '#place' })}</div>`;
  },
  /** The documented video, click to load, with its own title and date. */
  'item-video': (graph, ctx) => {
    const it = itemOf(graph, ctx); const v = it && videoOf(graph, it); if (!v) return '';
    const yt = `https://www.youtube.com/watch?v=${v.videoId}`;
    return `<figure class="ip-video">${player(v, ctx, { lazy: false, label: 'Play the video' })}
<figcaption><span>${esc(titleOf(v))} · ${esc(when(v))}</span><a href="${esc(yt)}" target="_blank" rel="noopener noreferrer">Watch on YouTube${ICON.out}</a></figcaption></figure>`;
  },
  /** Every receipt documented on the item, in one place. */
  'item-receipts': (graph, ctx) => {
    const it = itemOf(graph, ctx); if (!it || !it.receipts?.length) return '';
    const kinds = [...new Set(it.receipts.map((r) => r.kind))];
    const tally = kinds.map((k) => plural(it.receipts.filter((r) => r.kind === k).length, k, k === 'repository' ? 'repositories' : k + 's')).join(', ');
    return `<div class="wrap ip-band-in">${sectionHead('Receipts', { id: 'receipts-h', lede: `Everything on this page that can be checked without taking Ken’s word for it: ${esc(tally)}.` })}
${receipts(it)}</div>`;
  },
  /** Documented relationships with their evidence, and the way into the universe. */
  'item-threads': (graph, ctx) => {
    const it = itemOf(graph, ctx); if (!it) return '';
    const { edges } = neighbours(it, graph);
    return `<div class="wrap ip-band-in">${sectionHead('Threads', { id: 'threads-h', lede: threadsLede(it, edges) })}
${threads(it, graph, ctx, { empty: true })}
<p class="ip-universe">${button('Open the universe here', universeHref(it, ctx), { variant: 'ghost', icon: ICON.expand })}</p></div>`;
  },
  /** Place in the universe and threads together (film and essay pages, where the work itself comes first). */
  'item-place': (graph, ctx) => {
    const it = itemOf(graph, ctx); if (!it) return '';
    const { edges } = neighbours(it, graph);
    return `<div class="wrap ip-place-grid">${skyFigure(graph, it, ctx, { cls: 'ip-sky--inline' })}
<div class="ip-place-threads">${sectionHead('Its place in the universe', { id: 'place-h', lede: threadsLede(it, edges) })}
${threads(it, graph, ctx, { empty: true })}</div></div>`;
  },
  /** Page end: more of the same kind, newest first, and the way back to the index. (Follow links are in the footer.) */
  'item-more': (graph, ctx) => {
    const it = itemOf(graph, ctx); const type = it?.type === 'essay' ? 'essay' : 'build'; const [path] = INDEX[type];
    const more = graph.latest(type, 4).filter((o) => o.id !== it?.id).slice(0, 3); if (!more.length) return '';
    const label = type === 'essay' ? `All ${n(graph.stats.essays)} essays` : `All ${n(graph.stats.builds)} builds`;
    return `<div class="wrap">${sectionHead(type === 'essay' ? 'More writing' : 'More builds', { id: 'more-h', link: { href: href(path, ctx), label } })}
<ul class="grid grid--3 grid--rail">${more.map((o) => `<li>${card(o, ctx, { graph })}</li>`).join('')}</ul></div>`;
  },
};

// Receipts grouped by what they document, so a page can set the matching transactions beside the prose that
// describes them. `rc-<word>` = the item's receipts whose label starts with that word or whose kind is that word.
for (const word of ['decision', 'encouragement', 'registry', 'injection', 'repository', 'order', 'delivery']) {
  item[`rc-${word}`] = (graph, ctx) => {
    const it = itemOf(graph, ctx); if (!it) return '';
    const list = (it.receipts || []).filter((r) => r.kind === word || r.label.toLowerCase().startsWith(word));
    return list.length ? receipts({ receipts: list }) : '<p class="empty">This receipt is not in the content graph.</p>';
  };
}

export { fmtDate, card };
