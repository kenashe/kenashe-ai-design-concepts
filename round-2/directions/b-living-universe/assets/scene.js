// Direction B · The Living Universe · scene model.
// Pure ES module (no DOM). Used by render.js in Node (the prerendered SVG poster) and by the
// Canvas 2D / WebGL renderers in the browser, so the poster frame and the live universe agree.
//
// Every visible element is data:
//   bodies   one per build, essay, video, short (+ the Digest core), placed from item.layout
//   threads  graph.edges only (documented relationships)
//   dust     one particle per published Digest post, laid out by its real publish day (digest.perDay)
//   rings    one per timeline month (the radial time axis)
//   sectors  graph.themes (the angular axis)
// Nothing is positioned by hand. A new item lands where its theme and date put it.

export const TINT = {
  film: '#ff9468',    // ember
  onchain: '#86e0d2', // pale verdigris
  web: '#ffc35a',     // amber
  agents: '#c8ff4d',  // production accent2
  life: '#f6cfae',    // candle
};
// The Digest is a different phenomenon: cooler and dimmer. Its colour follows its derived status.
export const DIGEST_TINT = { paused: '#8f9cab', publishing: '#ffd7a1' };

export const hash = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967295; };
const DAY = 864e5;

/** Perceptual radius: graph radius 0.18..1 (newest..oldest) spread so the dense recent months get room. */
export const mapR = (r) => 0.1 + 0.9 * Math.pow(Math.max(0, Math.min(1, (r - 0.18) / 0.82)), 0.52);

/**
 * Time model, recovered from the graph rather than duplicated: graph.js sets
 * radius = 0.18 + clamp((t1 - date) / span) * 0.82. t1 is the newest dated item; span is read back
 * from any unclamped item. radiusAt(date, t) is then the radius that item would have had on day t,
 * which is what the growth replay uses. At t = t1 it equals item.layout.radius exactly.
 */
export function timeModel(graph) {
  const t1 = Date.parse(graph.stats.lastDate);
  const spans = graph.items
    .filter((i) => i.date && i.layout.radius > 0.19 && i.layout.radius < 0.99)
    .map((i) => (t1 - Date.parse(i.date)) / ((i.layout.radius - 0.18) / 0.82))
    .sort((a, b) => a - b);
  const span = spans.length ? spans[spans.length >> 1] : 365 * DAY;
  const radiusAt = (date, t = t1) => 0.18 + Math.min(1, Math.max(0, (t - Date.parse(date)) / span)) * 0.82;
  return { t1, span, radiusAt };
}

/** Months from the timeline, oldest first, used by the replay scrubber. */
export function monthsOf(graph) {
  return graph.timeline.slice().reverse().map((m) => ({
    month: m.month, t: Date.parse(`${m.month}-01`), tEnd: Date.parse(`${m.month}-01`) + 31 * DAY,
    items: m.items.length, digestPosts: m.digestPosts,
  }));
}

const gauss = (u, v) => Math.sqrt(-2 * Math.log(Math.max(1e-6, u))) * Math.cos(2 * Math.PI * v);

