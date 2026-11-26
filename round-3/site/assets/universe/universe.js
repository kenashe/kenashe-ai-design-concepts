// Round 3 · The Living Universe · interactive renderer.
// Tier 1 is the prerendered SVG poster (works with JS off). This module is tier 2 (Canvas 2D) and lazily
// adds tier 3 (gl.js, a raw WebGL light layer) on capable devices.
//
// Scale: only what partition() returns is projected, drawn, labelled or hit-tested, so a frame costs the
// same with 44 items or 3,000. The DOM holds one focusable element for the whole universe (arrow keys travel
// between items); there is no anchor per body. The complete text equivalent is the list view.
import { buildScene, partition, place, project, camera, placeLabels, shortTitle, bandBins, bodyRadius, periodLabel, yawFacing, R0, FOCAL, hash } from './scene.js';
import { fmtDate, typeLabel } from '../../../lib/graph.js';
import { viewCamera, BOX } from './poster.js';
import { itemCard, clusterCard, digestCard } from './cards.js';

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t | 0, a[1] + (b[1] - a[1]) * t | 0, a[2] + (b[2] - a[2]) * t | 0];
const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const HAZE = [58, 52, 46];       // what distant light fades toward (atmospheric perspective)
const CREAM = [255, 248, 236];
const SANS = '"Hanken Grotesk", system-ui, sans-serif';
const SERIF = '"Instrument Serif", Georgia, serif';

export function capabilities() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const conn = navigator.connection || {};
  const cores = navigator.hardwareConcurrency || 4; const mem = navigator.deviceMemory || 4;
  const lowPower = cores <= 2 || mem <= 2; const saveData = !!conn.saveData;
  const tier = new URLSearchParams(location.search).get('tier'); // QA override: ?tier=webgl | canvas | still
  const c = { reduced, lowPower, saveData, motion: !reduced && !saveData, gl: !reduced && !saveData && !lowPower, fps: lowPower ? 30 : 60, tier: tier || 'auto', still: false };
  if (tier === 'webgl') Object.assign(c, { gl: true, motion: !reduced, fps: 60, lowPower: false });
  if (tier === 'canvas') Object.assign(c, { gl: false, motion: !reduced });
  if (tier === 'still') Object.assign(c, { gl: false, motion: false, still: true });
  return c;
}

const spriteCache = new Map();
/** Light falloff sprite: a tight core plus a long soft tail (the 2D stand-in for the WebGL shader). */
function sprite(c) {
  const key = c.join(); let s = spriteCache.get(key); if (s) return s;
  s = document.createElement('canvas'); s.width = s.height = 128; const g = s.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, css(c, 0.9)); gr.addColorStop(0.06, css(c, 0.5)); gr.addColorStop(0.18, css(c, 0.17)); gr.addColorStop(0.45, css(c, 0.045)); gr.addColorStop(1, css(c, 0));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); spriteCache.set(key, s); return s;
}

let glowSprite = null;
/** The pool of light around "now", rendered once and stretched onto the plane each frame. */
function nowGlow() {
  if (glowSprite) return glowSprite;
  const s = glowSprite = document.createElement('canvas'); s.width = s.height = 256; const g = s.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,214,160,.2)'); gr.addColorStop(0.25, 'rgba(255,196,128,.085)'); gr.addColorStop(0.6, 'rgba(255,190,120,.03)'); gr.addColorStop(1, 'rgba(255,190,120,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256); return s;
}

