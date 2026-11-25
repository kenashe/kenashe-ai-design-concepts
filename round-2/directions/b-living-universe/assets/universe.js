// Direction B · The Living Universe · interactive renderer.
// Tier 1 is the prerendered SVG poster (works with JS off). This module is tier 2 (Canvas 2D),
// and lazily adds tier 3 (gl.js, raw WebGL light layer) on capable devices.
// Bodies stay real links: a layer of <a> elements follows the canvas so keyboard and screen
// reader users get the same universe.
import { buildScene, camera, project, placeLabels, labelPriority, shortTitle, metaLine, mapR, ringLabelAngle, hash, TINT, DIGEST_TINT, monthsOf } from './scene.js';
import { fmtDate, typeLabel, esc } from '../../../lib/graph.js';
import { POSTER_VIEWS, viewCamera } from '../render.js';

const DAY = 864e5;
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const ASH = rgb('#5d6670');
const WARM = rgb(DIGEST_TINT.publishing);

export function capabilities() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const conn = navigator.connection || {};
  const cores = navigator.hardwareConcurrency || 4; const mem = navigator.deviceMemory || 4;
  const lowPower = cores <= 2 || mem <= 2;
  const saveData = !!conn.saveData;
  // QA / review override: ?tier=webgl | canvas | still
  const tier = new URLSearchParams(location.search).get('tier');
  const c = { reduced, lowPower, saveData, motion: !reduced && !saveData, gl: !reduced && !saveData && !lowPower && cores >= 4 && mem >= 4, fps: lowPower ? 24 : 60 };
  if (tier === 'webgl') Object.assign(c, { gl: true, motion: !reduced, fps: 60, lowPower: false });
  if (tier === 'canvas') Object.assign(c, { gl: false, motion: !reduced });
  if (tier === 'still') Object.assign(c, { gl: false, motion: false });
  return c;
}

/** Glow sprite per colour (canvas fallback for the WebGL light layer). */
const spriteCache = new Map();
function sprite(c, soft = 1) {
  const key = c.join() + soft; if (spriteCache.has(key)) return spriteCache.get(key);
  const s = document.createElement('canvas'); s.width = s.height = 128; const g = s.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, css(c, 0.95)); gr.addColorStop(0.07 * soft, css(c, 0.5)); gr.addColorStop(0.22, css(c, 0.14)); gr.addColorStop(0.5, css(c, 0.035)); gr.addColorStop(1, css(c, 0));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); spriteCache.set(key, s); return s;
}

/** Pure gaussian haze sprite for the Digest lane (density shows as light). */
function haze(c) {
  const key = 'h' + c.join(); if (spriteCache.has(key)) return spriteCache.get(key);
  const s = document.createElement('canvas'); s.width = s.height = 64; const g = s.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  for (let i = 0; i <= 8; i++) { const x = i / 8; gr.addColorStop(x, css(c, Math.exp(-x * x * 5) * (1 - x))); }
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); spriteCache.set(key, s); return s;
}

