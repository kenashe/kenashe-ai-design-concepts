// Discovery regions: the video archive (/videos/), the project index (/building/), the writing index (/writing/).
// Pure ES module (no DOM): the same functions prerender the pages in Node and re-render them in the browser
// when a filter changes (site/assets/discovery.js), so the static HTML and the filtered views can never diverge.
//
// One model for all three indexes:
//   INDEX[name]           what the index lists, which filters it has, how items are grouped
//   itemsOf(def, graph)   every item of the index, newest first
//   groupsOf(def, items)  matched items -> groups (year; month inside the newest year for videos) -> sections (kind)
//   resultsHTML(...)      groups -> HTML. Only the first FIRST items of a section are rendered, and only while the
//                         BUDGET lasts; the rest is revealed on demand ("Show 48 more"). Without JavaScript the rest
//                         is a plain list of links inside <noscript>, which costs no DOM nodes when scripts run.
import { esc, typeLabel, titleOf, when, n, plural, media, glyph, kicker, themeOf, player, threads, chips, button, automatedBadge, placeholderBadge, digestWord, followLinks, href, local, itemHref, ICON, COPY, fmtDate } from '../components.js';

export const FIRST = 12;   // video cards rendered per section at first: a screenful, divisible by every column count used
export const FIRST_ROWS = 24; // rows (builds, essays) rendered per group at first
export const STEP = 48;    // items added by "Show 48 more"
export const BUDGET = 60;  // items rendered before anything is asked for; later groups fill in as they come into view

