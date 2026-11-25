// KenAshe.ai 2.0 · shared behaviour: bar, menu, command palette, reveals,
// cursor light, and honest live-data helpers (one fetch per page view).
const doc = document.documentElement;
const BASE = doc.dataset.base || './';
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------------- live data (CORS endpoints listed in content.json) ---------------- */
const STATUS_URL = 'https://zerohuman-production.up.railway.app/api/status';
const COMMITS_URL = 'https://api.github.com/repos/kenashe/kenashe/commits?per_page=30';
const memo = {};
export function fetchJSON(url, ms = 6000) {
  if (memo[url]) return memo[url];
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  memo[url] = fetch(url, { signal: ctl.signal, headers: { Accept: 'application/json' } })
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .finally(() => clearTimeout(t));
  return memo[url];
}
export const getStatus = () => fetchJSON(STATUS_URL);
export const getCommits = () => fetchJSON(COMMITS_URL);

const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export function fmtDate(iso, withTime = false) {
  const d = new Date(iso);
  let s = `${MON[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
  if (withTime) s += `, ${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')} UTC`;
  return s;
}
export function ago(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.round(s)} sec ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} hr ago`;
  return fmtDate(iso);
}
export const nf = n => Number(n).toLocaleString('en-US');
export function nowUTC() { const d = new Date(); return `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')} UTC`; }

/* ---------------- bar ---------------- */
const bar = $('.bar');
if (bar) {
  const onScroll = () => bar.classList.toggle('is-scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
}

/* scroll-spy for primary nav (home only) */
const spyLinks = $$('.nav a[data-spy]');
const spyTargets = spyLinks.map(a => document.getElementById(a.dataset.spy)).filter(Boolean);
if (spyTargets.length && !location.pathname.includes('/building/')) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      spyLinks.forEach(a => a.dataset.spy === e.target.id ? a.setAttribute('aria-current', 'location') : a.removeAttribute('aria-current'));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  spyTargets.forEach(t => io.observe(t));
}

/* ---------------- mobile menu ---------------- */
const menu = $('#menu');
$$('[data-menu-open]').forEach(b => b.addEventListener('click', () => menu?.showModal()));
$$('[data-menu-close]').forEach(b => b.addEventListener('click', () => menu?.close()));
menu?.addEventListener('click', e => { if (e.target.closest('a[href]')) menu.close(); });

/* ---------------- reveal on scroll ---------------- */
if (!reduced && 'IntersectionObserver' in window) {
  const rio = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
  $$('[data-reveal],[data-reveal-chain]').forEach(el => rio.observe(el));
} else {
  $$('[data-reveal],[data-reveal-chain]').forEach(el => el.classList.add('in'));
}

/* ---------------- cursor-aware light (decorative; focus-within shows it centred) ---------------- */
if (matchMedia('(hover: hover)').matches) {
  document.addEventListener('pointermove', e => {
    const card = e.target.closest?.('.lit');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });
}

/* ---------------- copy buttons ---------------- */
$$('[data-copy]').forEach(b => b.addEventListener('click', async () => {
  const lab = $('[data-copy-label]', b) || b;
  try { await navigator.clipboard.writeText(b.dataset.copy); lab.textContent = 'Copied ✓'; }
  catch { lab.textContent = b.dataset.copy; }
  setTimeout(() => (lab.textContent = 'Copy address'), 2200);
}));

