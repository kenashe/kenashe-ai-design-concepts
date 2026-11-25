// Concept 05 · The Digital Universe — hand-written Canvas 2D projection, no library.
// Every position comes from the JSON island written by _tools/build.py (real dates, real topics).
import { zeroHuman, latestPipelineCommit, SNAPSHOT_LABEL, fmtUTC, fmtDay, num } from './live.js';

const DATA = JSON.parse(document.getElementById('universe-data').textContent);
const $ = (s, r = document) => r.querySelector(s);
const root = document.documentElement;
const stage = $('#stage');
const canvas = $('#sky');
const layer = $('#bodies');
const card = $('#card');
const cardIn = $('#card-in');
const btnMotion = $('#btn-motion');
const btnList = $('#btn-list');

const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
const lowPower = (navigator.hardwareConcurrency || 4) <= 2 || (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
  (navigator.connection && navigator.connection.saveData);
let reduce = mqReduce.matches;         // no drift, no easing, no accretion
let paused = reduce || lowPower;       // low-power devices start still; they may opt in

const ctx = canvas.getContext && canvas.getContext('2d');
const BODIES = DATA.bodies;
const byId = new Map(BODIES.map(b => [b.id, b]));
const KIND = { build: 'Build', film: 'Short film', video: 'Video', short: 'Short', essay: 'Essay', digest: 'Automated' };
const CL = new Map(DATA.clusters.map(c => [c.id, c]));
const S_ROOT = '../../';

// ------------------------------------------------------------------ links
const links = DATA.links.map(l => ({ ...l, A: byId.get(l.a), B: byId.get(l.b) }));
const neighbours = new Map(BODIES.map(b => [b.id, []]));
links.forEach(l => { neighbours.get(l.a).push({ other: l.B, why: l.why }); neighbours.get(l.b).push({ other: l.A, why: l.why }); });

// ------------------------------------------------------------------ live data (fetched once)
let ZH = null, COMMIT = null;

// ------------------------------------------------------------------ fallbacks first
const listMode = (on, focus = true) => {
  root.classList.toggle('list-mode', on);
  btnList.setAttribute('aria-pressed', String(on));
  $('.lbl', btnList).textContent = on ? 'Map view' : 'List view';
  $('.ico', btnList).textContent = on ? '◎' : '☰';
  if (on && focus) $('#index').focus({ preventScroll: false });
  if (!on) { resize(); requestRender(); }
};
btnList.addEventListener('click', () => listMode(!root.classList.contains('list-mode')));

wirePlayers(document);
startLive();

if (!ctx) {
  root.classList.add('no-canvas');
  btnList.hidden = true;
  throw new Error('Canvas unavailable: list view only');
}
root.classList.add('has-map');
document.querySelectorAll('.locate').forEach(b => {
  b.hidden = false;
  b.addEventListener('click', () => { listMode(false, false); stage.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' }); focusBody(b.dataset.locate, true); });
});

// ------------------------------------------------------------------ nebula (1 particle = 1 automated post)
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const NB = DATA.nebula;
const R = rng(1399);
const particles = new Float32Array(NB.count * 3);
for (let i = 0; i < NB.count; i++) {
  const f = i / (NB.count - 1);
  const u = NB.uStart + (NB.uEnd - NB.uStart) * f + (R() - 0.5) * 0.06;
  const rad = Math.sqrt(-2 * Math.log(R() + 1e-9)) * 0.34;          // gaussian core
  const a = R() * Math.PI * 2;
  particles[i * 3] = u; particles[i * 3 + 1] = Math.cos(a) * rad; particles[i * 3 + 2] = Math.sin(a) * rad;
}
const LATEST_FROM = NB.count - NB.latest;

// ------------------------------------------------------------------ camera
const cam = { spin: 0.55, tilt: -0.5, pitch: 0.2, zoom: 1, tu: 0, dist: 18, ox: 0, oy: 0 };
const goal = { ...cam };
let W = 0, H = 0, DPR = 1, portrait = false, focal = 600, cx = 0, cy = 0, fitTu = 0;
let accretion = (reduce || lowPower) ? 1 : 0, accStart = 0;

function defaults() {
  portrait = W < H * 0.9;
  return { spin: portrait ? 0.35 : 0.5, tilt: portrait ? -0.5 : -0.78, pitch: portrait ? 0.1 : 0.42, zoom: 1, tu: fitTu, dist: 14, ox: 0, oy: 0 };
}

const P = { x: 0, y: 0, z: 0, k: 0 };
function project(u, v, w, c = cam, out = P) {
  const cs = Math.cos(c.spin), sn = Math.sin(c.spin);
  const v2 = v * cs - w * sn, w2 = v * sn + w * cs;
  const a = u - c.tu;
  const ct = Math.cos(c.tilt), st = Math.sin(c.tilt);
  const along = a * ct - w2 * st;
  const depth = a * st + w2 * ct;
  let X, Y;
  if (portrait) { X = v2; Y = -along; } else { X = along; Y = -v2; }
  const cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
  const Y2 = Y * cp - depth * sp, Z2 = Y * sp + depth * cp;
  const z = Z2 + c.dist;
  const k = (focal * c.zoom) / z;
  out.x = cx + (c.ox || 0) + X * k; out.y = cy + (c.oy || 0) + Y2 * k; out.z = z; out.k = k;
  return out;
}
const bpos = b => [b.u, b.r * Math.cos(b.a), b.r * Math.sin(b.a)];

function fit() {
  // Fit the whole map (main axis + outer lanes) into the stage at the default view.
  const d = defaults();
  const pts = [];
  for (const b of BODIES) pts.push(bpos(b));
  for (const t of [DATA.axis.min, DATA.axis.max]) for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; pts.push([t, Math.cos(a) * 3.5, Math.sin(a) * 3.5]); }
  const saved = { focal, cx, cy };
  let best = null;
  // centre on the dense, recent end on phones; whole axis on desktop
  d.tu = portrait ? 2.2 : 0.6;
  focal = 1; cx = 0; cy = 0;
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  for (const p of pts) { project(p[0], p[1], p[2], d); minX = Math.min(minX, P.x); maxX = Math.max(maxX, P.x); minY = Math.min(minY, P.y); maxY = Math.max(maxY, P.y); }
  // wide screens keep the left third for the title block; elsewhere the title sits above the stage
  const left = (!portrait && W >= 1100) ? Math.min(W * 0.36, 560) : (portrait ? 14 : 50);
  const right = portrait ? 14 : 60;
  const padTop = portrait ? 64 : 96, padBot = portrait ? 150 : 120;
  const f = Math.min((W - left - right) / (maxX - minX), (H - padTop - padBot) / (maxY - minY));
  focal = f;
  cx = left + (W - left - right) / 2 - ((minX + maxX) / 2) * f;
  cy = padTop + (H - padTop - padBot) / 2 - ((minY + maxY) / 2) * f;
  fitTu = d.tu;
  best = d;
  void saved;
  return best;
}

function resize() {
  const r = stage.getBoundingClientRect();
  if (!r.width) return;
  W = r.width; H = r.height;
  DPR = Math.min(window.devicePixelRatio || 1, lowPower ? 1 : (W < 600 ? 1.75 : 2));
  canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  const wasPortrait = portrait;
  const d = fit();
  if (!started || wasPortrait !== portrait) { Object.assign(cam, d); Object.assign(goal, d); }
  requestRender();
}

// ------------------------------------------------------------------ DOM bodies (real buttons)
const els = new Map();
BODIES.forEach((b, i) => {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'body k-' + b.kind + (b.status === 'LIVE' ? ' is-live' : '');
  el.dataset.id = b.id;
  const bits = [b.title, KIND[b.kind]];
  if (b.status && b.kind !== 'digest') bits.push(b.status);
  if (b.kind === 'digest') bits.push('machine-published');
  bits.push(b.dateLabel, CL.get(b.cluster).label);
  const n = neighbours.get(b.id).length;
  if (n) bits.push(n + (n === 1 ? ' connection' : ' connections'));
  el.setAttribute('aria-label', bits.join(', '));
  el.innerHTML = '<span class="ring" aria-hidden="true"></span>';
  layer.appendChild(el);
  els.set(b.id, el);
  el.addEventListener('focus', () => { setFocus(b.id); flyTo(b); });
  el.addEventListener('blur', () => setTimeout(() => { if (focusedId === b.id && !layer.contains(document.activeElement) && !card.contains(document.activeElement)) { focusedId = null; requestRender(); } }, 0));
  el.addEventListener('mouseenter', () => { hoverId = b.id; requestRender(); });
  el.addEventListener('mouseleave', () => { if (hoverId === b.id) hoverId = null; requestRender(); });
  el.addEventListener('click', () => { openCard(b); });
  el.addEventListener('keydown', ev => onBodyKey(ev, b, i));
});

let focusedId = null, hoverId = null, openId = null;
function setFocus(id) { focusedId = id; requestRender(); }

function onBodyKey(ev, b, i) {
  let next = null;
  const k = ev.key;
  if (k === 'ArrowLeft' || (portrait && k === 'ArrowDown' && false)) next = BODIES[Math.min(i + 1, BODIES.length - 1)];
  else if (k === 'ArrowRight') next = BODIES[Math.max(i - 1, 0)];
  else if (k === 'ArrowUp' || k === 'ArrowDown') {
    // nearest body in the neighbouring topic sector, close in time
    const ids = DATA.clusters.map(c => c.id);
    const ci = ids.indexOf(b.cluster);
    const target = ids[(ci + (k === 'ArrowUp' ? 1 : ids.length - 1)) % ids.length];
    let best = null, bd = 1e9;
    for (const o of BODIES) if (o.cluster === target && o !== b) { const d = Math.abs(o.u - b.u); if (d < bd) { bd = d; best = o; } }
    next = best;
  } else if (k === 'Home') next = BODIES[0];
  else if (k === 'End') next = BODIES[BODIES.length - 1];
  else if (k === 'Escape' && openId) { closeCard(); ev.preventDefault(); return; }
  if (next) { ev.preventDefault(); els.get(next.id).focus({ preventScroll: true }); if (openId) openCard(next, false); }
}

function focusBody(id, open) {
  const b = byId.get(id); if (!b) return;
  els.get(id).focus({ preventScroll: true });
  if (open) openCard(b);
}

function flyTo(b) {
  const [u] = bpos(b);
  // face the body toward the viewer, choose the shortest spin
  let s = -Math.PI / 2 - b.a;
  while (s - cam.spin > Math.PI) s -= Math.PI * 2;
  while (s - cam.spin < -Math.PI) s += Math.PI * 2;
  goal.spin = b.kind === 'digest' ? cam.spin : s;
  goal.tu = u + b.r * Math.tan(goal.tilt) * (portrait ? 1 : 1);
  goal.zoom = Math.max(cam.zoom, portrait ? 1.7 : 1.55);
  setOffset(b);
  if (reduce) Object.assign(cam, goal);
  requestRender();
}
// keep the focused body clear of the open card: card sits right on desktop, bottom on phones
let offsetBody = null;
function setOffset(b = offsetBody) {
  offsetBody = b;
  if (!b) { goal.ox = 0; goal.oy = 0; return; }
  const open = !!openId;
  const want = {
    x: open && !portrait ? (W - Math.min(420, W * 0.36) - 20) / 2 : W / 2,
    y: open && portrait ? H * 0.24 : H * 0.48,
  };
  const p = bpos(b);
  const q = project(p[0], p[1], p[2], { ...goal, ox: 0, oy: 0 }, {});
  goal.ox = want.x - q.x; goal.oy = want.y - q.y;
}

// ------------------------------------------------------------------ card
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function glyph(kind, live) {
  const g = {
    build: '<circle cx="8" cy="8" r="4.2" fill="currentColor"/>',
    film: '<circle cx="8" cy="8" r="3.4" fill="currentColor"/><circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor"/>',
    video: '<circle cx="8" cy="8" r="4.6" fill="none" stroke="currentColor" stroke-width="1.4"/>',
    short: '<circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.4"/>',
    essay: '<rect x="4.2" y="4.2" width="7.6" height="7.6" fill="none" stroke="currentColor" stroke-width="1.4" transform="rotate(45 8 8)"/>',
    digest: '<g fill="currentColor"><circle cx="4" cy="5" r="1"/><circle cx="8" cy="3.5" r="1"/><circle cx="11.5" cy="6" r="1"/><circle cx="5.5" cy="9.5" r="1"/><circle cx="10" cy="10" r="1"/><circle cx="7" cy="12.5" r="1"/></g>',
  }[kind];
  return `<svg class="glyph" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">${g}${live ? '<circle cx="8" cy="8" r="7" fill="none" stroke="var(--live)" stroke-width="1.3"/>' : ''}</svg>`;
}

function cardHTML(b) {
  const i = BODIES.indexOf(b);
  const older = BODIES[i + 1], newer = BODIES[i - 1];
  const live = b.status === 'LIVE';
  let h = `<div class="card-top"><p class="card-kind">${glyph(b.kind, live)}<span>${KIND[b.kind]}</span>${b.status && b.kind !== 'digest' ? `<span class="status s-${b.status.toLowerCase()}">${b.status}</span>` : ''}${b.kind === 'digest' ? '<span class="auto-tag">Automated</span>' : ''}</p>
  <button type="button" class="card-x" data-close aria-label="Close card">×</button></div>
  <h2 id="card-title" tabindex="-1">${esc(b.title)}</h2>
  <p class="card-meta">${esc(b.dateLabel)}${b.duration ? ' · ' + esc(b.duration) : ''} · ${esc(CL.get(b.cluster).label)}</p>`;
  if (b.img && b.kind !== 'build' || (b.img && b.kind === 'build')) {
    const alt = b.imgAlt || (b.kind === 'video' || b.kind === 'short' ? 'Thumbnail: ' + b.title : (b.kind === 'film' ? 'A still from Returning Your Things' : 'Image from ' + b.title));
    if (b.yt) {
      h += `<div class="card-media player"><img src="${S_ROOT}${esc(b.img)}" alt="${esc(alt)}" width="640" height="360"><button type="button" class="play" data-yt="${esc(b.yt)}" data-title="${esc(b.title)}" aria-label="Play ${esc(b.title)} here. Loads YouTube."><span aria-hidden="true">▶</span> Play here</button></div>`;
    } else {
      h += `<div class="card-media"><img src="${S_ROOT}${esc(b.img)}" alt="${esc(alt)}" width="640" height="360"></div>`;
    }
  }
  if (b.authorship) h += `<p class="authorship">${esc(b.authorship)}</p>`;
  if (b.dek) h += `<p class="card-dek">${esc(b.dek)}</p>`;
  if (b.note) h += `<p class="card-note">${esc(b.note)}</p>`;
  if (b.stack) h += `<ul class="chips" aria-label="Stack">${b.stack.map(s => `<li>${esc(s)}</li>`).join('')}</ul>`;
  const extra = [b.metric, ...(b.footer || [])].filter(Boolean);
  if (extra.length) h += `<p class="metric">${extra.map(esc).join(' · ')}</p>`;
  if (b.liveKey === 'zerohuman') h += `<div class="card-live" data-card-live="zerohuman">${zhLine()}</div>`;
  if (b.kind === 'digest') {
    h += `<p class="card-dek">One dim particle per published post: ${num(NB.count)} as of ${fmtDay(NB.asOf + 'T12:00:00Z')}. Positions along time are spread evenly from May 2026, since per-post dates are not in this snapshot.</p><div class="card-live" data-card-live="github">${commitLine()}</div>`;
  }
  // actions
  h += '<p class="card-actions">';
  if (b.local) h += `<a class="btn" href="${esc(b.local)}">Explore the system →</a>`;
  if (b.kind === 'digest') h += `<a class="btn" href="#digest" data-close-nav>Latest automated posts</a>`;
  if (b.url) h += `<a class="btn${b.local ? ' btn-ghost' : ''}" href="${esc(b.url)}" rel="noopener">${b.kind === 'video' || b.kind === 'short' ? 'Watch on YouTube' : b.kind === 'digest' ? 'Open the Digest' : 'Read on kenashe.ai'} ↗</a>`;
  if (!b.url && !b.local) h += '<span class="muted">No public write-up yet.</span>';
  h += '</p>';
  const nb = neighbours.get(b.id);
  if (nb.length) {
    h += `<div class="card-links"><h3>Connected</h3><ul>${nb.map(n => `<li><button type="button" data-go="${n.other.id}">${glyph(n.other.kind, n.other.status === 'LIVE')}<span><strong>${esc(n.other.title)}</strong><em>${esc(n.why)}</em></span></button></li>`).join('')}</ul></div>`;
  }
  h += `<div class="card-nav">${older ? `<button type="button" data-go="${older.id}" aria-label="Older: ${esc(older.title)}">← Older</button>` : '<span></span>'}${newer ? `<button type="button" data-go="${newer.id}" aria-label="Newer: ${esc(newer.title)}">Newer →</button>` : '<span></span>'}</div>`;
  return h;
}

function openCard(b, moveFocus = true) {
  openId = b.id;
  cardIn.innerHTML = cardHTML(b);
  card.hidden = false;
  root.classList.add('card-open');
  wirePlayers(cardIn);
  els.forEach((el, id) => el.classList.toggle('is-open', id === b.id));
  if (moveFocus) $('#card-title').focus({ preventScroll: true });
  flyTo(b);
  requestRender();
}
function closeCard(returnFocus = true) {
  if (!openId) return;
  const id = openId;
  openId = null;
  card.hidden = true;
  root.classList.remove('card-open');
  cardIn.innerHTML = '';
  els.forEach(el => el.classList.remove('is-open'));
  if (returnFocus) els.get(id).focus({ preventScroll: true });
  setOffset(); if (reduce) Object.assign(cam, goal);
  requestRender();
}
card.addEventListener('click', ev => {
  const go = ev.target.closest('[data-go]');
  if (go) { const b = byId.get(go.dataset.go); els.get(b.id).focus({ preventScroll: true }); openCard(b); return; }
  if (ev.target.closest('[data-close]')) closeCard();
  if (ev.target.closest('[data-close-nav]')) closeCard(false);
});
card.addEventListener('keydown', ev => { if (ev.key === 'Escape') { ev.preventDefault(); closeCard(); } });

// ------------------------------------------------------------------ pointer: drag to orbit, pinch to zoom
let drag = null, moved = false, vel = 0, velT = 0;
const pointers = new Map();
stage.addEventListener('pointerdown', ev => {
  if (ev.target.closest('.card, .stage-ui button, .stage-ui a')) return;
  pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (pointers.size === 1) { drag = { x: ev.clientX, y: ev.clientY, spin: goal.spin, tilt: goal.tilt, pitch: goal.pitch }; moved = false; }
  else if (pointers.size === 2) { const [a, b] = [...pointers.values()]; drag = { pinch: Math.hypot(a.x - b.x, a.y - b.y), zoom: goal.zoom }; }
});
window.addEventListener('pointermove', ev => {
  if (!pointers.has(ev.pointerId) || !drag) return;
  const prev = pointers.get(ev.pointerId);
  pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (drag.pinch) {
    const [a, b] = [...pointers.values()];
    goal.zoom = clamp(drag.zoom * Math.hypot(a.x - b.x, a.y - b.y) / drag.pinch, 0.6, 4);
    if (reduce) cam.zoom = goal.zoom;
    requestRender(); return;
  }
  const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
  if (!moved && Math.hypot(dx, dy) > 6) { moved = true; stage.classList.add('dragging'); }
  if (!moved) return;
  if (portrait) { goal.spin = drag.spin + dx * 0.008; goal.pitch = clamp(drag.pitch - dy * 0.004, -0.6, 0.9); }
  else { goal.spin = drag.spin + dy * 0.008; goal.tilt = clamp(drag.tilt + dx * 0.004, -1.25, 0.4); }
  vel = ((portrait ? ev.clientX - prev.x : ev.clientY - prev.y) * 0.008); velT = performance.now();
  Object.assign(cam, { spin: goal.spin, tilt: goal.tilt, pitch: goal.pitch });
  requestRender();
});
const endPtr = ev => {
  pointers.delete(ev.pointerId);
  if (pointers.size === 0) {
    if (moved && !reduce && performance.now() - velT < 80) inertia = clamp(vel, -0.06, 0.06);
    drag = null; setTimeout(() => stage.classList.remove('dragging'), 0);
  }
};
window.addEventListener('pointerup', endPtr);
window.addEventListener('pointercancel', endPtr);
// a drag that started on a body must not open it
stage.addEventListener('click', ev => { if (moved && ev.target.closest('.body')) { ev.stopPropagation(); ev.preventDefault(); moved = false; } }, true);
let inertia = 0;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
$('#z-in').addEventListener('click', () => { goal.zoom = clamp(goal.zoom * 1.3, 0.6, 4); if (reduce) cam.zoom = goal.zoom; requestRender(); });
$('#z-out').addEventListener('click', () => { goal.zoom = clamp(goal.zoom / 1.3, 0.6, 4); if (reduce) cam.zoom = goal.zoom; requestRender(); });
$('#z-reset').addEventListener('click', () => { closeCard(false); offsetBody = null; Object.assign(goal, defaults(), { tu: fitTu }); if (reduce) Object.assign(cam, goal); focusedId = null; requestRender(); });
stage.addEventListener('wheel', ev => {
  if (!(ev.ctrlKey || ev.metaKey)) return;     // never hijack page scroll; pinch-zoom on trackpads sends ctrlKey
  ev.preventDefault();
  goal.zoom = clamp(goal.zoom * Math.exp(-ev.deltaY * 0.004), 0.6, 4); if (reduce) cam.zoom = goal.zoom; requestRender();
}, { passive: false });

// ------------------------------------------------------------------ motion control
function setPaused(p) {
  paused = p;
  btnMotion.setAttribute('aria-pressed', String(p));
  $('.lbl', btnMotion).textContent = p ? 'Play motion' : 'Pause motion';
  $('.ico', btnMotion).textContent = p ? '▶' : '❚❚';
  root.classList.toggle('motion-paused', p);
  requestRender();
}
btnMotion.addEventListener('click', () => setPaused(!paused));
function applyReduce() {
  reduce = mqReduce.matches;
  btnMotion.hidden = reduce;
  if (reduce) { accretion = 1; inertia = 0; Object.assign(cam, goal); }
  setPaused(reduce || lowPower);
}
mqReduce.addEventListener ? mqReduce.addEventListener('change', applyReduce) : mqReduce.addListener(applyReduce);

// ------------------------------------------------------------------ render loop (only while visible)
let raf = 0, visible = true, started = false, last = 0, wasEngaged = false;
function requestRender() { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); }
document.addEventListener('visibilitychange', () => { if (!document.hidden) requestRender(); });
new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) requestRender(); }, { threshold: 0.01 }).observe(stage);
window.addEventListener('resize', () => { clearTimeout(resize.t); resize.t = setTimeout(resize, 80); });

