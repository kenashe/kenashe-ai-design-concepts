// Direction B · The Living Universe · region renderers.
// Pure ES module: runs in Node (tools/prerender.mjs) and in the browser (publishing demo, ?demo=).
// Every list, count, date, position and relationship below comes from the graph.
import { esc, fmtDate, hrefFor, typeLabel } from '../../lib/graph.js';
import { DEMO_STEPS } from '../../lib/publish-demo.js';
import { buildScene, camera, project, placeLabels, labelPriority, shortTitle, metaLine, ringLabelAngle, monthsOf, TINT, DIGEST_TINT, mapR } from './assets/scene.js';

export const BUILT = ['/', '/building/autonomous-ai-blog/', '/building/returning-your-things/'];
const DIR = 'b-living-universe';

const href = (path, ctx) => hrefFor(path, ctx, BUILT);
/** Prototype-only routes inside this direction (proposed additions, see REPORT.md). */
const local = (path, ctx) => `${ctx.base}directions/${ctx.dir || DIR}/${path}`;
const ext = (url) => (/^https?:/.test(url) ? ' target="_blank" rel="noopener noreferrer"' : '');
const n = (x) => Number(x).toLocaleString('en-US');
const fmt = (it) => fmtDate(it.date, it.precision);

/** Below-the-fold image: loads when it nears the viewport (assets/lazy.js); <noscript> keeps it for JS-off. */
const lazy = (src, w, h, extra = '') => `<img data-src="${esc(src)}" alt="" width="${w}" height="${h}" decoding="async"${extra}><noscript><img src="${esc(src)}" alt="" width="${w}" height="${h}"${extra}></noscript>`;

const sceneCache = new WeakMap();
export const sceneOf = (graph) => { let s = sceneCache.get(graph); if (!s) { s = buildScene(graph); sceneCache.set(graph, s); } return s; };

// ---------- small data-derived glyphs (shared visual language with the canvas) ----------
const r2 = (v) => Math.round(v * 100) / 100;
function glyph(it, size = 28) {
  const c = it.type === 'digest' ? DIGEST_TINT[it.status] ?? DIGEST_TINT.paused : TINT[it.theme];
  const h = size / 2, r = r2(size * 0.16); const R = (k) => r2(r * k);
  let body = '';
  if (it.type === 'build') {
    body = `<path d="M${r2(h - size * 0.46)} ${h}H${r2(h + size * 0.46)}M${h} ${r2(h - size * 0.46)}V${r2(h + size * 0.46)}" stroke="${c}" stroke-width="1" opacity=".75"/>` +
      `<circle cx="${h}" cy="${h}" r="${R(1.15)}" fill="#fff8ec"/>` + (/live/i.test(it.status) ? `<circle cx="${h}" cy="${h}" r="${R(2.4)}" fill="none" stroke="${c}" stroke-width="1" opacity=".6"/>` : '');
  } else if (it.type === 'essay') {
    body = `<circle cx="${h}" cy="${h}" r="${R(1.9)}" fill="#1b1712" stroke="${c}" stroke-width="1"/><path d="M${h} ${r2(h - r * 1.9)}A${R(1.9)} ${R(1.9)} 0 0 1 ${h} ${r2(h + r * 1.9)}A${R(0.9)} ${R(1.9)} 0 0 0 ${h} ${r2(h - r * 1.9)}Z" fill="${c}"/>`;
  } else if (it.type === 'video' || it.type === 'short') {
    const k = it.type === 'short' ? 0.75 : 1;
    body = `<circle cx="${h}" cy="${h}" r="${R(1.4 * k)}" fill="${c}"/><ellipse cx="${h}" cy="${h}" rx="${R(3 * k)}" ry="${R(0.95 * k)}" fill="none" stroke="${c}" stroke-width="1" transform="rotate(-18 ${h} ${h})"/>`;
  } else {
    body = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => `<circle cx="${r2(h + Math.cos(i * 2.4) * i * size * 0.045)}" cy="${r2(h + Math.sin(i * 2.4) * i * size * 0.03)}" r="1" fill="${c}"/>`).join('');
  }
  return `<svg class="glyph" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">${body}</svg>`;
}

/** Zero-length round-capped segments as one compact relative path: one dot per point. */
function dotPath(points) { let d = '', px = 0, py = 0; for (const [x, y] of points) { const X = Math.round(x), Y = Math.round(y); d += d ? `m${X - px} ${Y - py}h0` : `M${X} ${Y}h0`; px = X; py = Y; } return d; }

// ---------- the universe poster: a static SVG frame of the same scene the canvas animates ----------
const VIEWS = {
  wide: { w: 1200, h: 820, cam: { yaw: 1.6, pitch: 0.6, dist: 1.42, cx: 0.5, cy: 0.5, fov: 1.0 }, labels: 24, font: 13, keepOut: [{ x: 0, y: 0, w: 250, h: 820 }] },
  tall: { w: 600, h: 1000, cam: { yaw: 1.6, pitch: 0.9, dist: 1.36, cx: 0.5, cy: 0.64, fov: 0.95 }, labels: 10, font: 20, keepOut: [{ x: 0, y: 0, w: 600, h: 400 }] },
  'tall-full': { w: 600, h: 1000, cam: { yaw: 1.6, pitch: 0.95, dist: 1.42, cx: 0.5, cy: 0.56, fov: 0.95 }, labels: 12, font: 20, keepOut: [{ x: 0, y: 0, w: 600, h: 200 }] },
  nebula: { w: 1200, h: 620, cam: { yaw: 1.9, pitch: 1.12, dist: 0.78, cx: 0.5, cy: 0.5, fov: 1.0 }, target: 'dust', labels: 12, font: 13 },
  'nebula-tall': { w: 600, h: 760, cam: { yaw: 0.35, pitch: 1.2, dist: 0.86, cx: 0.5, cy: 0.5, fov: 1.0 }, target: 'dust', labels: 7, font: 19 },
  full: { w: 1440, h: 860, cam: { yaw: 1.6, pitch: 0.62, dist: 1.5, cx: 0.5, cy: 0.5, fov: 1.0 }, labels: 32, font: 13 },
};
export const POSTER_VIEWS = VIEWS;
/** Resolve a view's camera against the scene (a 'dust' target looks at the Digest lane's centre of mass). */
export function viewCamera(V, S) {
  const c = { ...V.cam };
  if (V.target === 'dust' && S.dustCount) { let x = 0, z = 0; for (let i = 0; i < S.dustCount; i++) { x += S.dust[i * 5]; z += S.dust[i * 5 + 2]; } c.tx = x / S.dustCount; c.tz = z / S.dustCount; }
  return c;
}

