// ZeroHuman page: live worker status (fetched once, labelled Live only on success) and the
// block-by-block replay of the first paid Decision. Everything shown is from the page's own facts.
const RM = matchMedia('(prefers-reduced-motion: reduce)');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const FIRST_ORDER_BLOCK = 26427993;

/* ---------------------------------------------------------- live status */
async function status() {
  const box = $('[data-zh-status]');
  if (!box) return;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 6000);
  try {
    const r = await fetch('https://zerohuman-production.up.railway.app/api/status', { signal: ctl.signal, headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    if (!d || !d.head) throw new Error('no head');
    const set = (k, v) => { const el = $(`[data-zh="${k}"]`, box); if (el) el.textContent = v; };
    const head = Number(d.head);
    set('healthy', d.healthy ? (d.paused ? 'Paused' : 'Healthy') : 'Unhealthy');
    set('mode', d.mode ? d.mode[0].toUpperCase() + d.mode.slice(1) : '—');
    set('head', head.toLocaleString('en-US'));
    set('since', (head - FIRST_ORDER_BLOCK).toLocaleString('en-US'));
    if (d.orders && d.orders.fulfilled != null) set('fulfilled', String(d.orders.fulfilled));
    if (d.identity) set('identity', `${d.identity.name || 'zerohuman.eth'} ${d.identity.ok ? '✓' : '✕'}`);
    const lab = $('[data-zh-label]', box);
    lab.textContent = `Live · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    box.classList.add('is-live');
  } catch { /* keep the dated snapshot */ } finally { clearTimeout(t); }
}

/* ---------------------------------------------------------- replay */
function replay() {
  const fig = $('[data-replay]');
  if (!fig) return;
  const ctl = $('[data-rp-ctl]', fig); ctl.hidden = false;
  const steps = $$('.rp-s', fig), blocks = $$('.blk', fig);
  const out = $('[data-rp-out]', fig), play = $('[data-rp-play]', fig);
  const names = steps.map((s) => $('.rp-k', s).textContent.replace(/^\d+ · /, ''));
  let cur = steps.length - 1, timers = [], playing = false;
  const clear = () => { timers.forEach(clearTimeout); timers = []; };
  const setBlocks = (n) => blocks.forEach((b, i) => b.classList.toggle('is-on', i < n));
  const render = (i, nBlocks) => {
    cur = i;
    fig.dataset.step = i;
    steps.forEach((s, j) => { s.classList.toggle('is-cur', j === i); s.classList.toggle('is-done', j < i); });
    setBlocks(nBlocks ?? (i >= 2 ? 6 : i >= 1 ? 1 : 0));
    fig.classList.toggle('is-picked', i >= 2 && (nBlocks == null || nBlocks >= 6));
    out.textContent = `Step ${i + 1} of ${steps.length} · ${names[i]}`;
  };
  const stop = () => { clear(); playing = false; fig.classList.remove('is-playing'); play.textContent = 'Replay the first order'; };
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));
  const start = () => {
    clear(); playing = true; fig.classList.add('is-run', 'is-playing'); play.textContent = 'Stop replay';
    const slow = !RM.matches;
    render(0, 0);
    let t = 1300;
    at(t, () => render(1, 1)); t += 1500;
    at(t, () => render(2, 1));
    if (slow) for (let b = 2; b <= 6; b++) { t += 520; const n = b; at(t, () => render(2, n)); }
    else { t += 600; at(t, () => render(2, 6)); }
    t += 1400; at(t, () => render(3)); t += 1700;
    at(t, () => { render(4); stop(); });
  };
  play.addEventListener('click', () => (playing ? stop() : start()));
  $('[data-rp-prev]', fig).addEventListener('click', () => { stop(); fig.classList.add('is-run'); render(Math.max(0, cur - 1)); });
  $('[data-rp-next]', fig).addEventListener('click', () => { stop(); fig.classList.add('is-run'); render(Math.min(steps.length - 1, cur + 1)); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && playing) stop(); });
  new IntersectionObserver((es) => es.forEach((e) => { if (!e.isIntersecting && playing) stop(); })).observe(fig);
  render(cur);
}

status(); replay();
