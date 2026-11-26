// Round 3 · The Living Universe · scene model.
// Pure ES module (no DOM). Used by render.js in Node (the prerendered SVG poster) and by the
// Canvas 2D / WebGL renderers in the browser, so the poster frame and the live universe agree.
//
// Everything visible is data:
//   bodies    one per build, essay, video, short, placed from item.layout (theme sector -> direction, t -> distance)
//   clusters  graph.clusters('month'|'quarter'|'year') when there is too much to draw one by one
//   threads   graph.edges only (documented relationships)
//   band      the automated Digest, aggregated from graph.digest.perWeek into a faint low band
//   rings     the time axis (quarters while the record is short, years once it is long)
//   sectors   graph.themes (dynamic: any number of themes, colours derived from theme.hue)
// "Now" (t = 1) is at the centre, where Ken's photograph stands. Work recedes outward into the past.
import { hash } from '../../../lib/graph.js';

const DAY = 864e5;
export const R0 = 0.235;   // inner radius: the present. Nothing is placed inside it, the portrait stands there.
export const TAU = 30;     // days. Smaller = more room for recent work, older years compress harder.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- colour: every theme's light is derived from theme.hue ----------
const hsl = (h, s, l) => {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12; const a = s * Math.min(l, 1 - l);
  const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return '#' + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0')).join('');
};
const VARIANT = {
  vivid: (h) => hsl(h, h < 95 || h > 330 ? 100 : 62, h > 200 && h < 320 ? 77 : h < 95 ? 68 : 70),
  pale: (h) => hsl(h, 62, 83),
  deep: (h) => hsl(h - 7, 78, 60),
};
const hueGap = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
/**
 * One colour per theme, from its hue. Themes whose hues sit close together (film 18, life 30, web 42)
 * take different variants (vivid / pale / deep) so they stay distinguishable. Seed themes are assigned
 * first so their colours never change when a new theme emerges.
 */
export function themeColors(themes) {
  const out = new Map(); const variant = new Map();
  const order = themes.slice().sort((a, b) => (b.seed ? 1 : 0) - (a.seed ? 1 : 0) || a.hue - b.hue);
  for (const t of order) {
    const used = new Set(order.filter((o) => variant.has(o.id) && hueGap(o.hue, t.hue) < 22).map((o) => variant.get(o.id)));
    const v = ['vivid', 'pale', 'deep'].find((x) => !used.has(x)) ?? 'vivid';
    variant.set(t.id, v); out.set(t.id, VARIANT[v](t.hue));
  }
  return out;
}
// The Digest is not a light. It is an ash band whose tint follows its derived status, never bright.
export const DIGEST_TINT = { paused: '#8a939d', publishing: '#b3a58f' };

// ---------- time ----------
/**
 * Time to radius. item.layout.t is 0 (start of the modern record) … 1 (now). The newest work sits at R0,
 * and age maps to radius logarithmically: with one year of work it is close to linear, with sixteen years
 * the newest year still owns about half of the radius and each older year is compressed a little more.
 * During the growth replay `tNow` < 1 and everything is nearer the centre, exactly where it was then.
 */