export function posterSVG(graph, ctx, view = 'wide', { focus = null, highlight = [] } = {}) {
  const V = VIEWS[view]; const { w, h } = V; const tall = h > w;
  const S = sceneOf(graph); const P = []; const cam = camera(viewCamera(V, S));
  const pr = (x, y, z) => { const p = project(cam, w, h, x, y, z, P); return p ? [p[0], p[1], p[2], p[3]] : null; };
  const f1 = (v) => Math.round(v * 10) / 10;
  let out = `<svg class="poster poster-${view}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" role="img" aria-labelledby="pt-${view}" xmlns="http://www.w3.org/2000/svg">`;
  out += `<title id="pt-${view}">Map of Ken Ashe's work: ${S.bodies.length - 1} builds, essays and videos placed by topic and date, ${S.threads.length} documented relationships, and ${n(S.dustCount)} automated Digest posts.</title>`;
  out += '<defs>' + Object.entries({ ...TINT, digest: S.digest.core?.tint ?? DIGEST_TINT.paused }).map(([k, c]) =>
    `<radialGradient id="h-${view}-${k}"><stop offset="0" stop-color="${c}" stop-opacity=".55"/><stop offset=".25" stop-color="${c}" stop-opacity=".16"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`).join('') + '</defs>';
  // rings (time axis)
  const seen = new Set(); let rings = ''; const ringBoxes = [];
  for (const r of S.rings) {
    const key = r.rho.toFixed(3); if (seen.has(key)) continue; seen.add(key);
    let d = '';
    for (let i = 0; i <= 72; i++) { const a = (i / 72) * Math.PI * 2; const p = pr(Math.cos(a) * r.rho, 0, Math.sin(a) * r.rho); if (p) d += `${i ? 'L' : 'M'}${Math.round(p[0])} ${Math.round(p[1])}`; }
    rings += `<path d="${d}" class="ring"/>`;
    const la = ringLabelAngle(cam); const lp = pr(Math.cos(la) * r.rho, 0, Math.sin(la) * r.rho);
    if (lp && r.rho > 0.2) { rings += `<text x="${f1(lp[0] + 4)}" y="${f1(lp[1]) + 12}" class="ring-l">${esc(fmtDate(`${r.month}-15`, 'month'))}</text>`; ringBoxes.push({ x: lp[0], y: lp[1] + 1, w: tall ? 100 : 66, h: tall ? 20 : 15 }); }
  }
  out += `<g class="rings">${rings}</g>`;
  // sectors (theme axis)
  const obstacles = ringBoxes;
  const sfs = tall ? 18 : 11;
  out += '<g class="sectors">' + S.sectors.map((s) => {
    const p = pr(Math.cos(s.angle) * 1.08, 0, Math.sin(s.angle) * 1.08);
    if (!p) return '';
    const tw = s.label.length * sfs * 0.78;
    p[0] = Math.max(tw / 2 + 12, Math.min(w - tw / 2 - 12, p[0])); p[1] = Math.max(sfs + 8, Math.min(h - 8, p[1]));
    obstacles.push({ x: p[0] - tw / 2, y: p[1] - sfs, w: tw, h: sfs * 1.4 });
    return `<text x="${f1(p[0])}" y="${f1(p[1])}" class="sector-l" fill="${s.tint}">${esc(s.label)}</text>`;
  }).join('') + '</g>';
  // dust: one dot per post, drawn as a single path of zero-length round-capped segments
  const dp = [];
  for (let i = 0; i < S.dustCount; i++) { const p = pr(S.dust[i * 5], S.dust[i * 5 + 1], S.dust[i * 5 + 2]); if (p && p[0] > -10 && p[0] < w + 10 && p[1] > -10 && p[1] < h + 10) dp.push(p); }
  const dust = dotPath(dp);
  out += `<path class="dust" d="${dust}" stroke="${S.digest.core?.tint}"/>`;
  // threads
  const proj = new Map(S.bodies.map((b) => [b.id, pr(b.x, b.y, b.z)]));
  out += '<g class="threads">' + S.threads.map((t) => {
    const a = proj.get(t.from.id), b = proj.get(t.to.id); if (!a || !b) return '';
    const len = Math.hypot(t.from.x - t.to.x, t.from.z - t.to.z);
    const c = pr((t.from.x + t.to.x) / 2, (t.from.y + t.to.y) / 2 + 0.08 + len * 0.25, (t.from.z + t.to.z) / 2);
    return c ? `<path d="M${f1(a[0])} ${f1(a[1])}Q${f1(c[0])} ${f1(c[1])} ${f1(b[0])} ${f1(b[1])}" class="thread"/>` : '';
  }).join('') + '</g>';
  // now reticle
  const o = pr(0, 0, 0);
  if (o) out += `<g class="now" transform="translate(${f1(o[0])} ${f1(o[1])})"><circle r="5"/><path d="M-14 0h7M7 0h7M0 -14v7M0 7v7"/><text y="30" class="now-l">Now · ${esc(fmtDate(graph.stats.lastDate))}</text></g>`;
  // bodies, far to near
  const order = S.bodies.map((b) => ({ b, p: proj.get(b.id) })).filter((x) => x.p).sort((x, y) => y.p[2] - x.p[2]);
  const k = tall ? 0.95 : 1;
  out += '<g class="bodies">';
  for (const { b, p } of order) {
    const it = b.item; const r = Math.max(1.6, b.size * p[3] * 0.62 * k);
    const fog = Math.min(1, Math.max(0, (p[2] - 1.6) / 1.6));
    const hl = highlight.includes(b.id);
    const foot = b.type !== 'digest' ? pr(b.x, 0, b.z) : null;
    if (foot) out += `<path class="stalk" d="M${f1(p[0])} ${f1(p[1])}V${f1(foot[1])}" opacity="${f1(0.5 - fog * 0.3)}"/><ellipse class="foot" cx="${f1(foot[0])}" cy="${f1(foot[1])}" rx="${f1(r * 1.4)}" ry="${f1(r * 1.4 * Math.sin(cam.pitch))}"/>`;
    let g = `<circle r="${f1(r * (b.type === 'digest' ? 9 : 6))}" fill="url(#h-${view}-${b.type === 'digest' ? 'digest' : b.theme})" opacity="${f1(1 - fog * 0.5)}"/>`;
    if (b.type === 'build') g += `<path d="M${-r * 4.2} 0H${r * 4.2}M0 ${-r * 4.2}V${r * 4.2}" class="spike" stroke="${b.tint}"/><circle r="${f1(r * 0.62)}" class="core"/>`;
    else if (b.type === 'essay') g += `<circle r="${f1(r)}" class="planet" stroke="${b.tint}"/><circle r="${f1(r * 0.78)}" cx="${f1(-p[0] + o[0] > 0 ? r * 0.25 : -r * 0.25)}" fill="${b.tint}" opacity=".85"/>`;
    else if (b.type === 'video' || b.type === 'short') g += `<circle r="${f1(r * 0.7)}" fill="${b.tint}"/><ellipse rx="${f1(r * 1.7)}" ry="${f1(r * 0.5)}" class="ringed" stroke="${b.tint}" transform="rotate(-16)"/>`;
    else g += `<circle r="${f1(r * 0.9)}" class="digest-core" stroke="${b.tint}"/>`;
    if (b.demo) g += `<circle r="${f1(r * 2.4)}" class="demo-ring"/>`;
    const label = `${typeLabel[it.type]}: ${it.title}${it.date ? `, ${fmt(it)}` : ''}`;
    out += `<a href="${esc(it.type === 'digest' ? href(it.href, ctx) : href(it.href, ctx))}" class="body t-${it.type}${hl || b.demo ? ' is-new' : ''}" data-id="${esc(b.id)}"${b.demo ? ' data-new' : ''} aria-label="${esc(label)}"${ext(href(it.href, ctx))}><g transform="translate(${f1(p[0])} ${f1(p[1])})" opacity="${f1(1 - fog * 0.35)}">${g}</g></a>`;
    obstacles.push({ x: p[0] - r, y: p[1] - r, w: r * 2, h: r * 2 });
  }
  out += '</g>';
  // labels: level of detail + collision avoidance, same algorithm as the canvas
  const fs = V.font;
  const cands = order.map(({ b, p }) => {
    const t = shortTitle(b.item.title, tall ? 24 : 32);
    const meta = metaLine(b.item, fmtDate);
    return { id: b.id, x: p[0], y: p[1], r: Math.max(2, b.size * p[3] * 0.62), w: Math.max(t.length * fs * 0.52, meta.length * fs * 0.46) + 4, h: fs + 15, pri: labelPriority(b, focus, null), t, meta, b };
  });
  if (o) obstacles.push({ x: o[0] - 60, y: o[1] - 16, w: 120, h: 54 });
  for (const r of V.keepOut || []) obstacles.push(r);
  const placed = placeLabels(cands, { width: w, height: h, max: V.labels, obstacles });
  out += '<g class="labels" aria-hidden="true">';
  for (const c of cands) {
    const L = placed.get(c.id); if (!L) continue;
    const tx = L.align === 'r' ? L.x + c.w : L.align === 'c' ? L.x + c.w / 2 : L.x;
    const anchor = L.align === 'r' ? 'end' : L.align === 'c' ? 'middle' : 'start';
    out += `<text x="${f1(tx)}" y="${f1(L.y + fs)}" text-anchor="${anchor}" class="lab${c.b.type === 'digest' ? ' lab-digest' : ''}${c.b.demo ? ' lab-demo' : ''}" style="font-size:${fs}px">${esc(c.t)}${c.b.demo ? ' <tspan class="ph">(placeholder)</tspan>' : ''}<tspan x="${f1(tx)}" dy="${fs * 0.95 + 2}" class="lab-m">${esc(c.meta)}</tspan></text>`;
  }
  out += '</g></svg>';
  return out;
}

