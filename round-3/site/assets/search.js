// Global search overlay. Any page gets it with one line:
//   <script type="module" src="<S>/assets/search.js"></script>        (or `import './search.js'` in the page entry)
// It listens for the header's cancelable `r3:search` event (see STYLEGUIDE §1), for "/" and for Ctrl/Cmd+K.
// Nothing is fetched until the first open. The index is the prebuilt data/search.json; pages that run on other
// data (the stress test, ?demo=) search their own graph instead. Without JavaScript the header control stays a
// plain link to /building/.
import { search, searchIndex, esc, typeLabel, fmtDate } from '../../lib/graph.js';
import { prep, media, titleOf, itemHref, local, href, ICON, n, plural, chips, automatedBadge } from '../render.js';
import { baseOf, rootOf, ctxFor, graphFrom, loadSources, demoKeys } from './boot.js';

const PAGE = 20;                       // results shown before "Show more"
const KINDS = [['', 'All'], ['build', 'Builds'], ['video', 'Videos'], ['short', 'Shorts'], ['essay', 'Writing']];
let given = null;                      // { graph, ctx } from a page that has already loaded the graph
let data = null;                       // promise of { graph, ctx, index, universe(it), open(it) }
let dlg = null; let trigger = null; let state = { q: '', kind: '', shown: PAGE }; let last = null;

/** Pages that already hold the graph pass it in, so opening search costs no extra request for it. */
export function provideSearch(graph, ctx) { given = { graph, ctx }; }

// the overlay's stylesheet travels with the script, so one line is enough to add search to a page
if (!document.querySelector('link[href$="search.css"]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = new URL('./search.css', import.meta.url).href; document.head.append(l); }

async function load() {
  const base = baseOf(); const ctx = given?.ctx ?? ctxFor(base); const root = rootOf();
  const graph = prep(given?.graph ?? graphFrom(await loadSources(base, ctx.sourcesFile), base, demoKeys()));
  const own = root !== 'site' || ctx.sourcesFile !== 'data/sources.json' || demoKeys().length > 0;
  let index = null;
  if (!own) { try { const r = await fetch(`${base}data/search.json`); if (r.ok) index = await r.json(); } catch { /* fall through to the graph */ } }
  index ??= searchIndex(graph);
  // where "Show in the universe" goes: the site's universe, or the stress page that shows this dataset
  let uni = local('universe/', ctx);
  if (root === 'stress') { try { const { DATASETS } = await import(new URL('../../stress/render.js', import.meta.url).href); const d = DATASETS.find((x) => x.file === ctx.sourcesFile); if (d) uni = `${base}stress/${d.dir}`; } catch { /* keep the site universe */ } }
  const onArchive = !!document.querySelector('[data-index="videos"]');
  return {
    graph, ctx, index,
    universe: (it) => `${uni}#i=${it.id}`,
    // synthetic entries have no page of their own: videos open in this page's archive, the rest in the universe
    open: (it) => { const u = itemHref(it, ctx); if (u !== '#') return u; return (it.type === 'video' || it.type === 'short') && onArchive ? `#v-${it.videoId}` : `${uni}#i=${it.id}`; },
  };
}

function build() {
  dlg = document.createElement('dialog'); dlg.className = 'gs'; dlg.setAttribute('aria-labelledby', 'gs-h');
  dlg.innerHTML = `<div class="gs-box">
<div class="gs-head"><h2 id="gs-h" class="vh">Search everything Ken has made</h2>
<label class="gs-field">${ICON.search}<span class="vh">Search builds, videos, Shorts and writing</span><input id="gs-q" type="search" placeholder="Search all of Ken’s work" autocomplete="off" spellcheck="false" enterkeyhint="search" aria-controls="gs-list" aria-describedby="gs-hint"></label>
<button class="gs-x" type="button" data-gs-close>${ICON.close}<span>Close</span></button></div>
<div class="gs-kinds">${chips(KINDS.map(([value, label]) => ({ label, value, pressed: !value })), { label: 'Kind', name: 'gs-kind' })}</div>
<p class="gs-status" role="status" aria-live="polite">Loading the index…</p>
<ul class="gs-list" id="gs-list" aria-label="Results"></ul>
<p class="gs-foot" id="gs-hint"><span class="gs-keys">Arrow keys move through results, Enter opens, Escape closes.</span> <span class="gs-digest"></span></p></div>`;
  document.body.append(dlg);
  const input = dlg.querySelector('#gs-q');
  input.addEventListener('input', () => { state.q = input.value; state.shown = PAGE; render(); });
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || e.target.closest('[data-gs-close]')) { dlg.close(); return; }
    const chip = e.target.closest('.gs-kinds .chip'); if (chip) { state.kind = chip.dataset.value || ''; state.shown = PAGE; render(); return; }
    if (e.target.closest('[data-gs-more]')) { const at = state.shown; state.shown += PAGE; render(); dlg.querySelectorAll('.gs-main')[at]?.focus(); return; }
    if (e.target.closest('a[href]') && !e.metaKey && !e.ctrlKey) dlg.close(); // same-page targets (a video in this archive) need the overlay gone
  });
  dlg.addEventListener('close', () => { document.documentElement.classList.remove('gs-open'); document.body.style.paddingRight = ''; const t = trigger; trigger = null; if (t?.isConnected) t.focus({ preventScroll: true }); });
  dlg.addEventListener('keydown', onKey);
}