function frame(t) {
  raf = 0;
  const dt = Math.min(0.05, last ? (t - last) / 1000 : 0.016); last = t;
  let active = false;
  if (!reduce) {
    // drift (paused by the control, by interaction, and by an open card)
    if (!paused && !drag && !openId && !focusedIdActive()) { goal.spin += dt * 0.035; cam.spin += dt * 0.035; active = true; }
    if (inertia) { goal.spin += inertia; cam.spin += inertia; inertia *= 0.92; if (Math.abs(inertia) < 0.0005) inertia = 0; active = true; }
    for (const k of ['spin', 'tilt', 'pitch', 'zoom', 'tu', 'ox', 'oy']) {
      const d = goal[k] - cam[k];
      if (Math.abs(d) > 1e-4) { cam[k] += d * Math.min(1, dt * 5); active = true; } else cam[k] = goal[k];
    }
    if (accretion < 1) { if (!accStart) accStart = t; accretion = Math.min(1, (t - accStart) / 2600); active = true; }
    if (!paused) active = true; // LIVE pulse
  }
  draw(t);
  const d0 = defaults(); const engaged = !!(openId || Math.abs(cam.zoom - 1) > 0.04 || Math.abs(cam.ox) > 2 || Math.abs(cam.oy) > 2 || Math.abs(cam.tu - fitTu) > 0.05 || Math.abs(cam.tilt - d0.tilt) > 0.03 || Math.abs(cam.pitch - d0.pitch) > 0.03);
  if (engaged !== wasEngaged) { root.classList.toggle('map-engaged', engaged); wasEngaged = engaged; }
  if (active && !(paused && !drag && accretion >= 1 && settled())) requestRender();
}
const settled = () => ['spin', 'tilt', 'pitch', 'zoom', 'tu', 'ox', 'oy'].every(k => Math.abs(goal[k] - cam[k]) < 1e-4) && !inertia;
const focusedIdActive = () => focusedId && layer.contains(document.activeElement);

