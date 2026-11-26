// Regions that belong to one page each: ZeroHuman's status, the film, the system behind the Digest,
// and the film banner at the end of the making-of essay. All derived from the graph.
import { esc, fmtDate, titleOf, when, n, plural, glyph, player, card, button, automatedBadge, digestWord, href, itemHref, media, ICON, COPY } from '../../components.js';
import { itemOf, statusOf, videoOf, kickerLine } from './item.js';
import { neighbours } from './sky.js';

const FILM_ID = 'building:returning-your-things';
const extAttrs = (url) => (/^https?:/.test(url) ? ' target="_blank" rel="noopener noreferrer"' : '');
const VERB = { 'links-to': ['links to', 'is linked from'], embeds: ['embeds', 'is embedded in'], mentions: ['mentions', 'is mentioned by'] };

/** A thread shown as a card: the related item, then how the two are related and where that is documented. */
function threadCard(edge, from, graph, ctx, { level = 3 } = {}) {
  const out = edge.from === from.id; const o = graph.byId.get(out ? edge.to : edge.from);
  const verb = (VERB[edge.type] ?? [edge.type, edge.type])[out ? 0 : 1];
  return `<li class="thread-card" style="--tc:${o.tint}">${card(o, ctx, { level, graph, dek: o.type !== 'video' && o.type !== 'short' })}
<p class="thread-ev"><span>${esc(titleOf(from))} ${esc(verb)} this.</span> Documented in ${esc(edge.evidence || 'the page source')}</p></li>`;
}