/** Roving focus: the field and the result links are real controls; arrows move between them. */
function onKey(e) {
  const input = dlg.querySelector('#gs-q'); const mains = [...dlg.querySelectorAll('.gs-main')]; const el = document.activeElement;
  const row = el?.closest?.('.gs-row'); const i = row ? mains.indexOf(row.querySelector('.gs-main')) : -1;
  if (e.key === 'ArrowDown' && (el === input || i >= 0)) { e.preventDefault(); (mains[i + 1] ?? (i < 0 ? mains[0] : null) ?? dlg.querySelector('[data-gs-more]'))?.focus(); }
  else if (e.key === 'ArrowUp' && (i >= 0 || el?.matches?.('[data-gs-more]'))) { e.preventDefault(); (i > 0 ? mains[i - 1] : i === 0 ? input : mains.at(-1) ?? input).focus(); }
  else if (e.key === 'ArrowRight' && el?.classList.contains('gs-main')) { const u = row.querySelector('.gs-uni'); if (u) { e.preventDefault(); u.focus(); } }
  else if (e.key === 'ArrowLeft' && el?.classList.contains('gs-uni')) { e.preventDefault(); row.querySelector('.gs-main').focus(); }
  else if (e.key === 'Home' && i >= 0) { e.preventDefault(); mains[0].focus(); }
  else if (e.key === 'End' && i >= 0) { e.preventDefault(); mains.at(-1).focus(); }
  else if (e.key === 'Enter' && el === input) { e.preventDefault(); mains[0]?.click(); }
  else if (i >= 0 && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== ' ') input.focus(); // keep typing from anywhere in the list
}

const kindLabel = (it) => [typeLabel[it.type], it.type === 'build' && it.status ? it.status[0] + it.status.slice(1).toLowerCase() : null].filter(Boolean).join(' · ');
function rowHTML(it, d) {
  const th = d.graph.sector[it.theme]; const url = d.open(it); const out = /^https?:/.test(url);
  return `<li class="gs-row gs-row--${it.type}${it.demo ? ' is-ph' : ''}" style="--tc:${it.tint}">
<a class="gs-main" href="${esc(url)}"${out ? ' target="_blank" rel="noopener noreferrer"' : ''}><span class="gs-media">${media(it, { w: 160, h: 90, lazy: false })}</span>
<span class="gs-body"><span class="gs-t">${esc(titleOf(it))}</span><span class="gs-m"><span class="gs-kind">${esc(kindLabel(it))}</span>${th ? `<span class="theme" style="--tc:${th.tint ?? it.tint}">${esc(th.label)}</span>` : ''}<span>${esc(fmtDate(it.date, it.precision))}</span>${it.demo ? '<span class="badge-ph">Placeholder</span>' : ''}${it.synthetic ? '<span class="badge-ph">Synthetic</span>' : ''}</span></span></a>
<a class="gs-uni" href="${esc(d.universe(it))}">Show in the universe</a></li>`;
}