// ------------------------------------------------------------------ drawing
const INK = '17,19,22', LIVE = '178,50,21', NEB = '74,92,112';
const proj = BODIES.map(() => ({ x: 0, y: 0, z: 0, k: 0 }));
const order = BODIES.map((_, i) => i);
let fontsReady = false;
document.fonts && document.fonts.ready.then(() => { fontsReady = true; requestRender(); });

function draw(t) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const k0 = focal / 14;     // reference scale
  const fade = z => clamp(1.2 - (z - cam.dist) / 8, 0.2, 1);

  const placed = [];
  const hit = (box) => { for (const p of placed) if (box[0] < p[2] && box[2] > p[0] && box[1] < p[3] && box[3] > p[1]) return true; return false; };
  // --- month rings (the time axis is a tube) ---
  ctx.lineWidth = 1;
  const ticks = DATA.axis.ticks;
  ctx.font = '500 10px "Geist Mono", ui-monospace, monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let ti = ticks.length - 1; ti >= 0; ti--) {
    const tk = ticks[ti];
    const R0 = 3.55;
    ctx.beginPath();
    for (let i = 0; i <= 64; i++) {
      const a = i / 64 * Math.PI * 2; project(tk.u, Math.cos(a) * R0, Math.sin(a) * R0);
      i ? ctx.lineTo(P.x, P.y) : ctx.moveTo(P.x, P.y);
    }
    ctx.strokeStyle = `rgba(${INK},${0.07 + (tk.year ? 0.06 : 0)})`; ctx.stroke();
    if (tk.label) {
      // label where the ring is highest on screen
      let best = null;
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; project(tk.u, Math.cos(a) * (R0 + 0.35), Math.sin(a) * (R0 + 0.35)); if (!best || (portrait ? P.x > best.x : P.y < best.y)) best = { x: P.x, y: P.y, z: P.z }; }
      const txt = (tk.label + (tk.year ? ' ' + tk.year : '')).toUpperCase();
      const tw = ctx.measureText(txt).width;
      const box = [best.x - tw / 2 - 4, best.y - 7, best.x + tw / 2 + 4, best.y + 7];
      if (!hit(box)) {
        placed.push(box);
        ctx.fillStyle = `rgba(${INK},${0.62 * fade(best.z) + 0.2})`;
        ctx.fillText(txt, best.x, best.y);
      }
    }
  }
  // axis line + break to 2016
  ctx.beginPath(); project(DATA.axis.min, 0, 0); ctx.moveTo(P.x, P.y); project(DATA.axis.max + 0.3, 0, 0); ctx.lineTo(P.x, P.y);
  ctx.strokeStyle = `rgba(${INK},.5)`; ctx.stroke();
  ctx.setLineDash([2, 4]); ctx.beginPath(); project(DATA.axis.break, 0, 0); ctx.moveTo(P.x, P.y); const bx = P.x, by = P.y; project(DATA.axis.min, 0, 0); ctx.lineTo(P.x, P.y); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = `rgba(${INK},.7)`; ctx.fillText('2016 ⋯', bx + (portrait ? 0 : -24), by + (portrait ? 14 : 0));
  // "now" marker
  project(DATA.axis.max + 0.3, 0, 0);
  ctx.fillStyle = `rgba(${INK},.8)`; ctx.textAlign = portrait ? 'center' : 'left';
  ctx.fillText('NOW →', P.x + (portrait ? 0 : 8), P.y + (portrait ? -12 : 0));
  ctx.textAlign = 'center';

  // --- cluster lanes ---
  for (const c of DATA.clusters) {
    const R1 = 3.55, v = Math.cos(c.angle) * R1, w = Math.sin(c.angle) * R1;
    ctx.beginPath(); project(DATA.axis.min, v, w); ctx.moveTo(P.x, P.y); project(DATA.axis.max, v, w); ctx.lineTo(P.x, P.y);
    const z = P.z;
    ctx.strokeStyle = `rgba(${INK},${0.16 * fade(z)})`; ctx.stroke();
    project(DATA.axis.max + 0.15, Math.cos(c.angle) * (R1 + 0.25), Math.sin(c.angle) * (R1 + 0.25));
    ctx.font = '600 10.5px "Geist Mono", ui-monospace, monospace';
    const txt = c.label.toUpperCase(), tw = ctx.measureText(txt).width;
    const lx = portrait ? P.x - tw / 2 : P.x + 6, ly = P.y + (portrait ? -10 : 0);
    const box = [lx - 3, ly - 8, lx + tw + 3, ly + 8];
    if (lx < 4 || lx + tw > W - 4 || hit(box)) continue;
    placed.push(box);
    ctx.fillStyle = `rgba(${INK},${0.35 + 0.5 * fade(P.z)})`;
    ctx.textAlign = 'left';
    ctx.fillText(txt, lx, ly);
  }
  ctx.textAlign = 'center';

  // --- the Digest nebula: dim, dense, machine-made ---
  const shown = Math.floor(NB.count * easeOut(accretion));
  for (let i = 0; i < shown; i++) {
    project(particles[i * 3], particles[i * 3 + 1], particles[i * 3 + 2]);
    if (P.x < -4 || P.x > W + 4 || P.y < -4 || P.y > H + 4) continue;
    const latest = i >= LATEST_FROM;
    const s = latest ? 2.4 : clamp(P.k / k0 * 1.3, 1, 2.2);
    ctx.fillStyle = latest ? `rgba(${NEB},.95)` : `rgba(${NEB},${0.34 * fade(P.z) + 0.14})`;
    ctx.fillRect(P.x - s / 2, P.y - s / 2, s, s);
  }

  // --- project bodies ---
  for (let i = 0; i < BODIES.length; i++) { const p = bpos(BODIES[i]); project(p[0], p[1], p[2], cam, proj[i]); }
  order.sort((a, b) => proj[b].z - proj[a].z);
  const sel = openId || focusedId || hoverId;
  const selNb = sel ? new Set(neighbours.get(sel).map(n => n.other.id)) : null;

  // stems to the axis
  for (const i of order) {
    const b = BODIES[i]; if (b.kind === 'digest') continue;
    const q = proj[i]; project(b.u, 0, 0);
    ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(P.x, P.y);
    ctx.strokeStyle = `rgba(${INK},${(sel === b.id ? 0.45 : 0.08) * fade(q.z)})`; ctx.stroke();
  }

  // --- real connections ---
  for (const l of links) {
    const ia = BODIES.indexOf(l.A), ib = BODIES.indexOf(l.B);
    const pa = proj[ia], pb = proj[ib];
    const hot = sel && (l.a === sel || l.b === sel);
    const A = bpos(l.A), B = bpos(l.B);
    const m = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2 * 1.45, (A[2] + B[2]) / 2 * 1.45];
    project(m[0], m[1], m[2]);
    ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.quadraticCurveTo(P.x, P.y, pb.x, pb.y);
    ctx.lineWidth = hot ? 1.4 : 0.9;
    ctx.setLineDash(hot ? [] : [1, 3]);
    ctx.strokeStyle = hot ? `rgba(${LIVE},.85)` : `rgba(${INK},${0.38 * Math.min(fade(pa.z), fade(pb.z)) + 0.05})`;
    ctx.stroke();
  }
  ctx.setLineDash([]); ctx.lineWidth = 1;

  // --- bodies + labels ---
  const labelQueue = [];
  for (const i of order) {
    const b = BODIES[i], q = proj[i];
    const sc = clamp(q.k / k0, 0.55, 2.6);
    const a = fade(q.z);
    const isSel = sel === b.id, isNb = selNb && selNb.has(b.id);
    const dim = sel && !isSel && !isNb ? 0.45 : 1;
    ctx.globalAlpha = Math.min(1, a * dim + (isSel ? 1 : 0));
    drawGlyph(b, q.x, q.y, sc, t, isSel);
    ctx.globalAlpha = 1;
    // position the DOM hit target
    const el = els.get(b.id);
    el.style.transform = `translate(${q.x}px,${q.y}px)`;
    el.style.zIndex = String(1000 - Math.round(q.z * 10));
    let pr = { film: 6, build: b.status === 'LIVE' ? 5 : 4, essay: 3, video: 2, short: 1, digest: 5 }[b.kind] + sc;
    if (isSel) pr = 100; else if (isNb) pr += 20;
    labelQueue.push({ b, q, sc, pr, a, isSel, isNb, dim });
  }
  labelQueue.sort((x, y) => y.pr - x.pr);
  const limit = portrait ? (W < 600 ? (sel ? 7 : 8) : (sel ? 14 : 16)) : (sel ? 24 : 30);
  let count = 0;
  for (const L of labelQueue) {
    if (count >= limit && !L.isSel && !L.isNb) continue;
    if (L.q.x < 0 || L.q.x > W || L.q.y < 0 || L.q.y > H) continue;
    if (drawLabel(L, placed)) count++;
  }
}
const easeOut = x => 1 - Math.pow(1 - x, 3);