// ---------- a body's local sky: the item and its documented neighbours, from real scene positions ----------
export function localSky(graph, ctx, item, { w = 640, h = 360, cls = '' } = {}) {
  const S = sceneOf(graph); const me = S.byId.get(item.id); if (!me) return '';
  const nb = item.related.map((id) => S.byId.get(id)).filter(Boolean);
  const pts = [me, ...nb];
  const span = Math.max(0.12, ...nb.map((b) => Math.hypot(b.x - me.x, b.z - me.z))) * 1.45;
  const k = Math.min(w, h * 1.6) / 2 / span;
  const sx = (x) => w / 2 + (x - me.x) * k;
  const sy = (z) => h / 2 + (z - me.z) * k * 0.62;
  const f1 = (v) => Math.round(v * 10) / 10;
  let s = `<svg class="sky ${cls}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(`${item.title} and ${nb.length} documented relationship${nb.length === 1 ? '' : 's'}, drawn from their positions in the universe`)}" xmlns="http://www.w3.org/2000/svg">`;
  // the month rings that pass through this patch of sky
  const seen = new Set();
  for (const r of S.rings) { const key = r.rho.toFixed(3); if (seen.has(key)) continue; seen.add(key); s += `<ellipse class="ring" cx="${f1(sx(0))}" cy="${f1(sy(0))}" rx="${f1(r.rho * k)}" ry="${f1(r.rho * k * 0.62)}"/>`; }
  // neighbourhood dust (real Digest posts that fall inside the frame)
  const dp = [];
  for (let i = 0; i < S.dustCount; i++) { const x = sx(S.dust[i * 5]), y = sy(S.dust[i * 5 + 2]); if (x > 0 && x < w && y > 0 && y < h) dp.push([x, y]); }
  const d = dotPath(dp);
  if (d) s += `<path class="dust" d="${d}" stroke="${S.digest.core?.tint}"/>`;
  // other bodies in the frame, unlabelled context
  for (const b of S.bodies) { if (pts.includes(b)) continue; const x = sx(b.x), y = sy(b.z); if (x > 0 && x < w && y > 0 && y < h) s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="1.8" fill="${b.tint}" opacity=".4"/>`; }
  for (const b of nb) { const x1 = sx(me.x), y1 = sy(me.z), x2 = sx(b.x), y2 = sy(b.z); const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - Math.hypot(x2 - x1, y2 - y1) * 0.18; s += `<path d="M${f1(x1)} ${f1(y1)}Q${f1(mx)} ${f1(my)} ${f1(x2)} ${f1(y2)}" class="thread"/>`; }
  const obstacles = []; const cands = [];
  for (const b of pts) {
    const x = sx(b.x), y = sy(b.z), r = b === me ? 5.5 : 3.4; const c = b.tint;
    s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${r * 8}" fill="${c}" opacity=".06"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${r * 3}" fill="${c}" opacity=".13"/>`;
    if (b.type === 'build') s += `<path d="M${f1(x - r * 5)} ${f1(y)}H${f1(x + r * 5)}M${f1(x)} ${f1(y - r * 5)}V${f1(y + r * 5)}" stroke="${c}" stroke-width=".8" opacity=".7"/>`;
    if (b.type === 'video' || b.type === 'short') s += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(r * 2)}" ry="${f1(r * 0.6)}" fill="none" stroke="${c}" stroke-width=".9" transform="rotate(-16 ${f1(x)} ${f1(y)})"/>`;
    s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${r}" fill="${b === me ? '#fff8ec' : c}"/>`;
    obstacles.push({ x: x - r, y: y - r, w: r * 2, h: r * 2 });
    const t = shortTitle(b.item.title, b === me ? 34 : 26); const fs = b === me ? 15 : 12.5;
    cands.push({ id: b.id, x, y, r, w: t.length * fs * 0.52 + 4, h: fs + 4, pri: b === me ? 1e6 : b.size, t, fs, me: b === me });
  }
  const placed = placeLabels(cands, { width: w, height: h, max: 12, obstacles });
  for (const c of cands) { const L = placed.get(c.id); if (!L) continue; const tx = L.align === 'r' ? L.x + c.w : L.align === 'c' ? L.x + c.w / 2 : L.x; s += `<text x="${f1(tx)}" y="${f1(L.y + c.fs)}" text-anchor="${L.align === 'r' ? 'end' : L.align === 'c' ? 'middle' : 'start'}" class="sky-l${c.me ? ' me' : ''}">${esc(c.t)}</text>`; }
  return s + '</svg>';
}