export function mountUniverse(stage, opts) {
  const cap = opts.cap || capabilities();
  const mode = opts.mode || 'hero'; const full = mode === 'full';
  let graph = opts.graph; let S = buildScene(graph); let sceneMs = S.buildMs;
  const ctxp = opts.ctx; const hrefOf = opts.hrefOf;
  const posterBox = stage.querySelector('.u-poster');
  const plate = stage.querySelector('.plate');
  let portrait = false; // on tall screens the full universe is seen from higher up, so the disk fills the height
  const home = () => { const h = { ...viewCamera(opts.view || mode), ...(opts.camera || {}) }; if (full && portrait) h.pitch = 0.95; return h; };
  let cam = home(); let goal = home();

  // ----- DOM: two canvases, one keyboard target, one live region -----
  const glc = document.createElement('canvas'); glc.className = 'u-gl'; glc.setAttribute('aria-hidden', 'true');
  const c2 = document.createElement('canvas'); c2.className = 'u-2d'; c2.setAttribute('aria-hidden', 'true');
  const keys = document.createElement('div'); keys.className = 'u-keys'; keys.tabIndex = 0; keys.setAttribute('role', 'application');
  keys.setAttribute('aria-label', 'The universe of Ken Ashe’s work. Arrow keys travel between items, Enter opens the selected item, Escape clears the selection, plus and minus zoom. A full list view is available.');
  const live = document.createElement('p'); live.className = 'vh'; live.setAttribute('aria-live', 'polite');
  stage.append(glc, c2, keys, live);
  const g = c2.getContext('2d');
  const card = opts.card;
  let GL = null;

  // ----- state -----
  let W = 1, H = 1, dpr = 1, U = 400, ox = 0, oy = 0, shift = 0, shiftGoal = 0;
  let paused = !cap.motion; let visible = true; let raf = 0; let last = performance.now(); let clock = 0;
  let selected = null; let hover = null; let lastInput = -1e9; let drag = null; const pointers = new Map(); let pinch = null;
  let replay = null; let tNow = 1; let lastMonth = '';
  let travel = null; let digestOpen = false;
  const births = new Map(); const soft = new Set(); const newThreads = new Map(); const expanded = new Set();
  let P = null; let lodMs = 0; let lodAt = 0; let zoomedIn = false;
  let screen = []; let byScreen = new Map(); let grid = new Map(); const CELL = 56;
  let labels = new Map(); let labelFrame = 0; const labelAlpha = new Map(); const textW = new Map(); let labelsDrawn = 0; let threadsDrawn = 0;
  let digestBox = null; let bins = bandBins(S, 1, 32);
  let bench = null; let frameCount = 0;
  const budget = () => opts.budget ?? (W < 700 ? 110 : cap.lowPower ? 180 : 240);

  function relod() { const t0 = performance.now(); P = partition(S, { tNow, budget: budget(), clusterBudget: W < 700 ? 60 : 110, expanded }); lodMs = performance.now() - t0; lodAt = clock; labelFrame = 0; }

  // ----- geometry: the poster's box defines where "now" is and how big a world unit is -----
  let plateRect = null;
  function resize() {
    const r = stage.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
    const tall = W < H * 0.8; if (tall !== portrait) { portrait = tall; goal.pitch = home().pitch; cam.pitch = goal.pitch; }
    const pr = posterBox?.getBoundingClientRect();
    if (pr && pr.width) { U = pr.width / BOX; ox = pr.left - r.left + pr.width / 2; oy = pr.top - r.top + pr.height / 2; } else { U = Math.min(W, H * 1.4) / BOX; ox = W / 2; oy = H / 2; }
    if (plate && !full) { const q = plate.getBoundingClientRect(); plateRect = q.width ? { x: q.left - r.left, y: q.top - r.top, w: q.width, h: q.height } : null; }
    dpr = Math.min(window.devicePixelRatio || 1, cap.lowPower ? 1.5 : 2);
    c2.width = Math.round(W * dpr); c2.height = Math.round(H * dpr);
    GL?.resize(W, H, Math.min(dpr, 1.5));
    const b = budget(); if (!P || P._b !== b) { relod(); P._b = b; }
    labelFrame = 0; request();
  }
  const T = [];
  const proj = (x, y, z, out = T) => project(cam, ox - shift, oy, U, x, y, z, out);
  /** Screen point → world point on the plane y = 0 (for zooming toward the pointer). */
  function unproject(sx, sy) {
    const sp = Math.sin(cam.pitch), cp = Math.cos(cam.pitch); const k = (oy - sy) / (FOCAL * U); const den = sp - k * cp; if (Math.abs(den) < 1e-3) return null;
    const rz = (k * cam.dist) / den; const depth = cam.dist + rz * cp; if (depth < 0.1) return null;
    const rx = ((sx - (ox - shift)) * depth) / (FOCAL * U); const cy = Math.cos(cam.yaw), sy2 = Math.sin(cam.yaw);
    return [rx * cy + rz * sy2 + cam.tx, -rx * sy2 + rz * cy + cam.tz];
  }

  // ----- selection, card, camera choreography -----
  const bodyOf = (id) => S.byId.get(id) ?? P.clusters.find((c) => c.id === id) ?? null;
  const drawnHas = (id) => byScreen.has(id) || P.lights.some((b) => b.id === id) || P.clusters.some((b) => b.id === id);
  function reveal(id) { // make sure an item is individually drawn (open the cluster that holds it)
    const h = P.holder.get(id); if (h) { openCluster(h.id, { quiet: true }); }
  }
  function flyTo(b) {
    const w = place(S, b, tNow, []);
    if (full) {
      goal.tx = w[0] * 0.8; goal.ty = 0; goal.tz = w[2] * 0.8; goal.dist = Math.min(goal.dist, FOCAL * (b.isCluster ? 0.6 : 0.7));
      goal.yaw = yawFacing(Math.atan2(w[2], w[0]), goal.yaw, 0);
      shiftGoal = card && W > 760 ? Math.min(190, W * 0.14) : 0;
    } else {
      // homepage: the universe turns like a turntable around Ken and brings the work to the front
      goal.yaw = yawFacing(Math.atan2(w[2], w[0]), goal.yaw, W > 760 ? 0.5 : 0.25); goal.dist = FOCAL * 0.86;
    }
    if (cap.reduced) { cam = { ...goal }; shift = shiftGoal; }
  }
  function select(id, { fly = true, announce = true } = {}) {
    if (id === 'digest') { showDigest(true); return; }
    if (S.byId.has(id) && !P.lights.includes(S.byId.get(id))) reveal(id);
    const b = bodyOf(id); if (!b) return;
    selected = id; digestOpen = false; stage.classList.add('has-selection');
    if (fly) flyTo(b);
    renderCard(b);
    if (announce) live.textContent = b.isCluster ? `Cluster: ${b.count} pieces, ${graph.sector[b.theme]?.label}, ${periodLabel(b.cluster.period)}. Press Enter to open it.`
      : `${typeLabel[b.item.type]}: ${b.item.title}, ${fmtDate(b.item.date, b.item.precision)}${b.item.related.length ? `, ${b.item.related.length} documented thread${b.item.related.length > 1 ? 's' : ''}` : ''}${b.demo ? ', placeholder' : ''}. Press Enter to open.`;
    lastInput = clock; labelFrame = 0; request();
    opts.onSelect?.(b);
  }
  function deselect({ keep = false } = {}) {
    selected = null; digestOpen = false; stage.classList.remove('has-selection'); shiftGoal = 0;
    if (!keep) { const h = home(); goal = full ? { ...goal, tx: 0, ty: 0, tz: 0, dist: h.dist } : { ...goal, dist: h.dist }; if (cap.reduced) { cam = { ...goal }; shift = 0; } }
    if (card) { card.hidden = true; card.innerHTML = ''; }
    labelFrame = 0; request(); opts.onSelect?.(null);
  }
  function openCluster(id, { quiet = false } = {}) {
    const c = P.clusters.find((x) => x.id === id); if (!c) return;
    // keep the opened set small: at most three clusters or ~320 lights are resolved at once
    while (expanded.size >= 3) expanded.delete(expanded.values().next().value);
    expanded.add(id); relod();
    for (const iid of c.cluster.ids) { births.set(iid, clock); soft.add(iid); } // resolving: the lights fade up, without the ring a new piece gets
    if (!quiet) { const top = S.byId.get(c.cluster.top); if (top) select(top.id); }
    request();
  }
  function follow(fromId, toId) {
    reveal(toId); const a = bodyOf(fromId), b = bodyOf(toId); if (!a || !b) return;
    if (!cap.motion || paused) { select(toId); return; }
    travel = { a, b, t0: clock, dur: 1.7 }; if (card) card.hidden = true; flyTo(b); request();
  }
  function showDigest(on) {
    digestOpen = on; selected = null; stage.classList.toggle('has-selection', on);
    if (card) { card.hidden = !on; card.innerHTML = on ? digestCard(graph, ctxp) : ''; if (on) wireCard(); }
    if (on) live.textContent = `The Digest, automated. ${graph.digest.statusLine}`;
    request();
  }
  function renderCard(b) {
    if (!card) return;
    card.innerHTML = b.isCluster ? clusterCard(b.cluster, graph, ctxp, { opened: expanded.has(b.id) }) : itemCard(b.item, graph, ctxp);
    card.hidden = false; card.scrollTop = 0; wireCard(b);
  }
  function wireCard(b) {
    card.querySelector('[data-close]')?.addEventListener('click', () => { deselect(); keys.focus({ preventScroll: true }); });
    card.querySelectorAll('[data-to]').forEach((btn) => btn.addEventListener('click', () => (b && !b.isCluster ? follow(b.id, btn.dataset.to) : select(btn.dataset.to))));
    card.querySelector('[data-open-cluster]')?.addEventListener('click', (e) => openCluster(e.currentTarget.dataset.openCluster));
  }

  // ----- keyboard: one tab stop, arrow keys travel -----
  keys.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === 'Escape') { if (selected || digestOpen) { e.preventDefault(); deselect(); } return; }
    if (k === '+' || k === '=') { e.preventDefault(); zoom(0.8); return; }
    if (k === '-' || k === '_') { e.preventDefault(); zoom(1.25); return; }
    if (k === 'l' || k === 'L') { if (opts.onList) { e.preventDefault(); opts.onList(); } return; }
    if (k === 'Enter') {
      const b = selected && bodyOf(selected); if (!b) return; e.preventDefault();
      if (b.isCluster) { openCluster(b.id); return; }
      const url = hrefOf(b.item); if (url && url !== '#') { if (/^https?:/.test(url) && !url.startsWith(location.origin)) window.open(url, '_blank', 'noopener'); else location.assign(url); }
      return;
    }
    if (k === 'Home') { e.preventDefault(); const newest = P.lights.slice().sort((a, b) => b.t - a.t || b.pri - a.pri)[0]; if (newest) select(newest.id); return; }
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k]; if (!dir) return;
    e.preventDefault();
    const cur = selected && byScreen.get(selected);
    if (!cur) { const first = screen.filter((s) => !s.hidden).sort((a, b) => b.b.pri - a.b.pri)[0]; if (first) select(first.b.id); return; }
    let best = null, bs = Infinity;
    for (const s of screen) {
      if (s === cur || s.hidden) continue; const dx = s.x - cur.x, dy = s.y - cur.y; const along = dx * dir[0] + dy * dir[1]; if (along < 6) continue;
      const across = Math.abs(dx * dir[1] - dy * dir[0]); const score = along + across * 2.2; if (score < bs) { bs = score; best = s; }
    }
    if (best) select(best.b.id);
  });
  keys.addEventListener('focus', () => { stage.classList.add('is-keyed'); request(); });
  keys.addEventListener('blur', () => { stage.classList.remove('is-keyed'); request(); });

  // ----- pointer input: tap/click selects, drag orbits, pinch or wheel zooms -----
  const local = (e) => { const r = c2.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  c2.addEventListener('pointerdown', (e) => {
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), dist: goal.dist }; drag = null; return; }
    drag = { x: e.clientX, y: e.clientY, yaw: goal.yaw, pitch: goal.pitch, moved: 0, type: e.pointerType }; lastInput = clock;
  });
  const onMove = (e) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      goal.dist = clamp(pinch.dist * (pinch.d / Math.max(20, d)), FOCAL * 0.28, FOCAL * 1.5); if (cap.reduced) cam.dist = goal.dist; lastInput = clock; request(); return;
    }
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
      if (drag.moved > 5) {
        goal.yaw = drag.yaw + dx * 0.005;
        if (full || drag.type === 'mouse') goal.pitch = clamp(drag.pitch + dy * 0.004, 0.3, 1.35);
        if (cap.reduced) { cam.yaw = goal.yaw; cam.pitch = goal.pitch; }
        lastInput = clock; request();
      }
      return;
    }
    if (e.pointerType !== 'mouse') return;
    if (e.target !== c2) { if (hover) { hover = null; request(); } return; }
    const [x, y] = local(e); const h = pick(x, y, 14); const id = h ? h.b.id : inBox(digestBox, x, y) ? 'digest' : null;
    if (id !== hover) { hover = id; c2.style.cursor = hover ? 'pointer' : 'grab'; labelFrame = 0; request(); }
  };
  const onUp = (e) => {
    pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null;
    if (!drag) return; const d = drag; drag = null;
    if (d.moved <= 5 && e.target === c2 && e.type === 'pointerup') {
      const [x, y] = local(e); const h = pick(x, y, e.pointerType === 'touch' ? 24 : 14);
      if (h) select(h.b.id); else if (inBox(digestBox, x, y)) showDigest(!digestOpen); else if (selected || digestOpen) deselect();
    }
  };
  window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onUp);
  const onWheel = (e) => {
    e.preventDefault(); const f = Math.exp(clamp(e.deltaY, -120, 120) * 0.0022);
    if (f < 1 && !selected) { const [x, y] = local(e); const w = unproject(x, y); if (w && Math.hypot(w[0], w[1]) < 1.3) { goal.tx += (w[0] - goal.tx) * 0.18; goal.tz += (w[1] - goal.tz) * 0.18; } }
    zoom(f);
  };
  if (full) c2.addEventListener('wheel', onWheel, { passive: false });
  function zoom(f) {
    goal.dist = clamp(goal.dist * f, FOCAL * 0.28, FOCAL * 1.5);
    if (goal.dist > FOCAL * 0.95 && !selected) { goal.tx *= 0.6; goal.tz *= 0.6; }
    if (cap.reduced) cam = { ...goal }; lastInput = clock; request();
  }
  const inBox = (b, x, y) => b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  /** Hit-test through a uniform grid over the projected bodies (rebuilt each frame; O(1) per query). */
  function pick(x, y, tol) {
    let best = null, bd = tol; const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    for (let i = cx - 1; i <= cx + 1; i++) for (let j = cy - 1; j <= cy + 1; j++) {
      const arr = grid.get(i * 4096 + j); if (!arr) continue;
      for (const s of arr) { if (s.hidden) continue; const d = Math.hypot(s.x - x, s.y - y) - s.r; if (d < bd) { bd = d; best = s; } }
    }
    return best;
  }

  // ----- visibility and the loop -----
  const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; request(); }, { threshold: 0.01 });
  io.observe(stage);
  const onVis = () => request(); document.addEventListener('visibilitychange', onVis);
  const ro = new ResizeObserver(() => resize()); ro.observe(stage);
  if (document.fonts?.ready) document.fonts.ready.then(() => { textW.clear(); labelFrame = 0; request(); });

  function animating() {
    if (bench || travel || replay?.playing || births.size || newThreads.size) return true;
    let d = Math.abs(shift - shiftGoal) * 0.01; for (const k of ['yaw', 'pitch', 'dist', 'tx', 'ty', 'tz']) d += Math.abs(cam[k] - goal[k]);
    if (d > 2e-4) return true;
    for (const v of labelAlpha.values()) if (v > 0.02 && v < 0.98) return true;
    return cap.motion && !paused;
  }
  function request() { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); }
  function frame(now) {
    raf = 0;
    if (!bench && cap.fps < 60 && now - last < 1000 / cap.fps - 2 && !drag) { request(); return; }
    const gap = now - last; const dt = Math.min(0.05, gap / 1000); last = now; clock += dt;
    const t0 = performance.now();
    step(dt); draw();
    if (bench) { const d = performance.now() - t0; bench.draw.push(d); if (bench.frames++) bench.gaps.push(gap); if (now - bench.start > bench.ms) finishBench(); }
    frameCount++;
    if (animating() && visible && !document.hidden) request();
  }

  function step(dt) {
    if (bench) { const u = (performance.now() - bench.start) / bench.ms; goal.yaw += dt * 0.6; goal.dist = FOCAL * (0.75 + 0.3 * Math.cos(u * Math.PI * 4)); }
    // the slow living drift (only while nobody is interacting)
    else if (cap.motion && !paused && !drag && !selected && !digestOpen && !travel && clock - lastInput > 4) goal.yaw += dt * 0.014;
    if (travel) { const u = (clock - travel.t0) / travel.dur; if (u >= 1) { const id = travel.b.id; travel = null; select(id); } }
    if (replay?.playing && !paused) {
      replay.p += dt / replay.dur;
      if (replay.p >= 1) { replay.playing = false; setTime(1); replay = null; opts.onReplay?.({ done: true, t: 1 }); } else setTime(paceT(replay.p), true);
    }
    // level of detail follows the zoom: close in, the clusters near the centre of view resolve into lights
    const zin = goal.dist < FOCAL * 0.62;
    if (full && P.clusters.length && zin && clock - lodAt > 0.5 && !travel) {
      let best = null, bd = 0.36; const w = [];
      for (const c of P.clusters) { place(S, c, tNow, w); const d = Math.hypot(w[0] - goal.tx, w[2] - goal.tz); if (d < bd) { bd = d; best = c; } }
      if (best && !expanded.has(best.id)) { const keepSel = selected; openCluster(best.id, { quiet: true }); if (keepSel === best.id) select(S.byId.get(best.cluster.top)?.id, { fly: false }); }
    }
    if (full && zoomedIn && !zin && goal.dist > FOCAL * 0.9 && expanded.size && !selected) { expanded.clear(); relod(); }
    zoomedIn = zin;
    const k = cap.reduced ? 1 : 1 - Math.exp(-dt * (travel ? 3.2 : 2.6));
    for (const key of ['yaw', 'pitch', 'dist', 'tx', 'ty', 'tz']) cam[key] += (goal[key] - cam[key]) * k;
    shift += (shiftGoal - shift) * k;
    for (const [id, t0] of births) if (clock - t0 > 2.2) { births.delete(id); soft.delete(id); }
    for (const [id, t0] of newThreads) if (clock - t0 > 2.4) newThreads.delete(id);
  }

  function setTime(t, fromPlay = false) {
    const prev = tNow; tNow = clamp(t, 0, 1); const iso = S.tm.isoAt(tNow); const m = iso.slice(0, 7);
    if (m !== lastMonth || tNow >= 1 || !fromPlay) {
      lastMonth = m; relod();
      if (tNow > prev && tNow < 1) for (const b of P.lights) if (b.t > prev && b.t <= tNow) births.set(b.id, clock);
    }
    bins = bandBins(S, tNow, 32);
    if (tNow < 1) opts.onReplay?.({ t: tNow, iso, month: m, count: countBorn(tNow), digest: S.band.weeks.reduce((s, w) => s + (w.t <= tNow ? w.n : 0), 0) });
    if (!fromPlay) request();
  }
  let sortedT = null;
  /** Replay pacing: half by the calendar, half by the work itself, so busy months get the time they deserve. */
  function paceT(p) { countBorn(0); const q = sortedT[Math.min(sortedT.length - 1, Math.floor(p * sortedT.length))] ?? 1; return clamp(0.5 * p + 0.5 * q, 0, 1); }
  function countBorn(t) { sortedT ??= Float64Array.from(S.bodies.map((b) => b.t)).sort(); let lo = 0, hi = sortedT.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (sortedT[mid] <= t) lo = mid + 1; else hi = mid; } return lo; }

  // ----- drawing -----
  const fogOf = (depth) => clamp((depth - (cam.dist - 0.15)) / 1.25, 0, 1);
  function path(rho, y, a0, a1, steps, move = true) {
    let started = !move;
    for (let i = 0; i <= steps; i++) { const a = a0 + ((a1 - a0) * i) / steps; const p = proj(Math.cos(a) * rho, y, Math.sin(a) * rho); if (!p) continue; if (started) g.lineTo(p[0], p[1]); else { g.moveTo(p[0], p[1]); started = true; } }
  }

  function draw() {
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const glPts = GL ? [] : null; const moving = cap.motion && !paused;
    const o = proj(0, 0, 0, []);
    const small = W < 700;
    const obstacles = (opts.keepOut?.() || []).slice();

    // the light of "now": it falls from Ken's window onto the plane around it
    if (o) {
      const R = U * 1.05 * o[3]; const sy = Math.max(0.2, Math.sin(cam.pitch));
      g.drawImage(nowGlow(), o[0] - R, o[1] - R * sy, R * 2, R * 2 * sy);
    }

    // the automated Digest: a faint low band, aggregated per week. Never a light, never above Ken's work.
    const band = S.band; const bc = rgb(band.tint); const lift = digestOpen || hover === 'digest' ? 2.2 : 1;
    const bw = band.a1 - band.a0;
    for (let i = 0; i < bins.length; i++) {
      const b = bins[i]; let a = (0.03 + b.a * 0.062) * lift;
      if (band.status === 'publishing' && moving) a *= 0.85 + 0.15 * Math.sin(clock * 0.7 - i * 0.5);
      g.fillStyle = css(bc, Math.min(0.14, a));
      // three nested wedges feather the edges, so it reads as a haze lying in the plane, not a shape
      for (const k of [0, 0.2]) { g.beginPath(); path(b.r0, -0.03, band.a0 + bw * k, band.a1 - bw * k, 8); path(b.r1, -0.03, band.a1 - bw * k, band.a0 + bw * k, 8, false); g.closePath(); g.fill(); }
    }
    if (digestOpen) { // on demand: one hairline per published week
      g.strokeStyle = css(bc, 0.5); g.lineWidth = 1; g.beginPath();
      const step = Math.max(1, Math.ceil(band.weeks.length / 160));
      for (let i = 0; i < band.weeks.length; i += step) { const w = band.weeks[i]; if (w.t > tNow) continue; path(S.tm.rho(w.t, tNow), -0.03, band.a0, band.a1, 10); }
      g.stroke();
    }

    // time axis
    g.lineWidth = 1; const la = Math.atan2(-Math.cos(cam.yaw), -Math.sin(cam.yaw)) + 0.5; const ringLabels = [];
    for (const r of S.rings) {
      if (r.t > tNow) continue; const rho = S.tm.rho(r.t, tNow);
      g.beginPath(); path(rho, 0, 0, Math.PI * 2, 72); g.strokeStyle = r.major ? 'rgba(244,239,228,.1)' : 'rgba(244,239,228,.055)'; g.stroke();
      if (r.label) { const lp = proj(Math.cos(la) * rho, 0, Math.sin(la) * rho, []); if (lp) ringLabels.push([lp, r.label]); }
    }
    g.beginPath(); path(R0, 0, 0, Math.PI * 2, 48); g.strokeStyle = 'rgba(255,214,160,.22)'; g.stroke();

    // themes around the rim, in their own light
    const sfs = small ? 17 : 21; g.font = `italic 400 ${sfs}px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    const sectorBoxes = [];
    for (const s of S.sectors) {
      const p = proj(Math.cos(s.mid) * 1.13, 0, Math.sin(s.mid) * 1.13, []); if (!p) continue;
      const tw = g.measureText(s.label).width; const x = clamp(p[0], tw / 2 + 12, W - tw / 2 - 12), y = clamp(p[1], sfs + 10, H - 12);
      const bx = { x: x - tw / 2 - 4, y: y - sfs, w: tw + 8, h: sfs * 1.35 };
      if (obstacles.concat(plateRect ? [plateRect] : [], sectorBoxes).some((q) => bx.x < q.x + q.w && bx.x + bx.w > q.x && bx.y < q.y + q.h && bx.y + bx.h > q.y)) continue;
      const fog = fogOf(p[2]); g.fillStyle = css(mix(rgb(s.tint), HAZE, fog * 0.35), 0.95 - fog * 0.25);
      g.lineJoin = 'round'; g.lineWidth = 4; g.strokeStyle = 'rgba(10,9,8,.8)'; g.strokeText(s.label, x, y); g.fillText(s.label, x, y); sectorBoxes.push(bx);
    }
    for (const b of sectorBoxes) obstacles.push(b);
    if (plateRect) obstacles.push(plateRect);
    g.font = `500 14px ${SANS}`; g.textAlign = 'left'; let lastY = -1e9;
    for (const [p, t] of ringLabels.reverse()) {
      const tw = g.measureText(t).width; const bx = { x: p[0] + 6, y: p[1] + 2, w: tw + 4, h: 18 };
      if (Math.abs(p[1] - lastY) < 26 || bx.x + bx.w > W - 8 || bx.y + bx.h > H - 8 || bx.x < 8 || bx.y < 8) continue;
      if (obstacles.some((q) => bx.x < q.x + q.w && bx.x + bx.w > q.x && bx.y < q.y + q.h && bx.y + bx.h > q.y)) continue;
      lastY = p[1]; g.lineWidth = 4; g.strokeStyle = 'rgba(10,9,8,.85)'; g.strokeText(t, bx.x, bx.y + 14); g.fillStyle = 'rgba(169,160,141,1)'; g.fillText(t, bx.x, bx.y + 14); obstacles.push(bx);
    }
    // the Digest's label: small, ash, at the outer end of its band
    digestBox = null;
    if (tNow >= S.tm.tOf(graph.digest.first)) {
      const label = `Automated Digest · ${band.status}`; g.font = `500 14px ${SANS}`; const tw = g.measureText(label).width;
      let done = false;
      for (const [rho, dy] of [[1.03, 26], [0.88, 8], [0.72, 8], [0.56, 8], [0.42, 8]]) { // outer end of the band first, then further in if that spot is taken
        const p = proj(Math.cos(band.mid) * rho, -0.03, Math.sin(band.mid) * rho, []); if (!p || done) continue;
        for (const ax of [-tw / 2, 10, -tw - 10]) {
        const x = p[0] + ax, y = p[1] + dy; const bx = { x: x - 6, y: y - 16, w: tw + 12, h: 24 };
        if (bx.x < 8 || bx.x + bx.w > W - 8 || bx.y < 8 || bx.y + bx.h > H - 8 || obstacles.some((q) => bx.x < q.x + q.w && bx.x + bx.w > q.x && bx.y < q.y + q.h && bx.y + bx.h > q.y)) continue;
        const hot = digestOpen || hover === 'digest';
        g.textAlign = 'left'; g.lineWidth = 4; g.strokeStyle = 'rgba(10,9,8,.85)'; g.strokeText(label, x, y); g.fillStyle = css(mix(bc, CREAM, hot ? 0.6 : 0.25)); g.fillText(label, x, y);
        if (hot) g.fillRect(x, y + 4, tw, 1);
        digestBox = { x: bx.x - 4, y: bx.y - 10, w: bx.w + 8, h: 44 }; obstacles.push(bx); done = true; break;
        }
      }
    }

    // project what the level of detail says to draw
    const focusId = travel ? travel.b.id : selected || (hover !== 'digest' ? hover : null);
    const focusSet = new Set();
    if (focusId) { focusSet.add(focusId); const fb = S.byId.get(focusId); if (fb) for (const id of fb.item.related) focusSet.add(P.holder.get(id)?.id ?? id); }
    if (travel) { focusSet.add(travel.a.id); focusSet.add(travel.b.id); }
    screen = []; byScreen = new Map(); grid = new Map(); const w3 = [];
    const depth0 = o ? o[2] : cam.dist;
    const add = (b) => {
      place(S, b, tNow, w3); const p = proj(w3[0], w3[1], w3[2]); if (!p) return;
      if (p[0] < -40 || p[0] > W + 40 || p[1] < -40 || p[1] > H + 40) return;
      const r = bodyRadius(b, p[3], U);
      const s = { b, x: p[0], y: p[1], r, depth: p[2], fog: fogOf(p[2]), s: p[3], wx: w3[0], wy: w3[1], wz: w3[2], hidden: false };
      // behind the portrait: really occluded, so neither labelled nor clickable
      if (plateRect && p[2] > depth0 && s.x > plateRect.x - 2 && s.x < plateRect.x + plateRect.w + 2 && s.y > plateRect.y && s.y < plateRect.y + plateRect.h) s.hidden = true;
      screen.push(s); byScreen.set(b.id, s);
      const k = Math.floor(s.x / CELL) * 4096 + Math.floor(s.y / CELL); (grid.get(k) ?? grid.set(k, []).get(k)).push(s);
    };
    for (const b of P.clusters) add(b);
    for (const b of P.lights) add(b);

    // threads: documented relationships only. Many threads -> only the strongest few at rest, all of the focused item's.
    threadsDrawn = 0;
    const drawThread = (A, B, on, key, dirHash) => {
      const len = Math.hypot(A.wx - B.wx, A.wz - B.wz);
      const C = proj((A.wx + B.wx) / 2, (A.wy + B.wy) / 2 + 0.07 + len * 0.22, (A.wz + B.wz) / 2, []); if (!C) return;
      const born = newThreads.get(key); const grow = born != null ? ease((clock - born) / 1.6) : 1; const fog = (A.fog + B.fog) / 2;
      g.beginPath(); g.moveTo(A.x, A.y);
      if (grow < 1) { const q = grow; g.quadraticCurveTo(A.x + (C[0] - A.x) * q, A.y + (C[1] - A.y) * q, (1 - q) * (1 - q) * A.x + 2 * (1 - q) * q * C[0] + q * q * B.x, (1 - q) * (1 - q) * A.y + 2 * (1 - q) * q * C[1] + q * q * B.y); }
      else g.quadraticCurveTo(C[0], C[1], B.x, B.y);
      g.lineWidth = on ? 1.4 : 1;
      g.strokeStyle = on ? 'rgba(255,228,186,.9)' : born != null ? 'rgba(255,184,77,.9)' : `rgba(255,232,200,${0.2 * (1 - fog * 0.6) * (focusId ? 0.45 : 1)})`;
      g.stroke(); threadsDrawn++;
      if (moving || on) { // a light travels along the thread in its documented direction
        const u = on && !moving ? 0.5 : (clock * (0.1 / (0.4 + len)) + dirHash) % 1;
        const qx = (1 - u) * (1 - u) * A.x + 2 * (1 - u) * u * C[0] + u * u * B.x, qy = (1 - u) * (1 - u) * A.y + 2 * (1 - u) * u * C[1] + u * u * B.y; const fade = Math.sin(Math.PI * u) * (on ? 0.9 : 0.4) * (1 - fog * 0.5);
        if (glPts) glPts.push(qx, qy, 18, 1, 0.9, 0.72, fade, 0.5); else { g.globalCompositeOperation = 'lighter'; g.globalAlpha = fade; g.drawImage(sprite([255, 228, 186]), qx - 9, qy - 9, 18, 18); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
      }
      return C;
    };
    const ambient = S.threads.length <= 70 ? S.threads : (S._ambient ??= S.threads.slice().sort((a, b) => b.from.pri + b.to.pri - a.from.pri - a.to.pri).slice(0, 400));
    let amb = 0;
    for (const t of ambient) {
      const A = byScreen.get(t.from.id), B = byScreen.get(t.to.id); if (!A || !B) continue;
      const on = focusId && (t.from.id === focusId || t.to.id === focusId); if (on) continue; if (amb++ >= 70) break;
      drawThread(A, B, false, `${t.from.id}>${t.to.id}`, hash(t.from.id + t.to.id));
    }
    if (focusId) for (const t of S.threadsOf.get(focusId) || []) {
      const A = byScreen.get(t.from.id) ?? byScreen.get(P.holder.get(t.from.id)?.id), B = byScreen.get(t.to.id) ?? byScreen.get(P.holder.get(t.to.id)?.id); if (!A || !B || A === B) continue;
      drawThread(A, B, true, `${t.from.id}>${t.to.id}`, hash(t.from.id + t.to.id));
    }
    if (travel) { // following a thread: a brighter light carries the eye from one piece of work to the other
      const A = byScreen.get(travel.a.id), B = byScreen.get(travel.b.id);
      if (A && B) { const e = ease((clock - travel.t0) / travel.dur); const len = Math.hypot(A.wx - B.wx, A.wz - B.wz); const C = proj((A.wx + B.wx) / 2, (A.wy + B.wy) / 2 + 0.07 + len * 0.22, (A.wz + B.wz) / 2, []);
        if (C) { const x = (1 - e) * (1 - e) * A.x + 2 * (1 - e) * e * C[0] + e * e * B.x, y = (1 - e) * (1 - e) * A.y + 2 * (1 - e) * e * C[1] + e * e * B.y;
          if (glPts) glPts.push(x, y, 70, 1, 0.82, 0.5, 1, 0.7); else { g.globalCompositeOperation = 'lighter'; g.drawImage(sprite([255, 205, 130]), x - 34, y - 34, 68, 68); g.globalCompositeOperation = 'source-over'; } } }
    }

    // stalks: a hairline from each light down to the plane of time (depth cue). Skipped when there are very many.
    if (screen.length < 420) {
      g.lineWidth = 1; g.beginPath();
      for (const s of screen) { if (s.b.isCluster || s.hidden) continue; const f = proj(s.wx, 0, s.wz); if (!f) continue; g.moveTo(s.x, s.y); g.lineTo(f[0], f[1]); }
      g.strokeStyle = `rgba(244,239,228,${focusId ? 0.07 : 0.13})`; g.stroke();
    }

    lite = screen.length > 130; haloK = GL ? 7 : lite ? 4.6 : cap.lowPower ? 5.4 : 6.6;
    // bodies, far to near
    screen.sort((a, b) => b.depth - a.depth);
    for (const s of screen) if (s.b.isCluster) drawCluster(s, focusId, focusSet, glPts); else drawBody(s, focusId, focusSet, glPts, o, moving);

    // the newest video's light is tied to its card in the hero
    const lead = opts.leader?.();
    if (lead && tNow >= 1) { const s = byScreen.get(lead.id); if (s && !s.hidden) { const x = clamp(s.x, lead.x, lead.x + lead.w), y = clamp(s.y, lead.y, lead.y + lead.h); if (Math.hypot(x - s.x, y - s.y) > 12) { g.strokeStyle = 'rgba(255,214,160,.5)'; g.lineWidth = 1; g.setLineDash([2, 5]); g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(x, y); g.stroke(); g.setLineDash([]); } } }

    drawLabels(focusId, focusSet, obstacles, small);
    if (GL) GL.draw(new Float32Array(glPts), glPts.length / 8);

    // the portrait follows "now" on the full-screen universe
    if (plate && full) {
      if (o && o[0] > -80 && o[0] < W + 80 && o[1] > -40 && o[1] < H + 200) { plate.style.transform = `translate(${o[0].toFixed(1)}px,${o[1].toFixed(1)}px) translate(-50%,-100%) scale(${clamp(o[3], 0.6, 2.2).toFixed(3)})`; plate.style.visibility = ''; const pw = plate.offsetWidth * clamp(o[3], 0.6, 2.2), ph = plate.offsetHeight * clamp(o[3], 0.6, 2.2); plateRect = { x: o[0] - pw / 2, y: o[1] - ph, w: pw, h: ph }; }
      else { plate.style.visibility = 'hidden'; plateRect = null; }
    }
    opts.onFrame?.();
  }

  let lite = false; let haloK = 6.6; // halo radius in body radii; smaller on low-power devices and when there is a lot to draw (Canvas 2D fill cost)
  function drawCluster(s, focusId, focusSet, glPts) {
    const { b, x, y, fog } = s; const r = Math.min(s.r, 30); const dim = focusId && !focusSet.has(b.id) ? 0.5 : 1; const c = mix(rgb(b.tint), HAZE, fog * 0.5); const a = (1 - fog * 0.5) * dim;
    // a soft body sized by how much work it holds; no hard edge, so it reads as "many", not as one thing
    if (glPts) glPts.push(x, y, r * 5.2, c[0] / 255, c[1] / 255, c[2] / 255, a * 0.5, 1);
    else { g.globalAlpha = a; g.fillStyle = css(c, 0.055); g.beginPath(); g.arc(x, y, r * 2.3, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(x, y, r * 1.55, 0, Math.PI * 2); g.fill(); } // plain fills: far cheaper than additive sprites in Canvas 2D
    g.globalAlpha = a; g.fillStyle = css(c, 0.16); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    if (hover === b.id) { g.strokeStyle = css(c, 0.6); g.lineWidth = 1; g.stroke(); }
    if (focusId === b.id) { g.strokeStyle = 'rgba(255,248,236,.9)'; g.beginPath(); g.arc(x, y, r + 5, 0, Math.PI * 2); g.stroke(); }
    g.globalAlpha = 1;
  }

  function drawBody(s, focusId, focusSet, glPts, o, moving) {
    const { b, x, y, r, fog } = s;
    const dim = focusId && !focusSet.has(b.id) ? 0.4 : 1;
    const coc = Math.abs(s.depth - cam.dist);                    // distance from the plane of focus
    const alpha0 = (1 - fog * 0.55) * dim;
    const c = mix(rgb(b.tint), HAZE, fog * 0.5);
    const born = births.get(b.id); const isSoft = born != null && soft.has(b.id); const flare = born != null && !isSoft ? 1 - ease((clock - born) / 2) : 0;
    const fadeIn = isSoft ? ease((clock - born) / 1.2) : 1; const alpha = alpha0 * fadeIn;
    const tw = b.live && moving ? 0.88 + 0.12 * Math.sin(clock * 1.6 + hash(b.id) * 6.28) : 1;
    const R = r * haloK * (1 + coc * 0.7) * (1 + flare * 2.2); const ha = Math.min(1.4, alpha * (0.9 / (1 + coc * 0.9)) * tw + flare);
    if (glPts) glPts.push(x, y, R * 2.2, c[0] / 255, c[1] / 255, c[2] / 255, ha * 1.15, 1);
    else if (!lite || fog < 0.55 || focusSet.has(b.id)) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, ha); g.drawImage(sprite(c), x - R, y - R, R * 2, R * 2); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    g.save(); g.globalAlpha = Math.min(1, alpha / (1 + coc * 0.8) + flare);
    const rich = !lite || focusId === b.id || r > 7; // gradients only where they can be seen; flat strokes when there is a lot to draw
    if (b.type === 'build') {
      const L = r * 4.4 * (focusId === b.id ? 1.4 : 1) * tw;
      if (rich) for (const [dx, dy, l, w] of [[1, 0, L, 1], [0, 1, L, 1], [0.707, 0.707, L * 0.3, 0.7], [0.707, -0.707, L * 0.3, 0.7]]) {
        const gr = g.createLinearGradient(x - dx * l, y - dy * l, x + dx * l, y + dy * l); gr.addColorStop(0, css(c, 0)); gr.addColorStop(0.5, css(c, 0.9)); gr.addColorStop(1, css(c, 0));
        g.strokeStyle = gr; g.lineWidth = w; g.beginPath(); g.moveTo(x - dx * l, y - dy * l); g.lineTo(x + dx * l, y + dy * l); g.stroke();
      } else {
        g.lineWidth = 1; g.strokeStyle = css(c, 0.28); g.beginPath(); g.moveTo(x - L, y); g.lineTo(x + L, y); g.moveTo(x, y - L); g.lineTo(x, y + L); g.stroke();
        g.strokeStyle = css(c, 0.6); g.beginPath(); g.moveTo(x - L * 0.45, y); g.lineTo(x + L * 0.45, y); g.moveTo(x, y - L * 0.45); g.lineTo(x, y + L * 0.45); g.stroke();
      }
      g.fillStyle = '#fff8ec'; g.beginPath(); g.arc(x, y, r * 0.64, 0, Math.PI * 2); g.fill();
    } else if (b.type === 'essay') { // a planet lit from the present: its bright side faces Ken's window
      let lx = (o ? o[0] : W / 2) - x, ly = (o ? o[1] - U * 0.25 : H / 2) - y; const ll = Math.hypot(lx, ly) || 1; lx /= ll; ly /= ll;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = '#17120c'; g.fill();
      if (rich) {
        g.save(); g.clip();
        const gr = g.createRadialGradient(x + lx * r * 0.7, y + ly * r * 0.7, 0, x + lx * r * 0.5, y + ly * r * 0.5, r * 1.5);
        gr.addColorStop(0, css(mix(c, CREAM, 0.45), 1)); gr.addColorStop(0.55, css(c, 0.85)); gr.addColorStop(1, css(c, 0));
        g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
      } else { const a = Math.atan2(ly, lx); g.fillStyle = css(c, 0.9); g.beginPath(); g.arc(x, y, r, a - Math.PI / 2, a + Math.PI / 2); g.fill(); }
      g.strokeStyle = css(c, 0.55); g.lineWidth = 0.9; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
    } else { // videos and shorts: ringed bodies
      const k = r; g.lineWidth = 1; g.strokeStyle = css(c, 0.85);
      g.beginPath(); g.ellipse(x, y, k * 1.85, k * 0.52, -0.28, Math.PI, Math.PI * 2); g.stroke();
      if (rich) { const gr = g.createRadialGradient(x - k * 0.25, y - k * 0.25, 0, x, y, k * 0.75); gr.addColorStop(0, css(mix(c, CREAM, 0.5))); gr.addColorStop(1, css(c, 1)); g.fillStyle = gr; } else g.fillStyle = css(mix(c, CREAM, 0.2));
      g.beginPath(); g.arc(x, y, k * 0.72, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(x, y, k * 1.85, k * 0.52, -0.28, 0, Math.PI); g.stroke();
    }
    if (b.demo) { g.globalAlpha = 1; g.strokeStyle = '#ffb84d'; g.setLineDash([3, 3]); g.lineDashOffset = moving ? -clock * 6 : 0; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, r * 2.4 + 3, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); }
    if (flare > 0) { g.globalAlpha = flare; g.strokeStyle = 'rgba(255,214,150,1)'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, r * 2 + (1 - flare) * 44, 0, Math.PI * 2); g.stroke(); }
    if (focusId === b.id) {
      g.globalAlpha = 1; g.strokeStyle = 'rgba(255,248,236,.95)'; g.lineWidth = 1.2; const q = Math.max(11, r * 2.3);
      g.beginPath(); g.arc(x, y, q, 0, Math.PI * 2); g.stroke();
      for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2 + Math.PI / 4; g.beginPath(); g.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q); g.lineTo(x + Math.cos(a) * (q + 6), y + Math.sin(a) * (q + 6)); g.stroke(); }
    }
    g.restore();
  }

  // Labels: few, large (never under 14 px), never overlapping. Placement is recomputed a few times a second
  // and each label then rides with its body, so nothing jitters while the universe drifts.
  function drawLabels(focusId, focusSet, obstacles, small) {
    const fs = small ? 14.5 : 15.5; const max = opts.maxLabels ?? Math.round(clamp((W * H) / 78000, 4, 14));
    if (labelFrame-- <= 0) {
      labelFrame = moveFast() ? 4 : 12;
      const cands = []; const pool = screen.filter((s) => !s.hidden);
      for (const s of pool) if (s.r > (small ? 5 : 3)) obstacles.push({ x: s.x - s.r, y: s.y - s.r, w: s.r * 2, h: s.r * 2 });
      // candidates: the focus and its neighbours, then the highest-priority bodies in view
      const ranked = pool.map((s) => { const b = s.b; let pri = b.pri * (1 - s.fog * 0.55) * (b.demo ? 30 : 1); if (b.id === focusId) pri = 1e6; else if (focusSet.has(b.id)) pri = 1e5 + b.pri; else if (focusId) pri *= 0.2; if ((labelAlpha.get(b.id) ?? 0) > 0.5) pri *= 1.4; return [pri, s]; }).sort((a, b) => b[0] - a[0]).slice(0, max * 4 + 8);
      for (const [pri, s] of ranked) {
        const b = s.b; const t = b.isCluster ? `${periodLabel(b.cluster.period)} · ${b.count}` : shortTitle(b.item.title, small ? 22 : 30) + (b.demo ? ' (placeholder)' : '');
        const big = b.id === focusId; const f = big ? fs + 2 : fs; const key = t + f;
        let w = textW.get(key); if (!w) { g.font = `${big ? 700 : 600} ${f}px ${SANS}`; w = g.measureText(t).width + 2; textW.set(key, w); }
        cands.push({ id: b.id, x: s.x, y: s.y, r: Math.max(4, s.r), w, h: f + 5, pri, t, f, big });
      }
      const placed = placeLabels(cands, { width: W, height: H, max, obstacles, pad: small ? 3 : 6 });
      const next = new Map();
      for (const c of cands) { const L = placed.get(c.id); if (L) next.set(c.id, { dx: L.x - c.x, dy: L.y - c.y, align: L.align, w: c.w, t: c.t, f: c.f, big: c.big }); }
      for (const [id, L] of labels) if (!next.has(id) && (labelAlpha.get(id) ?? 0) > 0.02) next.set(id, { ...L, out: true });
      labels = next;
    }
    labelsDrawn = 0; const k = cap.reduced ? 1 : 0.16;
    for (const [id, L] of labels) {
      const s = byScreen.get(id); const target = s && !L.out && !s.hidden ? 1 : 0; const a0 = labelAlpha.get(id) ?? 0; const a = a0 + (target - a0) * k; labelAlpha.set(id, a);
      if (!s || a < 0.02) { if (L.out) { labels.delete(id); labelAlpha.delete(id); } continue; }
      const x = s.x + L.dx, y = s.y + L.dy; const tx = L.align === 'r' ? x + L.w : L.align === 'c' ? x + L.w / 2 : x;
      g.textAlign = L.align === 'r' ? 'right' : L.align === 'c' ? 'center' : 'left';
      g.globalAlpha = a * (focusId && !focusSet.has(id) ? 0.55 : 1) * (1 - s.fog * 0.3);
      g.font = `${L.big ? 700 : 600} ${L.f}px ${SANS}`; g.lineJoin = 'round'; g.lineWidth = 5; g.strokeStyle = 'rgba(10,9,8,.9)'; g.strokeText(L.t, tx, y + L.f);
      g.fillStyle = s.b.demo ? '#ffb84d' : L.big ? '#ffffff' : s.b.isCluster ? css(mix(rgb(s.b.tint), CREAM, 0.55)) : '#f4efe4'; g.fillText(L.t, tx, y + L.f);
      if (!L.out) labelsDrawn++;
    }
    g.globalAlpha = 1;
  }
  const moveFast = () => Math.abs(cam.yaw - goal.yaw) + Math.abs(cam.dist - goal.dist) + Math.abs(cam.tx - goal.tx) + Math.abs(cam.tz - goal.tz) > 0.02 || !!drag;

  // ----- measurement (used by the stress test) -----
  function finishBench() {
    const b = bench; bench = null; goal = { ...home() }; shiftGoal = 0;
    const avg = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0); const worst = (a) => (a.length ? Math.max(...a) : 0);
    const sorted = b.gaps.slice().sort((x, y) => x - y);
    b.resolve({ frames: b.frames, avgFrameMs: avg(b.gaps), worstFrameMs: worst(b.gaps), p95FrameMs: sorted[Math.floor(sorted.length * 0.95)] ?? 0, avgDrawMs: avg(b.draw), worstDrawMs: worst(b.draw) });
    request();
  }

  // ----- public API -----
  const api = {
    get scene() { return S; }, get graph() { return graph; }, get paused() { return paused; }, get selected() { return selected; }, get tNow() { return tNow; },
    setPaused(p) { paused = p; request(); },
    select, deselect, follow, zoom, openCluster, showDigest, focus: () => keys.focus({ preventScroll: true }),
    reset() { travel = null; expanded.clear(); relod(); deselect(); goal = home(); shiftGoal = 0; if (cap.reduced) cam = { ...goal }; request(); },
    replayStart() { deselect(); expanded.clear(); births.clear(); replay = { p: 0, playing: true, dur: clamp(8 + S.tm.span / 500, 10, 22) }; paused = false; lastMonth = ''; setTime(0, true); request(); },
    replayStop() { if (replay) replay.playing = false; request(); },
    replaySeek(t) { replay = { p: t, playing: false, dur: replay?.dur ?? 12 }; setTime(t); },
    replayEnd() { replay = null; births.clear(); setTime(1); opts.onReplay?.({ done: true, t: 1 }); },
    get replaying() { return !!replay?.playing; },
    setGraph(next, { born = [] } = {}) {
      const old = S; graph = next; S = buildScene(graph); sceneMs = S.buildMs; sortedT = null; tNow = 1; expanded.clear(); bins = bandBins(S, 1, 32); relod();
      for (const id of born) births.set(id, clock);
      const had = new Set(old.threads.map((t) => `${t.from.id}>${t.to.id}`)); for (const t of S.threads) { const key = `${t.from.id}>${t.to.id}`; if (!had.has(key)) newThreads.set(key, clock); }
      textW.clear(); labels = new Map(); labelAlpha.clear(); if (selected && !S.byId.has(selected)) deselect(); request(); return S;
    },
    redraw: () => { labelFrame = 0; request(); },
    /** Honest numbers for the measurement panel. */
    stats() { return { items: S.bodies.length, lights: P.lights.length, clusters: P.clusters.length, drawn: screen.length, labels: labelsDrawn, threads: threadsDrawn, threadsTotal: S.threads.length, digestPosts: graph.digest.published, digestSegments: bins.length, sceneBuildMs: sceneMs, lodMs, renderer: stage.dataset.renderer, dpr, width: W, height: H, fpsCap: cap.fps }; },
    /** Orbit and zoom for `seconds`, rendering every frame, and report frame times. */
    benchmark(seconds = 4) { return new Promise((resolve) => { deselect(); bench = { start: performance.now(), ms: seconds * 1000, gaps: [], draw: [], frames: 0, resolve }; last = performance.now(); request(); }); },
    /** Stage-relative position of a drawn body (QA hook). */
    screenOf(id) { const s = byScreen.get(id); return s ? { x: s.x, y: s.y, r: s.r, hidden: s.hidden } : null; },
    _debug() { return { W, H, U, ox, oy, cam: { ...cam }, labels: [...labels.keys()], paused, tNow, frames: frameCount }; },
    destroy() { io.disconnect(); ro.disconnect(); cancelAnimationFrame(raf); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp); document.removeEventListener('visibilitychange', onVis); glc.remove(); c2.remove(); keys.remove(); live.remove(); stage.classList.remove('is-live', 'has-selection'); },
  };

  resize();
  stage.classList.add('is-live'); stage.__universe = api; stage.dataset.renderer = 'canvas2d';
  if (cap.gl) import('./gl.js').then((m) => { GL = m.createGL(glc, W, H, Math.min(dpr, 1.5)); if (GL) { stage.dataset.renderer = 'webgl'; request(); } }).catch(() => {});
  return api;
}
