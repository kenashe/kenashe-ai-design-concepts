/* Concept 03 · The Cinematic Creator — vanilla JS, no dependencies. */
const doc = document.documentElement;
doc.classList.add('js');
const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
let reduce = mqReduce.matches;
if (reduce) doc.classList.add('rm');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* ---------- Chapters menu (native <dialog>: focus trap + Esc for free) ---------- */
const menu = $('#chapters');
const openBtns = $$('[data-open-chapters]');
if (menu && typeof menu.showModal === 'function') {
  openBtns.forEach(b => b.addEventListener('click', () => {
    menu.showModal();
    openBtns.forEach(x => x.setAttribute('aria-expanded', 'true'));
    const cur = $('.chapters__list a[aria-current="true"]', menu) || $('.chapters__list a', menu);
    cur && cur.focus();
  }));
  menu.addEventListener('close', () => {
    openBtns.forEach(x => x.setAttribute('aria-expanded', 'false'));
  });
  $$('[data-close-chapters]', menu).forEach(b => b.addEventListener('click', () => menu.close()));
  $$('.chapters__list a', menu).forEach(a => {
    a.addEventListener('click', () => menu.close());
    const still = a.dataset.still;
    const bg = $('.chapters__bg img', menu);
    if (still && bg) {
      const show = () => { if (bg.getAttribute('src') !== still) bg.src = still; };
      a.addEventListener('mouseenter', show);
      a.addEventListener('focus', show);
    }
  });
} else if (menu) {
  // Very old browsers: the dialog content is still reachable as a normal block.
  openBtns.forEach(b => b.addEventListener('click', () => { menu.setAttribute('open', ''); }));
}

/* ---------- Chapter tracking: header label, rail, runtime bar ---------- */
const chapters = $$('[data-chapter]');
const label = $('#bar-chapter');
const num = $('#bar-num');
const railLinks = $$('.rail a, .chapters__list a');
function setCurrent(sec) {
  if (!sec) return;
  document.body.classList.toggle('at-opening', sec.id === 'opening' || sec.id === 'screening');
  if (label) label.textContent = sec.dataset.chapter;
  if (num) num.textContent = sec.dataset.no || '';
  railLinks.forEach(a => a.setAttribute('aria-current', a.getAttribute('href') === '#' + sec.id ? 'true' : 'false'));
}
if (chapters.length && 'IntersectionObserver' in window) {
  const seen = new Map();
  const io = new IntersectionObserver(es => {
    es.forEach(e => seen.set(e.target, e.isIntersecting));
    // the last chapter whose top has passed 40% of the viewport wins
    let best = chapters[0];
    for (const c of chapters) { if (c.getBoundingClientRect().top < innerHeight * 0.4) best = c; }
    setCurrent(best);
  }, { rootMargin: '-40% 0px -55% 0px' });
  chapters.forEach(c => io.observe(c));
  setCurrent(chapters[0]);
}
const runtime = $('.runtime i');
if (runtime) {
  let ticking = false;
  const upd = () => {
    const max = doc.scrollHeight - innerHeight;
    runtime.style.setProperty('--p', max > 0 ? Math.min(1, scrollY / max).toFixed(4) : 0);
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
  upd();
}

/* ---------- Rack-focus reveals ---------- */
const reveals = $$('.reveal, .portrait');
if (!reduce && 'IntersectionObserver' in window) {
  const ro = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); }
  }), { rootMargin: '0px 0px -12% 0px' });
  reveals.forEach(r => ro.observe(r));
} else reveals.forEach(r => r.classList.add('in'));

/* ---------- Opening title sequence: cross-dissolve with pause control ---------- */
const seq = $('[data-sequence]');
if (seq) {
  const shots = $$('.shot', seq);
  const btn = $('#seq-toggle');
  const no = $('#shot-no');
  let i = 0, timer = null, userPaused = false, visible = true;
  const HOLD = 7000;
  const show = n => {
    shots[i].classList.remove('is-on');
    i = (n + shots.length) % shots.length;
    shots[i].classList.add('is-on');
    if (no) no.textContent = `Shot ${i + 1} / ${shots.length}`;
  };
  const running = () => timer !== null;
  const start = () => { if (!running() && !reduce) timer = setInterval(() => show(i + 1), HOLD); seq.classList.remove('paused'); };
  const stop = () => { clearInterval(timer); timer = null; seq.classList.add('paused'); };
  const sync = () => {
    const should = !userPaused && visible && !document.hidden && !reduce;
    should ? start() : stop();
    if (btn) {
      const playing = running();
      btn.setAttribute('aria-pressed', playing ? 'false' : 'true');
      btn.querySelector('.lbl').textContent = playing ? 'Pause' : 'Play';
      btn.querySelector('.ico-pause').style.display = playing ? '' : 'none';
      btn.querySelector('.ico-play').style.display = playing ? 'none' : '';
    }
    // freeze the Ken Burns push when paused
    shots.forEach(s => { const im = s.querySelector('img'); if (im) im.style.animationPlayState = running() ? 'running' : 'paused'; });
  };
  if (shots.length > 1) {
    btn && btn.addEventListener('click', () => { userPaused = !userPaused; sync(); });
    document.addEventListener('visibilitychange', sync);
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; sync(); }).observe(seq);
    mqReduce.addEventListener && mqReduce.addEventListener('change', e => { reduce = e.matches; doc.classList.toggle('rm', reduce); if (reduce) { show(0); } sync(); });
    if (reduce && btn) btn.hidden = true;
    sync();
  }
}