// ---------- regions ----------
const navLinks = (ctx) => [
  ['Universe', local('universe/', ctx)],
  ['Building', href('/building/', ctx)],
  ['Videos', `${href('/', ctx)}#videos`],
  ['Writing', href('/writing/', ctx)],
  ['Digest', href('/blog/', ctx)],
  ['About', href('/about/', ctx)],
];

function card(it, ctx, { big = false } = {}) {
  const url = href(it.href, ctx);
  const vis = it.image
    ? lazy(it.image, 640, 360)
    : localSky(ctxGraph, ctx, it, { w: 640, h: 360 });
  return `<article class="card t-${it.type}${big ? ' card-big' : ''}" data-id="${esc(it.id)}"${it.demo ? ' data-new' : ''}>
    <a href="${esc(url)}"${ext(url)} class="card-link"><div class="card-vis">${vis}${it.image ? '' : '<span class="vis-note">Drawn from its place in the universe</span>'}</div>
    <div class="card-txt"><p class="kicker">${glyph(it, 18)}<span>${esc(typeLabel[it.type])}${it.status ? ` · ${esc(it.status)}` : ''} · <time datetime="${esc(it.date)}">${esc(fmt(it))}</time></span>${it.demo ? '<span class="ph-tag">Placeholder</span>' : ''}</p>
    <h3>${esc(it.title)}</h3>${big || it.type === 'build' ? `<p class="dek">${esc(it.dek)}</p>` : ''}${it.metric ? `<p class="metric">${esc(it.metric)}</p>` : ''}</div></a></article>`;
}
let ctxGraph = null; // set per region call so card() can draw local skies

