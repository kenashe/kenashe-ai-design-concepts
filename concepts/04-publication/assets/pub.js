// Concept 04 · The Independent Publication — shared behaviour (front page + article).
// Vanilla, no dependencies. Every enhancement degrades to plain links/content without JS.
(() => {
  const doc = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---- Sticky section bar: show the mini nameplate once the big one scrolls away ---- */
  const bar = document.querySelector('.sectionbar');
  const plate = document.querySelector('.nameplate, .art-head');
  if (bar && plate && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => bar.classList.toggle('is-scrolled', !e.isIntersecting), { rootMargin: '-60px 0px 0px 0px' }).observe(plate);
  }

  /* ---- Active section in the bar ---- */
  const navLinks = [...document.querySelectorAll('.sections a[href*="#"]')];
  const targets = navLinks.map(a => document.getElementById(a.hash.slice(1))).filter(Boolean);
  if (targets.length && 'IntersectionObserver' in window && !document.body.classList.contains('is-article')) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        navLinks.forEach(a => a.setAttribute('aria-current', a.hash === '#' + e.target.id ? 'true' : 'false'));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    targets.forEach(t => io.observe(t));
  }

  /* ---- Sections index overlay (mobile): native <dialog> gives focus trap + Esc ---- */
  const dlg = document.getElementById('sections-index');
  const openBtn = document.querySelector('.sections-btn');
  if (dlg && openBtn && typeof dlg.showModal === 'function') {
    openBtn.addEventListener('click', () => { dlg.showModal(); openBtn.setAttribute('aria-expanded', 'true'); });
    dlg.addEventListener('close', () => { openBtn.setAttribute('aria-expanded', 'false'); openBtn.focus(); });
    dlg.querySelector('.close-btn')?.addEventListener('click', () => dlg.close());
    dlg.querySelectorAll('a').forEach(a => a.addEventListener('click', () => dlg.close()));
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  } else if (openBtn) {
    openBtn.hidden = true; // very old browsers: fall back to the plain section list
    document.querySelector('.sections')?.style.setProperty('display', 'flex');
  }

  /* ---- Ink-in rules: quiet, one-time, motion-permitting only ---- */
  if (!reduce.matches && 'IntersectionObserver' in window) {
    doc.classList.add('ink');
    const els = document.querySelectorAll('.sec-head, .feed');
    document.querySelectorAll('.feed li').forEach((li, i) => li.style.setProperty('--i', i % 8));
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    els.forEach(el => io.observe(el));
  }

  /* ---- Click-to-load YouTube (privacy-enhanced). Links work without JS. ---- */
  window.pubLoadYT = (host, id, start, title) => {
    const f = document.createElement('iframe');
    const s = start ? `&start=${start}` : '';
    f.src = `https://www.youtube-nocookie.com/embed/${id}?rel=0&autoplay=1${s}`;
    f.title = title || 'YouTube video player';
    f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share';
    f.allowFullscreen = true;
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    host.replaceChildren(f);
    f.focus();
  };
  document.querySelectorAll('a.yt[data-yt]').forEach(a => {
    a.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      const wrap = document.createElement('div');
      wrap.className = 'yt-frame';
      a.replaceWith(wrap);
      window.pubLoadYT(wrap, a.dataset.yt, a.dataset.start, a.dataset.title);
    });
  });

  /* ---- Filter tabs (Features by authorship, Build ledger by status) ---- */
  document.querySelectorAll('[data-tabs]').forEach(list => {
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    const scope = document.getElementById(list.dataset.tabs);
    const status = document.getElementById(list.dataset.status);
    const select = (tab, focus) => {
      tabs.forEach(t => { const on = t === tab; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
      const v = tab.dataset.filter;
      let shown = 0;
      scope.querySelectorAll('[data-k]').forEach(item => {
        const ok = v === 'all' || item.dataset.k.split(' ').includes(v);
        item.hidden = !ok; if (ok) shown++;
      });
      if (status) status.textContent = `Showing ${shown} of ${scope.querySelectorAll('[data-k]').length}: ${tab.dataset.label}.`;
      if (focus) tab.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', e => {
        const k = e.key; let n = null;
        if (k === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        if (k === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (k === 'Home') n = tabs[0];
        if (k === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
  });

  /* ---- Live data: one request per page view, 6s timeout, honest labels ---- */
  const fetchJSON = async (url, ms = 6000) => {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), ms);
    try {
      const r = await fetch(url, { signal: c.signal, headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error(r.status);
      return await r.json();
    } finally { clearTimeout(t); }
  };
  const fmtTime = (iso, short) => {
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', ...(short ? {} : { year: 'numeric' }), hour: 'numeric', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' });
  };
  const nowLabel = () => new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const setSrc = (el, state, text) => { if (!el) return; el.dataset.state = state; el.textContent = text; };

  const zh = document.querySelector('[data-live="zerohuman"]');
  if (zh) {
    const src = zh.querySelector('.src');
    fetchJSON(zh.dataset.url).then(d => {
      const set = (k, v) => { const el = zh.querySelector(`[data-f="${k}"]`); if (el && v !== undefined && v !== null) el.textContent = v; };
      set('healthy', d.healthy ? 'Healthy' : 'Not healthy');
      set('mode', d.paused ? 'Paused' : (d.mode ? d.mode[0].toUpperCase() + d.mode.slice(1) : undefined));
      set('head', d.head ? Number(d.head).toLocaleString('en-US') : undefined);
      set('orders', d.orders && d.orders.fulfilled !== undefined ? String(d.orders.fulfilled) : undefined);
      set('tick', d.lastTickAt ? fmtTime(d.lastTickAt, true) : undefined);
      setSrc(src, 'live', `Live · ${nowLabel()}`);
      const f = zh.querySelector('.databox__f'); if (f) f.textContent = 'Fetched just now from the public ZeroHuman /api/status endpoint. * Orders fulfilled counts every paid order, including Ken’s own test buyer.';
    }).catch(() => setSrc(src, 'snapshot', src?.dataset.snapshot || 'Snapshot'));
  }

  const gh = document.querySelector('[data-live="github"]');
  if (gh) {
    const src = gh.querySelector('.src');
    fetchJSON(gh.dataset.url).then(list => {
      if (!Array.isArray(list) || !list.length) throw new Error('empty');
      const c = list.find(x => /^pipeline:/i.test(x?.commit?.message || '')) || list[0];
      gh.querySelector('[data-f="msg"]').textContent = (c.commit.message || '').split('\n')[0];
      gh.querySelector('[data-f="sha"]').textContent = (c.sha || '').slice(0, 7);
      gh.querySelector('[data-f="date"]').textContent = fmtTime(c.commit.committer?.date || c.commit.author?.date);
      setSrc(src, 'live', `LIVE · ${nowLabel()}`);
    }).catch(() => setSrc(src, 'snapshot', src?.dataset.snapshot || 'SNAPSHOT'));
  }
})();