export function timeModel(graph) {
  const start = Date.parse(graph.time.start), end = Date.parse(graph.time.end);
  const span = Math.max(30, (end - start) / DAY);
  const denom = Math.log1p(span / TAU);
  const rho = (t, tNow = 1) => R0 + (1 - R0) * Math.log1p(Math.max(0, tNow - t) * span / TAU) / denom;
  const tOf = (iso) => clamp((Date.parse(iso) - start) / (end - start), 0, 1);
  const isoAt = (t) => new Date(start + clamp(t, 0, 1) * (end - start)).toISOString().slice(0, 10);
  return { start, end, span, rho, tOf, isoAt };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const periodLabel = (p) => (/^\d{4}$/.test(p) ? p : /Q/.test(p) ? `${p.slice(5)} ${p.slice(0, 4)}` : `${MONTHS[+p.slice(5, 7) - 1]} ${p.slice(0, 4)}`);
const quarterOf = (m) => `${m.slice(0, 4)}-Q${Math.floor((+m.slice(5, 7) - 1) / 3) + 1}`;

/** Build the scene from the graph. Units: the disk has radius 1, y is up, "now" is the origin. */
export function buildScene(graph) {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const tm = timeModel(graph);
  const colors = themeColors(graph.themes);
  const digestItem = graph.byId.get('digest');
  const bodies = [];
  for (const it of graph.items) {
    if (it.type === 'digest') continue;
    const L = it.layout;
    const size = it.type === 'build' ? 3.4 + L.weight * 2.2 : it.type === 'short' ? 2.1 + L.weight * 1.3 : 2.8 + L.weight * 2;
    bodies.push({
      id: it.id, item: it, type: it.type, theme: it.theme, angle: L.angle, t: L.t, jitter: L.jitter,
      size, tint: colors.get(it.theme) ?? '#f4efe4', pri: it.priority,
      live: it.type === 'build' && /live/i.test(it.status || ''), demo: !!it.demo, dx: 0, dz: 0,
    });
  }
  const byId = new Map(bodies.map((b) => [b.id, b]));
  const threads = graph.edges.map((e) => ({ from: byId.get(e.from), to: byId.get(e.to), type: e.type, evidence: e.evidence })).filter((t) => t.from && t.to);
  const threadsOf = new Map();
  for (const t of threads) { (threadsOf.get(t.from.id) ?? threadsOf.set(t.from.id, []).get(t.from.id)).push(t); (threadsOf.get(t.to.id) ?? threadsOf.set(t.to.id, []).get(t.to.id)).push(t); }

  // by month, newest first: the level-of-detail window is made of whole months
  const byMonth = new Map();
  for (const b of bodies) (byMonth.get(b.item.month) ?? byMonth.set(b.item.month, []).get(b.item.month)).push(b);
  const months = [...byMonth.keys()].sort().reverse();

  // time axis: years, plus quarters while the record is short
  const rings = [];
  const y0 = new Date(tm.start).getUTCFullYear(), y1 = new Date(tm.end).getUTCFullYear();
  const fine = tm.span < 900;
  for (let y = y0; y <= y1; y++) for (const m of fine ? [0, 3, 6, 9] : [0]) {
    const ms = Date.UTC(y, m, 1); if (ms <= tm.start || ms >= tm.end - 20 * DAY) continue;
    rings.push({ t: (ms - tm.start) / (tm.end - tm.start), label: m === 0 ? String(y) : `${MONTHS[m]} ${y}`, major: m === 0 });
  }
  const earlier = bodies.some((b) => Date.parse(b.item.date) < tm.start);
  rings.push({ t: 0, label: earlier ? `Before ${MONTHS[new Date(tm.start).getUTCMonth()]} ${new Date(tm.start).getUTCFullYear()}` : '', major: true, rim: true });

  const sectors = graph.themes.map((t) => ({ id: t.id, label: t.label, start: t.start, span: t.span, mid: t.mid, count: t.count, tint: colors.get(t.id) }));

  // The Digest: aggregated per week into radial bins. No grain per post, so 1,399 or 55,000 posts cost the same.
  const d = graph.digest; const sec = graph.sector[digestItem?.theme] ?? graph.themes[0];
  const weeks = (d.perWeek || []).map((w) => ({ t: w.t, n: w.n, start: w.start }));
  const band = { a0: sec.start + sec.span * 0.16, a1: sec.start + sec.span * 0.84, mid: sec.mid, weeks, status: d.status, tint: DIGEST_TINT[d.status] ?? DIGEST_TINT.paused, item: digestItem };

  // cluster bodies (made on demand, one per graph cluster)
  const clusterBodies = new Map();
  const clusterBody = (c) => {
    let b = clusterBodies.get(c.id);
    if (!b) {
      b = { id: c.id, cluster: c, isCluster: true, type: 'cluster', theme: c.theme, angle: c.layout.angle, t: c.layout.t, jitter: 0.25,
        size: 5 + Math.sqrt(c.count) * 2.1, tint: colors.get(c.theme) ?? '#f4efe4', pri: 2 + Math.sqrt(c.count), count: c.count, dx: 0, dz: 0 };
      clusterBodies.set(c.id, b);
    }
    return b;
  };
  const S = { bodies, byId, threads, threadsOf, byMonth, months, rings, sectors, band, tm, colors, clusterBody, graph,
    digest: { status: d.status, statusLine: d.statusLine, published: d.published, first: d.first, last: d.last } };
  S.buildMs = typeof performance !== 'undefined' ? performance.now() - t0 : 0;
  return S;
}

/** Radial bins of the Digest band at scene time tNow: [{r0, r1, a}] with a in 0..1 (relative density). */
export function bandBins(S, tNow = 1, N = 36) {
  const bins = new Float64Array(N); const wk = 7 / S.tm.span; const idx = (r) => ((r - R0) / (1 - R0)) * N;
  for (const w of S.band.weeks) {
    if (w.t > tNow) continue;
    // a week covers a radial interval (its start … its end); spread its posts over the bins it touches so the band is continuous
    const a = idx(S.tm.rho(Math.min(tNow, w.t + wk), tNow)), b = Math.max(a + 1e-6, idx(S.tm.rho(w.t, tNow)));
    for (let i = Math.max(0, Math.floor(a)); i <= Math.min(N - 1, Math.floor(b)); i++) bins[i] += (w.n * (Math.min(b, i + 1) - Math.max(a, i))) / (b - a);
  }
  let max = 0; const out = [];
  for (let i = 0; i < N; i++) { const r0 = R0 + ((1 - R0) * i) / N, r1 = R0 + ((1 - R0) * (i + 1)) / N; const v = bins[i] / (r0 + r1); if (v > max) max = v; out.push({ r0, r1, v }); }
  return out.filter((b) => b.v > max * 0.02).map((b) => ({ r0: b.r0, r1: b.r1, a: Math.sqrt(b.v / max) }));
}

/** World position of a body at scene time tNow. */
export function place(S, b, tNow = 1, out = [0, 0, 0]) {
  const rho = S.tm.rho(b.t, tNow);
  out[0] = Math.cos(b.angle) * rho + b.dx; out[1] = 0.02 + b.jitter * 0.085 * (0.6 + rho); out[2] = Math.sin(b.angle) * rho + b.dz;
  return out;
}

/**
 * Level of detail. Returns what to draw at scene time tNow:
 *   lights    individual bodies: whole months, newest first, until `budget` is reached (plus expanded clusters)
 *   clusters  everything older, as graph.clusters: months to finish the cut quarter, then quarters, then,
 *             once `clusterBudget` fills, whole years
 * With today's 44 items everything is a light and there are no clusters.
 */
export function partition(S, { tNow = 1, budget = 240, clusterBudget = 110, expanded = null } = {}) {
  const g = S.graph; const cutIso = S.tm.isoAt(tNow); const cutMonth = cutIso.slice(0, 7);
  const born = (b) => tNow >= 1 || b.t <= tNow || b.item.date <= cutIso;
  const months = tNow >= 1 ? S.months : S.months.filter((m) => m <= cutMonth);
  let lights = []; let i = 0;
  for (; i < months.length; i++) {
    const arr = tNow >= 1 ? S.byMonth.get(months[i]) : S.byMonth.get(months[i]).filter(born);
    if (lights.length && lights.length + arr.length > budget) break;
    for (const b of arr) lights.push(b);
  }
  if (lights.length > budget * 1.5) lights = lights.sort((a, b) => b.pri - a.pri).slice(0, Math.round(budget * 1.5));
  const clusters = [];
  if (i < months.length) {
    const idx = (level) => { const k = `_idx_${level}`; if (!S[k]) { S[k] = new Map(); for (const c of g.clusters(level)) (S[k].get(c.period) ?? S[k].set(c.period, []).get(c.period)).push(c); } return S[k]; };
    const cutQ = quarterOf(months[i - 1] ?? ''); const started = new Set(months.slice(0, i).map((m) => m.slice(0, 4)));
    const seen = new Set(); let yearMode = false;
    for (let j = i; j < months.length; j++) {
      const m = months[j], q = quarterOf(m), y = m.slice(0, 4);
      if (q === cutQ) { started.add(y); for (const c of idx('month').get(m) || []) clusters.push(c); continue; }
      if (!yearMode && clusters.length >= clusterBudget * 0.55 && !started.has(y)) yearMode = true;
      const key = yearMode ? y : q; if (seen.has(key)) continue; seen.add(key);
      if (!yearMode) started.add(y);
      for (const c of idx(yearMode ? 'year' : 'quarter').get(key) || []) clusters.push(c);
    }
  }
  let cl = clusters.map((c) => S.clusterBody(c));
  if (expanded?.size) {
    const open = cl.filter((c) => expanded.has(c.id)); cl = cl.filter((c) => !expanded.has(c.id));
    for (const c of open) for (const id of c.cluster.ids) { const b = S.byId.get(id); if (b) lights.push(b); }
  }
  // which cluster holds an item that is not drawn individually (so a focused thread can still end somewhere)
  const holder = new Map(); for (const c of cl) for (const id of c.cluster.ids) holder.set(id, c);
  relax(S, lights, cl, tNow);
  return { lights, clusters: cl, holder, tNow };
}

/** Deterministic separation pass over what is actually drawn: bodies that would overlap drift apart a little. */
function relax(S, lights, clusters, tNow) {
  const B = lights.concat(clusters); const n = B.length; if (n < 2) return;
  const X = new Float64Array(n), Z = new Float64Array(n), M = new Float64Array(n); const p = [0, 0, 0];
  for (let i = 0; i < n; i++) { const b = B[i]; b.dx = 0; b.dz = 0; place(S, b, tNow, p); X[i] = p[0]; Z[i] = p[2]; M[i] = 0.034 + b.size * 0.0042; }
  const cell = 0.12; const iters = n > 300 ? 14 : 36;
  for (let it = 0; it < iters; it++) {
    const grid = new Map();
    for (let i = 0; i < n; i++) { const k = Math.floor(X[i] / cell) * 4096 + Math.floor(Z[i] / cell); (grid.get(k) ?? grid.set(k, []).get(k)).push(i); }
    let moved = false;
    for (let i = 0; i < n; i++) {
      const cx = Math.floor(X[i] / cell), cz = Math.floor(Z[i] / cell);
      for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gz = cz - 1; gz <= cz + 1; gz++) {
        const arr = grid.get(gx * 4096 + gz); if (!arr) continue;
        for (const j of arr) {
          if (j <= i) continue;
          let vx = X[j] - X[i], vz = Z[j] - Z[i]; let dist = Math.hypot(vx, vz); const min = M[i] + M[j];
          if (dist >= min) continue;
          if (dist < 1e-4) { const a = hash(B[i].id + B[j].id) * 6.283; vx = Math.cos(a); vz = Math.sin(a); dist = 1; }
          const push = ((min - Math.hypot(X[j] - X[i], Z[j] - Z[i])) * 0.5) / dist;
          X[i] -= vx * push; Z[i] -= vz * push; X[j] += vx * push; Z[j] += vz * push; moved = true;
        }
      }
    }
    if (!moved) break;
  }
  for (let i = 0; i < n; i++) {
    const b = B[i]; place(S, b, tNow, p);
    // never push a body into the present (the portrait stands there) or far off the disk
    let x = X[i], z = Z[i]; const r = Math.hypot(x, z);
    if (r < R0) { x *= R0 / (r || 1); z *= R0 / (r || 1); } else if (r > 1.08) { x *= 1.08 / r; z *= 1.08 / r; }
    b.dx = x - p[0]; b.dz = z - p[2];
  }
}

