// /building/ — faceted discovery over the prerendered index. Facets, counts and rows all come
// from the graph at build time; this only shows and hides rows, and fades non-matching clips.
import './site.js';
import { reduced } from './data.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const FACETS = ['type', 'theme', 'status', 'stack'];
const state = Object.fromEntries(FACETS.map((f) => [f, new Set()]));
let q = '';

function fromURL() {
  const p = new URLSearchParams(location.search);
  let any = false;
  for (const f of FACETS) { const v = p.get(f); if (v) { v.split(',').forEach((x) => state[f].add(x)); any = true; } }
  q = p.get('q') || '';
  if (!any && !q) $$('[data-facet][data-default]').forEach((b) => state[b.dataset.facet].add(b.dataset.val));
  const input = $('#q'); if (input) input.value = q;
}
function toURL() {
  const p = new URLSearchParams();
  for (const f of FACETS) if (state[f].size) p.set(f, [...state[f]].join(','));
  if (q) p.set('q', q);
  const s = p.toString();
  history.replaceState(null, '', s ? `?${s}` : location.pathname);
}
function matches(d) {
  if (state.type.size && !state.type.has(d.type)) return false;
  if (state.theme.size && !state.theme.has(d.theme)) return false;
  if (state.status.size && !state.status.has(d.status)) return false;
  if (state.stack.size && !(d.stack || '').split('|').some((s) => state.stack.has(s))) return false;
  if (q && !q.toLowerCase().split(/\s+/).every((t) => (d.text || '').includes(t))) return false;
  return true;
}
function apply() {
  const rows = $$('.edl__row');
  let shown = 0;
  for (const r of rows) { const ok = matches(r.dataset); r.hidden = !ok; if (ok) shown++; }
  // month headers: hide when every row under them is hidden
  $$('.edl__month').forEach((m) => { let n = m.nextElementSibling, vis = false; while (n && !n.classList.contains('edl__month')) { if (!n.hidden) vis = true; n = n.nextElementSibling; } m.hidden = !vis; });
  $$('[data-index-timeline] .clip').forEach((c) => { const row = document.getElementById(c.getAttribute('href').split('#')[1] || '') || $(`.edl__row[data-id="${CSS.escape(c.dataset.id)}"]`); c.toggleAttribute('data-hide', !!row && row.hidden); });
  $$('[data-facet]').forEach((b) => b.setAttribute('aria-pressed', String(state[b.dataset.facet].has(b.dataset.val))));
  const c = $('[data-count]'); if (c) c.textContent = `Showing ${shown} of ${rows.length}`;
  const e = $('[data-empty]'); if (e) e.hidden = shown > 0;
  toURL();
}

fromURL(); apply();
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-facet]');
  if (b) { const s = state[b.dataset.facet]; s.has(b.dataset.val) ? s.delete(b.dataset.val) : s.add(b.dataset.val); apply(); return; }
  if (e.target.closest('[data-reset]')) { FACETS.forEach((f) => state[f].clear()); q = ''; const i = $('#q'); if (i) i.value = ''; apply(); return; }
  const clip = e.target.closest('[data-index-timeline] .clip');
  if (clip && !e.metaKey && !e.ctrlKey) {
    const row = $(`.edl__row[data-id="${CSS.escape(clip.dataset.id)}"]`);
    if (!row) return;
    e.preventDefault();
    if (row.hidden) { FACETS.forEach((f) => state[f].clear()); q = ''; $('#q').value = ''; apply(); }
    row.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    row.classList.remove('is-flash'); void row.offsetWidth; row.classList.add('is-flash');
    row.querySelector('a')?.focus({ preventScroll: true });
  }
});
$('#q')?.addEventListener('input', (e) => { q = e.target.value.trim(); apply(); });
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !/^(INPUT|TEXTAREA)$/.test(e.target.tagName) && !document.querySelector('dialog[open]')) { e.preventDefault(); $('#q')?.focus(); }
});
// Deep link to an entry (e.g. /building/#media-pitch-triage from a card-only build): show everything.
if (location.hash) { const row = document.getElementById(location.hash.slice(1)); if (row?.hidden) { FACETS.forEach((f) => state[f].clear()); apply(); row.scrollIntoView(); } }
