// Concept 06 · The Human Behind the Technology — small, dependency-free enhancements.
const root = document.documentElement;
const motionOK = !matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

/* ---------- hand-drawn strokes: measure path lengths ---------- */
$$('.draw path').forEach(p => { try { p.style.setProperty('--len', Math.ceil(p.getTotalLength()) + 1); } catch (e) {} });

/* ---------- paper "settle" reveals + annotation drawing ---------- */
const revealables = $$('.settle, .draw, [data-reveal]');
if (motionOK && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  revealables.forEach(el => io.observe(el));
} else {
  revealables.forEach(el => el.classList.add('in'));
}

/* ---------- read-along story: words darken as you reach them ---------- */
const along = $$('.read-along p');
if (motionOK && along.length) {
  const words = [];
  along.forEach(p => {
    const frag = document.createDocumentFragment();
    p.childNodes.forEach(n => {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach(t => {
          if (!t) return;
          if (/^\s+$/.test(t)) { frag.append(t); return; }
          const s = document.createElement('span'); s.className = 'w'; s.textContent = t; frag.append(s); words.push(s);
        });
      } else { const c = n.cloneNode(true); c.classList && c.classList.add('w'); frag.append(c); words.push(c); }
    });
    p.replaceChildren(frag);
  });
  let ticking = false;
  const update = () => {
    const line = innerHeight * 0.7;
    for (const w of words) w.classList.toggle('lit', w.getBoundingClientRect().top < line);
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  update();
}

/* ---------- "Currently curious about" word swap (with pause) ---------- */
const swapBox = $('[data-swap]');
if (swapBox) {
  const list = $$('li', swapBox.querySelector('.interests-all')).map(li => li.textContent.trim());
  const live = swapBox.querySelector('.swap');
  const btn = swapBox.querySelector('.pause');
  if (motionOK && list.length > 1) {
    swapBox.querySelector('.interests-all').classList.add('sr-only');
    live.hidden = false; btn.hidden = false;
    const w = live.querySelector('.w');
    let i = 0, timer = null;
    const step = () => {
      w.classList.add('out');
      setTimeout(() => {
        i = (i + 1) % list.length; w.textContent = list[i];
        w.classList.remove('out'); w.classList.add('pre');
        requestAnimationFrame(() => requestAnimationFrame(() => w.classList.remove('pre')));
      }, 320);
    };
    const play = () => { timer = setInterval(step, 2600); btn.setAttribute('aria-pressed', 'false'); btn.querySelector('span').textContent = 'Pause'; };
    const stop = () => { clearInterval(timer); timer = null; btn.setAttribute('aria-pressed', 'true'); btn.querySelector('span').textContent = 'Play'; };
    btn.addEventListener('click', () => (timer ? stop() : play()));
    document.addEventListener('visibilitychange', () => { if (document.hidden && timer) { clearInterval(timer); timer = 'paused-hidden'; } else if (!document.hidden && timer === 'paused-hidden') { play(); } });
    play();
  }
}

/* ---------- conversational pill nav ---------- */
const pill = $('#pill'), chat = $('#chat');
if (pill && chat) {
  const open = () => {
    chat.hidden = false; chat.classList.remove('opening'); void chat.offsetWidth; chat.classList.add('opening');
    pill.setAttribute('aria-expanded', 'true');
    const first = chat.querySelector('.routes a'); first && first.focus();
  };
  const close = (refocus = true) => { chat.hidden = true; pill.setAttribute('aria-expanded', 'false'); if (refocus) pill.focus(); };
  pill.addEventListener('click', () => (chat.hidden ? open() : close()));
  chat.querySelector('.chat-close').addEventListener('click', () => close());
  chat.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  pill.addEventListener('keydown', e => { if (e.key === 'Escape' && !chat.hidden) close(); });
  $$('.routes a', chat).forEach(a => a.addEventListener('click', () => close(false)));
  document.addEventListener('click', e => { if (!chat.hidden && !e.target.closest('.pill-wrap')) close(false); });
}

/* tuck the pill away while scrolling down on small screens; bring it back on scroll up */
const pillWrap = $('.pill-wrap');
if (pillWrap) {
  let lastY = scrollY, tick = false;
  const small = matchMedia('(max-width: 860px)');
  addEventListener('scroll', () => {
    if (tick) return; tick = true;
    requestAnimationFrame(() => {
      const y = scrollY, open = chat && !chat.hidden;
      const nearEnd = innerHeight + y > document.documentElement.scrollHeight - 40;
      const hide = small.matches && !open && y > lastY + 4 && y > 400 && !nearEnd && !pillWrap.contains(document.activeElement);
      if (hide) pillWrap.classList.add('tucked'); else if (y < lastY - 4 || nearEnd || y < 400) pillWrap.classList.remove('tucked');
      lastY = y; tick = false;
    });
  }, { passive: true });
  pillWrap.addEventListener('focusin', () => pillWrap.classList.remove('tucked'));
}

/* ---------- conventional menu (mobile) ---------- */
const menuBtn = $('#menu-btn');
if (menuBtn) {
  const menu = menuBtn.closest('.menu');
  menuBtn.addEventListener('click', () => {
    const on = menu.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(on));
  });
  menu.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('open')) { menu.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.focus(); } });
  $$('a', menu).forEach(a => a.addEventListener('click', () => { menu.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); }));
}