function drawGlyph(b, x, y, sc, t, isSel) {
  const r = 4.6 * sc;
  ctx.lineWidth = Math.max(1, 1.2 * sc * 0.8);
  // restrained luminosity: a paper-white halo lifts each handmade body off the plate
  if (b.kind !== 'digest') {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
    g.addColorStop(0, 'rgba(250,248,242,.95)'); g.addColorStop(1, 'rgba(250,248,242,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = `rgb(${INK})`; ctx.fillStyle = `rgb(${INK})`;
  switch (b.kind) {
    case 'build': ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); break;
    case 'film':
      ctx.beginPath(); ctx.arc(x, y, r * 1.05, 0, Math.PI * 2); ctx.fill();
      for (let j = 1; j <= 3; j++) { ctx.globalAlpha *= 0.75; ctx.beginPath(); ctx.arc(x, y, r * (1.05 + j * 0.75), 0, Math.PI * 2); ctx.lineWidth = 0.8; ctx.stroke(); }
      break;
    case 'video': ctx.beginPath(); ctx.arc(x, y, r * 1.05, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill(); break;
    case 'short': ctx.beginPath(); ctx.arc(x, y, r * 0.66, 0, Math.PI * 2); ctx.stroke(); break;
    case 'essay': ctx.beginPath(); const d = r * 1.15; ctx.moveTo(x, y - d); ctx.lineTo(x + d, y); ctx.lineTo(x, y + d); ctx.lineTo(x - d, y); ctx.closePath(); ctx.stroke(); break;
    case 'digest':
      ctx.strokeStyle = `rgba(${NEB},.9)`; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.arc(x, y, 14 * Math.min(sc, 1.6), 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      break;
  }
  if (b.status === 'LIVE') {
    // the pulse only exists because the thing is actually running
    const ph = paused || reduce ? 0.5 : ((t / 2400 + (b.u * 0.37)) % 1);
    ctx.strokeStyle = `rgba(${LIVE},${0.95 - (paused || reduce ? 0.1 : ph * 0.75)})`;
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(x, y, r * (1.65 + (paused || reduce ? 0.25 : ph * 1.1)), 0, Math.PI * 2); ctx.stroke();
  }
  if (isSel) {
    ctx.strokeStyle = `rgba(${LIVE},1)`; ctx.lineWidth = 1.2;
    const s = r * 3; ctx.beginPath();
    // crosshair brackets
    for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      ctx.moveTo(x + dx * s, y + dy * s * 0.55); ctx.lineTo(x + dx * s, y + dy * s); ctx.lineTo(x + dx * s * 0.55, y + dy * s);
    }
    ctx.stroke();
  }
}

function trunc(s, n) { return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; }
function drawLabel(L, placed) {
  const { b, q, sc, isSel, isNb } = L;
  if (!fontsReady && !isSel) { /* draw anyway with fallback fonts */ }
  let font, size, text = b.title, meta = null;
  const big = isSel ? 1.25 : 1;
  switch (b.kind) {
    case 'film': size = 19; font = 'italic 400 SIZEpx Newsreader, Georgia, serif'; meta = 'SHORT FILM · ' + b.duration; break;
    case 'build': size = 13.5; font = '600 SIZEpx Syne, system-ui, sans-serif'; meta = (b.status === 'LIVE' ? 'LIVE · ' : '') + b.dateLabel.toUpperCase(); break;
    case 'essay': size = 14; font = 'italic 400 SIZEpx Newsreader, Georgia, serif'; text = trunc(text, isSel ? 70 : 42); break;
    case 'digest': size = 12; font = '600 SIZEpx "Geist Mono", ui-monospace, monospace'; text = 'THE DIGEST · AUTOMATED'; meta = num(NB.count) + ' MACHINE-PUBLISHED POSTS'; break;
    default: size = 10.5; font = '500 SIZEpx "Geist Mono", ui-monospace, monospace'; text = trunc(text.toUpperCase(), isSel ? 60 : 34);
  }
  const s = clamp(size * (0.75 + sc * 0.3) * big * (W < 600 ? 0.86 : 1), size * 0.78, size * (W < 600 ? 1.25 : 1.6));
  ctx.font = font.replace('SIZE', s.toFixed(1));
  const tw = ctx.measureText(text).width;
  const ms = 9.5;
  const mw = meta ? (ctx.save(), ctx.font = `500 ${ms}px "Geist Mono", ui-monospace, monospace`, ctx.measureText(meta).width + (ctx.restore(), 0)) : 0;
  const w = Math.max(tw, mw), hgt = s + (meta ? ms + 4 : 0);
  const off = 4.6 * sc * (b.kind === 'film' ? 4 : b.kind === 'digest' ? 3.4 : 2) + 6;
  // prefer right of the body; flip left near the edge
  let x = q.x + off, align = 'left';
  if (x + w > W - 8) { x = q.x - off; align = 'right'; }
  if (align === 'right' && x - w < 8) {
    if (!isSel) return false;
    x = Math.max(8, Math.min(W - 8 - w, q.x - w / 2)); align = 'left';
  }
  const x0 = align === 'left' ? x : x - w;
  const y0 = q.y - hgt / 2;
  const box = [x0 - 3, y0 - 2, x0 + w + 3, y0 + hgt + 2];
  if (!isSel) for (const p of placed) if (box[0] < p[2] && box[2] > p[0] && box[1] < p[3] && box[3] > p[1]) return false;
  placed.push(box);
  const alpha = isSel ? 1 : clamp(L.a * L.dim + (isNb ? 0.3 : 0), 0.35, 1);
  // paper knock-out behind text keeps it legible over lines and particles
  ctx.fillStyle = `rgba(235,232,223,${isSel ? 0.92 : 0.72})`;
  ctx.fillRect(box[0], box[1], box[2] - box[0], box[3] - box[1]);
  ctx.textAlign = align; ctx.textBaseline = 'top';
  ctx.fillStyle = b.kind === 'digest' ? `rgba(${NEB},${alpha})` : `rgba(${INK},${alpha})`;
  ctx.fillText(text, x, y0);
  if (meta) {
    ctx.font = `500 ${ms}px "Geist Mono", ui-monospace, monospace`;
    ctx.fillStyle = b.status === 'LIVE' && b.kind === 'build' ? `rgba(${LIVE},${alpha})` : `rgba(${INK},${alpha * 0.78})`;
    ctx.fillText(meta, x, y0 + s + 3);
  }
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  return true;
}

// ------------------------------------------------------------------ jump-to search (combobox)
const jin = $('#jump-input'), jlist = $('#jump-list');
let jItems = [], jActive = -1;
function renderJump() {
  const q = jin.value.trim().toLowerCase();
  jItems = q ? BODIES.filter(b => (b.title + ' ' + KIND[b.kind] + ' ' + (b.stack || []).join(' ') + ' ' + CL.get(b.cluster).label).toLowerCase().includes(q)).slice(0, 8) : [];
  jActive = jItems.length ? 0 : -1;
  jlist.innerHTML = jItems.map((b, i) => `<li role="option" id="jo-${i}" aria-selected="${i === jActive}" data-id="${b.id}">${glyph(b.kind, b.status === 'LIVE')}<span>${esc(b.title)}</span><em>${KIND[b.kind]} · ${esc(b.dateLabel)}</em></li>`).join('') || (q ? '<li class="none" role="option" aria-disabled="true" aria-selected="false">Nothing on the map matches.</li>' : '');
  const open = !!q;
  jlist.hidden = !open; jin.setAttribute('aria-expanded', String(open));
  jin.setAttribute('aria-activedescendant', jActive >= 0 ? 'jo-' + jActive : '');
}
function chooseJump(b) {
  jin.value = ''; renderJump();
  listMode(false, false);
  stage.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
  els.get(b.id).focus({ preventScroll: true }); openCard(b);
}
jin.addEventListener('input', renderJump);
jin.addEventListener('keydown', ev => {
  if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
    if (!jItems.length) return; ev.preventDefault();
    jActive = (jActive + (ev.key === 'ArrowDown' ? 1 : jItems.length - 1)) % jItems.length;
    [...jlist.children].forEach((li, i) => li.setAttribute('aria-selected', String(i === jActive)));
    jin.setAttribute('aria-activedescendant', 'jo-' + jActive);
  } else if (ev.key === 'Enter' && jActive >= 0) { ev.preventDefault(); chooseJump(jItems[jActive]); }
  else if (ev.key === 'Escape') { jin.value = ''; renderJump(); }
});
jlist.addEventListener('mousedown', ev => { const li = ev.target.closest('[data-id]'); if (li) { ev.preventDefault(); chooseJump(byId.get(li.dataset.id)); } });
jin.addEventListener('blur', () => setTimeout(() => { jlist.hidden = true; jin.setAttribute('aria-expanded', 'false'); }, 150));

// global shortcut: "/" focuses jump-to
document.addEventListener('keydown', ev => {
  if (ev.key === '/' && !/input|textarea/i.test(document.activeElement.tagName)) { ev.preventDefault(); jin.focus(); }
});

// ------------------------------------------------------------------ live data
function zhLine() {
  if (!ZH) return `<p class="live-line"><span class="lv lv-snap">${SNAPSHOT_LABEL}</span> checking zerohuman.eth…</p>`;
  return `<p class="live-line"><span class="lv ${ZH.live ? 'lv-live' : 'lv-snap'}">${ZH.live ? 'Live · checked ' + fmtUTC(ZH.at) : SNAPSHOT_LABEL}</span> Worker ${ZH.healthy ? 'healthy' : 'not healthy'} · mode ${esc(ZH.mode)} · latest block seen ${num(ZH.head)} · ${ZH.fulfilled} orders fulfilled</p>`;
}
function commitLine() {
  if (!COMMIT) return `<p class="live-line"><span class="lv lv-snap">${SNAPSHOT_LABEL}</span> checking the pipeline…</p>`;
  return `<p class="live-line"><span class="lv ${COMMIT.live ? 'lv-live' : 'lv-snap'}">${COMMIT.live ? 'Live' : SNAPSHOT_LABEL}</span> Latest pipeline commit ${fmtDay(COMMIT.date)}: “${esc(COMMIT.message)}”</p>`;
}
async function startLive() {
  const zhEl = document.getElementById('ro-zh'), dc = document.getElementById('digest-commit');
  zeroHuman(DATA.live).then(z => {
    ZH = z;
    if (zhEl) zhEl.innerHTML = `<span class="lv ${z.live ? 'lv-live' : 'lv-snap'}">${z.live ? 'Live' : SNAPSHOT_LABEL}</span> ${z.healthy ? 'healthy' : 'not healthy'} · block ${num(z.head)}`;
    document.querySelectorAll('[data-card-live="zerohuman"]').forEach(n => n.innerHTML = zhLine());
  });
  latestPipelineCommit(DATA.commit).then(c => {
    COMMIT = c;
    if (dc) dc.innerHTML = `<span class="lv ${c.live ? 'lv-live' : 'lv-snap'}">${c.live ? 'Live' : SNAPSHOT_LABEL}</span> Latest pipeline commit, ${fmtDay(c.date)}: “${esc(c.message)}”`;
    document.querySelectorAll('[data-card-live="github"]').forEach(n => n.innerHTML = commitLine());
  });
}

// ------------------------------------------------------------------ click-to-load YouTube
function wirePlayers(scope) {
  scope.querySelectorAll('.play[data-yt]').forEach(btn => {
    if (btn.dataset.wired) return; btn.dataset.wired = '1';
    btn.addEventListener('click', () => {
      const box = btn.parentElement;
      const f = document.createElement('iframe');
      f.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(btn.dataset.yt)}?autoplay=1&rel=0`;
      f.title = btn.dataset.title || 'YouTube video';
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.setAttribute('allowfullscreen', '');
      f.width = 1280; f.height = 720;
      box.classList.add('is-playing');
      box.replaceChildren(f);
      f.focus();
    });
  });
}

// ------------------------------------------------------------------ go
applyReduce();
resize();
started = true;
requestRender();