// ---------- camera ----------
export const FOCAL = 2.6; // perspective strength: at cam.dist === FOCAL, one world unit at the target is U pixels
export function camera(o = {}) {
  return { yaw: o.yaw ?? 0.9, pitch: o.pitch ?? 0.5, dist: o.dist ?? FOCAL, tx: o.tx ?? 0, ty: o.ty ?? 0, tz: o.tz ?? 0 };
}
/** Project a world point. (ox, oy) is where the camera target lands on screen, U the pixels per world unit. Returns [sx, sy, depth, scale] or null. */
export function project(cam, ox, oy, U, x, y, z, out = []) {
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  const px = x - cam.tx, py = y - cam.ty, pz = z - cam.tz;
  const rx = px * cy - pz * sy; const rz = px * sy + pz * cy;
  const ry = py * cp + rz * sp; const rz2 = -py * sp + rz * cp;
  const depth = cam.dist + rz2;
  if (depth < 0.12) return null;
  const s = FOCAL / depth;
  out[0] = ox + rx * s * U; out[1] = oy - ry * s * U; out[2] = depth; out[3] = s;
  return out;
}
/** Yaw that brings world angle `a` to the front of the disk (nearest the viewer), offset a little to one side. */
export const yawFacing = (a, current, side = 0.3) => { const want = -Math.PI / 2 + side - a; return current + Math.atan2(Math.sin(want - current), Math.cos(want - current)); };