/* ---------- receipts toggle (the technical layer) ---------- */
const rb = $('#receipts-btn');
if (rb) rb.addEventListener('click', () => {
  const on = root.classList.toggle('show-receipts');
  rb.setAttribute('aria-pressed', String(on));
  rb.querySelector('.lbl .v').textContent = on ? 'Hide' : 'Show';
});

/* ---------- build logbook: filter + "show all" (everything visible without JS) ---------- */
const filters = $('#log-filters');
if (filters) {
  const items = $$('#log li'), count = $('#log-count'), more = $('#log-more');
  const FIRST = 8; let f = 'all', expanded = false;
  const render = () => {
    let n = 0, shown = 0;
    items.forEach(li => {
      const match = f === 'all' || li.dataset.status === f;
      if (match) n++;
      const show = match && (expanded || n <= FIRST);
      li.hidden = !show; if (show) shown++;
    });
    more.hidden = expanded || n <= FIRST;
    more.textContent = `Show all ${n} ${f === 'all' ? '' : f.toUpperCase() + ' '}builds`;
    count.textContent = `Showing ${shown} of ${items.length} builds` + (f === 'all' ? ', newest first.' : ` (filter: ${f.toUpperCase()}).`);
  };
  filters.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('button', filters).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    f = b.dataset.f; render();
  });
  more.addEventListener('click', () => { expanded = true; const first = items.find(li => li.hidden === true && (f === 'all' || li.dataset.status === f)); render(); first && first.querySelector('a, .t') && (first.tabIndex = -1, first.focus()); });
  render();
}

/* ---------- YouTube click-to-load (nothing loads until you ask) ---------- */
document.addEventListener('click', e => {
  const a = e.target.closest('a[data-yt]'); if (!a) return;
  e.preventDefault();
  const id = a.dataset.yt, title = a.dataset.title || 'YouTube video';
  const f = document.createElement('iframe');
  f.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
  f.title = title; f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; f.allowFullscreen = true;
  f.referrerPolicy = 'strict-origin-when-cross-origin';
  const holder = a.closest('[data-yt-holder]') || a.parentElement;
  holder.replaceChildren(f); f.focus();
});

/* ---------- subtle magnetic tilt on polaroids (decorative; pointer only) ---------- */
if (motionOK && finePointer) {
  $$('.tilt-hover').forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', ((e.clientX - r.left) / r.width - .5) * 8 + 'px');
      el.style.setProperty('--my', ((e.clientY - r.top) / r.height - .5) * 8 + 'px');
    });
    el.addEventListener('pointerleave', () => { el.style.setProperty('--mx', '0px'); el.style.setProperty('--my', '0px'); });
  });
}

/* ---------- live data: one fetch per page view, honest labels ---------- */
const fmtUTC = iso => {
  const d = new Date(iso); if (isNaN(d)) return iso;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }) + ' UTC';
};
const fmtDay = iso => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
async function getJSON(url, ms = 6000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(url, { signal: c.signal, headers: { Accept: 'application/json' } }); if (!r.ok) throw new Error(r.status); return await r.json(); }
  finally { clearTimeout(t); }
}
const setBadge = (el, live, when) => { if (!el) return; el.classList.toggle('is-live', live); el.textContent = live ? `Live · checked ${when}` : el.dataset.snapshot; };

$$('[data-zh-card]').length && getJSON('https://zerohuman-production.up.railway.app/api/status').then(s => {
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  $$('[data-zh-card]').forEach(card => {
    const set = (k, v) => { const el = card.querySelector(`[data-zh="${k}"]`); if (el && v !== undefined && v !== null) el.textContent = v; };
    set('healthy', s.healthy === true ? 'Healthy' : s.healthy === false ? 'Not healthy' : undefined);
    set('mode', s.paused ? `${s.mode || '—'} (paused)` : s.mode);
    set('head', s.head ? Number(s.head).toLocaleString('en-US') : undefined);
    set('tick', s.lastTickAt ? fmtUTC(s.lastTickAt) : undefined);
    set('orders', s.orders && s.orders.fulfilled !== undefined ? String(s.orders.fulfilled) : undefined);
    setBadge(card.querySelector('[data-live-badge]'), true, now);
  });
}).catch(() => { /* keep the dated snapshot that is already in the HTML */ });

const commitBox = $('[data-gh]');
commitBox && getJSON('https://api.github.com/repos/kenashe/kenashe/commits?per_page=10').then(list => {
  if (!Array.isArray(list) || !list.length) throw new Error('empty');
  const pick = list.find(c => /^pipeline:/.test(c.commit && c.commit.message)) || list[0];
  const msg = pick.commit.message.split('\n')[0];
  const date = pick.commit.committer ? pick.commit.committer.date : pick.commit.author.date;
  commitBox.querySelector('[data-gh="msg"]').textContent = msg;
  commitBox.querySelector('[data-gh="meta"]').textContent = `${pick.sha.slice(0, 7)} · ${fmtUTC(date)}`;
  setBadge(commitBox.querySelector('[data-live-badge]'), true, new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
}).catch(() => {});
