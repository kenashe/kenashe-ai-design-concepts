// ZeroHuman write-up: live worker status, section progress rail, order stepper.
import { getStatus, fmtDate, ago, nf, nowUTC, reduced } from './site.js';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------------- live worker status ---------------- */
const ws = $('[data-wstatus]');
if (ws) {
  const badge = $('[data-ws-badge]', ws), note = $('[data-ws-note]', ws);
  const set = (k, v, ok) => { const el = $(`[data-w="${k}"]`, ws); if (!el) return; el.textContent = v; if (ok !== undefined) el.classList.toggle('ok', ok); };
  getStatus().then(s => {
    if (typeof s?.healthy !== 'boolean') throw new Error('shape');
    set('healthy', s.healthy ? (s.paused ? 'healthy · paused' : 'healthy') : 'not healthy', s.healthy && !s.paused);
    set('mode', s.mode || '—');
    set('head', nf(s.head));
    set('tick', `${ago(s.lastTickAt)} · ${fmtDate(s.lastTickAt, true).split(', ').slice(-1)[0]}`);
    set('orders', String(s.orders?.fulfilled ?? '—'));
    if (Array.isArray(s.services)) {
      set('services', s.services.map(x => x.id).join(' · '));
      const eth = [...new Set(s.services.map(x => Number(BigInt(x.priceWei) * 10000n / 10n ** 18n) / 10000))];
      set('price', eth.length === 1 ? `${eth[0]} ETH each` : eth.map(e => `${e} ETH`).join(' / '));
    }
    if (s.identity) set('identity', s.identity.ok ? `agree · ${s.identity.primaryName || s.identity.name}` : 'mismatch, signing refused', !!s.identity.ok);
    $('[data-w="raw"]', ws).textContent = JSON.stringify(s, null, 2);
    badge.className = 'status status--live pulse'; badge.textContent = 'Live';
    note.textContent = `Live · read at ${nowUTC()} from zerohuman-production.up.railway.app/api/status (once per visit).`;
  }).catch(() => {
    badge.className = 'status status--snap'; badge.textContent = 'Snapshot';
    set('identity', 'not in snapshot');
    note.textContent = 'Snapshot · Nov 25, 2026. The live endpoint did not answer in time, so this is the last recorded status.';
  });
}

/* ---------------- section progress rail ---------------- */
const secs = $$('[data-sec]');
const tocLinks = $$('[data-toc]');
const fill = $('.toc .fill'), mtoc = $('[data-mtoc]'), mcur = $('[data-mtoc-cur]'), article = $('.article');
if (secs.length) {
  const names = Object.fromEntries(tocLinks.map(a => [a.dataset.toc, a.textContent]));
  let current = null;
  const io = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) current = e.target.id; });
    const idx = secs.findIndex(s => s.id === current);
    tocLinks.forEach((a, i) => {
      a.classList.toggle('is-done', i < idx);
      i === idx ? a.setAttribute('aria-current', 'location') : a.removeAttribute('aria-current');
    });
    if (mcur && current) mcur.textContent = names[current] || '';
  }, { rootMargin: '-30% 0px -60% 0px' });
  secs.forEach(s => io.observe(s));
  let raf = 0;
  const prog = () => {
    raf = 0;
    const r = article.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * .4 - r.top) / r.height));
    fill?.style.setProperty('--p', p.toFixed(4));
    mtoc?.style.setProperty('--p', p.toFixed(4));
  };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(prog); }, { passive: true });
  prog();
  mtoc?.addEventListener('click', e => { if (e.target.closest('a')) mtoc.open = false; });
}

/* ---------------- order stepper ---------------- */
const st = $('[data-stepper]');
if (st) {
  const steps = $$('.step', st), dg = $('[data-diagram]', st), cap = $('[data-cap]', st), count = $('[data-count]', st);
  const caps = JSON.parse($('#caps').textContent);
  const playBtn = $('[data-play]', st), playIco = $('[data-play-ico]', st), playLab = $('[data-play-lab]', st);
  const ICO_PLAY = playIco.innerHTML;
  const ICO_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>';
  const MAP = {
    1: { n: ['buyer', 'ens'], p: [1], l: [1] },
    2: { n: ['buyer', 'ens'], p: [2], l: [2] },
    3: { n: ['worker'], p: [3], l: [3] },
    4: { n: ['worker', 'ens', 'buyer'], p: [4], l: [4] },
    5: { n: ['buyer'], p: [5], l: [5], t: [5] },
  };
  let cur = 1, timer = null;
  function go(n, announce = true) {
    cur = ((n - 1 + 5) % 5) + 1;
    steps.forEach((s, i) => {
      s.classList.toggle('is-on', i + 1 === cur); s.classList.toggle('is-past', i + 1 < cur);
      $('button', s).setAttribute('aria-pressed', String(i + 1 === cur));
    });
    const m = MAP[cur];
    $$('[data-n]', dg).forEach(g => g.classList.toggle('on', m.n.includes(g.dataset.n)));
    $$('[data-p]', dg).forEach(p => p.classList.toggle('on', m.p.includes(+p.dataset.p)));
    $$('[data-l]', dg).forEach(p => p.classList.toggle('on', m.l.includes(+p.dataset.l)));
    $$('[data-t]', dg).forEach(p => p.classList.toggle('on', (m.t || []).includes(+p.dataset.t)));
    if (announce) cap.innerHTML = caps[cur - 1];
    count.textContent = `${cur} / 5`;
  }
  function stop() {
    clearInterval(timer); timer = null;
    playBtn.setAttribute('aria-pressed', 'false'); playIco.innerHTML = ICO_PLAY; playLab.textContent = cur === 5 ? 'Replay the order' : 'Play the order';
    dg.classList.add('paused');
  }
  function play() {
    if (cur === 5) go(1);
    dg.classList.remove('paused');
    playBtn.setAttribute('aria-pressed', 'true'); playIco.innerHTML = ICO_PAUSE; playLab.textContent = 'Pause';
    timer = setInterval(() => { if (cur >= 5) return stop(); go(cur + 1); }, reduced ? 4000 : 2600);
  }
  steps.forEach((s, i) => $('button', s).addEventListener('click', () => { stop(); go(i + 1); }));
  $('[data-prev]', st).addEventListener('click', () => { stop(); go(cur - 1); });
  $('[data-next]', st).addEventListener('click', () => { stop(); go(cur + 1); });
  playBtn.addEventListener('click', () => (timer ? stop() : play()));
  // keyboard: arrow keys move between steps when focus is inside the list
  $('.steps', st).addEventListener('keydown', e => {
    if (!['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(e.key)) return;
    e.preventDefault(); stop(); go(cur + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1));
    $('button', steps[cur - 1]).focus();
  });
  // auto-play stops when the diagram leaves the screen or the tab is hidden
  new IntersectionObserver(([e]) => { if (!e.isIntersecting && timer) stop(); }).observe(dg);
  document.addEventListener('visibilitychange', () => { if (document.hidden && timer) stop(); });
  go(1, false);
  dg.classList.add('paused'); // dashes only march while the order is playing
}