function videoCard(it, ctx) {
  const url = it.href;
  return `<li class="vid t-${it.type}" data-id="${esc(it.id)}"${it.demo ? ' data-new' : ''}>
    <div class="vid-frame${it.type === 'short' ? ' is-short' : ''}" data-embed="${esc(it.embed || '')}" data-title="${esc(it.title)}">
      <a href="${esc(url)}"${ext(url)} class="vid-poster">${lazy(it.image, 640, 360)}<span class="play" aria-hidden="true"></span><span class="sr">Watch “${esc(it.title)}” on YouTube</span></a>
    </div>
    <p class="kicker">${glyph(it, 16)}<span>${esc(typeLabel[it.type])} · <time datetime="${esc(it.date)}">${esc(fmt(it))}</time></span>${it.demo ? '<span class="ph-tag">Placeholder</span>' : ''}</p>
    <h3><a href="${esc(url)}"${ext(url)}>${esc(it.title)}</a></h3></li>`;
}

function components(graph) {
  const seen = new Set(); const out = [];
  for (const it of graph.items) {
    if (seen.has(it.id) || !it.related.length) continue;
    const comp = []; const stack = [it.id];
    while (stack.length) { const id = stack.pop(); if (seen.has(id)) continue; seen.add(id); comp.push(graph.byId.get(id)); stack.push(...graph.byId.get(id).related); }
    out.push(comp.sort((a, b) => b.layout.weight - a.layout.weight));
  }
  return out.sort((a, b) => b.length - a.length);
}

function histogram(graph, { w = 720, h = 120, cls = '' } = {}) {
  const d = graph.digest; const days = Object.entries(d.perDay).sort(([a], [b]) => (a < b ? -1 : 1));
  if (!days.length) return '';
  const t0 = Date.parse(days[0][0]); const tEnd = Date.parse(graph.stats.lastDate); const DAY = 864e5;
  const N = Math.round((tEnd - t0) / DAY) + 1; const bw = w / N; const max = Math.max(...days.map(([, v]) => v));
  let bars = '';
  for (const [k, v] of days) { const i = Math.round((Date.parse(k) - t0) / DAY); const bh = (v / max) * (h - 26); bars += `<rect data-d="${k}" data-n="${v}" x="${(i * bw).toFixed(2)}" y="${(h - 18 - bh).toFixed(1)}" width="${Math.max(1, bw - 0.6).toFixed(2)}" height="${bh.toFixed(1)}"/>`; }
  const months = [...new Set(days.map(([k]) => k.slice(0, 7)))];
  const ticks = months.map((m) => { const i = Math.round((Date.parse(`${m}-01`) - t0) / DAY); return i >= 0 ? `<text x="${(i * bw).toFixed(1)}" y="${h - 4}">${esc(fmtDate(`${m}-15`, 'month').split(' ')[0])}</text>` : ''; }).join('');
  const lastI = Math.round((Date.parse(d.last) - t0) / DAY);
  const stillW = (N - 1 - lastI) * bw;
  return `<svg class="hist ${cls}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="${esc(`Digest posts per day from ${fmtDate(d.first)} to ${fmtDate(d.last)}. Busiest day: ${max} posts.`)}" xmlns="http://www.w3.org/2000/svg">
    <g class="bars">${bars}</g>${d.status !== 'publishing' && stillW > 0 ? `<rect class="still" x="${((lastI + 1) * bw).toFixed(1)}" y="0" width="${stillW.toFixed(1)}" height="${h - 18}"/>` : ''}
    <line x1="0" x2="${w}" y1="${h - 18}" y2="${h - 18}" class="axis"/><g class="ticks">${ticks}</g></svg>`;
}

