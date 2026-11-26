// Regions for the dedicated universe page (proposed new route /universe/) and the stress test.
import { esc, titleOf, fmtDate, row, itemHref, n, plural, typeLabel, glyph, when, digestStatus, placeholderBadge } from '../components.js';
import { posterSVG } from '../assets/universe/poster.js';

export const LIST_FULL = 90; // items listed in full in the prerendered HTML; older years are filled in on demand

/** One year of the list view. Exported so the page script can fill a year when it is opened. */
export function yearItems(graph, ctx, year) {
  return graph.items.filter((i) => i.type !== 'digest' && i.date.startsWith(year)).sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((it) => `<li style="--tc:${it.tint}" data-id="${esc(it.id)}"><a href="${esc(itemHref(it, ctx))}"${/^https?:/.test(itemHref(it, ctx)) ? ' target="_blank" rel="noopener noreferrer"' : ''}>${glyph(it, 22)}<span class="ul-t">${esc(titleOf(it))}</span></a><span class="ul-m">${esc(typeLabel[it.type])} · ${esc(graph.sector[it.theme]?.label ?? '')} · ${esc(when(it))}${it.related.length ? ` · ${plural(it.related.length, 'thread')}` : ''}${it.demo ? placeholderBadge() : ''}</span><button class="ul-go" type="button" data-show="${esc(it.id)}">Show in universe</button></li>`).join('');
}

export const universe = {
  'universe-poster': (graph, ctx) => posterSVG(graph, ctx, 'full', { hrefOf: (it) => itemHref(it, ctx) }),
  'universe-now': (graph) => `Now · ${esc(fmtDate(graph.time.end))}`,
  /** One honest sentence of counts (the Digest is not counted with Ken's work). */
  'universe-summary': (graph) => {
    const s = graph.stats;
    return `${plural(s.builds, 'build')}, ${plural(s.essays, 'essay')}, ${plural(s.videos, 'video')} and ${plural(s.shorts, 'short')} in ${plural(s.themes, 'theme')}, joined by ${plural(s.relationships, 'documented thread')}.`;
  },
  /**
   * The list view: the complete text equivalent of the universe, grouped by year, newest first.
   * The DOM stays small at any scale: years are <details>; only the newest years (up to LIST_FULL items) are
   * in the prerendered HTML, older years are filled in when opened, and without JavaScript they point to the archives.
   */
  'universe-list': (graph, ctx) => {
    let budget = LIST_FULL; let out = '';
    graph.years.forEach((y, i) => {
      const count = graph.items.filter((it) => it.type !== 'digest' && it.date.startsWith(y)).length;
      const full = budget > 0 || i === 0; budget -= count;
      out += `<details class="ul-year" data-year="${esc(y)}"${i === 0 ? ' open' : ''}><summary><span class="ul-y">${esc(y)}</span><span class="ul-c">${plural(count, 'piece')}</span></summary><ul class="ul-items"${full ? '' : ' data-lazy'}>${full ? yearItems(graph, ctx, y) : `<li class="ul-lazy">This year opens here when scripts are available. Everything is also in the Building, Videos and Writing archives.</li>`}</ul></details>`;
    });
    return out;
  },
  /** Every documented thread with its evidence (capped; the rest are reachable from each item). */
  'universe-threads': (graph, ctx) => {
    const cap = 60; const verb = { 'links-to': 'links to', embeds: 'embeds', mentions: 'mentions' };
    return `<ul class="thread-list">${graph.edges.slice(0, cap).map((e) => { const a = graph.byId.get(e.from), b = graph.byId.get(e.to); return `<li><a href="${esc(itemHref(a, ctx))}">${esc(a.title)}</a> <span>${esc(verb[e.type] ?? e.type)}</span> <a href="${esc(itemHref(b, ctx))}">${esc(b.title)}</a><small>Documented in ${esc(e.evidence || '')}</small></li>`; }).join('')}</ul>${graph.edges.length > cap ? `<p class="receipts-more">Showing ${cap} of ${n(graph.edges.length)} documented threads. Select any item to see its own.</p>` : ''}`;
  },
  'universe-digest': (graph, ctx) => digestStatus(graph, ctx, { level: 3 }),
};