// ---------- labels: few, large, never overlapping ----------
export const shortTitle = (t, n = 30) => (t.length > n ? t.slice(0, n - 1).replace(/[\s,:;.·|-]+\S*$/, '').replace(/(\s+(a|an|the|to|of|is|and|in|on|my|i|for|with|then))+$/i, '').replace(/[\s,:;.·|-]+$/, '') + '…' : t);

/**
 * Greedy placement. cands: [{id, x, y, r, w, h, pri}]. Tries six positions around each anchor and skips a
 * label rather than letting it overlap another label, a body, or a keep-out rectangle.
 * Returns Map id -> {x, y, align} (x, y = top-left of the text box).
 */
export function placeLabels(cands, { x0 = 0, y0 = 0, width, height, max = 12, pad = 6, obstacles = [] } = {}) {
  const out = new Map(); const boxes = obstacles.slice(); let n = 0;
  const hit = (r) => r.x < x0 + 6 || r.y < y0 + 6 || r.x + r.w > x0 + width - 6 || r.y + r.h > y0 + height - 6 ||
    boxes.some((o) => r.x < o.x + o.w + pad && r.x + r.w + pad > o.x && r.y < o.y + o.h + pad && r.y + r.h + pad > o.y);
  for (const c of cands.slice().sort((a, b) => b.pri - a.pri)) {
    if (n >= max && c.pri < 1e5) break;
    const g = c.r + 9;
    const opts = [
      [c.x + g, c.y - c.h / 2, 'l'], [c.x - g - c.w, c.y - c.h / 2, 'r'],
      [c.x - c.w / 2, c.y + g, 'c'], [c.x - c.w / 2, c.y - g - c.h, 'c'],
      [c.x + g * 0.7, c.y + g * 0.6, 'l'], [c.x - g * 0.7 - c.w, c.y + g * 0.6, 'r'],
    ];
    if (c.pri >= 1e6) opts.push([c.x - c.w / 2, c.y + g + c.h + 10, 'c'], [c.x + g + 24, c.y + c.h, 'l'], [c.x - g - 24 - c.w, c.y + c.h, 'r'], [c.x - c.w / 2, c.y - g - c.h * 2 - 10, 'c']); // the focused label always finds a place
    for (const [x, y, align] of opts) {
      const r = { x, y, w: c.w, h: c.h };
      if (!hit(r)) { boxes.push(r); out.set(c.id, { x, y, align }); n++; break; }
    }
  }
  return out;
}

export { hash };

/** On-screen radius of a body. s = perspective scale from project(), U = pixels per world unit. */
export const bodyRadius = (b, s, U) => Math.max(b.isCluster ? 5 : 2.3, b.size * s * 0.8 * Math.pow(U / 500, 0.6));
