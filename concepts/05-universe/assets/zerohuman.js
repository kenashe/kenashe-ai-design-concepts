// ZeroHuman system page: order orbit, boundary ring, live worker status. No library.
import { zeroHuman, SNAPSHOT_LABEL, fmtUTC, num } from './live.js';

const SNAP = { healthy: true, mode: 'public', head: '26492255', lastTickAt: '2026-11-25T12:40:16Z', ordersFulfilled: 2 };
const FIRST_ORDER_BLOCK = 26427993;
const NS = 'http://www.w3.org/2000/svg';
const $ = (s, r = document) => r.querySelector(s);
const reduce = matchMedia('(prefers-reduced-motion: reduce)');

// ------------------------------------------------------------------ geometry
const C = { x: 320, y: 330, rx: 182, ry: 134 };
const STEPS = [
  { name: 'Discover', who: 'buyer' },
  { name: 'Pay & order', who: 'buyer' },
  { name: 'Work', who: 'worker' },
  { name: 'Deliver', who: 'worker' },
  { name: 'Verify', who: 'buyer' },
];
const ang = i => Math.PI + i * (Math.PI * 2 / STEPS.length);
const pt = (a, k = 1) => [C.x + Math.cos(a) * C.rx * k, C.y + Math.sin(a) * C.ry * k];
const el = (tag, attrs = {}, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); parent && parent.appendChild(n); return n; };

// ------------------------------------------------------------------ boundary ring (6 documented limits)
const BOUNDS = ['B1 · HOT KEY ON HOST', 'B2 · NO ESCROW', 'B3 · BUILDERS CAN BIAS A DECISION', 'B4 · ONE ORDER AT A TIME', 'B5 · THIRD-PARTY DEPENDENCIES', 'B6 · NO OUTSIDE BUYER YET'];
const ring = $('#bound-ring');
const R = 292;
BOUNDS.forEach((label, i) => {
  const c = -Math.PI / 2 + i * Math.PI / 3;
  const a0 = c - Math.PI / 6 + 0.05, a1 = c + Math.PI / 6 - 0.05;
  const arc = (r, from, to, sweep) => `M${320 + Math.cos(from) * r},${320 + Math.sin(from) * r} A${r},${r} 0 0 ${sweep} ${320 + Math.cos(to) * r},${320 + Math.sin(to) * r}`;
  el('path', { d: arc(R, a0, a1, 1), class: 'bound-arc' + (i === 5 ? ' is-key' : '') }, ring);
  const bottom = Math.sin(c) > 0.2;
  const id = 'bt' + i;
  el('path', { id, d: bottom ? arc(R + 13, a1, a0, 0) : arc(R + 7, a0, a1, 1), fill: 'none' }, ring);
  const t = el('text', { class: 'bound-lbl' + (i === 5 ? ' is-key' : '') }, ring);
  const tp = el('textPath', { href: '#' + id, startOffset: '50%', 'text-anchor': 'middle' }, t);
  tp.textContent = label;
});

// ------------------------------------------------------------------ stations
const g = $('#stations');
const stationEls = STEPS.map((s, i) => {
  const a = ang(i);
  const [x, y] = pt(a);
  const grp = el('g', { class: 'station st-' + s.who, tabindex: '0', role: 'button', 'aria-label': `Step ${i + 1}: ${s.name}` }, g);
  el('circle', { cx: x, cy: y, r: 22, class: 'st-hit' }, grp);
  el('circle', { cx: x, cy: y, r: 13, class: 'st-dot' }, grp);
  const n = el('text', { x, y: y + 4.5, 'text-anchor': 'middle', class: 'st-n' }, grp); n.textContent = i + 1;
  const [lx, ly] = pt(a, 1.0);
  const dx = Math.cos(a), dy = Math.sin(a);
  const side = Math.abs(dy) < 0.3;            // the left-most station labels above itself
  const tx = side ? lx - 34 : lx + dx * 26, ty = side ? ly - 40 : ly + dy * 26 + (dy > 0.3 ? 12 : -10);
  const anchor = side || Math.abs(dx) < 0.3 ? 'middle' : dx > 0 ? 'start' : 'end';
  const t = el('text', { x: tx, y: ty, 'text-anchor': anchor, class: 'st-name' }, grp); t.textContent = s.name;
  const w = el('text', { x: tx, y: ty + 15, 'text-anchor': anchor, class: 'st-who' }, grp); w.textContent = s.who === 'buyer' ? 'BUYING AGENT' : 'WORKER';
  grp.addEventListener('click', () => go(i, true));
  grp.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(i, true); } });
  return grp;
});

// ------------------------------------------------------------------ step state
const steps = [...document.querySelectorAll('.step')];
const packet = $('#packet'), trail = $('#orbit-trail'), count = $('#step-count');
const playBtn = $('#st-play');
document.documentElement.classList.add('zh-js');
let cur = 0, pos = ang(0), raf = 0, playing = false, timer = 0;