export const regions = {
  nav(graph, ctx) {
    return `<ul>${navLinks(ctx).map(([l, u]) => `<li><a href="${esc(u)}"${ext(u)}>${l}</a></li>`).join('')}</ul>`;
  },
  brand(graph, ctx) { return `<a class="brand" href="${esc(href('/', ctx))}"><span class="brand-mark" aria-hidden="true"></span>Ken Ashe</a>`; },

  'poster-wide'(graph, ctx) { return posterSVG(graph, ctx, 'wide'); },
  'poster-tall'(graph, ctx) { return posterSVG(graph, ctx, 'tall'); },
  'poster-full'(graph, ctx) { return posterSVG(graph, ctx, 'full'); },
  'poster-tall-full'(graph, ctx) { return posterSVG(graph, ctx, 'tall-full'); },
  'poster-nebula'(graph, ctx) { return posterSVG(graph, ctx, 'nebula'); },
  'poster-nebula-tall'(graph, ctx) { return posterSVG(graph, ctx, 'nebula-tall'); },

  'hero-stats'(graph) {
    const s = graph.stats;
    return `<p class="hero-stats"><span><b>${s.builds}</b> builds</span><span><b>${s.essays}</b> essays</span><span><b>${s.videos}</b> videos</span><span><b>${s.shorts}</b> shorts</span><span><b>${s.relationships}</b> documented threads</span><span class="st-digest"><b>${n(s.digestPublished)}</b> automated Digest posts</span></p>`;
  },
  'hero-now'(graph, ctx) {
    return `<h2 class="mini-h">Newest light</h2><ol class="now-list">${graph.now.map((it) => { const u = href(it.href, ctx); return `<li data-id="${esc(it.id)}"${it.demo ? ' data-new' : ''}><a href="${esc(u)}"${ext(u)}>${glyph(it, 16)}<span class="nl-t">${esc(it.title)}</span><span class="nl-m">${esc(typeLabel[it.type])} · ${esc(fmt(it))}</span></a></li>`; }).join('')}</ol>`;
  },
  legend(graph) {
    const S = sceneOf(graph);
    return `<ul class="legend">${[['build', 'Build'], ['essay', 'Essay'], ['video', 'Video'], ['short', 'Short']].map(([t, l]) => `<li>${glyph({ type: t, theme: 'web', status: 'LIVE' }, 18)}${l}</li>`).join('')}<li>${glyph({ type: 'digest', status: S.digest.status }, 18)}Digest post <em>(automated)</em></li><li><span class="lg-thread" aria-hidden="true"></span>Documented link</li></ul>`;
  },

  'latest-builds'(graph, ctx) {
    ctxGraph = graph;
    return `<div class="cards">${graph.featuredBuilds.map((b, i) => card(b, ctx, { big: i === 0 })).join('')}</div>
      <p class="more"><a href="${esc(href('/building/', ctx))}"${ext(href('/building/', ctx))}>All ${graph.stats.builds} builds</a></p>`;
  },
  'latest-videos'(graph, ctx) {
    const v = graph.latest('video', 4); const sh = graph.latest('short', 4);
    return `<ul class="vids">${v.map((it) => videoCard(it, ctx)).join('')}</ul><h3 class="sub-h">Shorts</h3><ul class="vids vids-short">${sh.map((it) => videoCard(it, ctx)).join('')}</ul>
      <p class="more"><a href="https://www.youtube.com/@KenAshe" target="_blank" rel="noopener noreferrer">All ${graph.stats.videos} videos and ${graph.stats.shorts} shorts on YouTube</a></p>`;
  },
  'latest-writing'(graph, ctx) {
    return `<ol class="writing">${graph.latest('essay', 5).map((it) => { const u = href(it.href, ctx); return `<li data-id="${esc(it.id)}"${it.demo ? ' data-new' : ''}><a href="${esc(u)}"${ext(u)}>${it.image ? lazy(it.image, 160, 100) : `<span class="w-glyph">${glyph(it, 40)}</span>`}<span class="w-txt"><span class="kicker"><time datetime="${esc(it.date)}">${esc(fmt(it))}</time>${it.authorship ? ` · ${esc(it.authorship)}` : ''}${it.demo ? '<span class="ph-tag">Placeholder</span>' : ''}</span><span class="w-t">${esc(it.title)}</span><span class="w-d">${esc(it.dek)}</span></span></a></li>`; }).join('')}</ol>
      <p class="more"><a href="${esc(href('/writing/', ctx))}"${ext(href('/writing/', ctx))}>All ${graph.stats.essays} essays</a></p>`;
  },
  'digest-status'(graph, ctx) {
    const d = graph.digest; const aab = graph.byId.get(d.relatedBuild);
    const u = href(d.link, ctx); const ua = aab ? href(aab.href, ctx) : null;
    return `<div class="digest-card" data-status="${esc(d.status)}">
      <p class="kicker"><span class="badge-auto">${esc(d.label)}</span><span class="status-dot" aria-hidden="true"></span>${esc(d.status === 'publishing' ? 'Publishing' : 'Paused')}</p>
      <h3>${esc(d.name)}</h3><p class="dek">${esc(d.statusLine)}</p>
      ${histogram(graph, { w: 560, h: 96 })}
      <dl class="d-facts"><div><dt>Published</dt><dd>${n(d.published)}</dd></div><div><dt>Held as drafts</dt><dd>${n(d.drafts)}</dd></div><div><dt>First post</dt><dd>${esc(fmtDate(d.first))}</dd></div><div><dt>Last post</dt><dd>${esc(fmtDate(d.last))}</dd></div>${d.noindex ? '<div><dt>Search</dt><dd>noindex</dd></div>' : ''}</dl>
      <p class="d-by">Byline: ${esc(d.byline)}. Machine-written and kept separate from Ken's writing.</p>
      <p class="d-links">${ua ? `<a href="${esc(ua)}"${ext(ua)}>How the system works</a>` : ''}<a href="${esc(u)}"${ext(u)}>Browse the archive</a></p></div>`;
  },
  constellations(graph, ctx) {
    ctxGraph = graph;
    const comps = components(graph).filter((c) => c.length >= 3).slice(0, 3);
    return `<ol class="consts">${comps.map((c) => { const lead = c[0]; return `<li class="const"><div class="const-vis">${localSky(graph, ctx, lead, { w: 480, h: 300 })}</div>
      <h3>${esc(lead.title)} <span>and ${c.length - 1} linked</span></h3>
      <ul>${c.slice(1, 7).map((it) => { const u = href(it.href, ctx); return `<li data-id="${esc(it.id)}"><a href="${esc(u)}"${ext(u)}>${glyph(it, 14)}${esc(it.title)}</a></li>`; }).join('')}${c.length > 7 ? `<li class="const-more">and ${c.length - 7} more in the universe</li>` : ''}</ul></li>`; }).join('')}</ol>`;
  },
  credentials(graph) {
    return graph.credentials.map((g) => `<div class="cred"><h3>${esc(g.label)}</h3><ul>${g.items.map((c) => `<li>${esc(c.name)} <span>${esc(c.issuer)}</span></li>`).join('')}</ul></div>`).join('');
  },
  'knows-about'(graph) { return `<ul class="tags">${graph.person.knowsAbout.map((k) => `<li>${esc(k)}</li>`).join('')}</ul>`; },
  'jsonld'(graph) {
    const p = graph.person;
    return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Person', name: p.name, jobTitle: p.jobTitle, description: p.description, knowsAbout: p.knowsAbout, sameAs: p.sameAs, image: p.image, url: 'https://kenashe.ai/' }).replace(/</g, '\\u003c')}</script>`;
  },

  // ---------- /universe/ ----------
  'universe-index'(graph, ctx) {
    return `<div class="u-index">${graph.themes.map((t) => {
      const its = graph.items.filter((i) => i.theme === t.id && i.type !== 'digest').sort((a, b) => (a.date < b.date ? 1 : -1));
      if (!its.length) return '';
      return `<section class="ui-col" aria-labelledby="th-${t.id}"><h3 id="th-${t.id}" style="--tint:${TINT[t.id]}">${esc(t.label)} <span>${its.length}</span></h3><p class="ui-hint">${esc(t.hint)}</p><ul>${its.map((it) => { const u = href(it.href, ctx); return `<li data-id="${esc(it.id)}"${it.demo ? ' data-new' : ''}><a href="${esc(u)}"${ext(u)}>${glyph(it, 16)}<span>${esc(it.title)}</span><time datetime="${esc(it.date)}">${esc(fmt(it))}</time></a>${it.related.length ? `<span class="ui-rel">${it.related.length} linked</span>` : ''}</li>`; }).join('')}</ul></section>`;
    }).join('')}</div>`;
  },
  'thread-list'(graph, ctx) {
    const verb = { 'links-to': 'links to', embeds: 'embeds', mentions: 'mentions' };
    return `<ol class="thread-list">${graph.edges.map((e) => { const a = graph.byId.get(e.from), b = graph.byId.get(e.to); return `<li><a href="${esc(href(a.href, ctx))}"${ext(href(a.href, ctx))}>${esc(a.title)}</a> <span>${verb[e.type] || e.type}</span> <a href="${esc(href(b.href, ctx))}"${ext(href(b.href, ctx))}>${esc(b.title)}</a> <em>${esc(e.evidence || '')}</em></li>`; }).join('')}</ol>`;
  },
  'replay-months'(graph) {
    return `<ol class="months">${monthsOf(graph).reverse().map((m) => `<li><b>${esc(fmtDate(`${m.month}-15`, 'month'))}</b> ${m.items} new${m.digestPosts ? ` · ${n(m.digestPosts)} Digest posts` : ''}</li>`).join('')}</ol>`;
  },

  // ---------- /building/autonomous-ai-blog/ ----------
  'item-head'(graph, ctx) {
    const it = graph.byId.get(ctx.item); if (!it) return '';
    const d = graph.digest; const isAAB = it.id === d.relatedBuild;
    const status = isAAB ? (d.status === 'publishing' ? 'Publishing daily' : 'Scheduled publishing paused') : it.status;
    return `<p class="kicker">${glyph(it, 18)}<span>${esc(typeLabel[it.type])} · ${esc(fmt(it))}</span><span class="pill" data-status="${esc(isAAB ? d.status : (it.status || '').toLowerCase())}">${esc(status)}</span></p>
      <h1>${esc(it.title)}</h1><p class="lede">${esc(it.dek)}</p>`;
  },
  'digest-now'(graph) {
    const d = graph.digest;
    return `<div class="dn" data-status="${esc(d.status)}"><p class="kicker"><span class="badge-auto">${esc(d.label)}</span><span class="status-dot" aria-hidden="true"></span>Current status, read from the publishing workflow</p>
      <p class="dn-line">${esc(d.statusLine)}</p>
      <dl class="d-facts"><div><dt>Published</dt><dd>${n(d.published)}</dd></div><div><dt>Held as drafts</dt><dd>${n(d.drafts)}</dd></div><div><dt>In the repository</dt><dd>${n(d.total)}</dd></div><div><dt>First post</dt><dd>${esc(fmtDate(d.first))}</dd></div><div><dt>Last post</dt><dd>${esc(fmtDate(d.last))}</dd></div><div><dt>Indexing</dt><dd>${d.noindex ? 'noindex' : 'indexed'}</dd></div></dl></div>`;
  },
  'digest-results'(graph) {
    const d = graph.digest;
    return `<p>As of ${esc(fmtDate(graph.stats.lastDate))}, the repository holds ${n(d.total)} Digest posts dated from ${esc(fmtDate(d.first))}. Of those, ${n(d.published)} are published and ${n(d.drafts)} were held back as drafts.</p>`;
  },
  'digest-volume'(graph) {
    const words = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
    const e = graph.stats.essays;
    return `<p><b>Volume outweighs everything else on the site.</b> About ten posts a day adds up to ${n(graph.digest.published)} machine-written posts next to ${words[e] ?? n(e)} essays I directed myself. That is why I chose to present the Digest as an experiment rather than a search-driven publication.</p>`;
  },
  'digest-hist'(graph) {
    const d = graph.digest; const days = Object.entries(d.perDay); const max = days.reduce((m, [k, v]) => (v > m[1] ? [k, v] : m), ['', 0]);
    const months = graph.timeline.filter((m) => m.digestPosts).slice().reverse();
    return `${histogram(graph, { w: 1100, h: 180, cls: 'hist-big' })}
      <p class="hist-cap">${n(d.published)} published posts across ${days.length} publishing days. Busiest day: ${esc(fmtDate(max[0]))}, ${max[1]} posts.${d.status !== 'publishing' ? ` The hatched band is the time since the last post (${esc(fmtDate(d.last))}).` : ''}</p>
      <ol class="months months-digest">${months.map((m) => `<li><b>${esc(fmtDate(`${m.month}-15`, 'month'))}</b> ${n(m.digestPosts)}</li>`).join('')}</ol>`;
  },
  'digest-latest'(graph, ctx) {
    const d = graph.digest;
    return `<ol class="dl">${d.latest.slice(0, 8).map((p) => { const u = href(p.link, ctx); return `<li><a href="${esc(u)}"${ext(u)}>${p.image ? lazy(`${ctx.base}assets/${p.image}`, 640, 427) : ''}<span class="kicker"><span class="badge-auto">${esc(d.label)}</span><time datetime="${esc(p.date)}">${esc(fmtDate(p.date))}</time></span><span class="dl-t">${esc(p.title)}</span><span class="dl-tags">${p.tags.map(esc).join(' · ')}</span></a></li>`; }).join('')}</ol>
      <p class="more"><a href="${esc(href(d.link, ctx))}"${ext(href(d.link, ctx))}>The full archive of ${n(d.published)} posts</a></p>`;
  },
  'top-tags'(graph) { return `<ul class="tags">${graph.digest.topTags.map((t) => `<li>${esc(t.tag)} <span>${n(t.n)}</span></li>`).join('')}</ul>`; },
  related(graph, ctx) {
    const it = graph.byId.get(ctx.item); if (!it) return '';
    const verb = (a, b) => { const e = graph.edges.find((x) => (x.from === a && x.to === b) || (x.from === b && x.to === a)); if (!e) return ''; const out = e.from === a; return { 'links-to': out ? 'This page links to it' : 'Links to this page', embeds: out ? 'Embedded here' : 'Embeds this', mentions: out ? 'Mentioned here' : 'Its description links here' }[e.type]; };
    ctxGraph = graph;
    return `<div class="related-wrap"><div class="related-sky">${localSky(graph, ctx, it, { w: 640, h: 380 })}</div><ul class="related">${it.related.map((id) => { const r = graph.byId.get(id); const u = r.type === 'digest' ? href(r.href, ctx) : href(r.href, ctx); return `<li data-id="${esc(r.id)}"><a href="${esc(u)}"${ext(u)}>${r.image ? lazy(r.image, 160, 90) : `<span class="w-glyph">${glyph(r, 36)}</span>`}<span><span class="kicker">${esc(typeLabel[r.type])}${r.date ? ` · ${esc(fmt(r))}` : ''}</span><span class="rel-t">${esc(r.title)}</span><span class="rel-why">${esc(verb(it.id, id))}</span></span></a></li>`; }).join('')}</ul></div>`;
  },
  'news-video'(graph, ctx) {
    // The newest video that documents this build (from the graph), click-to-load.
    const it = graph.byId.get(ctx.item); if (!it) return '';
    const v = it.related.map((id) => graph.byId.get(id)).filter((r) => r.type === 'video').sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    if (!v) return '';
    return `<figure class="player" data-embed="${esc(v.embed)}" data-title="${esc(v.title)}"><a class="vid-poster" href="${esc(v.href)}" target="_blank" rel="noopener noreferrer">${lazy(v.image, 1280, 720)}<span class="play" aria-hidden="true"></span><span class="sr">Play “${esc(v.title)}”</span></a><figcaption><span class="kicker">Video · ${esc(fmt(v))}</span> ${esc(v.title)}</figcaption></figure>`;
  },

  // ---------- publish/ (prototype-only) ----------
  'demo-steps'() {
    return `<ol class="steps">${DEMO_STEPS.map((st, i) => `<li class="step" data-key="${esc(st.key)}">
      <div class="step-h"><span class="step-n">${String(i + 1).padStart(2, '0')}</span><h3>${esc(st.label)}</h3><span class="step-state" aria-live="polite"></span></div>
      <p class="step-where"><span>Where</span> <code>${esc(st.where)}</code></p>
      <pre class="snippet" tabindex="0" aria-label="What Ken types"><code>${esc(st.snippet)}</code></pre>
      <p class="step-effort"><span>Effort</span> ${esc(st.effort)}</p>
      <p class="step-note">${esc(st.note).replace(/`([^`]+)`/g, '<code>$1</code>')}</p>
      <div class="step-act" data-slot="${esc(st.key)}"></div></li>`).join('')}</ol>`;
  },
  'change-list'(graph) {
    return `<p class="cl-empty">No example entries applied. This is the universe exactly as the production data builds it: ${graph.stats.builds} builds, ${graph.stats.essays} essays, ${graph.stats.videos + graph.stats.shorts} videos and shorts, ${graph.stats.relationships} documented threads.</p>`;
  },

  // ---------- /building/returning-your-things/ ----------
  'film-player'(graph, ctx) {
    const it = graph.byId.get(ctx.item); if (!it?.video) return '';
    const v = graph.byId.get(`video:${it.video}`); if (!v) return '';
    return `<figure class="player film-player" data-embed="${esc(v.embed)}" data-title="${esc(v.title)}"><a class="vid-poster" href="${esc(v.href)}" target="_blank" rel="noopener noreferrer"><img src="${esc(v.image)}" alt="" width="1280" height="720" fetchpriority="high" decoding="async"><span class="play play-big" aria-hidden="true"></span><span class="sr">Play the film “${esc(v.title)}”</span></a></figure>`;
  },
  'film-kicker'(graph, ctx) {
    const it = graph.byId.get(ctx.item); if (!it) return '';
    const v = it.video ? graph.byId.get(`video:${it.video}`) : null;
    return `<p class="kicker">Short film${v ? ` · Released <time datetime="${esc(v.date)}">${esc(fmt(v))}</time>` : ''}</p>`;
  },
};
