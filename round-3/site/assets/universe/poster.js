// Round 3 · tier 1 of the universe: a prerendered SVG frame of the same scene the canvas animates.
// Works with JavaScript off: every light is a real link. Built at prerender time (Node) and again in the
// browser for ?demo=. Small at any scale: old periods are clusters, the Digest is ~36 band segments.
import { esc, fmtDate, typeLabel } from '../../../lib/graph.js';
import { buildScene, partition, place, project, camera, placeLabels, shortTitle, bandBins, bodyRadius, periodLabel, R0 } from './scene.js';

const sceneCache = new WeakMap();
export const sceneOf = (graph) => { let s = sceneCache.get(graph); if (!s) { s = buildScene(graph); sceneCache.set(graph, s); } return s; };

// The poster is a square of 2.6 world units centred on "now". CSS sizes that square (--U) and places its
// centre (--ox, --oy); the canvas measures the same box, so poster and live universe always agree.
export const BOX = 2.6; const VB = 1000; const PU = VB / BOX; const C = VB / 2;
/**
 * Framing presets (cameras and label areas, in poster units). They are framing, not positions.
 * `wide`/`tall` describe the part of the square that is visible on desktop / phone and the rectangle the
 * portrait covers, so the JS-off labels avoid it.
 */
export const VIEWS = {
  hero: { cam: { yaw: 3.1, pitch: 0.46 }, budget: 100,
    wide: { font: 14.5, max: 9, x0: 392, y0: 165, w: 560, h: 585, keep: [{ x: 405, y: 275, w: 190, h: 275 }, { x: 600, y: 655, w: 400, h: 150 }] },
    tall: { font: 28, max: 3, x0: 152, y0: 165, w: 696, h: 560, keep: [{ x: 355, y: 150, w: 290, h: 440 }] } },
  full: { cam: { yaw: 2.05, pitch: 0.66 }, budget: 100,
    wide: { font: 19, max: 11, x0: 0, y0: 60, w: 1000, h: 880, keep: [{ x: 458, y: 404, w: 84, h: 100 }, { x: 0, y: 0, w: 330, h: 330 }] },
    tall: { font: 30, max: 4, x0: 150, y0: 200, w: 700, h: 720, keep: [{ x: 440, y: 380, w: 120, h: 124 }] } },
};
export const viewCamera = (name) => camera(VIEWS[name]?.cam ?? VIEWS.hero.cam);

const f1 = (v) => Math.round(v * 10) / 10;