async function render() {
  const d = await (data ??= load()); if (!dlg) return;
  const t0 = performance.now();
  const all = search(d.index, state.q, {}, Infinity).results;       // ranked by search(); empty query = newest first
  const per = {}; for (const r of all) per[r.k] = (per[r.k] || 0) + 1;
  const hits = state.kind ? all.filter((r) => r.k === state.kind) : all;
  const t1 = performance.now();
  const shown = hits.slice(0, state.shown).map((r) => d.graph.byId.get(r.id)).filter(Boolean);
  const left = hits.length - shown.length;
  dlg.querySelector('.gs-list').innerHTML = shown.map((it) => rowHTML(it, d)).join('') + (left > 0 ? `<li class="gs-more-li"><button class="gs-more" type="button" data-gs-more>Show ${n(Math.min(PAGE, left))} more</button></li>` : '');
  dlg.querySelectorAll('.gs-kinds .chip').forEach((b) => {
    const v = b.dataset.value || ''; b.setAttribute('aria-pressed', String(v === state.kind));
    let c = b.querySelector('.chip-n'); if (!c) { c = document.createElement('span'); c.className = 'chip-n'; b.append(c); } c.textContent = n(v ? per[v] || 0 : all.length);
  });
  const s = d.graph.stats; const q = state.q.trim();
  dlg.querySelector('.gs-status').textContent = q
    ? hits.length ? `${plural(hits.length, 'result')} for “${q}”${hits.length > shown.length ? `, showing the first ${n(shown.length)}` : ''}` : `Nothing matches “${q}”${state.kind ? ' in this kind. Try All.' : '.'}`
    : `Type to search ${plural(s.builds, 'build')}, ${plural(s.videos, 'video')}, ${plural(s.shorts, 'Short')} and ${plural(s.essays, 'essay')}. Newest first:`;
  const dg = d.graph.digest; const dgUrl = href(dg.link || '/blog/', d.ctx);
  dlg.querySelector('.gs-digest').innerHTML = `${automatedBadge()} The Digest’s ${n(dg.published)} automated posts are not searched here. <a href="${esc(dgUrl)}"${/^https?:/.test(dgUrl) ? ' target="_blank" rel="noopener noreferrer"' : ''}>Open its archive</a>`;
  const t2 = performance.now(); void dlg.offsetHeight; const t3 = performance.now();
  last = { query: state.q, kind: state.kind, indexed: d.index.length, results: hits.length, shown: shown.length, searchMs: +(t1 - t0).toFixed(2), renderMs: +(t2 - t1).toFixed(2), layoutMs: +(t3 - t2).toFixed(2), totalMs: +(t3 - t0).toFixed(2), rows: dlg.querySelectorAll('.gs-row').length, overlayNodes: dlg.getElementsByTagName('*').length };
}

export function openSearch(from = document.activeElement) {
  if (!dlg) build();
  if (dlg.open) { dlg.querySelector('#gs-q').focus(); return; }
  trigger = from instanceof HTMLElement && from !== document.body ? from : null;
  document.querySelector('.nav-menu[open]')?.removeAttribute('open');
  const sw = innerWidth - document.documentElement.clientWidth; if (sw > 0) document.body.style.paddingRight = `${sw}px`;
  document.documentElement.classList.add('gs-open');
  dlg.showModal();
  const input = dlg.querySelector('#gs-q'); input.focus(); input.select();
  render();
}

// ----- triggers. Only claim the header control when a modal dialog is possible; otherwise its link still works.
const can = typeof HTMLDialogElement === 'function' && typeof HTMLDialogElement.prototype.showModal === 'function';
if (can && !window.__r3search) {
  document.addEventListener('r3:search', (e) => { e.preventDefault(); openSearch(e.detail?.trigger); });
  document.addEventListener('keydown', (e) => {
    const k = e.key; const mod = e.ctrlKey || e.metaKey;
    if (mod && !e.altKey && !e.shiftKey && (k === 'k' || k === 'K')) { e.preventDefault(); openSearch(); return; }
    if (k !== '/' || mod || e.altKey) return;
    const t = e.target; if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    e.preventDefault(); openSearch();
  });
  window.__r3search = { open: openSearch, get last() { return last; }, get state() { return state; }, ready: () => (data ??= load()) };
}
