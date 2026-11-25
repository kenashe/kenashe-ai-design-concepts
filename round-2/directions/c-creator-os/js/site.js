// Shared behaviour on every page: header state, click-to-load video, command palette, live readings.
import { getGraph, pageCtx, BASE, reduced } from './data.js';
import { hrefOf, DIR, monShort } from '../render.js';
import { fmtDate, typeLabel, esc } from '../../../lib/graph.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------------- header */
const top = $('.top');
if (top) { const f = () => top.classList.toggle('is-scrolled', scrollY > 6); addEventListener('scroll', f, { passive: true }); f(); }
$$('.menu').forEach((m) => m.addEventListener('click', (e) => { if (e.target.closest('a')) m.open = false; }));

/* ---------------- click-to-load YouTube (youtube-nocookie, local poster until clicked) */
export function playInto(container, embed, title) {
  const f = document.createElement('iframe');
  f.src = `${embed}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
  f.title = title || 'YouTube video';
  f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
  f.allowFullscreen = true;
  f.referrerPolicy = 'strict-origin-when-cross-origin';
  container.append(f);
  container.classList.add('is-playing');
  f.focus?.();
  return f;
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-play][data-embed]');
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
  e.preventDefault();
  const title = a.dataset.title || a.getAttribute('aria-label')?.replace(/^Play( video)?:\s*/, '') || '';
  // Reel frames play in the room's feature screen; everything else plays in place.
  if (a.closest('.reel')) {
    const scr = $('.feature .scr');
    if (scr) {
      $$('.reel__f.is-playing').forEach((n) => n.classList.remove('is-playing'));
      a.closest('.reel__f').classList.add('is-playing');
      const box = document.createElement('div');
      box.className = 'scr scr--video';
      scr.replaceWith(box);
      playInto(box, a.dataset.embed, title);
      box.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      return;
    }
  }
  const box = document.createElement('div');
  box.className = a.className + ' is-playing';
  box.style.cssText = a.style.cssText;
  a.replaceWith(box);
  playInto(box, a.dataset.embed, title);
});

/* ---------------- command palette */
const dlg = $('#palette');
let opener = null, results = [], active = 0;
const PAGES = [
  { t: 'Home', s: 'The edit, the monitor and what is on the bench', u: `${BASE}directions/${DIR}/` },
  { t: 'Building index', s: 'Every build, filterable by theme, status, stack and type', u: `${BASE}directions/${DIR}/building/` },
  { t: 'Video index', s: 'Proposed new route: every upload by month', u: `${BASE}directions/${DIR}/videos/` },
  { t: 'The 36-second sale', s: 'AI agent economy on Ethereum: receipts and replay', u: `${BASE}directions/${DIR}/building/ai-agent-economy/` },
  { t: 'Publishing demo', s: 'Watch a new project, article and video land', u: `${BASE}directions/${DIR}/publish/` },
  { t: 'About', s: 'kenashe.ai/about', u: 'https://kenashe.ai/about/' },
  { t: 'Writing', s: 'kenashe.ai/writing', u: 'https://kenashe.ai/writing/' },
];
function buildPalette() {
  dlg.innerHTML = `<div class="pal__top"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`
    + `<input class="pal__in" id="pal-q" role="combobox" aria-expanded="true" aria-controls="pal-list" aria-autocomplete="list" aria-label="Search builds, videos, writing and pages" placeholder="Search builds, videos, writing…" autocomplete="off" spellcheck="false">`
    + `<button type="button" class="tbtn" data-pal-close>Esc</button></div>`
    + `<div class="pal__list" id="pal-list" role="listbox" aria-label="Results"></div>`
    + `<div class="pal__foot"><span>↑ ↓ move</span><span>↵ ${document.documentElement.dataset.page === 'home' ? 'cue on the timeline' : 'open'}</span><span>⌘/Ctrl ↵ open page</span><span>Esc close</span></div>`;
  $('#pal-q', dlg).addEventListener('input', render);
  $('#pal-q', dlg).addEventListener('keydown', onKey);
  $('[data-pal-close]', dlg).addEventListener('click', () => dlg.close());
  $('#pal-list', dlg).addEventListener('click', (e) => { const o = e.target.closest('[role=option]'); if (o) choose(+o.dataset.i, e.metaKey || e.ctrlKey); });
  dlg.addEventListener('close', () => opener?.focus?.());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
}
let G = null;
const GROUPS = { action: 'Actions', page: 'Pages', build: 'Builds', video: 'Videos & shorts', short: 'Videos & shorts', essay: 'Writing · by Ken', digest: 'Digest · automated' };
function entries() {
  const ctx = pageCtx();
  const out = [];
  if (document.documentElement.dataset.page === 'home') {
    out.push({ k: 'action', t: 'Play the year', s: 'Run the playhead through every clip', act: 'play' });
    for (const t of G.themes) out.push({ k: 'action', t: `Solo: ${t.label}`, s: t.hint, act: `solo:${t.id}`, theme: t.id });
  }
  for (const p of PAGES) out.push({ k: 'page', t: p.t, s: p.s, u: p.u });
  const items = G.items.filter((i) => i.date).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  for (const i of items) out.push({ k: i.type, t: i.type === 'digest' ? `${i.title} (automated)` : i.title, s: `${typeLabel[i.type]} · ${fmtDate(i.date, i.precision)}${i.stack ? ' · ' + i.stack.slice(0, 3).join(', ') : ''}`, x: `${i.dek || ''} ${(i.stack || []).join(' ')} ${i.theme}`, u: hrefOf(i, ctx), id: i.id, theme: i.theme });
  return out;
}
function render() {
  const q = $('#pal-q', dlg).value.toLowerCase().trim();
  const toks = q.split(/\s+/).filter(Boolean);
  let list = entries();
  if (toks.length) {
    list = list.map((e) => { const t = e.t.toLowerCase(), hay = `${t} ${(e.s || '').toLowerCase()} ${(e.x || '').toLowerCase()}`; if (!toks.every((k) => hay.includes(k))) return null; let sc = 0; for (const k of toks) sc += t.startsWith(k) ? 40 : t.includes(` ${k}`) ? 25 : t.includes(k) ? 12 : 3; return { e, sc }; })
      .filter(Boolean).sort((a, b) => b.sc - a.sc).slice(0, 40).map((x) => x.e);
    const order = Object.keys(GROUPS);
    list.sort((a, b) => order.indexOf(a.k) - order.indexOf(b.k));
  } else {
    const pick = (k, n) => list.filter((e) => (Array.isArray(k) ? k.includes(e.k) : e.k === k)).slice(0, n);
    list = [...pick('action', 1), ...pick('build', 4), ...pick(['video', 'short'], 3), ...pick('essay', 2), ...pick('page', 4), ...pick('digest', 1)];
  }
  results = list; active = 0;
  const hl = (s) => { let o = esc(s); for (const k of toks) o = o.replace(new RegExp(`(${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'), '<mark>$1</mark>'); return o; };
  const box = $('#pal-list', dlg);
  if (!list.length) { box.innerHTML = `<p class="pal__empty">Nothing matches “${esc(q)}”. Try “ethereum”, “film” or “agents”.</p>`; $('#pal-q', dlg).removeAttribute('aria-activedescendant'); return; }
  let html = '', last = '';
  list.forEach((e, i) => {
    const g = GROUPS[e.k];
    if (g !== last) { html += `<div class="pal__g" role="presentation">${g}</div>`; last = g; }
    html += `<div class="pal__o" role="option" id="po-${i}" data-i="${i}" aria-selected="${i === 0}"${e.theme ? ` data-theme="${e.theme}"` : ''}><i aria-hidden="true"></i><span><b>${hl(e.t)}</b><small>${esc(e.s || '')}</small></span><span class="k" aria-hidden="true">${e.act ? '⌘' : /^https?:/.test(e.u || '') ? '↗' : '↵'}</span></div>`;
  });
  box.innerHTML = html;
  setActive(0);
}
function setActive(i) {
  if (!results.length) return;
  active = (i + results.length) % results.length;
  $$('.pal__o', dlg).forEach((o) => o.setAttribute('aria-selected', String(+o.dataset.i === active)));
  const el = $(`#po-${active}`, dlg);
  $('#pal-q', dlg).setAttribute('aria-activedescendant', el.id);
  el.scrollIntoView({ block: 'nearest' });
}
function onKey(e) {
  if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
  else if (e.key === 'Enter') { e.preventDefault(); choose(active, e.metaKey || e.ctrlKey); }
}
function choose(i, forceOpen) {
  const e = results[i];
  if (!e) return;
  const suite = window.__edit;
  if (e.act && suite) { dlg.close(); suite.action(e.act); return; }
  if (e.id && suite && !forceOpen && suite.has(e.id)) { dlg.close(); suite.cue(e.id, { scroll: true }); return; }
  if (e.u && e.u !== '#') location.href = e.u;
}
export async function openPalette() {
  if (!dlg) return;
  opener = document.activeElement;
  if (!dlg.firstChild) buildPalette();
  try { G = G || (await getGraph()).graph; } catch { return; }
  $('#pal-q', dlg).value = '';
  render();
  dlg.showModal();
  $('#pal-q', dlg).focus();
}
$$('[data-palette]').forEach((b) => b.addEventListener('click', openPalette));
document.addEventListener('keydown', (e) => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); dlg?.open ? dlg.close() : openPalette(); }
  else if (e.key === '/' && !typing && !dlg?.open && !document.querySelector('#q')) { e.preventDefault(); openPalette(); }
});