const ext = (url) => (/^https?:/.test(url) ? ' target="_blank" rel="noopener noreferrer"' : '');
const sentence = (s) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : '');
const monthLong = (ym) => new Date(`${ym}-15T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const byNewest = (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
/** Deep link that opens the universe focused on an item (documented by the lead: universe/#i=<item id>). */
export const universeHref = (it, ctx) => `${local('universe/', ctx)}#i=${it.id}`;
const countBy = (list, key) => { const m = new Map(); for (const it of list) for (const k of [].concat(key(it) ?? [])) m.set(k, (m.get(k) || 0) + 1); return m; };
const NOUN = { video: ['video', 'videos'], short: ['Short', 'Shorts'], build: ['build', 'builds'], essay: ['essay', 'essays'] };
const count = (k, kind) => plural(k, ...NOUN[kind]);

// ---------------------------------------------------------------- the three indexes
export const INDEX = {
  videos: {
    types: ['video', 'short'], params: ['q', 'kind', 'theme', 'year'], months: true, first: FIRST, listClass: (k) => `vgrid vgrid--${k}`,
    match: (it, s) => (!s.kind || it.type === s.kind) && (!s.theme || it.theme === s.theme) && (!s.year || it.date.startsWith(s.year)),
    what: 'videos and Shorts',
  },
  building: {
    types: ['build'], params: ['q', 'status', 'theme', 'stack', 'year'], first: FIRST_ROWS, listClass: () => 'blist',
    match: (it, s) => (!s.status || it.status === s.status) && (!s.theme || it.theme === s.theme) && (!s.stack || (it.stack || []).includes(s.stack)) && (!s.year || it.date.startsWith(s.year)),
    what: 'builds',
  },
  writing: {
    types: ['essay'], params: ['q', 'theme', 'year'], first: FIRST_ROWS, listClass: () => 'wlist',
    match: (it, s) => (!s.theme || it.theme === s.theme) && (!s.year || it.date.startsWith(s.year)),
    what: 'essays',
  },
};
export const itemsOf = (def, graph) => graph.items.filter((i) => def.types.includes(i.type)).sort(byNewest);

/** Matched items (newest first) -> groups. `all` is the unfiltered list: its newest year is "the current year". */
export function groupsOf(def, matched, all = matched) {
  const current = all[0]?.date.slice(0, 4); const groups = []; const at = new Map();
  for (const it of matched) {
    const y = it.date.slice(0, 4); const byMonth = def.months && y === current; const key = byMonth ? it.month : y;
    let g = at.get(key);
    if (!g) { g = { key, year: y, id: byMonth ? `m-${key}` : `y-${key}`, label: byMonth ? monthLong(key) : key, secs: [] }; at.set(key, g); groups.push(g); }
    let sec = g.secs.find((x) => x.kind === it.type);
    if (!sec) { sec = { kind: it.type, items: [] }; g.secs.push(sec); g.secs.sort((a, b) => def.types.indexOf(a.kind) - def.types.indexOf(b.kind)); }
    sec.items.push(it);
  }
  return groups;
}

// ---------------------------------------------------------------- items
/** Where a video's own link goes without JavaScript: YouTube. Placeholders and synthetic entries only point at themselves. */
const watchHref = (it) => (it.demo || it.synthetic || !/^https?:/.test(it.href || '') ? `#v-${it.videoId}` : it.href);

/** One video or Short in the archive. Long-form is a landscape card, a Short is a portrait card. id = v-<videoId>. */
export function videoCard(it, graph, ctx) {
  const url = watchHref(it); const th = themeOf(graph, it);
  const rel = it.related.map((id) => graph.byId.get(id)).filter(Boolean);
  return `<li class="vcard vcard--${it.type}${it.demo ? ' is-ph' : ''}" id="v-${esc(it.videoId)}" data-id="${esc(it.id)}" style="--tc:${it.tint}">
<article class="card card--${it.type} card--md"><div class="card-media${it.type === 'short' ? ' vcard-media--short' : ''}">${media(it, { w: 480, h: 270 })}<span class="card-play" aria-hidden="true">${ICON.play}</span></div>
<div class="card-body"><h3 class="card-title"><a href="${esc(url)}"${ext(url)} data-play>${esc(titleOf(it))}</a></h3>
<p class="vcard-meta"><span>${esc(typeLabel[it.type])} · ${esc(when(it))}</span><span class="theme" style="--tc:${th.tint ?? it.tint}">${esc(th.label)}</span>${it.demo ? placeholderBadge() : ''}</p>
${rel.length ? `<ul class="vthreads" aria-label="Documented threads">${rel.slice(0, 2).map((o) => `<li style="--tc:${o.tint}"><a href="${esc(itemHref(o, ctx))}"${ext(itemHref(o, ctx))}>${glyph(o, 18)}<span>${esc(typeLabel[o.type])}: ${esc(titleOf(o))}</span></a></li>`).join('')}${rel.length > 2 ? `<li class="vthreads-more">and ${n(rel.length - 2)} more</li>` : ''}</ul>` : ''}</div></article></li>`;
}
/** The in-place player that a card opens into (browser only; the card's own link is the no-JS path). */
export function videoPanel(it, graph, ctx) {
  const yt = /^https?:/.test(it.href || '') && !it.demo && !it.synthetic ? it.href : null;
  return `<div class="vpanel vpanel--${it.type}" data-panel>
<div class="vpanel-player">${player(it, ctx, { lazy: false, label: it.type === 'short' ? 'Play the Short' : 'Play the video' })}</div>
<div class="vpanel-info">${kicker(it)}<h3 class="vpanel-title" tabindex="-1">${esc(titleOf(it))}</h3>
${it.dek ? `<p class="vpanel-dek">${esc(it.dek)}</p>` : ''}
<div class="vpanel-threads"><h4>Documented threads</h4>${threads(it, graph, ctx, { empty: true })}</div>
<p class="vpanel-links">${yt ? `<a class="more" href="${esc(yt)}" target="_blank" rel="noopener noreferrer">Watch on YouTube${ICON.out}</a>` : ''}<a class="more" href="${esc(universeHref(it, ctx))}">Show in the universe${ICON.arrow}</a></p>
<button class="vpanel-x" type="button" data-close>${ICON.close}<span>Close</span></button></div></div>`;
}

const statusMark = (b) => `<span class="bstatus bstatus--${esc(String(b.status).toLowerCase())}">${esc(b.statusLabel ?? sentence(b.status))}</span>`;
/** One build in the project index. Builds with a page link to it; builds without one are rows, not links. */
export function buildRow(b, graph, ctx) {
  const url = b.hasPage && b.href ? href(b.href, ctx) : null; const out = url && /^https?:/.test(url); const th = themeOf(graph, b);
  const facts = [b.metric ? `<span class="brow-metric">${esc(b.metric)}</span>` : '', b.receipts?.length ? `<span class="ct ct--receipts">${plural(b.receipts.length, 'receipt')}</span>` : '', b.related?.length ? `<span class="ct ct--threads">${plural(b.related.length, 'thread')}</span>` : ''].join('');
  return `<li class="brow${url ? '' : ' brow--nopage'}${b.demo ? ' is-ph' : ''}" data-id="${esc(b.id)}" style="--tc:${b.tint}">
<div class="brow-media">${media(b, { w: 480, h: 270 })}</div>
<div class="brow-body"><p class="brow-k">${statusMark(b)}<span>${esc(when(b))}</span><span class="theme" style="--tc:${th.tint ?? b.tint}">${esc(th.label)}</span>${b.demo ? placeholderBadge() : ''}</p>
<h3 class="brow-title">${url ? `<a href="${esc(url)}"${ext(url)}>${esc(b.title)}</a>` : esc(b.title)}</h3>
${b.dek ? `<p class="brow-dek">${esc(b.dek)}</p>` : ''}
${b.stack?.length ? `<ul class="brow-stack" aria-label="Stack">${b.stack.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
${facts ? `<p class="brow-meta">${facts}</p>` : ''}</div>
<p class="brow-go">${url ? `<span class="more" aria-hidden="true">${esc(b.cta || 'Read the build')}${out ? ICON.out : ICON.arrow}</span>${out ? '<span class="brow-note">Opens on kenashe.ai</span>' : ''}` : '<span class="brow-note">No write-up for this one</span>'}</p></li>`;
}
/** One essay in the writing index, with its authorship label. */
export function essayRow(e, graph, ctx) {
  const url = itemHref(e, ctx); const out = /^https?:/.test(url); const th = themeOf(graph, e);
  return `<li class="wrow${e.demo ? ' is-ph' : ''}" data-id="${esc(e.id)}" style="--tc:${e.tint}">
<div class="wrow-media">${media(e, { w: 480, h: 270, alt: e.imageAlt || '' })}</div>
<div class="wrow-body"><p class="brow-k"><span>${esc(when(e))}</span><span class="theme" style="--tc:${th.tint ?? e.tint}">${esc(th.label)}</span>${e.demo ? placeholderBadge() : ''}</p>
<h3 class="wrow-title"><a href="${esc(url)}"${ext(url)}>${esc(e.title)}</a></h3>
${e.dek ? `<p class="wrow-dek">${esc(e.dek)}</p>` : ''}
<p class="wrow-meta">${e.authorship ? `<span class="auth"><span class="auth-l">Authorship</span> ${esc(e.authorship)}</span>` : ''}${e.receipts?.length ? `<span class="ct ct--receipts">${plural(e.receipts.length, 'receipt')}</span>` : ''}${e.related?.length ? `<span class="ct ct--threads">${plural(e.related.length, 'thread')}</span>` : ''}${out ? '<span class="brow-note">Opens on kenashe.ai</span>' : ''}</p></div></li>`;
}
export const renderItem = (it, graph, ctx) => (it.type === 'build' ? buildRow(it, graph, ctx) : it.type === 'essay' ? essayRow(it, graph, ctx) : videoCard(it, graph, ctx));
/** The no-JS fallback for items that are not rendered as cards: a plain link per item. */
const plainLink = (it, ctx) => {
  const v = it.type === 'video' || it.type === 'short'; const url = v ? watchHref(it) : it.hasPage === false ? null : itemHref(it, ctx);
  return `<li${v ? ` id="v-${esc(it.videoId)}"` : ''}>${url ? `<a href="${esc(url)}"${ext(url)}>${esc(titleOf(it))}</a>` : esc(titleOf(it))} <span>${esc(typeLabel[it.type])} · ${esc(when(it))}</span></li>`;
};
export const moreLabel = (left, kind) => `Show ${n(Math.min(STEP, left))} more ${NOUN[kind][Math.min(STEP, left) === 1 ? 0 : 1]}`;

// ---------------------------------------------------------------- results
/**
 * groups -> HTML. opts.noscript adds the plain-link fallback (prerender only). The first group is always rendered;
 * later sections are rendered while the budget lasts and otherwise start empty (data-shown="0") and fill on approach.
 */
export function resultsHTML(def, graph, ctx, groups, { budget = BUDGET, noscript = false } = {}) {
  if (!groups.length) return '<p class="idx-none">Nothing matches these filters.</p>';
  let left = budget; const years = new Set();
  return groups.map((g, gi) => {
    const anchor = g.id.startsWith('m-') && !years.has(g.year) ? `<span class="idx-anchor" id="y-${esc(g.year)}"></span>` : ''; years.add(g.year);
    const both = g.secs.length > 1;
    const secs = g.secs.map((sec) => {
      const first = left > 0 || gi === 0 ? Math.min(def.first, sec.items.length) : 0; left -= first; const rest = sec.items.length - first;
      return `<div class="idx-sec idx-sec--${sec.kind}" data-g="${gi}" data-sec="${sec.kind}" data-total="${sec.items.length}" data-shown="${first}">
${both ? `<p class="idx-sec-h">${esc(sentence(NOUN[sec.kind][1]))}</p>` : ''}<ul class="${def.listClass(sec.kind)}">${sec.items.slice(0, first).map((it) => renderItem(it, graph, ctx)).join('')}</ul>
${rest ? `<p class="idx-more-p js-only"><button class="idx-more" type="button" data-more>${moreLabel(rest, sec.kind)}</button></p>` : ''}${rest && noscript ? `<noscript><ul class="idx-plain">${sec.items.slice(first).map((it) => plainLink(it, ctx)).join('')}</ul></noscript>` : ''}</div>`;
    }).join('');
    return `<section class="idx-group" id="${esc(g.id)}" aria-labelledby="${esc(g.id)}-h">${anchor}<header class="idx-group-head"><h2 id="${esc(g.id)}-h">${esc(g.label)}</h2><p>${g.secs.map((s) => count(s.items.length, s.kind)).join(' · ')}</p></header>${secs}</section>`;
  }).join('');
}
/** The line under the filters. */
export function statusText(def, matchedCount, total, active) {
  if (!active) return `${n(total)} ${def.what}, newest first`;
  return matchedCount ? `${n(matchedCount)} of ${n(total)} ${def.what} match` : `None of the ${n(total)} ${def.what} match`;
}

// ---------------------------------------------------------------- filters
const searchField = (label, placeholder) => `<label class="idx-search js-only"><span class="vh">${esc(label)}</span>${ICON.search}<input type="search" name="q" placeholder="${esc(placeholder)}" autocomplete="off" spellcheck="false" enterkeyhint="search"></label>`;
const themeChips = (graph, items) => { const c = countBy(items, (i) => i.theme); return `<div class="idx-row idx-row--scroll js-only"><span class="idx-l" aria-hidden="true">Theme</span>${chips([{ label: 'All themes', value: '', pressed: true }].concat(graph.themes.filter((t) => c.get(t.id)).map((t) => ({ label: t.label, value: t.id, count: c.get(t.id), tint: t.tint }))), { label: 'Theme', name: 'theme' })}</div>`; };
/** Years as chips. They are anchor links to the year groups (the no-JS path); the page script turns them into a filter. */
const yearChips = (def, items) => {
  const years = [...countBy(items, (i) => i.date.slice(0, 4))]; if (!years.length) return '';
  const months = def.months && years.length === 1; // a single year so far: offer its months instead
  const list = months ? [...countBy(items, (i) => i.month)].map(([m, k]) => ({ label: fmtDate(`${m}-15`, 'month'), href: `#m-${m}`, count: k })) : years.map(([y, k]) => ({ label: y, href: `#y-${y}`, count: k }));
  return `<div class="idx-row idx-row--scroll"><span class="idx-l" aria-hidden="true">${months ? 'Month' : 'Year'}</span>${chips([{ label: months ? 'All months' : 'All years', href: '#archive', pressed: true }].concat(list), { label: months ? 'Month' : 'Year', name: 'year' })}</div>`;
};
const select = (name, label, options) => `<label class="idx-select js-only"><span>${esc(label)}</span><select data-filter="${esc(name)}"><option value="">Any</option>${options.map(([v, k]) => `<option value="${esc(v)}">${esc(v)} (${n(k)})</option>`).join('')}</select></label>`;
const statusLine = (def, total) => `<p class="idx-status"><span data-status role="status">${esc(statusText(def, total, total, false))}</span><button class="idx-clear js-only" type="button" data-clear hidden>Clear filters</button></p>`;

function indexHTML(name, graph, ctx, bar) {
  const def = INDEX[name]; const items = itemsOf(def, graph);
  return `<div class="idx" id="archive" data-index="${name}"><div class="idx-bar">${bar(items)}</div>${statusLine(def, items.length)}
<div class="idx-results" data-results>${resultsHTML(def, graph, ctx, groupsOf(def, items), { noscript: true })}</div></div>`;
}

// ---------------------------------------------------------------- regions
export const discovery = {
  /** One plain line: the archive is complete and keeps what YouTube's feed drops. Counts and dates are derived. */
  'videos-intro': (graph) => {
    const s = graph.stats; const all = itemsOf(INDEX.videos, graph); if (!all.length) return 'No videos yet. Uploads appear here on their own.';
    return `Every upload, kept: ${count(s.videos, 'video')} and ${count(s.shorts, 'short')} since ${esc(fmtDate(all.at(-1).date, 'month'))}. YouTube’s feed lists only the newest 15; this archive keeps all ${n(all.length)}.`;
  },
  /** The newest long-form video, large, click to load. */
  'videos-feature': (graph, ctx) => {
    const v = graph.latestVideo; if (!v) return '';
    const yt = COPY.socials[0];
    return `<div class="wrap latest-grid"><div class="latest-player">${player(v, ctx, { lazy: false, label: 'Play the latest video' })}</div>
<div class="latest-info"><p class="eyebrow">Latest video · ${esc(when(v))}${v.demo ? ' · placeholder' : ''}</p><h2 id="feature-h">${esc(titleOf(v))}</h2>
${v.dek ? `<p class="latest-dek">${esc(v.dek)}</p>` : ''}
${v.related.length ? `<div class="latest-threads"><h3>Documented threads</h3>${threads(v, graph, ctx, { limit: 3 })}</div>` : ''}
<p class="latest-cta">${button(`Follow on ${yt.label}`, yt.url, { variant: 'ghost', icon: ICON.youtube, attrs: 'rel="noopener noreferrer me"' })}</p></div></div>`;
  },
  'videos-index': (graph, ctx) => indexHTML('videos', graph, ctx, (items) => {
    const k = countBy(items, (i) => i.type);
    return `<div class="idx-row">${searchField('Search the video archive', `Search ${n(items.length)} videos and Shorts`)}<div class="js-only">${chips([{ label: 'All', value: '', pressed: true, count: items.length }, { label: 'Videos', value: 'video', count: k.get('video') || 0 }, { label: 'Shorts', value: 'short', count: k.get('short') || 0 }], { label: 'Kind', name: 'kind' })}</div></div>${themeChips(graph, items)}${yearChips(INDEX.videos, items)}`;
  }),

  'building-intro': (graph) => {
    const all = itemsOf(INDEX.building, graph); if (!all.length) return 'No builds yet.';
    const st = [...countBy(all, (b) => b.status)].map(([s, k]) => `${n(k)} ${esc(String(s).toLowerCase())}`);
    return `${count(all.length, 'build')} since ${esc(fmtDate(all.at(-1).date, 'month'))}: ${st.join(', ')}. Each one lists its stack, its receipts and the work it is documented to connect to.`;
  },
  'building-index': (graph, ctx) => indexHTML('building', graph, ctx, (items) => {
    const st = [...countBy(items, (b) => b.status)]; const stack = [...countBy(items, (b) => b.stack || [])].sort((a, b) => b[1] - a[1] || (a[0].toLowerCase() < b[0].toLowerCase() ? -1 : 1));
    return `<div class="idx-row">${searchField('Search builds', `Search ${n(items.length)} builds`)}<div class="js-only">${chips([{ label: 'All', value: '', pressed: true, count: items.length }].concat(st.map(([s, k]) => ({ label: sentence(s), value: s, count: k }))), { label: 'Status', name: 'status' })}</div>${select('stack', 'Stack', stack)}</div>${themeChips(graph, items)}${yearChips(INDEX.building, items)}`;
  }),

  'writing-intro': (graph) => {
    const all = itemsOf(INDEX.writing, graph); if (!all.length) return 'No essays yet.';
    return `${count(all.length, 'essay')} by Ken, each labelled with how it was written. The automated Digest is not here; it is kept separate below.`;
  },
  'writing-index': (graph, ctx) => indexHTML('writing', graph, ctx, (items) => `${items.length > 12 ? `<div class="idx-row">${searchField('Search essays', `Search ${n(items.length)} essays`)}</div>` : ''}${themeChips(graph, items)}${yearChips(INDEX.writing, items)}`),
  /** The Digest on the writing page: one quiet line, labelled automated, status derived, a link to its archive. */
  'writing-digest': (graph, ctx) => {
    const d = graph.digest; const url = href(d.link || '/blog/', ctx);
    return `<p class="digest-line" data-status="${esc(d.status)}">${automatedBadge()}<span class="dl-name">${esc(d.name)}</span><span class="dl-state">${esc(digestWord(graph))}</span><span class="dl-text">${esc(d.statusLine)} ${n(d.published)} automated posts, kept apart from Ken’s essays.</span><a href="${esc(url)}"${ext(url)}>Open the archive${ICON.arrow}</a></p>`;
  },
  'writing-follow': (graph, ctx) => followLinks(ctx, { limit: 0, rss: true }),
};