export function posterSVG(graph, ctx, view = 'hero', { hrefOf = () => '#' } = {}) {
  const V = VIEWS[view] ?? VIEWS.hero; const S = sceneOf(graph); const cam = viewCamera(view);
  const P = partition(S, { budget: V.budget, clusterBudget: 70 });
  const pr = (x, y, z) => { const p = project(cam, C, C, PU, x, y, z, []); return p; };
  const ring = (rho, y = 0, a0 = 0, a1 = Math.PI * 2, steps = 64) => { let d = ''; for (let i = 0; i <= steps; i++) { const a = a0 + ((a1 - a0) * i) / steps; const p = pr(Math.cos(a) * rho, y, Math.sin(a) * rho); if (p) d += `${d ? 'L' : 'M'}${Math.round(p[0])} ${Math.round(p[1])}`; } return d; };
  const personal = graph.stats.personal;
  let out = `<svg class="poster" viewBox="0 0 ${VB} ${VB}" role="img" aria-labelledby="poster-t-${view}" xmlns="http://www.w3.org/2000/svg"><title id="poster-t-${view}">Map of Ken Ashe's work: ${personal.toLocaleString('en-US')} builds, essays and videos placed by topic and date around the present, with ${graph.stats.relationships} documented relationships. The automated Digest is shown separately as a faint band.</title>`;
  const gid = new Map(S.sectors.map((s, i) => [s.tint, `g${view[0]}${i}`]));
  out += `<defs><radialGradient id="now-${view}"><stop offset="0" stop-color="#ffd9a0" stop-opacity=".2"/><stop offset=".5" stop-color="#ffc27a" stop-opacity=".06"/><stop offset="1" stop-color="#ffc27a" stop-opacity="0"/></radialGradient>${[...gid].map(([c, id]) => `<radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity=".5"/><stop offset=".2" stop-color="${c}" stop-opacity=".17"/><stop offset=".5" stop-color="${c}" stop-opacity=".045"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`).join('')}</defs>`;
  const o = pr(0, 0, 0);
  out += `<ellipse cx="${C}" cy="${C}" rx="${Math.round(PU * 0.95)}" ry="${Math.round(PU * 0.95 * Math.sin(cam.pitch))}" fill="url(#now-${view})"/>`;
  // the automated Digest: a faint low band, aggregated per week
  const band = S.band; let bd = '';
  for (const b of bandBins(S, 1, 24)) {
    const inner = ring(b.r0, -0.03, band.a0, band.a1, 10), outer = ring(b.r1, -0.03, band.a1, band.a0, 10);
    bd += `<path d="${inner}${outer.replace('M', 'L')}Z" opacity="${(0.03 + b.a * 0.07).toFixed(2)}"/>`;
  }
  out += `<g class="p-band" fill="${band.tint}" data-status="${esc(band.status)}">${bd}</g>`;
  // time axis
  out += '<g class="p-rings">' + S.rings.map((r) => `<path d="${ring(S.tm.rho(r.t))}"${r.major ? ' class="major"' : ''}/>`).join('') + `<path d="${ring(R0)}" class="now"/></g>`;
  // threads (documented relationships only; capped when there are many)
  const drawn = new Set(P.lights.map((b) => b.id)); const pos = new Map();
  for (const b of P.lights.concat(P.clusters)) { const w = place(S, b, 1, []); pos.set(b.id, { w, p: pr(w[0], w[1], w[2]) }); }
  const th = S.threads.filter((t) => drawn.has(t.from.id) && drawn.has(t.to.id)).sort((a, b) => b.from.pri + b.to.pri - a.from.pri - a.to.pri).slice(0, 60);
  out += '<g class="p-threads">' + th.map((t) => {
    const A = pos.get(t.from.id), B = pos.get(t.to.id); if (!A.p || !B.p) return '';
    const len = Math.hypot(A.w[0] - B.w[0], A.w[2] - B.w[2]);
    const c = pr((A.w[0] + B.w[0]) / 2, (A.w[1] + B.w[1]) / 2 + 0.07 + len * 0.22, (A.w[2] + B.w[2]) / 2);
    return c ? `<path d="M${f1(A.p[0])} ${f1(A.p[1])}Q${f1(c[0])} ${f1(c[1])} ${f1(B.p[0])} ${f1(B.p[1])}"/>` : '';
  }).join('') + '</g>';
  // clusters (older periods), far to near
  const order = (arr) => arr.map((b) => ({ b, ...pos.get(b.id) })).filter((x) => x.p).sort((a, b) => b.p[2] - a.p[2]);
  out += '<g class="p-clusters">' + order(P.clusters).map(({ b, p }) => { const r = bodyRadius(b, p[3], PU); return `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${f1(r * 2.8)}" fill="url(#${gid.get(b.tint)})"/><circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${f1(r)}" fill="${b.tint}" opacity=".18"><title>${b.count} pieces · ${esc(graph.sector[b.theme]?.label ?? '')} · ${esc(periodLabel(b.cluster.period))}</title></circle>`; }).join('') + '</g>';
  // lights: each one is a link
  const bodies = order(P.lights); const cands = { wide: [], tall: [] }; const obst = { wide: [], tall: [] };
  let bs = '';
  for (const { b, p, w } of bodies) {
    const it = b.item; const x = f1(p[0]), y = f1(p[1]); const r = f1(bodyRadius(b, p[3], PU)); const c = b.tint;
    const fog = Math.max(0, Math.min(1, (p[2] - 2.2) / 1.4)); const op = f1(1 - fog * 0.45);
    const foot = pr(w[0], 0, w[2]);
    let shape = `<circle r="${f1(r * 6.5)}" fill="url(#${gid.get(c)})"/>`;
    if (b.type === 'build') { const L = f1(r * 4.2); shape += `<path d="M${-L} 0H${L}M0 ${-L}V${L}" stroke="${c}" stroke-width=".9" opacity=".8"/><circle r="${f1(r * 0.66)}" fill="#fff8ec"/>`; }
    else if (b.type === 'essay') { const ang = Math.round((Math.atan2(C - p[1], C - p[0]) * 180) / Math.PI); shape += `<circle r="${r}" fill="#17120c" stroke="${c}" stroke-width=".9"/><path d="M0 ${-r}A${r} ${r} 0 0 1 0 ${r}A${f1(r * 0.45)} ${r} 0 0 0 0 ${-r}Z" fill="${c}" transform="rotate(${ang})"/>`; }
    else { const k = b.type === 'short' ? 0.8 : 1; shape += `<ellipse rx="${f1(r * 1.9 * k)}" ry="${f1(r * 0.55 * k)}" fill="none" stroke="${c}" stroke-width=".9" transform="rotate(-16)"/><circle r="${f1(r * 0.72)}" fill="${c}"/>`; }
    if (b.demo) shape += `<circle r="${f1(r * 2.6 + 3)}" class="p-ph"/>`;
    const url = hrefOf(it); const ext = /^https?:/.test(url) ? ' target="_blank" rel="noopener noreferrer"' : '';
    const stalk = foot ? `<path class="p-stalk" d="M${x} ${y}L${f1(foot[0])} ${f1(foot[1])}"/>` : '';
    bs += `${stalk}<a href="${esc(url)}"${ext} data-id="${esc(it.id)}"><title>${esc(`${typeLabel[it.type]}: ${it.title}, ${fmtDate(it.date, it.precision)}${it.related.length ? `, ${it.related.length} documented thread${it.related.length > 1 ? 's' : ''}` : ''}${b.demo ? ' (placeholder)' : ''}`)}</title><g transform="translate(${x} ${y})" opacity="${op}"><circle r="${Math.max(16, r * 2.4)}" fill="transparent"/>${shape}</g></a>`;
    for (const k of ['wide', 'tall']) {
      const F = V[k]; const t = shortTitle(it.title, k === 'tall' ? 18 : 26) + (b.demo ? ' (placeholder)' : '');
      cands[k].push({ id: b.id, x: p[0], y: p[1], r: Math.max(4, r), w: t.length * F.font * 0.56 + 6, h: F.font * 1.25, pri: b.pri * (1 - fog * 0.5), t });
      obst[k].push({ x: p[0] - r, y: p[1] - r, w: r * 2, h: r * 2 });
    }
  }
  out += `<g class="p-bodies">${bs}</g>`;
  // labels: themes, time, the Digest and the few most important titles, once for wide screens and once for phones
  for (const k of ['wide', 'tall']) {
    const F = V[k]; const fs = F.font; let g = `<g class="p-labels p-labels--${k}" font-size="${fs}">`;
    const boxes = [...F.keep]; const hit = (a, b) => a.x < b.x + b.w + 4 && a.x + a.w + 4 > b.x && a.y < b.y + b.h + 2 && a.y + a.h + 2 > b.y;
    const free = (bx) => bx.x >= F.x0 && bx.y >= F.y0 && bx.x + bx.w <= F.x0 + F.w && bx.y + bx.h <= F.y0 + F.h && !boxes.some((o) => hit(bx, o));
    for (const s of S.sectors) {
      const sf = fs * 1.3; const tw = s.label.length * sf * 0.42;
      for (const rho of [1.13, 0.98, 0.84]) {
        const p = pr(Math.cos(s.mid) * rho, 0, Math.sin(s.mid) * rho); if (!p) continue;
        const bx = { x: p[0] - tw / 2, y: p[1] - sf, w: tw, h: sf * 1.3 }; if (!free(bx)) continue;
        boxes.push(bx); g += `<text class="p-sector" x="${f1(p[0])}" y="${f1(p[1])}" fill="${s.tint}" font-size="${f1(sf)}">${esc(s.label)}</text>`; break;
      }
    }
    { const label = `Automated Digest · ${band.status}`; const tw = label.length * fs * 0.5;
      for (const rho of [1.03, 0.88, 0.72, 0.56]) {
        const p = pr(Math.cos(band.mid) * rho, -0.03, Math.sin(band.mid) * rho); if (!p) continue;
        const bx = { x: p[0] - tw / 2, y: p[1] + fs * 0.4, w: tw, h: fs * 1.3 }; if (!free(bx)) continue;
        boxes.push(bx); g += `<text class="p-digest" x="${f1(bx.x)}" y="${f1(bx.y + fs)}" fill="${band.tint}">${esc(label)}</text>`; break;
      } }
    const la = Math.atan2(-Math.cos(cam.yaw), -Math.sin(cam.yaw)) + 0.5; let lastY = -1e9;
    for (const r of S.rings.filter((x) => x.label).sort((a, b) => b.t - a.t)) {
      const rho = S.tm.rho(r.t); const p = pr(Math.cos(la) * rho, 0, Math.sin(la) * rho); if (!p) continue;
      const bx = { x: p[0] + 6, y: p[1] + 3, w: r.label.length * fs * 0.56, h: fs * 1.2 };
      if (Math.abs(p[1] - lastY) < fs * 1.7 || !free(bx)) continue;
      lastY = p[1]; boxes.push(bx); g += `<text class="p-ring" x="${f1(bx.x)}" y="${f1(bx.y + fs)}">${esc(r.label)}</text>`;
    }
    const placed = placeLabels(cands[k], { x0: F.x0, y0: F.y0, width: F.w, height: F.h, max: F.max, obstacles: boxes.concat(obst[k]), pad: fs * 0.3 });
    for (const c of cands[k]) { const L = placed.get(c.id); if (!L) continue; const tx = L.align === 'r' ? L.x + c.w : L.align === 'c' ? L.x + c.w / 2 : L.x; g += `<text x="${f1(tx)}" y="${f1(L.y + fs)}" text-anchor="${L.align === 'r' ? 'end' : L.align === 'c' ? 'middle' : 'start'}">${esc(c.t)}</text>`; }
    out += g + '</g>';
  }
  return out + '</svg>';
}
