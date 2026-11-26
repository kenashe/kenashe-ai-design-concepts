// Entry for the discovery pages (/videos/, /building/, /writing/ and the stress archive). Everything on these pages
// is prerendered; this script only enhances: instant search, filters, URL state, "Show 48 more", in-place playback,
// and the global search overlay (./search.js). With JavaScript off the pages are complete lists of links.
import { boot, loadPlayer } from './boot.js';
import { searchIndex, search } from '../../lib/graph.js';
import { INDEX, itemsOf, groupsOf, resultsHTML, renderItem, moreLabel, videoPanel, statusText, STEP } from '../regions/discovery.js';
import { provideSearch } from './search.js';

const WINDOW_AT = 120; // indexes larger than this park sections that are far from the viewport
const page = await boot();
provideSearch(page.graph, page.ctx);
const root = document.querySelector('[data-index]');
if (root && INDEX[root.dataset.index]) startIndex(root, page);

function startIndex(root, { graph, ctx }) {
  const name = root.dataset.index; const def = INDEX[name];
  const all = itemsOf(def, graph);
  const index = searchIndex(graph).filter((r) => def.types.includes(r.k));
  const results = root.querySelector('[data-results]'); const statusEl = root.querySelector('[data-status]'); const clearBtn = root.querySelector('[data-clear]');
  const input = root.querySelector('.idx-search input'); const perf = document.querySelector('[data-perf]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const s = Object.fromEntries(def.params.map((k) => [k, ''])); // filter state
  let groups = []; let io = null; let last = null;

  // ----- state <-> URL (?q=&theme=&status=… so a view can be shared)
  const readURL = () => { const p = new URLSearchParams(location.search); for (const k of def.params) s[k] = p.get(k) ?? ''; };
  const writeURL = () => { const p = new URLSearchParams(location.search); for (const k of def.params) { if (s[k]) p.set(k, s[k]); else p.delete(k); } const q = p.toString(); history.replaceState(null, '', location.pathname + (q ? `?${q}` : '') + location.hash); };
  const active = () => def.params.some((k) => s[k]);

  const compute = () => {
    let m = all.filter((it) => def.match(it, s));
    if (s.q.trim()) { const ids = new Set(search(index, s.q, {}, Infinity).results.map((r) => r.id)); m = m.filter((it) => ids.has(it.id)); }
    return m;
  };
  const syncControls = () => {
    if (input && input.value !== s.q) input.value = s.q;
    root.querySelectorAll('[data-chips]').forEach((g) => {
      const key = g.dataset.chips; if (!(key in s)) return;
      g.querySelectorAll('button.chip').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.value || '') === s[key])));
      g.querySelectorAll('a.chip').forEach((a) => { if (valueOfAnchor(a) === s[key]) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    });
    root.querySelectorAll('select[data-filter]').forEach((el) => { el.value = s[el.dataset.filter] ?? ''; });
  };
  // year chips are anchors (#y-2026, #m-2026-11, #archive): their value is the date prefix they point at
  const valueOfAnchor = (a) => { const m = (a.getAttribute('href') || '').match(/^#[ym]-(.+)$/); return m ? m[1] : ''; };

  // ----- sections are windowed: a section holds cards only while it is near the viewport. Groups past the first
  // screen start empty and fill on approach; sections scrolled far away are parked again (their height is kept so
  // the page does not jump), which keeps the DOM small however many videos exist or have been revealed.
  const secItems = (sec) => groups[+sec.dataset.g]?.secs.find((x) => x.kind === sec.dataset.sec)?.items ?? [];
  function fill(sec, upTo) {
    const items = secItems(sec); const shown = +sec.dataset.shown; const to = Math.min(items.length, upTo);
    if (to <= shown) return null;
    const ul = sec.querySelector('ul'); const before = ul.children.length;
    ul.insertAdjacentHTML('beforeend', items.slice(shown, to).map((it) => renderItem(it, graph, ctx)).join(''));
    sec.dataset.shown = to; sec.style.minHeight = '';
    const more = sec.querySelector('[data-more]');
    if (more) { if (to >= items.length) more.parentElement.remove(); else more.textContent = moreLabel(items.length - to, sec.dataset.sec); }
    return ul.children[before] ?? null;
  }
  const wake = (sec) => { if (+sec.dataset.shown === 0) fill(sec, +sec.dataset.want || def.first); };
  const windowed = all.length > WINDOW_AT; // small archives keep everything they have shown (in-page find keeps working)
  function park(sec) {
    if (!windowed || +sec.dataset.shown === 0 || sec.contains(document.activeElement) || sec.querySelector('.is-open')) return;
    sec.style.minHeight = `${sec.offsetHeight}px`; sec.dataset.want = sec.dataset.shown; sec.dataset.shown = 0; sec.querySelector('ul').innerHTML = '';
  }
  function observe() {
    io?.disconnect(); const secs = results.querySelectorAll('.idx-sec'); if (!secs.length) return;
    if (!('IntersectionObserver' in window)) { secs.forEach(wake); return; }
    io = new IntersectionObserver((entries) => { for (const e of entries) (e.isIntersecting ? wake : park)(e.target); }, { rootMargin: '900px 0px' });
    secs.forEach((sec) => io.observe(sec));
  }

  // ----- render
  function apply({ write = true, url = true } = {}) {
    const t0 = performance.now();
    const matched = compute(); groups = groupsOf(def, matched, all);
    const t1 = performance.now();
    if (write) results.innerHTML = resultsHTML(def, graph, ctx, groups, { budget: def.first * 2 }); // the rest fills as it nears the viewport
    const t2 = performance.now();
    if (write) void results.offsetHeight; // include style and layout in the measurement
    const t3 = performance.now();
    statusEl.textContent = statusText(def, matched.length, all.length, active());
    if (clearBtn) clearBtn.hidden = !active();
    syncControls(); observe(); if (url) writeURL();
    last = { index: name, total: all.length, matched: matched.length, filterMs: +(t1 - t0).toFixed(2), renderMs: +(t2 - t1).toFixed(2), layoutMs: +(t3 - t2).toFixed(2), totalMs: +(t3 - t0).toFixed(2), domNodes: document.getElementsByTagName('*').length, archiveNodes: results.getElementsByTagName('*').length };
    if (perf) perf.textContent = `Measured in this browser: ${last.total.toLocaleString('en-US')} ${def.what} filtered to ${last.matched.toLocaleString('en-US')} ${write ? `and rendered in ${last.totalMs.toFixed(1)} ms (filter ${last.filterMs.toFixed(1)}, DOM ${last.renderMs.toFixed(1)}, layout ${last.layoutMs.toFixed(1)})` : `in ${last.filterMs.toFixed(1)} ms; the prerendered view was kept as it is`}. ${last.domNodes.toLocaleString('en-US')} DOM nodes on the page, ${last.archiveNodes.toLocaleString('en-US')} of them in the archive.`;
    return last;
  }
  const set = (patch) => { Object.assign(s, patch); return apply(); };

  // ----- controls
  input?.addEventListener('input', () => set({ q: input.value }));
  input?.addEventListener('keydown', (e) => { if (e.key === 'Escape' && input.value) { e.stopPropagation(); set({ q: '' }); } });
  root.addEventListener('change', (e) => { const el = e.target.closest('select[data-filter]'); if (el) set({ [el.dataset.filter]: el.value }); });
  root.addEventListener('click', (e) => {
    const chip = e.target.closest('.idx-bar .chip');
    if (chip) {
      const key = chip.closest('[data-chips]')?.dataset.chips; if (!(key in s)) return;
      e.preventDefault(); const v = chip.tagName === 'A' ? valueOfAnchor(chip) : chip.dataset.value || '';
      set({ [key]: s[key] === v ? '' : v }); return;
    }
    if (e.target.closest('[data-clear]')) { for (const k of def.params) s[k] = ''; apply(); (input ?? root.querySelector('.chip'))?.focus(); return; }
    const more = e.target.closest('[data-more]');
    if (more) { const sec = more.closest('.idx-sec'); const first = fill(sec, +sec.dataset.shown + STEP); first?.querySelector('a, button')?.focus({ preventScroll: true }); if (last) { last.domNodes = document.getElementsByTagName('*').length; last.archiveNodes = results.getElementsByTagName('*').length; } return; }
    if (name === 'videos') videoClick(e);
  });

  // ----- videos: play in place. A card opens into a full-width panel with the click-to-load player and its threads.
  const byVideoId = new Map(all.filter((i) => i.videoId).map((i) => [i.videoId, i]));
  function closePanel({ focus = false } = {}) {
    const li = results.querySelector('.vcard.is-open'); if (!li) return;
    li.querySelector('[data-panel]')?.remove(); li.classList.remove('is-open'); if (focus) li.querySelector('[data-play]')?.focus();
  }
  function openPanel(li, { play = false, instant = false } = {}) {
    const it = graph.byId.get(li.dataset.id); if (!it) return;
    if (!li.classList.contains('is-open')) { closePanel(); li.classList.add('is-open'); li.insertAdjacentHTML('beforeend', videoPanel(it, graph, ctx)); }
    const pl = li.querySelector('[data-player]');
    li.scrollIntoView({ block: 'start', behavior: reduced || instant ? 'auto' : 'smooth' });
    if (play && pl) loadPlayer(pl); else (li.querySelector('.player-link') ?? li.querySelector('.vpanel-title'))?.focus({ preventScroll: true });
    if (location.hash !== `#${li.id}`) history.replaceState(null, '', location.pathname + location.search + `#${li.id}`);
  }
  function videoClick(e) {
    if (e.target.closest('[data-close]')) { closePanel({ focus: true }); history.replaceState(null, '', location.pathname + location.search); return; }
    const a = e.target.closest('.vcard [data-play]'); if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    e.preventDefault(); openPanel(a.closest('.vcard'), { play: true });
  }
  root.addEventListener('keydown', (e) => { if (e.key === 'Escape' && e.target.closest?.('[data-panel]')) closePanel({ focus: true }); });
  /** #v-<videoId>: make sure the card exists (clear filters, fill its section), then open it. Does not start playback. */
  function fromHash() {
    const m = decodeURIComponent(location.hash).match(/^#v-(.+)$/); if (!m) return;
    const it = byVideoId.get(m[1]); if (!it) return;
    if (!compute().includes(it)) { for (const k of def.params) s[k] = ''; apply(); }
    const gi = groups.findIndex((g) => g.secs.some((x) => x.items.includes(it))); if (gi < 0) return;
    const at = groups[gi].secs.find((x) => x.kind === it.type).items.indexOf(it);
    const sec = results.querySelector(`.idx-sec[data-g="${gi}"][data-sec="${it.type}"]`);
    if (sec) fill(sec, Math.max(+sec.dataset.want || 0, Math.ceil((at + 1) / def.first) * def.first));
    const li = document.getElementById(`v-${it.videoId}`); if (li) openPanel(li, { instant: true });
  }

  // ----- start: adopt the prerendered default view untouched, or render the view the URL asks for
  readURL();
  apply({ write: active(), url: false });
  if (name === 'videos') { addEventListener('hashchange', fromHash); fromHash(); }
  window.__idx = { get last() { return last; }, state: s, set, apply, nodes: () => ({ page: document.getElementsByTagName('*').length, archive: results.getElementsByTagName('*').length, cards: results.querySelectorAll('.vcard, .brow, .wrow').length }) };
}