function ellipseArc(from, to) {
  // polyline approximation of the orbit between two angles (forward)
  let d = '', n = Math.max(2, Math.ceil((to - from) / 0.05));
  for (let i = 0; i <= n; i++) { const a = from + (to - from) * i / n; const [x, y] = pt(a); d += (i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1); }
  return d;
}
function place(a) {
  const [x, y] = pt(a);
  packet.setAttribute('cx', x.toFixed(1)); packet.setAttribute('cy', y.toFixed(1));
  trail.setAttribute('d', a > ang(0) + 0.001 ? ellipseArc(ang(0), a) : '');
}
function render() {
  steps.forEach((s, i) => { s.classList.toggle('is-active', i === cur); s.toggleAttribute('hidden', i !== cur); s.setAttribute('aria-current', i === cur ? 'step' : 'false'); });
  stationEls.forEach((s, i) => { s.classList.toggle('is-active', i === cur); s.classList.toggle('is-done', i < cur); s.setAttribute('aria-pressed', String(i === cur)); });
  count.textContent = `Step ${cur + 1} of ${STEPS.length}: ${STEPS[cur].name}`;
}
function go(i, user) {
  if (user) stop();
  const target = ang(i);
  cur = i; render();
  cancelAnimationFrame(raf);
  if (reduce.matches || document.hidden) { pos = target; place(pos); return; }
  const from = target < pos ? ang(0) : pos;       // looping back restarts the trail
  const t0 = performance.now(), dur = 900;
  const tick = now => {
    const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    pos = from + (target - from) * e; place(pos);
    if (k < 1) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}
$('#st-prev').addEventListener('click', () => go((cur + STEPS.length - 1) % STEPS.length, true));
$('#st-next').addEventListener('click', () => go((cur + 1) % STEPS.length, true));

// play: auto-advances (>5 s total), so it always has a visible pause control
function play() {
  playing = true; playBtn.setAttribute('aria-pressed', 'true');
  $('.lbl', playBtn).textContent = 'Pause orbit'; $('.ico', playBtn).textContent = '❚❚';
  clearInterval(timer);
  timer = setInterval(() => { if (!document.hidden && onScreen) go((cur + 1) % STEPS.length, false); }, 3200);
}
function stop() {
  playing = false; playBtn.setAttribute('aria-pressed', 'false');
  $('.lbl', playBtn).textContent = 'Play orbit'; $('.ico', playBtn).textContent = '▶';
  clearInterval(timer);
}
playBtn.addEventListener('click', () => playing ? stop() : play());
let onScreen = true;
new IntersectionObserver(es => { onScreen = es[0].isIntersecting; }).observe($('#orrery'));
function applyMotion() {
  playBtn.hidden = false;
  if (reduce.matches) stop(); else if (!playing) play();
}
reduce.addEventListener ? reduce.addEventListener('change', applyMotion) : reduce.addListener(applyMotion);
render(); place(pos); applyMotion();

// ------------------------------------------------------------------ live status (once, with timeout)
zeroHuman(SNAP).then(z => {
  const set = (id, v) => { const n = document.getElementById(id); if (n) n.textContent = v; };
  const src = $('#st-src');
  src.textContent = z.live ? 'Live' : SNAPSHOT_LABEL;
  src.className = 'lv ' + (z.live ? 'lv-live' : 'lv-snap');
  set('st-when', z.live ? `Fetched ${fmtUTC(z.at)} from the worker.` : 'The live endpoint did not answer in time, so this is the recorded snapshot from Nov 25, 2026, 12:40 UTC.');
  const pulse = document.querySelector('#zh-pulse a');
  if (pulse) pulse.innerHTML = `<span class="lv ${z.live ? 'lv-live' : 'lv-snap'}">${z.live ? 'Live' : SNAPSHOT_LABEL}</span> worker ${z.healthy ? 'healthy' : 'not healthy'} · mode ${z.mode} · latest block seen ${num(z.head)}`;
  set('st-healthy', z.healthy ? 'yes' : 'no');
  set('st-mode', z.mode || 'unknown');
  set('st-head', num(z.head));
  set('st-orders', z.fulfilled == null ? 'unknown' : String(z.fulfilled));
  set('st-tick', fmtUTC(z.lastTickAt));
  set('since-n', num(z.head - FIRST_ORDER_BLOCK));
  set('since-head', num(z.head));
  const ss = $('#since-src'); ss.textContent = z.live ? 'Live' : SNAPSHOT_LABEL; ss.className = 'lv ' + (z.live ? 'lv-live' : 'lv-snap');
  if (z.live && z.services) {
    let any = false;
    for (const s of z.services) {
      const n = document.querySelector(`[data-price="${s.id}"]`);
      if (n && s.priceWei) { n.textContent = (Number(s.priceWei) / 1e18).toString() + ' ETH'; any = true; }
    }
    if (any) { const m = $('#menu-src'); m.textContent = 'Live price'; m.className = 'lv lv-live'; }
  }
});