/* ---------------- live readings: one request per endpoint per view, labelled honestly */
const once = new Map();
export function fetchOnce(url, ms = 6000) {
  if (!once.has(url)) once.set(url, (async () => {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
    try { const r = await fetch(url, { signal: ctl.signal, headers: { Accept: 'application/json' } }); if (!r.ok) throw new Error(r.status); return { ok: true, data: await r.json(), at: new Date() }; }
    catch { return { ok: false }; } finally { clearTimeout(t); }
  })());
  return once.get(url);
}
const utc = (d) => `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`;
const ago = (iso) => { const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000); return s < 90 ? `${Math.round(s)} sec ago` : s < 5400 ? `${Math.round(s / 60)} min ago` : s < 86400 * 2 ? `${Math.round(s / 3600)} hr ago` : fmtDate(iso.slice(0, 10)); };
const zh = $('[data-zh]');
if (zh) fetchOnce('https://zerohuman-production.up.railway.app/api/status').then((r) => {
  if (!r.ok || !r.data?.head) return;
  const d = r.data, set = (k, v) => { const n = $(`[data-zh-${k}]`, zh); if (n && v != null) n.textContent = v; };
  set('healthy', d.healthy ? 'healthy' : 'not healthy');
  set('mode', d.paused ? 'paused' : d.mode);
  set('head', Number(d.head).toLocaleString('en-US'));
  set('tick', d.lastTickAt ? ago(d.lastTickAt) : null);
  set('orders', d.orders?.fulfilled);
  const pill = $('[data-zh-pill]', zh); pill.dataset.live = 'true'; set('label', `Live · read ${utc(r.at)}`);
});
const gh = $('[data-gh]');
if (gh) fetchOnce('https://api.github.com/repos/kenashe/kenashe/commits?per_page=1').then((r) => {
  if (!r.ok || !Array.isArray(r.data) || !r.data[0]) return;
  const c = r.data[0];
  gh.textContent = `Live · latest production commit ${c.sha.slice(0, 7)}, ${ago(c.commit.author.date)}`;
});
