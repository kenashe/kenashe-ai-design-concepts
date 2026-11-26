// Round 3 · the readable card that opens when something in the universe is selected.
// Pure HTML strings built from the same components as the rest of the site.
import { esc, titleOf, kicker, media, themeChip, threads, plural, n, itemHref, glyph, digestStatus, periodLabel, typeLabel, when, ICON, placeholderBadge } from '../../components.js';

const extAttrs = (url) => (/^https?:/.test(url) ? ' target="_blank" rel="noopener noreferrer"' : '');
const close = `<button class="uc-x" type="button" data-close aria-label="Close">${ICON.close}</button>`;

/** A selected build, essay, video or short. */
export function itemCard(it, graph, ctx) {
  const url = itemHref(it, ctx); const verb = it.type === 'video' || it.type === 'short' ? 'Watch' : it.type === 'essay' ? 'Read' : it.hasPage ? 'Open the build' : 'Open';
  const dead = url === '#';
  return `${close}<div class="uc-media">${media(it, { lazy: false })}</div>
<div class="uc-body">${kicker(it)}
<h3 class="uc-title">${esc(titleOf(it))}</h3>
<p class="uc-meta">${themeChip(graph, it)}${it.receipts?.length ? `<span class="ct ct--receipts">${plural(it.receipts.length, 'receipt')}</span>` : ''}${it.related?.length ? `<span class="ct ct--threads">${plural(it.related.length, 'thread')}</span>` : ''}</p>
${it.dek ? `<p class="uc-dek">${esc(it.dek)}</p>` : ''}
${dead ? `<p class="uc-note">${it.demo ? 'Placeholder entry. It has no page.' : 'Synthetic entry. It has no page.'}</p>` : `<p class="uc-open"><a class="btn btn--primary" href="${esc(url)}"${extAttrs(url)}><span>${verb}</span>${ICON.arrow}</a></p>`}
${it.related?.length ? `<div class="uc-threads"><h4>Follow a thread</h4>${threads(it, graph, ctx, { follow: true, limit: 6 })}</div>` : ''}</div>`;
}

/** A selected cluster: many pieces from one theme and period, shown as one soft body until opened. */
export function clusterCard(c, graph, ctx, { opened = false } = {}) {
  const theme = graph.sector[c.theme]; const items = c.ids.map((id) => graph.byId.get(id)).sort((a, b) => b.priority - a.priority);
  const kinds = Object.entries(c.byType).map(([k, v]) => plural(v, k)).join(' · ');
  return `${close}<div class="uc-body"><p class="kicker" style="--tc:${theme?.tint ?? '#f4efe4'}"><span>${esc(theme?.label ?? '')} · ${esc(periodLabel(c.period))}</span></p>
<h3 class="uc-title">${plural(c.count, 'piece')} of work</h3>
<p class="uc-dek">${esc(kinds)}. ${opened ? 'Opened: each piece is now its own light.' : 'Too many to draw one by one from this far out.'}</p>
<p class="uc-open"><button class="btn btn--primary" type="button" data-open-cluster="${esc(c.id)}"${opened ? ' disabled' : ''}><span>${opened ? 'Opened' : 'Open this cluster'}</span></button></p>
<div class="uc-threads"><h4>Most connected here</h4><ul class="threads">${items.slice(0, 5).map((it) => `<li style="--tc:${it.tint}"><button type="button" data-to="${esc(it.id)}"><span class="th-glyph">${glyph(it, 22)}</span><span class="th-body"><span class="th-title">${esc(titleOf(it))}</span><span class="th-ev">${esc(typeLabel[it.type])} · ${esc(when(it))}${it.demo ? placeholderBadge() : ''}</span></span></button></li>`).join('')}</ul>${c.count > 5 ? `<p class="receipts-more">and ${n(c.count - 5)} more in the list view</p>` : ''}</div></div>`;
}

/** The Digest's detail, shown only on demand. */
export const digestCard = (graph, ctx) => `${close}<div class="uc-body uc-body--digest">${digestStatus(graph, ctx, { level: 3 })}<p class="uc-note">The Digest is drawn as a faint band under Ken’s own work, aggregated per week. It is not counted among his builds, essays and videos.</p></div>`;