export const builds = {
  // ---------- ZeroHuman ----------
  /**
   * Service status. Prerendered as a dated snapshot of what the page documents; assets/pages.js asks the
   * service's public status endpoint once per view and only then relabels it "Live".
   */
  'zh-status': (graph, ctx) => {
    const it = itemOf(graph, ctx); if (!it) return '';
    return `<div class="zh-status" data-zh-status data-endpoint="https://zerohuman-production.up.railway.app/api/status" style="--tc:${it.tint}">
<p class="zh-status-label"><span class="zh-dot" aria-hidden="true"></span><span data-zh-label>Snapshot · as documented ${esc(fmtDate(graph.time.end))}</span></p>
<dl class="zh-status-rows" data-zh-rows><div><dt>Status</dt><dd>${esc(statusOf(graph, it))}${it.metric ? `, ${esc(it.metric)}` : ''}</dd></div><div><dt>Paid orders documented</dt><dd>${n(it.receipts.filter((r) => /order$/i.test(r.label)).length)}, both from Ken’s own test buyer</dd></div></dl>
<p class="zh-status-note" data-zh-note>This page asks the service’s public status endpoint once when it loads. If that works, the numbers above are replaced and labelled Live. Without JavaScript, or if the service cannot be reached, this dated snapshot stays.</p></div>`;
  },

  // ---------- Returning Your Things: a film first ----------
  'film-head': (graph, ctx) => {
    const it = itemOf(graph, ctx); if (!it) return '';
    const year = it.date.slice(0, 4);
    return `<div class="wrap film-head-in"><p class="crumb"><a href="${esc(href('/building/', ctx))}">${ICON.arrow}<span>Building</span></a></p>
<p class="film-k">A short film by ${esc(COPY.name)} · ${esc(year)}${it.metric ? ` · ${esc(it.metric)}` : ''}</p>
<h1>${esc(it.title)}</h1>
<p class="film-log">${esc(it.dek)}</p></div>`;
  },
  'film-player': (graph, ctx) => {
    const it = itemOf(graph, ctx); const v = it && videoOf(graph, it); if (!v) return '<p class="empty wrap">The film is not available to play here yet.</p>';
    return `<div class="film-screen">${player(v, ctx, { lazy: false, label: 'Play the film' })}
<p class="film-screen-cap"><span>${it.metric ? esc(it.metric) : ''} · No dialogue</span><a href="https://www.youtube.com/watch?v=${esc(v.videoId)}" target="_blank" rel="noopener noreferrer">Watch on YouTube${ICON.out}</a></p></div>`;
  },
  /** The making of: the film's documented threads as cards, then one step further along each. */
  'film-making': (graph, ctx) => {
    const it = itemOf(graph, ctx); if (!it) return '';
    const { edges } = neighbours(it, graph); const film = videoOf(graph, it);
    // the film's own upload is already playing above; show the threads that lead somewhere new
    const first = edges.filter((e) => (e.from === it.id ? e.to : e.from) !== film?.id);
    const seen = new Set([it.id, film?.id, ...first.map((e) => (e.from === it.id ? e.to : e.from))]);
    const second = [];
    for (const e of first) {
      const o = graph.byId.get(e.from === it.id ? e.to : e.from);
      for (const e2 of neighbours(o, graph).edges) { const id = e2.from === o.id ? e2.to : e2.from; if (!seen.has(id) && graph.byId.get(id)?.type !== 'digest') { seen.add(id); second.push([e2, o]); } }
    }
    if (!first.length) return '';
    return `<ul class="thread-cards">${first.map((e) => threadCard(e, it, graph, ctx)).join('')}${second.map(([e, o]) => threadCard(e, o, graph, ctx)).join('')}</ul>`;
  },

  // ---------- Autonomous AI blog: the system behind the Digest ----------
  /** The Digest's derived state, in the Digest's own quiet ash. Flips by itself if the data says publishing. */
  'blog-status': (graph, ctx) => {
    const d = graph.digest; const archive = href(d.link || '/blog/', ctx);
    const span = `${fmtDate(d.first)} to ${fmtDate(d.last)}`;
    return `<section class="digest-status blog-status" data-status="${esc(d.status)}" aria-label="The Digest, automated: current state">
<div class="ds-head">${automatedBadge()}<h2 class="ds-title">${esc(d.name)}</h2><span class="ds-state">${esc(digestWord(graph))}</span></div>
<p class="ds-line">${esc(d.statusLine)}</p>
<dl class="blog-facts"><div><dt>Published</dt><dd>${n(d.published)} automated posts</dd></div><div><dt>Held back as drafts</dt><dd>${n(d.drafts)} of ${n(d.total)}</dd></div><div><dt>First and last post</dt><dd>${esc(span)}</dd></div><div><dt>Search engines</dt><dd>${d.noindex ? 'Hidden (noindex), left out of the sitemap' : 'Indexable'}</dd></div></dl>
<p class="ds-links"><a href="${esc(archive)}"${extAttrs(archive)}>Open the archive${ICON.arrow}</a></p>
</section>`;
  },
  /** Real weekly volume, one ash bar per week, with the same numbers as a table. */
  'blog-volume': (graph, ctx) => {
    const d = graph.digest; const weeks = d.perWeek || []; if (!weeks.length) return '<p class="empty">No weekly numbers are recorded for the Digest.</p>';
    const max = Math.max(...weeks.map((w) => w.n), 1); const top = weeks.reduce((a, b) => (b.n > a.n ? b : a));
    const W = 720, H = 120; const bw = W / weeks.length;
    const bars = weeks.map((w, i) => { const h = Math.max(1.5, (w.n / max) * (H - 4)); return `<rect x="${(i * bw + 1).toFixed(1)}" y="${(H - h).toFixed(1)}" width="${Math.max(1, bw - 2).toFixed(1)}" height="${h.toFixed(1)}"/>`; }).join('');
    const label = `Automated Digest posts per week, ${fmtDate(weeks[0].start)} to ${fmtDate(d.last)}: ${n(d.published)} posts in ${plural(weeks.length, 'week')}; the busiest week, starting ${fmtDate(top.start)}, had ${n(top.n)}.`;
    return `<figure class="blog-volume" data-status="${esc(d.status)}">
<div class="bv-head">${automatedBadge()}<span>Posts per week, counted from the archive</span></div>
<svg class="bv-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(label)}">${bars}</svg>
<p class="bv-axis"><span>Week of ${esc(fmtDate(weeks[0].start))}</span><span>Busiest week: ${n(top.n)} posts</span><span>${esc(fmtDate(d.last))}</span></p>
<figcaption>${n(d.published)} automated posts in ${plural(weeks.length, 'week')}. ${esc(d.statusLine)}</figcaption>
<details class="bv-table"><summary>The same numbers as a table</summary><table><thead><tr><th scope="col">Week starting</th><th scope="col">Automated posts</th></tr></thead><tbody>${weeks.map((w) => `<tr><td>${esc(fmtDate(w.start))}</td><td>${n(w.n)}</td></tr>`).join('')}</tbody></table></details></figure>`;
  },

  // ---------- the essay's way back to the film ----------
  'essay-film': (graph, ctx) => {
    const f = graph.byId.get(FILM_ID); if (!f) return '';
    return `<a class="film-banner" href="${esc(itemHref(f, ctx))}" style="--tc:${f.tint}"><span class="film-banner-media">${media(f, { size: 'full', w: 1280, h: 720 })}</span>
<span class="film-banner-copy"><span class="film-k">A short film by ${esc(COPY.name)}${f.metric ? ` · ${esc(f.metric)}` : ''}</span><span class="film-banner-title">${esc(f.title)}</span><span class="film-banner-cta">${ICON.play}<span>${esc(f.cta || 'Watch the film')}</span></span></span></a>`;
  },
};
export { kickerLine, glyph, button };