export function mountUniverse(stage, opts) {
  const cap = opts.cap || capabilities();
  let graph = opts.graph; let S = buildScene(graph);
  const ctxp = opts.ctx; const hrefOf = opts.hrefOf;
  const viewName = () => (stage.clientWidth / Math.max(1, stage.clientHeight) < 0.95 ? stage.dataset.tall || 'tall' : stage.dataset.view || 'wide');
  let V = POSTER_VIEWS[viewName()];
  const home = () => camera({ ...viewCamera(V, S), ...(opts.camera || {}) });
  let cam = home(); let goal = home();

  // ----- DOM -----
  const glc = document.createElement('canvas'); glc.className = 'u-gl'; glc.setAttribute('aria-hidden', 'true');
  const c2 = document.createElement('canvas'); c2.className = 'u-2d'; c2.setAttribute('aria-hidden', 'true');
  const hits = document.createElement('div'); hits.className = 'u-hits';
  hits.setAttribute('role', 'group'); hits.setAttribute('aria-label', 'Bodies in the universe. Arrow keys move between neighbours.');
  stage.append(glc, c2, hits);
  const g = c2.getContext('2d');
  const card = opts.card; const caption = opts.caption;
  let GL = null;

  // ----- state -----
  let W = 0, H = 0, dpr = 1, vs = 1, ox = 0, oy = 0;
  let paused = !cap.motion; let visible = true; let raf = 0; let last = performance.now(); let clock = 0;
  let selected = null; let hover = null; let lastInput = -1e9; let drag = null;
  let replay = null; // {p, playing}
  let hiDay = null, hiLabel = ''; // a Digest publishing day to light up (ms)
  let travel = null; // {a, b, t0, dur}
  const births = new Map(); // id -> clock when born (flare)
  const newThreads = new Map(); // "from>to" -> clock
  const labelAlpha = new Map(); const prevAlign = new Map(); const textW = new Map();
  let months = monthsOf(graph);
  let tNow = S.tm.t1; // the scene's current time (replay changes it)
  let digestHeat = graph.digest.status === 'publishing' ? 1 : 0; // 1 warm/moving, 0 cooled/still
  let dustPolar = null; buildDust();

  function buildDust() {
    const n = S.dustCount; dustPolar = new Float64Array(n * 5);
    const coreA = S.digest.core?.angle ?? 3;
    for (let i = 0; i < n; i++) {
      const x = S.dust[i * 5], y = S.dust[i * 5 + 1], z = S.dust[i * 5 + 2], t = S.dust[i * 5 + 3] * DAY;
      const rho = Math.hypot(x, z); const rho0 = mapR(S.tm.radiusAt(new Date(t).toISOString().slice(0, 10)));
      dustPolar[i * 5] = Math.atan2(z, x) - (rho - 0.1) * 1.9 + 0 * coreA; // angle without twist
      dustPolar[i * 5 + 1] = rho - rho0; dustPolar[i * 5 + 2] = y; dustPolar[i * 5 + 3] = t; dustPolar[i * 5 + 4] = S.dust[i * 5 + 4];
    }
  }

  // ----- anchors (real links) -----
  let anchors = new Map();
  function buildAnchors() {
    hits.textContent = ''; anchors = new Map();
    const order = S.bodies.slice().sort((a, b) => (b.born - a.born) || (b.size - a.size));
    for (const b of order) {
      const it = b.item; const a = document.createElement('a');
      a.className = 'u-hit'; a.dataset.id = b.id; a.href = hrefOf(it);
      if (/^https?:/.test(a.href) && !a.href.startsWith(location.origin)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      a.setAttribute('aria-label', `${typeLabel[it.type]}: ${it.title}${it.date ? `, ${fmtDate(it.date, it.precision)}` : ''}${it.related.length ? `, ${it.related.length} documented link${it.related.length > 1 ? 's' : ''}` : ''}${b.demo ? ', placeholder' : ''}`);
      a.addEventListener('focus', () => select(b.id, { fly: true }));
      a.addEventListener('keydown', (e) => onKey(e, b));
      a.addEventListener('click', (e) => { if (a.dataset.armed !== '1') { e.preventDefault(); select(b.id, { fly: true }); a.dataset.armed = '1'; } });
      hits.append(a); anchors.set(b.id, a);
    }
  }
  buildAnchors();

  function onKey(e, b) {
    const k = e.key; if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Escape'].includes(k)) return;
    e.preventDefault();
    if (k === 'Escape') { deselect(); return; }
    const vis = S.bodies.filter((x) => x !== b && x.born <= tNow);
    let best = null, bestScore = Infinity;
    for (const x of vis) {
      let da = Math.atan2(x.z, x.x) - Math.atan2(b.z, b.x); da = Math.atan2(Math.sin(da), Math.cos(da));
      const dr = x.rho - b.rho;
      let ok = false, score = 0;
      if (k === 'ArrowRight') { ok = da > 0.01; score = da + Math.abs(dr) * 2; }
      if (k === 'ArrowLeft') { ok = da < -0.01; score = -da + Math.abs(dr) * 2; }
      if (k === 'ArrowUp') { ok = dr < -0.005; score = -dr + Math.abs(da) * 0.6; }
      if (k === 'ArrowDown') { ok = dr > 0.005; score = dr + Math.abs(da) * 0.6; }
      if (ok && score < bestScore) { bestScore = score; best = x; }
    }
    if (best) anchors.get(best.id)?.focus();
  }

  // ----- geometry -----
  const P = [];
  function resize() {
    const r = stage.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
    const nv = POSTER_VIEWS[viewName()]; if (nv !== V) { V = nv; goal = selected ? goal : home(); cam = { ...goal }; }
    dpr = Math.min(window.devicePixelRatio || 1, cap.lowPower ? 1.25 : 2);
    c2.width = Math.round(W * dpr); c2.height = Math.round(H * dpr); c2.style.width = W + 'px'; c2.style.height = H + 'px';
    vs = Math.max(W / V.w, H / V.h); ox = (W - V.w * vs) / 2; oy = (H - V.h * vs) / 2;
    GL?.resize(W, H, Math.min(dpr, 1.5));
    request();
  }
  function proj(x, y, z, out = P) { const p = project(cam, V.w, V.h, x, y, z, out); if (!p) return null; p[0] = ox + p[0] * vs; p[1] = oy + p[1] * vs; return p; }

  // positions at the scene time (growth replay moves everything outward as it ages)
  function bodyPos(b) {
    if (tNow >= S.tm.t1 || !b.item.date) return [b.x, b.y, b.z];
    const rt = mapR(S.tm.radiusAt(b.item.date, tNow)); const k = rt / b.rho;
    return [b.x * k, b.y, b.z * k];
  }

  // ----- selection & camera choreography -----
  function select(id, { fly = true, quiet = false } = {}) {
    const b = S.byId.get(id); if (!b) return;
    if (selected !== id) for (const a of anchors.values()) a.dataset.armed = '';
    selected = id; anchors.get(id) && (anchors.get(id).dataset.armed = '1');
    const [x, y, z] = bodyPos(b);
    // with the card open on a wide stage, the camera frames the body left of the card
    const side = card && !quiet && W > 700 ? 0.5 - Math.min(0.16, 190 / W) : home().cx;
    if (fly) goal = { ...goal, tx: x * 0.75, ty: y * 0.5, tz: z * 0.75, dist: Math.min(goal.dist, home().dist * 0.72), cx: side };
    if (quiet) { if (card) card.hidden = true; } else renderCard(b);
    lastInput = clock; request();
    opts.onSelect?.(b);
  }
  function deselect() { selected = null; goal = home(); if (card) card.hidden = true; request(); }

  function follow(fromId, toId) {
    const a = S.byId.get(fromId), b = S.byId.get(toId); if (!a || !b) return;
    if (!cap.motion || paused) { anchors.get(toId)?.focus(); select(toId); return; }
    travel = { a, b, t0: clock, dur: 1.9 }; if (card) card.hidden = true; request();
  }

  function renderCard(b) {
    if (!card) return;
    const it = b.item; const url = hrefOf(it); const extl = /^https?:/.test(url) && !url.startsWith(location.origin);
    const edges = graph.edges.filter((e) => e.from === it.id || e.to === it.id);
    const verb = { 'links-to': ['links to', 'linked from'], embeds: ['embeds', 'embedded in'], mentions: ['mentions', 'mentioned by'] };
    card.innerHTML = `${it.image && !b.demo ? `<div class="uc-img"><img src="${esc(it.image)}" alt=""></div>` : ''}
      <button class="uc-x" type="button" aria-label="Close">×</button>
      <p class="kicker"><span>${esc(typeLabel[it.type])}${it.status && it.type === 'build' ? ` · ${esc(it.status)}` : ''}${it.date ? ` · ${esc(fmtDate(it.date, it.precision))}` : ''}</span>${b.demo ? '<span class="ph-tag">Placeholder</span>' : ''}</p>
      <p class="uc-t">${esc(it.title)}</p>${it.id === graph.digest.relatedBuild ? `<p class="uc-d uc-status">${esc(graph.digest.statusLine)}</p>` : ''}<p class="uc-d">${esc(it.type === 'digest' ? `${graph.digest.statusLine} ${graph.digest.published.toLocaleString('en-US')} published posts, ${fmtDate(graph.digest.first)} to ${fmtDate(graph.digest.last)}.` : it.dek || '')}</p>
      <p class="uc-open"><a class="ubtn" href="${esc(url)}"${extl ? ' target="_blank" rel="noopener noreferrer"' : ''}>${it.type === 'video' || it.type === 'short' ? 'Watch' : it.type === 'digest' ? 'Open the archive' : 'Open'} →</a></p>
      ${edges.length ? `<div class="uc-threads"><p>Follow a thread</p>${edges.map((e) => { const out = e.from === it.id; const o = graph.byId.get(out ? e.to : e.from); return `<button type="button" data-to="${esc(o.id)}"><span aria-hidden="true">${out ? '→' : '←'}</span><span>${esc(o.title)}<small>${esc((verb[e.type] || [e.type, e.type])[out ? 0 : 1])} · ${esc(e.evidence || '')}</small></span></button>`; }).join('')}</div>` : ''}`;
    card.hidden = false;
    card.querySelector('.uc-x').onclick = () => { const a = anchors.get(b.id); deselect(); a?.focus({ preventScroll: true }); };
    card.querySelectorAll('[data-to]').forEach((btn) => (btn.onclick = () => follow(b.id, btn.dataset.to)));
  }

  // ----- input -----
  c2.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, yaw: goal.yaw, pitch: goal.pitch, moved: 0, type: e.pointerType }; lastInput = clock; });
  window.addEventListener('pointermove', (e) => {
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
      if (drag.moved > 4) {
        goal.yaw = drag.yaw + dx * 0.005; if (drag.type === 'mouse') goal.pitch = clamp(drag.pitch + dy * 0.004, 0.18, 1.35);
        if (cap.reduced) cam.yaw = goal.yaw, cam.pitch = goal.pitch;
        lastInput = clock; request();
      }
      return;
    }
    if (e.target !== c2) { if (hover) { hover = null; request(); } return; }
    const r = c2.getBoundingClientRect(); const h = pick(e.clientX - r.left, e.clientY - r.top, 18);
    if ((h?.id ?? null) !== hover) { hover = h?.id ?? null; c2.style.cursor = hover ? 'pointer' : 'grab'; request(); }
  });
  window.addEventListener('pointerup', (e) => {
    if (!drag) return; const d = drag; drag = null;
    if (d.moved <= 4 && e.target === c2) {
      const r = c2.getBoundingClientRect(); const h = pick(e.clientX - r.left, e.clientY - r.top, e.pointerType === 'touch' ? 26 : 18);
      if (h) select(h.id); else if (selected) deselect();
    }
  });
  if (opts.wheelZoom) c2.addEventListener('wheel', (e) => { e.preventDefault(); zoom(e.deltaY > 0 ? 1.1 : 0.9); }, { passive: false });
  function zoom(f) { goal.dist = clamp(goal.dist * f, 0.55, 4); if (cap.reduced) cam.dist = goal.dist; lastInput = clock; request(); }

  let screen = []; // last frame's projected bodies for picking
  function pick(x, y, tol) { let best = null, bd = tol; for (const s of screen) { const d = Math.hypot(s.x - x, s.y - y) - s.r; if (d < bd) { bd = d; best = s; } } return best; }

  // ----- visibility & loop -----
  const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; request(); }, { threshold: 0.01 });
  io.observe(stage);
  document.addEventListener('visibilitychange', () => request());
  const ro = new ResizeObserver(() => resize()); ro.observe(stage);

  function animating() {
    if (travel || replay?.playing || births.size || newThreads.size) return true;
    const d = Math.abs(cam.yaw - goal.yaw) + Math.abs(cam.pitch - goal.pitch) + Math.abs(cam.dist - goal.dist) + Math.abs(cam.tx - goal.tx) + Math.abs(cam.tz - goal.tz) + Math.abs(cam.ty - goal.ty);
    if (d > 1e-4) return true;
    return cap.motion && !paused;
  }
  function request() { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); }
  function frame(now) {
    raf = 0;
    if (cap.fps < 60 && now - last < 1000 / cap.fps - 2 && !drag) { request(); return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
    step(dt); draw();
    if (animating() && visible && !document.hidden) request();
  }

  function step(dt) {
    // ambient drift (only when nobody is interacting)
    if (cap.motion && !paused && !drag && !selected && !travel && clock - lastInput > 3.5) goal.yaw += dt * 0.022;
    // travel along a thread
    if (travel) {
      const u = (clock - travel.t0) / travel.dur; const e = ease(u);
      const [ax, ay, az] = bodyPos(travel.a), [bx, by, bz] = bodyPos(travel.b);
      goal.tx = (ax + (bx - ax) * e) * 0.75; goal.ty = (ay + (by - ay) * e) * 0.5; goal.tz = (az + (bz - az) * e) * 0.75;
      goal.dist = home().dist * (0.72 + Math.sin(Math.PI * e) * 0.18);
      if (u >= 1) { const id = travel.b.id; travel = null; anchors.get(id)?.focus({ preventScroll: true }); select(id); }
    }
    // replay
    if (replay?.playing && !paused) {
      replay.p += dt / 1.35; const M = months.length - 1;
      if (replay.p >= M + 0.6) { replay.playing = false; replay.p = M + 0.6; opts.onReplay?.({ done: true }); }
      setReplayP(replay.p, true);
    }
    // digest temperature follows derived status (and, during replay, whether posts were still arriving)
    const target = replay && tNow < Date.parse(graph.digest.last) + DAY && tNow >= Date.parse(graph.digest.first) ? 1 : graph.digest.status === 'publishing' ? 1 : 0;
    digestHeat += (target - digestHeat) * (cap.reduced ? 1 : Math.min(1, dt * 1.4));
    // camera easing
    const k = cap.reduced ? 1 : 1 - Math.exp(-dt * (travel ? 6 : 2.6));
    for (const key of ['yaw', 'pitch', 'dist', 'tx', 'ty', 'tz', 'cx', 'cy']) cam[key] += (goal[key] - cam[key]) * k;
    for (const [id, t0] of births) if (clock - t0 > 2.4) births.delete(id);
    for (const [id, t0] of newThreads) if (clock - t0 > 2.4) newThreads.delete(id);
  }

  function setReplayP(p, fromPlay = false) {
    const M = months.length - 1; const i = Math.floor(clamp(p, 0, M)); const f = clamp(p - i, 0, 1);
    const a = months[i], b = months[Math.min(M, i + 1)];
    tNow = p >= M + 0.5 ? S.tm.t1 : i >= M ? Math.min(S.tm.t1, a.t + f * (S.tm.t1 - a.t)) : a.t + (b.t - a.t) * f;
    if (!fromPlay) request();
    opts.onReplay?.({ p, month: months[Math.min(M, Math.round(clamp(p, 0, M)))], t: tNow, done: p >= M + 0.5 });
  }

  // ----- drawing -----
  const fogOf = (depth) => clamp((depth - (cam.dist - 0.35)) / 1.5, 0, 1);
  function draw() {
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const live = tNow >= S.tm.t1;
    const glPts = GL ? [] : null;
    const o = proj(0, 0, 0, []);

    // faint light of "now" at the centre
    if (o) { const R = 260 * vs; const gr = g.createRadialGradient(o[0], o[1], 0, o[0], o[1], R); gr.addColorStop(0, 'rgba(255,190,110,.07)'); gr.addColorStop(1, 'rgba(255,190,110,0)'); g.fillStyle = gr; g.fillRect(o[0] - R, o[1] - R, R * 2, R * 2); }

    // rings (time axis)
    g.lineWidth = 1; g.setLineDash([2, 6]);
    const la = ringLabelAngle(cam); const seen = new Set(); const ringLabels = [];
    for (const r of S.rings) {
      const key = r.rho.toFixed(3); if (seen.has(key)) continue; seen.add(key);
      const rho = live ? r.rho : mapR(S.tm.radiusAt(`${r.month}-01`, tNow)); if (r.t > tNow) continue;
      g.beginPath(); for (let i = 0; i <= 96; i++) { const a = (i / 96) * Math.PI * 2; const p = proj(Math.cos(a) * rho, 0, Math.sin(a) * rho); if (p) i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }
      g.strokeStyle = 'rgba(243,238,227,.075)'; g.stroke();
      const lp = proj(Math.cos(la) * rho, 0, Math.sin(la) * rho, []); if (lp && rho > 0.2) ringLabels.push([lp, fmtDate(`${r.month}-15`, 'month')]);
    }
    g.setLineDash([]);
    const obstacles = [];

    const keepRects = opts.keepOut?.() || [];
    // sectors (theme axis) + their keep-out boxes for labels
    g.font = `500 11px ${MONO}`; g.textAlign = 'center';
    for (const s of S.sectors) {
      const p = proj(Math.cos(s.angle) * 1.08, 0, Math.sin(s.angle) * 1.08, []); if (!p) continue;
      const label = spaced(s.label.toUpperCase()); const tw = g.measureText(label).width;
      p[0] = clamp(p[0], tw / 2 + 10, W - tw / 2 - 10); p[1] = clamp(p[1], 20, H - 10);
      for (const k of keepRects) if (p[0] + tw / 2 > k.x && p[0] - tw / 2 < k.x + k.w && p[1] > k.y && p[1] - 12 < k.y + k.h) p[0] = k.x + k.w + tw / 2 + 8;
      g.fillStyle = css(rgb(s.tint), 0.75); g.fillText(label, p[0], p[1]);
      obstacles.push({ x: p[0] - tw / 2, y: p[1] - 12, w: tw, h: 16 });
    }
    g.font = `400 10px ${MONO}`; g.fillStyle = 'rgba(139,131,115,.9)'; g.textAlign = 'left';
    const sectorBoxes = obstacles.slice();
    for (const [p, t] of ringLabels) {
      const bx = { x: p[0], y: p[1] + 1, w: 66, h: 15 };
      if (sectorBoxes.some((o) => bx.x < o.x + o.w && bx.x + bx.w > o.x && bx.y < o.y + o.h && bx.y + bx.h > o.y)) continue;
      g.fillText(t.toUpperCase(), p[0] + 4, p[1] + 12); obstacles.push(bx);
    }
    for (const r of keepRects) obstacles.push(r);

    // Digest dust: one grain per published post
    const heat = digestHeat; const dc = mix(rgb(S.digest.core?.tint ?? DIGEST_TINT.paused), WARM, heat);
    const coreA = 0; void coreA;
    const ndust = S.dustCount; let shown = 0; const hiPts = []; const glow = [];
    for (let i = 0; i < ndust; i++) {
      const t = dustPolar[i * 5 + 3]; if (t > tNow) continue; shown++;
      const rho0 = live ? null : mapR(S.tm.radiusAt(new Date(t).toISOString().slice(0, 10), tNow));
      let x, y, z;
      if (live) { x = S.dust[i * 5]; y = S.dust[i * 5 + 1]; z = S.dust[i * 5 + 2]; }
      else { const rho = rho0 + dustPolar[i * 5 + 1]; const a = dustPolar[i * 5] + (rho - 0.1) * 1.9; x = Math.cos(a) * rho; y = dustPolar[i * 5 + 2]; z = Math.sin(a) * rho; }
      const seed = dustPolar[i * 5 + 4];
      if (heat > 0.01 && cap.motion && !paused) { const w = clock * 0.06 * heat + seed * 6.28; x += Math.cos(w) * 0.004 * heat; z += Math.sin(w) * 0.004 * heat; }
      const p = proj(x, y, z); if (!p) continue;
      const fog = fogOf(p[2]);
      const age = clamp((tNow - t) / (S.tm.span * 0.6), 0, 1);
      let a = (0.5 + 0.35 * (1 - age)) * (1 - fog * 0.6) * (0.75 + heat * 0.25);
      if (heat > 0.01 && cap.motion && !paused) a *= 0.8 + 0.2 * Math.sin(clock * 2 + seed * 40);
      const size = (1.1 + seed * 0.9) * p[3] * vs * 1.05;
      if (hiDay != null && t === hiDay) { hiPts.push(p[0], p[1]); continue; }
      if (glPts) { const coc = Math.abs(p[2] - cam.dist) * 1.6; glPts.push(p[0], p[1], size * (5 + coc * 7), dc[0] / 255, dc[1] / 255, dc[2] / 255, a * 0.75 / (1 + coc * 2.2), 0.55, p[0], p[1], size * 24, dc[0] / 255, dc[1] / 255, dc[2] / 255, a * 0.05, 1); }
      else { glow.push(p[0], p[1], size, a); g.fillStyle = css(dc, a * 0.5); g.fillRect(p[0] - size / 2, p[1] - size / 2, size, size); }
    }
    // 2D tier: a soft additive bloom per grain so the lane reads as luminous dust, not dots
    if (!glPts && glow.length) {
      const spr = haze(dc); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < glow.length; i += 4) { const R = glow[i + 2] * 12; g.globalAlpha = glow[i + 3] * 0.011; g.drawImage(spr, glow[i] - R, glow[i + 1] - R, R * 2, R * 2); }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    }

    // the highlighted day: its posts glow amber above the lane
    if (hiPts.length) {
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < hiPts.length; i += 2) { g.drawImage(sprite([255, 190, 90]), hiPts[i] - 16, hiPts[i + 1] - 16, 32, 32); }
      g.globalCompositeOperation = 'source-over'; g.fillStyle = '#ffe2b0';
      let cx = 0, cy = 0; for (let i = 0; i < hiPts.length; i += 2) { g.fillRect(hiPts[i] - 1.5, hiPts[i + 1] - 1.5, 3, 3); cx += hiPts[i]; cy += hiPts[i + 1]; }
      cx /= hiPts.length / 2; cy /= hiPts.length / 2; let R = 0; for (let i = 0; i < hiPts.length; i += 2) R = Math.max(R, Math.hypot(hiPts[i] - cx, hiPts[i + 1] - cy));
      R += 14; g.strokeStyle = 'rgba(255,179,0,.8)'; g.setLineDash([3, 4]); g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
      if (hiLabel) { g.font = `500 11px ${MONO}`; g.textAlign = 'left'; g.lineWidth = 4; g.strokeStyle = 'rgba(11,10,8,.9)'; const t = hiLabel.toUpperCase(); g.strokeText(t, cx + R + 8, cy - R * 0.4); g.fillStyle = '#ffb300'; g.fillText(t, cx + R + 8, cy - R * 0.4); }
    }
    // bodies: project
    screen = [];
    const focusSet = new Set(); const focusId = selected || hover;
    if (focusId) { focusSet.add(focusId); for (const id of S.byId.get(focusId)?.item.related || []) focusSet.add(id); }
    if (travel) { focusSet.add(travel.a.id); focusSet.add(travel.b.id); }
    for (const b of S.bodies) {
      if (b.born > tNow && b.item.date) continue;
      const [x, y, z] = bodyPos(b); const p = proj(x, y, z, []); if (!p) continue;
      const r = Math.max(1.4, b.size * p[3] * 0.62 * vs);
      screen.push({ id: b.id, b, x: p[0], y: p[1], r, depth: p[2], fog: fogOf(p[2]) });
      if (!live && !births.has(b.id) && replay && tNow - b.born < 40 * DAY) births.set(b.id, clock);
    }
    const sp = new Map(screen.map((s) => [s.id, s]));

    // threads: documented relationships only
    for (const t of S.threads) {
      const A = sp.get(t.from.id), B = sp.get(t.to.id); if (!A || !B) continue;
      const [ax, ay, az] = bodyPos(t.from), [bx, by, bz] = bodyPos(t.to);
      const len = Math.hypot(ax - bx, az - bz);
      const C = proj((ax + bx) / 2, (ay + by) / 2 + 0.08 + len * 0.25, (az + bz) / 2, []); if (!C) continue;
      const on = focusSet.has(t.from.id) && focusSet.has(t.to.id) && (focusId === t.from.id || focusId === t.to.id || travel);
      const born = newThreads.get(`${t.from.id}>${t.to.id}`);
      const grow = born != null ? ease((clock - born) / 1.6) : 1;
      g.beginPath(); g.moveTo(A.x, A.y);
      if (grow < 1) { const q = grow; const mx = A.x + (C[0] - A.x) * q, my = A.y + (C[1] - A.y) * q; const ex = (1 - q) * (1 - q) * A.x + 2 * (1 - q) * q * C[0] + q * q * B.x; const ey = (1 - q) * (1 - q) * A.y + 2 * (1 - q) * q * C[1] + q * q * B.y; g.quadraticCurveTo(mx, my, ex, ey); }
      else g.quadraticCurveTo(C[0], C[1], B.x, B.y);
      g.setLineDash(on ? [] : [1.5, 4]); g.lineWidth = on ? 1.2 : 1;
      const fog = (A.fog + B.fog) / 2;
      g.strokeStyle = on ? 'rgba(255,226,180,.85)' : born != null ? 'rgba(255,179,0,.9)' : `rgba(255,232,196,${0.3 * (1 - fog * 0.5) * (focusId ? 0.55 : 1)})`;
      g.stroke(); g.setLineDash([]);
      // light travelling along the thread, in its documented direction
      if ((cap.motion && !paused) || on) {
        const speed = 0.12 / (0.4 + len); const u = on && !cap.motion ? 0.5 : (clock * speed + hash(t.from.id + t.to.id)) % 1;
        const qx = (1 - u) * (1 - u) * A.x + 2 * (1 - u) * u * C[0] + u * u * B.x; const qy = (1 - u) * (1 - u) * A.y + 2 * (1 - u) * u * C[1] + u * u * B.y;
        const fade = Math.sin(Math.PI * u);
        if (glPts) glPts.push(qx, qy, 16, 1, 0.9, 0.7, (on ? 0.9 : 0.45) * fade, 0.5);
        else { g.globalCompositeOperation = 'lighter'; g.globalAlpha = (on ? 0.9 : 0.5) * fade; const s = sprite([255, 226, 180]); g.drawImage(s, qx - 8, qy - 8, 16, 16); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
      }
    }
    // the travelling camera carries a brighter light along the followed thread
    if (travel) {
      const A = sp.get(travel.a.id), B = sp.get(travel.b.id);
      if (A && B) { const e = ease((clock - travel.t0) / travel.dur); const x = A.x + (B.x - A.x) * e, y = A.y + (B.y - A.y) * e; g.globalCompositeOperation = 'lighter'; g.drawImage(sprite([255, 200, 120]), x - 30, y - 30, 60, 60); g.globalCompositeOperation = 'source-over'; }
    }

    // stalks: a hairline from each body down to the disk plane (a depth cue, like an orrery)
    g.lineWidth = 1;
    for (const s of screen) {
      if (s.b.type === 'digest') continue;
      const [x, , z] = bodyPos(s.b); const f = proj(x, 0, z, []); if (!f) continue;
      const a = (0.2 - s.fog * 0.12) * (focusId && !focusSet.has(s.id) ? 0.5 : 1);
      g.strokeStyle = `rgba(243,238,227,${a})`; g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(f[0], f[1]); g.stroke();
      g.beginPath(); g.ellipse(f[0], f[1], s.r * 1.4, s.r * 1.4 * Math.sin(cam.pitch), 0, 0, Math.PI * 2); g.strokeStyle = `rgba(243,238,227,${a * 0.8})`; g.stroke();
    }
    // bodies: far to near
    screen.sort((a, b) => b.depth - a.depth);
    for (const s of screen) drawBody(s, focusId, focusSet, glPts, o);

    // now reticle
    if (o) {
      g.strokeStyle = 'rgba(255,210,140,.55)'; g.lineWidth = 1; g.beginPath(); g.arc(o[0], o[1], 5, 0, Math.PI * 2);
      g.moveTo(o[0] - 14, o[1]); g.lineTo(o[0] - 7, o[1]); g.moveTo(o[0] + 7, o[1]); g.lineTo(o[0] + 14, o[1]); g.moveTo(o[0], o[1] - 14); g.lineTo(o[0], o[1] - 7); g.moveTo(o[0], o[1] + 7); g.lineTo(o[0], o[1] + 14); g.stroke();
      g.font = `400 10px ${MONO}`; g.textAlign = 'center'; g.fillStyle = 'rgba(168,159,140,.95)';
      g.fillText(spaced(`NOW · ${fmtDate(new Date(tNow).toISOString().slice(0, 10), live ? 'day' : 'month')}`.toUpperCase(), 0.6), o[0], o[1] + 30);
      obstacles.push({ x: o[0] - 70, y: o[1] - 16, w: 140, h: 54 });
    }

    // labels
    drawLabels(focusId, focusSet, obstacles);

    if (GL) GL.draw(new Float32Array(glPts), glPts.length / 8);
    // anchors follow their bodies
    for (const [id, a] of anchors) {
      const s = sp.get(id);
      if (!s) { a.style.visibility = 'hidden'; a.tabIndex = -1; continue; }
      a.style.visibility = ''; a.tabIndex = 0;
      const d = Math.max(24, s.r * 2 + 10);
      a.style.width = a.style.height = d + 'px'; a.style.margin = `${-d / 2}px 0 0 ${-d / 2}px`;
      a.style.transform = `translate(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px)`;
    }
    opts.onFrame?.({ shown, total: ndust, t: tNow });
  }

  function drawBody(s, focusId, focusSet, glPts, o) {
    const { b, x, y, r, fog } = s; const it = b.item;
    const dim = focusId && !focusSet.has(b.id) ? 0.45 : 1;
    const coc = Math.abs(s.depth - cam.dist * (selected ? 1 : 1.05));
    const alpha = (1 - fog * 0.5) * dim;
    const base = b.type === 'digest' ? mix(rgb(b.tint), WARM, digestHeat) : rgb(b.tint);
    const c = mix(base, ASH, fog * 0.45);
    const born = births.get(b.id); const flare = born != null ? 1 - ease((clock - born) / 2.2) : 0;
    const live = b.live && cap.motion && !paused ? 0.86 + 0.14 * Math.sin(clock * 1.7 + hash(b.id) * 6.28) : 1;
    // halo (the light falls off; out-of-focus bodies spread wider and softer)
    const R = r * (b.type === 'digest' ? 9 : 7.5) * (1 + coc * 0.6) * (1 + flare * 2.5);
    const ha = alpha * (0.95 / (1 + coc * 0.8)) * live + flare;
    if (glPts) glPts.push(x, y, R * 2.2, c[0] / 255, c[1] / 255, c[2] / 255, Math.min(1.6, ha) * 1.25, 1);
    else { g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, ha); g.drawImage(sprite(c), x - R, y - R, R * 2, R * 2); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    const crisp = alpha / (1 + coc * 0.9);
    g.save(); g.globalAlpha = Math.min(1, crisp + flare);
    if (b.type === 'build') {
      const L = r * 4.6 * (focusId === b.id ? 1.5 : 1) * live;
      for (const [dx, dy, l, w] of [[1, 0, L, 0.9], [0, 1, L, 0.9], [0.707, 0.707, L * 0.32, 0.6], [0.707, -0.707, L * 0.32, 0.6]]) {
        const gr = g.createLinearGradient(x - dx * l, y - dy * l, x + dx * l, y + dy * l);
        gr.addColorStop(0, css(c, 0)); gr.addColorStop(0.5, css(c, 0.85)); gr.addColorStop(1, css(c, 0));
        g.strokeStyle = gr; g.lineWidth = w; g.beginPath(); g.moveTo(x - dx * l, y - dy * l); g.lineTo(x + dx * l, y + dy * l); g.stroke();
      }
      g.fillStyle = '#fff8ec'; g.beginPath(); g.arc(x, y, r * 0.62, 0, Math.PI * 2); g.fill();
    } else if (b.type === 'essay') {
      // a planet lit from the present: its bright side faces "now" at the centre
      let lx = (o ? o[0] : W / 2) - x, ly = (o ? o[1] : H / 2) - y; const ll = Math.hypot(lx, ly) || 1; lx /= ll; ly /= ll;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = '#17120c'; g.fill(); g.save(); g.clip();
      const gr = g.createRadialGradient(x + lx * r * 0.7, y + ly * r * 0.7, 0, x + lx * r * 0.5, y + ly * r * 0.5, r * 1.5);
      gr.addColorStop(0, css(mix(c, [255, 248, 236], 0.4), 1)); gr.addColorStop(0.55, css(c, 0.85)); gr.addColorStop(1, css(c, 0));
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
      g.strokeStyle = css(c, 0.5); g.lineWidth = 0.8; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
    } else if (b.type === 'video' || b.type === 'short') {
      const k = r; g.lineWidth = 1; g.strokeStyle = css(c, 0.8);
      g.beginPath(); g.ellipse(x, y, k * 1.8, k * 0.52, -0.28, Math.PI, Math.PI * 2); g.stroke();
      const gr = g.createRadialGradient(x - k * 0.25, y - k * 0.25, 0, x, y, k * 0.75); gr.addColorStop(0, css(mix(c, [255, 248, 236], 0.5))); gr.addColorStop(1, css(c, 1));
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, k * 0.72, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(x, y, k * 1.8, k * 0.52, -0.28, 0, Math.PI); g.stroke();
    } else if (b.type === 'digest') {
      g.strokeStyle = css(c, 0.7); g.setLineDash([1, 3]); g.lineWidth = 1;
      g.beginPath(); g.arc(x, y, r * 0.95, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(x, y, r * 1.6, 0, Math.PI * 2); g.globalAlpha *= 0.5; g.stroke(); g.setLineDash([]);
      if (digestHeat > 0.5 && cap.motion && !paused) { const a = clock * 0.8; g.beginPath(); g.arc(x, y, r * 1.6, a, a + 0.6); g.globalAlpha = 0.9; g.stroke(); }
    }
    if (b.demo) { g.globalAlpha = 1; g.strokeStyle = '#ffb300'; g.setLineDash([3, 3]); g.lineDashOffset = -clock * 6; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, r * 2.4 + 2, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); }
    if (flare > 0) { g.globalAlpha = flare; g.strokeStyle = 'rgba(255,214,150,1)'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, r * 2 + (1 - flare) * 46, 0, Math.PI * 2); g.stroke(); }
    if (focusId === b.id || document.activeElement === anchors.get(b.id)) {
      g.globalAlpha = 1; g.strokeStyle = 'rgba(255,248,236,.9)'; g.lineWidth = 1; const q = Math.max(9, r * 2.2);
      g.beginPath(); g.arc(x, y, q, 0, Math.PI * 2); g.stroke();
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; g.beginPath(); g.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q); g.lineTo(x + Math.cos(a) * (q + 5), y + Math.sin(a) * (q + 5)); g.stroke(); }
    }
    g.restore();
  }

  const c0 = () => true;
  function drawLabels(focusId, focusSet, obstacles) {
    const small = W < 700; const fs = small ? 12.5 : 13; const ms = small ? 9.5 : 10;
    const max = Math.round(clamp((W * H) / (small ? 22000 : 26000), 8, opts.maxLabels || 26));
    const cands = [];
    for (const s of screen) {
      if (s.r > 2) obstacles.push({ x: s.x - s.r * 0.7, y: s.y - s.r * 0.7, w: s.r * 1.4, h: s.r * 1.4 });
      const b = s.b; const t = shortTitle(b.item.title, small ? 26 : 32) + (b.demo ? ' (placeholder)' : '');
      const meta = metaLine(b.item, fmtDate).toUpperCase();
      let w = textW.get(b.id + t);
      if (!w) { g.font = `500 ${fs}px ${SANS}`; const a = g.measureText(t).width; g.font = `400 ${ms}px ${MONO}`; const m = small ? 0 : g.measureText(spaced(meta, 0.5)).width; w = Math.max(a, m) + 2; textW.set(b.id + t, w); }
      let pri = labelPriority(b, focusId, focusSet) * (1 - s.fog * 0.5);
      if (labelAlpha.get(b.id) > 0.5) pri *= 1.35; // hysteresis: labels that are showing tend to stay
      cands.push({ id: b.id, x: s.x, y: s.y, r: Math.max(3, s.r), w, h: small ? fs + 3 : fs + ms + 5, pri, t, meta: small && c0(b, focusId) ? '' : meta, s });
    }
    const placed = placeLabels(cands, { width: W, height: H, max, obstacles });
    const boxes = cands.filter((c) => placed.has(c.id)).map((c) => ({ ...placed.get(c.id), w: c.w, h: c.h }));
    const k = cap.reduced ? 1 : 0.2;
    for (const c of cands) {
      const L = placed.get(c.id); const target = L ? 1 : 0; const a0 = labelAlpha.get(c.id) ?? 0; const a = a0 + (target - a0) * k;
      labelAlpha.set(c.id, a); if (L) prevAlign.set(c.id, L);
      const P = L || prevAlign.get(c.id); if (!P || a < 0.02) continue;
      if (!L) { const bx = { x: P.x, y: P.y, w: c.w, h: c.h }; if (boxes.some((o) => bx.x < o.x + o.w && bx.x + bx.w > o.x && bx.y < o.y + o.h && bx.y + bx.h > o.y)) { labelAlpha.set(c.id, 0); continue; } }
      const tx = P.align === 'r' ? P.x + c.w : P.align === 'c' ? P.x + c.w / 2 : P.x;
      g.textAlign = P.align === 'r' ? 'right' : P.align === 'c' ? 'center' : 'left';
      const isF = c.id === focusId; const b = c.s.b;
      g.globalAlpha = a * (focusId && !focusSet.has(c.id) ? 0.55 : 1);
      g.font = `500 ${fs}px ${SANS}`; g.lineJoin = 'round'; g.lineWidth = 4; g.strokeStyle = 'rgba(11,10,8,.92)';
      g.strokeText(c.t, tx, P.y + fs); g.fillStyle = b.type === 'digest' ? css(mix(rgb(b.tint), WARM, digestHeat)) : b.demo ? '#ffb300' : isF ? '#ffffff' : '#f3eee3'; g.fillText(c.t, tx, P.y + fs);
      if (!c.meta || small) continue;
      g.font = `400 ${ms}px ${MONO}`; const m = spaced(c.meta, 0.5); g.strokeText(m, tx, P.y + fs + ms + 4); g.fillStyle = 'rgba(168,159,140,1)'; g.fillText(m, tx, P.y + fs + ms + 4);
    }
    g.globalAlpha = 1;
    if ([...labelAlpha.values()].some((v) => v > 0.02 && v < 0.98)) request();
  }

  // ----- public API -----
  const api = {
    get scene() { return S; },
    get paused() { return paused; },
    setPaused(p) { paused = p; request(); },
    select, deselect, follow, zoom: (f) => zoom(f),
    reset() { travel = null; deselect(); goal = home(); if (cap.reduced) cam = { ...goal }; request(); },
    replayStart() { replay = { p: 0, playing: true }; selected = null; if (card) card.hidden = true; goal = home(); births.clear(); paused = false; request(); },
    replayStop() { if (replay) replay.playing = false; request(); },
    replaySeek(p) { if (!replay) replay = { p, playing: false }; replay.p = p; replay.playing = false; setReplayP(p); request(); },
    replayEnd() { replay = null; tNow = S.tm.t1; births.clear(); request(); opts.onReplay?.({ done: true, p: months.length - 0.4, month: months.at(-1) }); },
    get months() { return months; },
    get replaying() { return !!replay?.playing; },
    setGraph(next, { born = [] } = {}) {
      const old = S; graph = next; S = buildScene(graph); months = monthsOf(graph); tNow = S.tm.t1; buildDust(); buildAnchors();
      for (const id of born) births.set(id, clock);
      for (const t of S.threads) { const key = `${t.from.id}>${t.to.id}`; if (!old.threads.some((x) => `${x.from.id}>${x.to.id}` === key)) newThreads.set(key, clock); }
      textW.clear(); request(); return S;
    },
    redraw: () => request(),
    _debug() { return { view: Object.keys(POSTER_VIEWS).find((k) => POSTER_VIEWS[k] === V), W, H, cam: { ...cam }, labels: [...labelAlpha].filter(([, a]) => a > 0.02).map(([id, a]) => [id, +a.toFixed(2)]), paused, tNow, fps: cap.fps }; },
    highlightDay(date, label = '') { hiDay = date ? Date.parse(date) : null; hiLabel = label; request(); },
    destroy() { io.disconnect(); ro.disconnect(); cancelAnimationFrame(raf); glc.remove(); c2.remove(); hits.remove(); },
  };

  resize();
  stage.classList.add('is-live'); stage.__universe = api;
  if (cap.gl) import('./gl.js').then((m) => { GL = m.createGL(glc, W, H, Math.min(dpr, 1.5)); if (GL) { stage.dataset.renderer = 'webgl'; request(); } }).catch(() => {});
  stage.dataset.renderer = 'canvas2d';
  return api;
}

const SANS = '"Hanken Grotesk", system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';
// letter-spacing for canvas text (canvas letterSpacing is not universal yet)
const spacedCache = new Map();
function spaced(s, em = 1) { const k = s + em; if (spacedCache.has(k)) return spacedCache.get(k); const v = em >= 1 ? s.split('').join('\u200a') : s; spacedCache.set(k, v); return v; }
export { TINT };