/* ---------------- command palette ---------------- */
const pal = $('#palette');
if (pal) {
  const input = $('#pq', pal), list = $('#pl', pal), stat = $('#pstat', pal);
  let INDEX = null, results = [], active = 0, opener = null;
  const GROUPS = { section: 'Jump to', page: 'Pages', build: 'Builds', video: 'Videos & film', writing: 'Writing · by Ken', digest: 'Digest · automated', social: 'Social', action: 'Actions' };
  const ICO = { section: '#', page: '→', build: '◆', video: '▶', writing: '✎', digest: 'AI', social: '@', action: '⌘' };
  const resolve = u => /^(https?:|mailto:)/.test(u) ? u : BASE + u;
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hi = (s, toks) => { let o = esc(s); toks.forEach(t => { if (t) o = o.replace(new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'), '<mark>$1</mark>'); }); return o; };

  async function load() {
    if (!INDEX) INDEX = (await import('./search-index.js')).default;
    return INDEX;
  }
  function search(q) {
    const toks = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!toks.length) {
      const pick = (k, n) => INDEX.filter(i => i.k === k).slice(0, n);
      return { toks, items: [...pick('section', 6), ...pick('page', 1), ...pick('build', 4), ...pick('video', 3), ...pick('writing', 3), ...pick('action', 1)] };
    }
    const order = Object.keys(GROUPS);
    const scored = [];
    for (const it of INDEX) {
      const t = it.t.toLowerCase(), hay = `${t} ${(it.s || '').toLowerCase()} ${(it.x || '').toLowerCase()}`;
      if (!toks.every(k => hay.includes(k))) continue;
      let sc = 0;
      for (const k of toks) sc += t.startsWith(k) ? 40 : new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(t) ? 25 : t.includes(k) ? 12 : 3;
      scored.push({ it, sc });
    }
    scored.sort((a, b) => (order.indexOf(a.it.k) - order.indexOf(b.it.k)) || b.sc - a.sc);
    return { toks, items: scored.slice(0, 40).map(s => s.it) };
  }
  function render() {
    const { toks, items } = search(input.value);
    results = items; active = 0;
    if (!items.length) {
      list.innerHTML = `<li class="palette__empty" role="presentation">Nothing matches “${esc(input.value)}”. Try “ethereum”, “film”, or “agents”.</li>`;
      input.removeAttribute('aria-activedescendant'); stat.textContent = 'No results'; return;
    }
    let html = '', last = '';
    items.forEach((it, i) => {
      if (it.k !== last) { html += `<li class="palette__group" role="presentation">${GROUPS[it.k]}</li>`; last = it.k; }
      html += `<li class="palette__opt" role="option" id="po-${i}" data-i="${i}" data-kind="${it.k}" aria-selected="${i === 0}"><span class="palette__ico" aria-hidden="true">${ICO[it.k]}</span><span><span class="palette__t">${hi(it.t, toks)}</span>${it.s ? `<span class="palette__s">${esc(it.s)}</span>` : ''}</span><span class="palette__k" aria-hidden="true">${/^https?:/.test(it.u || '') ? '↗' : '↵'}</span></li>`;
    });
    list.innerHTML = html;
    setActive(0, false);
    stat.textContent = `${items.length} result${items.length === 1 ? '' : 's'}`;
  }
  function setActive(i, scroll = true) {
    if (!results.length) return;
    active = (i + results.length) % results.length;
    $$('.palette__opt', list).forEach(o => o.setAttribute('aria-selected', String(+o.dataset.i === active)));
    const el = $(`#po-${active}`, list);
    input.setAttribute('aria-activedescendant', `po-${active}`);
    if (scroll && el) el.scrollIntoView({ block: 'nearest' });
  }
  function choose(i) {
    const it = results[i]; if (!it) return;
    if (it.k === 'action') { navigator.clipboard?.writeText('hello@kenashe.ai'); stat.textContent = 'Email address copied'; $(`#po-${i} .palette__t`, list).textContent = 'Copied hello@kenashe.ai ✓'; return; }
    const url = resolve(it.u);
    pal.close();
    const here = new URL(location.href), to = new URL(url, location.href);
    if (to.origin === here.origin && to.pathname === here.pathname && to.hash) {
      const t = document.getElementById(to.hash.slice(1));
      if (t) { t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); history.replaceState(null, '', to.hash); return; }
    }
    location.assign(url);
  }
  async function open() {
    if (pal.open) return;
    opener = document.activeElement;
    menu?.open && menu.close();
    pal.showModal();
    input.value = '';
    await load(); render(); input.focus();
  }
  $$('[data-palette-open]').forEach(b => b.addEventListener('click', open));
  $$('[data-palette-close]').forEach(b => b.addEventListener('click', () => pal.close()));
  pal.addEventListener('close', () => opener?.focus?.());
  pal.addEventListener('click', e => { if (e.target === pal) pal.close(); });
  input.addEventListener('input', render);
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
    else if (e.key === 'Home' && e.ctrlKey) { e.preventDefault(); setActive(0); }
    else if (e.key === 'End' && e.ctrlKey) { e.preventDefault(); setActive(results.length - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(active); }
  });
  list.addEventListener('click', e => { const o = e.target.closest('.palette__opt'); if (o) choose(+o.dataset.i); });
  list.addEventListener('pointermove', e => { const o = e.target.closest('.palette__opt'); if (o && +o.dataset.i !== active) setActive(+o.dataset.i, false); });
  addEventListener('keydown', e => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); pal.open ? pal.close() : open(); }
    else if (e.key === '/' && !typing && !pal.open) { e.preventDefault(); open(); }
  });
  // show the right modifier key
  if (!/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) $$('.kbtn kbd').forEach(k => (k.textContent = 'Ctrl K'));
}