/** Build the 3D scene from the graph. Units: the disk has radius ~1, y is up. */
export function buildScene(graph) {
  const tm = timeModel(graph);
  const themes = graph.themes;
  const sector = (Math.PI * 2) / themes.length;
  const bodies = [];
  for (const it of graph.items) {
    const L = it.layout;
    const rho = mapR(L.radius);
    const isDigest = it.type === 'digest';
    // Hand-made work floats above the plane; the automated Digest lies in it.
    const y = isDigest ? 0 : 0.02 + L.jitter * 0.085 * (0.6 + rho);
    const size = isDigest ? 9 : it.type === 'build' ? 3.2 + L.weight * 2.3 : it.type === 'short' ? 2 + L.weight * 1.4 : 2.6 + L.weight * 2.1;
    bodies.push({
      id: it.id, item: it, type: it.type, theme: it.theme,
      angle: L.angle, rho, x: Math.cos(L.angle) * rho, y, z: Math.sin(L.angle) * rho, dx: 0, dz: 0,
      size, tint: isDigest ? DIGEST_TINT[it.status] ?? DIGEST_TINT.paused : TINT[it.theme] ?? '#f3eee3',
      born: it.date ? Date.parse(it.date) : 0,
      live: it.type === 'build' && /live/i.test(it.status || ''),
      demo: !!it.demo,
    });
  }
  relax(bodies);
  const byId = new Map(bodies.map((b) => [b.id, b]));
  const threads = graph.edges.map((e) => ({ from: byId.get(e.from), to: byId.get(e.to), type: e.type, evidence: e.evidence })).filter((t) => t.from && t.to);

  // Digest dust: one particle per published post, on the day it was published.
  const d = graph.digest;
  const core = bodies.find((b) => b.type === 'digest');
  const days = Object.entries(d.perDay || {}).sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, n]) => ({ date, n, t: Date.parse(date) }));
  const total = days.reduce((s, x) => s + x.n, 0);
  const dust = new Float32Array(total * 5); // x, y, z, publish day (days since epoch, exact in float32), seed
  let k = 0;
  for (const day of days) {
    const rho0 = mapR(tm.radiusAt(day.date));
    const width = 0.05 + 0.022 * Math.sqrt(day.n);
    for (let j = 0; j < day.n; j++) {
      const s = `${day.date}#${j}`;
      const u = hash(s), v = hash(s + 'v'), w = hash(s + 'w'), q = hash(s + 'q');
      const rho = rho0 + (u - 0.5) * 0.018;
      const a = (core?.angle ?? 3) + (rho - 0.1) * 1.9 + gauss(v, w) * width;
      dust[k++] = Math.cos(a) * rho; dust[k++] = gauss(q, u) * 0.006; dust[k++] = Math.sin(a) * rho;
      dust[k++] = day.t / DAY; dust[k++] = q;
    }
  }
  const raw = monthsOf(graph).filter((m) => m.t <= tm.t1).map((m) => ({ ...m, rho: mapR(tm.radiusAt(`${m.month}-01`)) }));
  // Months older than the layout span all sit on the rim; keep one ring there (the newest of them).
  const rings = raw.filter((r, i) => !(r.rho >= 0.999 && raw.slice(i + 1).some((x) => x.rho >= 0.999)));
  const sectors = themes.map((t, i) => ({ id: t.id, label: t.label, angle: i * sector, tint: TINT[t.id] }));
  return {
    bodies, byId, threads, dust, dustCount: total, days, rings, sectors, tm,
    digest: { status: d.status, statusLine: d.statusLine, published: d.published, last: d.last, first: d.first, core },
  };
}

/** Deterministic separation pass: bodies that would sit on top of each other drift apart a little. */
function relax(bodies) {
  const B = bodies.filter((b) => b.type !== 'digest');
  for (let iter = 0; iter < 60; iter++) {
    for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
      const a = B[i], b = B[j];
      const ax = a.x + a.dx, az = a.z + a.dz, bx = b.x + b.dx, bz = b.z + b.dz;
      let vx = bx - ax, vz = bz - az; const dist = Math.hypot(vx, vz) || 1e-4;
      const min = 0.05 + (a.size + b.size) * 0.0028;
      if (dist < min) {
        if (dist < 1e-3) { vx = Math.cos(hash(a.id + b.id) * 6.28); vz = Math.sin(hash(a.id + b.id) * 6.28); }
        const push = (min - dist) * 0.5 / (Math.hypot(vx, vz) || 1);
        a.dx -= vx * push; a.dz -= vz * push; b.dx += vx * push; b.dz += vz * push;
      }
    }
  }
  for (const b of B) { b.x += b.dx; b.z += b.dz; }
}

// ---------- camera ----------
export function camera(o = {}) {
  return { yaw: o.yaw ?? -0.62, pitch: o.pitch ?? 0.5, dist: o.dist ?? 2.35, tx: o.tx ?? 0, ty: o.ty ?? 0, tz: o.tz ?? 0, fov: o.fov ?? 0.95, cx: o.cx ?? 0.5, cy: o.cy ?? 0.5 };
}

