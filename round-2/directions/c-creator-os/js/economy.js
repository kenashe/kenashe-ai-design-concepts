// The 36-second sale: a playhead over the two real transactions (blocks 26385257 → 26385260).
// Only the payment and delivery times are on the record; the steps before, between and after
// are shown as untimed segments rather than invented timestamps.
import './site.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = $('[data-replay]');
if (root) {
  const range = $('#rr', root), head = $('[data-rhead]', root), clock = $('[data-clock]', root), sub = $('[data-clock-sub]', root), now = $('[data-rnow]', root);
  const steps = $$('.rsteps li', root);
  const T0 = Date.UTC(2026, 10, 10, 14, 58, 11);
  // range value v: -12..-1 pre-roll, 0 payment, 1..35 between, 36 delivery, 37..48 post-roll
  const stepOf = (v) => (v < -6 ? 0 : v < 0 ? 1 : v === 0 ? 2 : v < 36 ? 3 : v === 36 ? 4 : 5);
  const valOf = [-10, -4, 0, 18, 36, 44];
  const pos = (v) => (v < 0 ? 14 * (1 + v / 12) : v > 36 ? 86 + 14 * ((v - 36) / 12) : 14 + (72 * v) / 36);
  const hhmmss = (ms) => new Date(ms).toISOString().slice(11, 19);
  let timer = null;

  function show(v) {
    v = Math.max(-12, Math.min(48, v));
    range.value = v;
    const s = stepOf(v);
    head.style.left = `${pos(v)}%`;
    steps.forEach((li, i) => { li.classList.toggle('is-on', i === s); li.classList.toggle('is-done', i < s); });
    if (v < 0) { clock.textContent = 'Before'; sub.textContent = '14:58:11 UTC · time not recorded'; }
    else if (v > 36) { clock.textContent = 'After'; sub.textContent = '14:58:47 UTC · time not recorded'; }
    else if (v === 0 || v === 36) { clock.textContent = hhmmss(T0 + v * 1000); sub.textContent = v === 0 ? 'UTC · block 26385257 · payment' : 'UTC · block 26385260 · delivery'; }
    else { clock.textContent = `+${v} s`; sub.textContent = 'after the payment · work timing not recorded'; }
    const li = steps[s];
    now.innerHTML = `<b>Step ${s + 1} of 6 · ${li.querySelector('b').textContent.replace('.', '')}</b>${[...li.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('')}`;
    range.setAttribute('aria-valuetext', `${li.querySelector('b').textContent} ${v < 0 ? 'before the payment' : v > 36 ? 'after the delivery' : v === 0 || v === 36 ? `${hhmmss(T0 + v * 1000)} UTC` : `${v} seconds after the payment`}`);
    $$('[data-rcpt]').forEach((r) => r.classList.toggle('is-on', (r.dataset.rcpt === 'ens' && s === 0) || (r.dataset.rcpt === 'order' && (s === 2 || s === 1)) || (r.dataset.rcpt === 'input' && s === 2) || (r.dataset.rcpt === 'delivery' && s >= 4)));
  }
  function stop() { clearInterval(timer); timer = null; const b = $('[data-r="play"]', root); b.setAttribute('aria-pressed', 'false'); $('.lbl', b).textContent = 'Replay in real time'; }
  function play() {
    if (timer) return stop();
    let v = +range.value; if (v >= 36 || v < 0) v = 0; show(v);
    const b = $('[data-r="play"]', root); b.setAttribute('aria-pressed', 'true'); $('.lbl', b).textContent = 'Pause';
    timer = setInterval(() => { v += 1; show(v); if (v >= 36) { stop(); } }, 1000); // real time: one second per second
  }
  range.addEventListener('input', () => { stop(); show(+range.value); });
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-r]'); if (!b) return;
    if (b.dataset.r === 'play') return play();
    stop();
    const s = stepOf(+range.value);
    show(valOf[Math.max(0, Math.min(5, s + (b.dataset.r === 'next' ? 1 : -1)))]);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  show(0);
}