/* ---------- Click-to-load YouTube (youtube-nocookie) ---------- */
function loadYT(player, id, title) {
  const f = document.createElement('iframe');
  f.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
  f.title = title || 'YouTube video player';
  f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
  f.allowFullscreen = true;
  f.referrerPolicy = 'strict-origin-when-cross-origin';
  player.classList.add('is-playing');
  player.innerHTML = '';
  player.appendChild(f);
  f.focus();
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-yt]');
  if (!b) return;
  e.preventDefault();
  loadYT(b.closest('.player'), b.dataset.yt, b.dataset.title);
});

/* ---------- The reel: projector + film strip + scrubber ---------- */
const reel = $('[data-reel]');
if (reel) {
  const track = $('.strip__track', reel);
  const cells = $$('.cell', reel);
  const proj = $('#projector');
  const pTitle = $('#p-title'), pMeta = $('#p-meta'), pLinks = $('#p-links'), pDailies = $('#p-dailies'), pNo = $('#p-no');
  const range = $('#reel-range');
  const prev = $('#reel-prev'), next = $('#reel-next');
  const data = cells.map(c => JSON.parse(c.dataset.video));

  function renderProjector(idx, focusPlayer) {
    const v = data[idx];
    cells.forEach((c, k) => c.setAttribute('aria-current', k === idx ? 'true' : 'false'));
    const player = $('.player', proj);
    const html = `<button class="player__poster" type="button" data-yt="${v.id}" data-title="${v.title.replace(/"/g, '&quot;')}">
      <img src="${v.thumb}" alt="" width="1280" height="720"><span class="player__play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg><span>Play${v.duration ? ' · ' + v.duration : ''}</span></span>
      <span class="vh">Play ${v.title}</span></button>`;
    player.classList.remove('is-playing');
    player.innerHTML = html;
    if (!reduce) { player.classList.remove('is-cut'); void player.offsetWidth; player.classList.add('is-cut'); }
    pNo.textContent = v.no;
    pTitle.textContent = v.title;
    pMeta.innerHTML = `<span class="slate"><b>${v.dateLabel}</b></span>${v.duration ? `<span class="slate">Runtime <b>${v.duration}</b></span>` : ''}<span class="slate">${v.kind === 'film' ? 'Short film' : 'Long-form video'}</span>`;
    pLinks.innerHTML = `<a class="btn" href="${v.url}" rel="noopener">YouTube <span class="arr" aria-hidden="true">↗</span></a>` +
      (v.related ? `<a class="btn" href="${v.related}" rel="noopener">${v.relatedLabel} <span class="arr" aria-hidden="true">→</span></a>` : '');
    pDailies.innerHTML = v.frames.map((f, k) => `<figure><img src="${f}" alt="" width="1280" height="720" loading="lazy"><figcaption class="slate">Frame ${k + 1}</figcaption></figure>`).join('');
    if (focusPlayer) $('.player__poster', proj).focus({ preventScroll: true });
  }
  cells.forEach((c, k) => {
    const b = $('.cell__btn', c);
    b.addEventListener('click', () => {
      renderProjector(k, false);
      const top = proj.getBoundingClientRect().top;
      if (top < 0 || top > innerHeight * 0.5) proj.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
    // roving: arrows move along the strip
    b.addEventListener('keydown', e => {
      let t = null;
      if (e.key === 'ArrowRight') t = k + 1; else if (e.key === 'ArrowLeft') t = k - 1;
      else if (e.key === 'Home') t = 0; else if (e.key === 'End') t = cells.length - 1;
      if (t === null) return;
      e.preventDefault();
      t = Math.max(0, Math.min(cells.length - 1, t));
      const nb = $('.cell__btn', cells[t]);
      nb.focus({ preventScroll: true });
      cells[t].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', inline: 'nearest', block: 'nearest' });
    });
    // dailies preview: cycle the real frames while hovered/focused (decorative; frames also appear in the projector)
    const alts = $$('img.alt', c);
    if (alts.length && !reduce) {
      let tm = null, n = -1;
      const go = () => { alts.forEach(a => a.classList.remove('on')); n = (n + 1) % (alts.length + 1); if (n < alts.length) alts[n].classList.add('on'); };
      const startC = () => { if (!tm) { alts.forEach(a => { if (!a.src) a.src = a.dataset.src; }); go(); tm = setInterval(go, 900); } };
      const stopC = () => { clearInterval(tm); tm = null; n = -1; alts.forEach(a => a.classList.remove('on')); };
      b.addEventListener('mouseenter', startC); b.addEventListener('mouseleave', stopC);
      b.addEventListener('focus', startC); b.addEventListener('blur', stopC);
    }
  });
  // scrubber <-> scroll
  const maxScroll = () => track.scrollWidth - track.clientWidth;
  const syncRange = () => {
    const m = maxScroll();
    range.value = m > 0 ? Math.round(track.scrollLeft / m * 1000) : 0;
    prev.disabled = track.scrollLeft < 4; next.disabled = track.scrollLeft > m - 4;
  };
  track.addEventListener('scroll', () => requestAnimationFrame(syncRange), { passive: true });
  range.addEventListener('input', () => { track.style.scrollSnapType = 'none'; track.scrollLeft = range.value / 1000 * maxScroll(); });
  range.addEventListener('change', () => { track.style.scrollSnapType = ''; });
  const step = d => track.scrollBy({ left: d * Math.max(260, track.clientWidth * 0.8), behavior: reduce ? 'auto' : 'smooth' });
  prev.addEventListener('click', () => step(-1)); next.addEventListener('click', () => step(1));
  addEventListener('resize', syncRange);
  syncRange();
}

/* ---------- Live data (once per page view, timeout, honest labels) ---------- */
async function getJSON(url, ms = 6000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}
const fmtTime = d => d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const fmtDate = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
function setBadge(el, live, when) {
  if (!el) return;
  el.classList.toggle('badge--live', live);
  el.textContent = live ? `Live · fetched ${fmtTime(new Date())}` : `Snapshot · ${when}`;
}
const zh = $('[data-live="zerohuman"]');
if (zh) {
  getJSON(zh.dataset.url).then(d => {
    const set = (k, v) => { const n = $(`[data-k="${k}"]`, zh); if (n && v !== undefined && v !== null) n.textContent = v; };
    set('healthy', d.healthy ? 'Healthy' : 'Not healthy');
    set('mode', d.paused ? 'Paused' : (d.mode || '—'));
    set('head', d.head);
    set('orders', d.orders && d.orders.fulfilled !== undefined ? d.orders.fulfilled : undefined);
    if (d.lastTickAt) set('tick', fmtTime(new Date(d.lastTickAt)));
    setBadge($('.badge', zh), true);
  }).catch(() => setBadge($('.badge', zh), false, zh.dataset.snapshot));
}
$$('[data-live="github"]').forEach(gh => {
  getJSON(gh.dataset.url).then(list => {
    if (!Array.isArray(list) || !list.length) throw new Error('empty');
    const pick = list.find(c => /^pipeline:/i.test(c.commit.message)) || list[0];
    const dt = new Date(pick.commit.committer?.date || pick.commit.author?.date);
    $('[data-k="msg"]', gh).textContent = pick.commit.message.split('\n')[0];
    $('[data-k="meta"]', gh).textContent = `${pick.sha.slice(0, 7)} · ${fmtDate(dt)}`;
    setBadge($('.badge', gh), true);
  }).catch(() => setBadge($('.badge', gh), false, gh.dataset.snapshot));
});

/* ---------- Film page: three-step comparison ---------- */
$$('[data-compare]').forEach(cmp => {
  const figs = $$('figure', cmp);
  const btns = $$('.compare__tabs button', cmp);
  btns.forEach((b, k) => b.addEventListener('click', () => {
    figs.forEach((f, j) => { f.classList.toggle('on', j === k); f.setAttribute('aria-hidden', j === k ? 'false' : 'true'); });
    btns.forEach((x, j) => x.setAttribute('aria-pressed', j === k ? 'true' : 'false'));
  }));
});

/* ---------- Film page: contact-sheet lightbox ---------- */
const lb = $('#lightbox');
if (lb && typeof lb.showModal === 'function') {
  const img = $('img', lb), cap = $('#lb-cap');
  $$('[data-zoom]').forEach(b => b.addEventListener('click', () => {
    img.src = b.dataset.zoom; img.alt = b.querySelector('img').alt; cap.textContent = b.dataset.cap;
    lb.showModal();
  }));
  $('[data-close-lb]', lb).addEventListener('click', () => lb.close());
  lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });
}