/** Project world point to screen. Returns [sx, sy, depth, scale] or null when behind the camera. */
export function project(cam, w, h, x, y, z, out = []) {
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  let px = x - cam.tx, py = y - cam.ty, pz = z - cam.tz;
  // yaw around y
  const rx = px * cy - pz * sy; const rz = px * sy + pz * cy;
  // pitch around x (camera looks down at the disk)
  const ry = py * cp + rz * sp; const rz2 = -py * sp + rz * cp;
  const depth = cam.dist + rz2;
  if (depth < 0.05) return null;
  const f = (Math.min(w, h * 1.25) * 0.5) / Math.tan(cam.fov / 2);
  const s = f / depth;
  out[0] = w * cam.cx + rx * s; out[1] = h * cam.cy - ry * s; out[2] = depth; out[3] = s / f * cam.dist;
  return out;
}

// ---------- labels: level of detail + collision avoidance ----------
export const shortTitle = (t, n = 34) => (t.length > n ? t.slice(0, n - 1).replace(/[\s,:;.·-]+\S*$/, '') + '…' : t);

/** Priority of a body's label (higher = placed first). */
export function labelPriority(b, focusId, neighbours) {
  if (b.id === focusId) return 1e6;
  if (neighbours?.has(b.id)) return 1e5 + b.size;
  if (b.type === 'digest') return 5e4;
  const typeBonus = b.type === 'build' ? 1.6 : b.type === 'video' ? 1.1 : b.type === 'essay' ? 1.15 : 0.6;
  return b.size * typeBonus * (1.5 - b.rho) * (b.demo ? 50 : 1);
}

/**
 * Greedy placement. cands: [{id, x, y, r, w, h, pri}] sorted by caller or not.
 * Tries eight positions around each anchor; skips a label rather than letting it overlap.
 * Returns Map id -> {x, y, align} (x,y = top-left of the text box).
 */
export function placeLabels(cands, { width, height, max = 24, pad = 4, obstacles = [] } = {}) {
  const placed = []; const out = new Map();
  const boxes = obstacles.slice();
  const hit = (r) => r.x < 4 || r.y < 4 || r.x + r.w > width - 4 || r.y + r.h > height - 4 ||
    boxes.some((o) => r.x < o.x + o.w + pad && r.x + r.w + pad > o.x && r.y < o.y + o.h + pad && r.y + r.h + pad > o.y);
  const sorted = cands.slice().sort((a, b) => b.pri - a.pri);
  for (const c of sorted) {
    if (placed.length >= max && c.pri < 1e5) break;
    const g = c.r + 7;
    const opts = [
      [c.x + g, c.y - c.h / 2, 'l'], [c.x - g - c.w, c.y - c.h / 2, 'r'],
      [c.x + g * 0.7, c.y - g * 0.7 - c.h, 'l'], [c.x + g * 0.7, c.y + g * 0.7, 'l'],
      [c.x - g * 0.7 - c.w, c.y - g * 0.7 - c.h, 'r'], [c.x - g * 0.7 - c.w, c.y + g * 0.7, 'r'],
      [c.x - c.w / 2, c.y - g - c.h, 'c'], [c.x - c.w / 2, c.y + g, 'c'],
    ];
    for (const [x, y, align] of opts) {
      const r = { x, y, w: c.w, h: c.h };
      if (!hit(r)) { boxes.push(r); placed.push(c); out.set(c.id, { x, y, align }); break; }
    }
  }
  return out;
}

export const metaLine = (it, fmt) => {
  const kind = { build: 'Build', essay: 'Writing', video: 'Video', short: 'Short', digest: 'Automated' }[it.type];
  const when = fmt(it.date, it.precision);
  return it.type === 'build' ? `${kind} · ${it.status || ''} · ${when}` : it.type === 'digest' ? `${kind} · ${it.status}` : `${kind} · ${when}`;
};

/** Where month labels sit on the rings: just off the point nearest the camera. */
export const ringLabelAngle = (cam) => Math.atan2(-Math.cos(cam.yaw), -Math.sin(cam.yaw)) + 0.32;
