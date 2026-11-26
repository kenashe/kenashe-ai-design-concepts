// Round 3 · interior pages · "its place in the universe".
// A small, real, prerendered frame of the same scene the universe draws (assets/universe/scene.js), framed on
// one item: where it sits (theme sector = direction, date = distance from "now"), Ken's photograph standing at
// "now", and the documented threads that leave it. Nothing is positioned by hand and nothing here is
// interactive: the links live in the thread list beside it and in "Open the universe here".
// Pure string builder (Node and browser). Works with JavaScript off.
import { esc, fmtDate, typeLabel } from '../../../lib/graph.js';
import { partition, place, project, camera, shortTitle, bandBins, bodyRadius, yawFacing, R0 } from '../../assets/universe/scene.js';
import { sceneOf, VIEWS } from '../../assets/universe/poster.js';
import { COPY } from '../../copy.js';
import { titleOf } from '../../components.js';

const VW = 720, VH = 540;                       // viewBox; CSS keeps the rendered width >= 594px (wide labels) or >= 340px (tall labels)
const FONT = { wide: 17, tall: 27 };            // viewBox units: 14px or more at those widths (CSS never renders the frame narrower than 375px)
const f1 = (v) => Math.round(v * 10) / 10;
let uid = 0;

/** The bodies an item is documented as connected to (the Digest is not a body; it is reported separately). */
export function neighbours(item, graph) {
  const edges = graph.edges.filter((e) => e.from === item.id || e.to === item.id);
  const ids = [...new Set(edges.map((e) => (e.from === item.id ? e.to : e.from)))];
  return { edges, items: ids.map((id) => graph.byId.get(id)).filter(Boolean) };
}

export function localSky(item, graph, ctx) {
  const S = sceneOf(graph); const me = S.byId.get(item.id); if (!me) return '';
  const P = partition(S, { budget: VIEWS.full.budget, clusterBudget: 70 });   // same level of detail and spacing as the poster
  const { items: nb } = neighbours(item, graph);
  const nbBodies = nb.map((it) => S.byId.get(it.id)).filter(Boolean);
  const digestLinked = nb.some((it) => it.type === 'digest');
  const id = `sky${++uid}`;

  // ---- framing: turn the disk so the item is at the front, then fit "now", the item and its neighbours ----
  const pos = new Map(); for (const b of S.bodies) pos.set(b.id, place(S, b, 1, []));
  const focus = [me, ...nbBodies].map((b) => pos.get(b.id)).concat([[0, 0.3, 0]]);
  const cx = (Math.min(...focus.map((p) => p[0])) + Math.max(...focus.map((p) => p[0]))) / 2;
  const cz = (Math.min(...focus.map((p) => p[2])) + Math.max(...focus.map((p) => p[2]))) / 2;
  const cam = camera({ yaw: yawFacing(me.angle, VIEWS.full.cam.yaw, 0.35), pitch: 0.6, tx: cx, tz: cz });
  const unit = focus.map((p) => project(cam, 0, 0, 1, p[0], p[1], p[2], [])).filter(Boolean);
  const x0 = Math.min(...unit.map((p) => p[0])), x1 = Math.max(...unit.map((p) => p[0]));
  const y0 = Math.min(...unit.map((p) => p[1])), y1 = Math.max(...unit.map((p) => p[1]));
  const U = Math.max(VW / 2.75, Math.min(VW / 1.05, (VW - 300) / Math.max(0.01, x1 - x0), (VH - 250) / Math.max(0.01, y1 - y0)));
  const ox = VW / 2 - ((x0 + x1) / 2) * U, oy = VH / 2 + 8 - ((y0 + y1) / 2) * U;
  const pr = (x, y, z) => project(cam, ox, oy, U, x, y, z, []);
  const ring = (rho, y = 0, a0 = 0, a1 = Math.PI * 2, steps = 72) => { let d = ''; for (let i = 0; i <= steps; i++) { const a = a0 + ((a1 - a0) * i) / steps; const p = pr(Math.cos(a) * rho, y, Math.sin(a) * rho); if (p) d += `${d ? 'L' : 'M'}${f1(p[0])} ${f1(p[1])}`; } return d; };
  const inView = (p, m = 0) => p && p[0] > -m && p[0] < VW + m && p[1] > -m && p[1] < VH + m;

  const theme = graph.sector[item.theme];
  const names = nb.map((it) => (it.type === 'digest' ? 'the automated Digest' : titleOf(it)));
  const label = `Where ${item.title} sits in the universe of Ken Ashe's work: ${theme?.label ?? ''}, ${fmtDate(item.date, item.precision)}.${names.length ? ` Documented threads connect it to ${names.join(', ')}.` : ' No documented threads yet.'}`;
  let out = `<svg class="sky" viewBox="0 0 ${VW} ${VH}" role="img" aria-label="${esc(label)}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`;
  const tints = [...new Set([me, ...nbBodies].map((b) => b.tint))];
  const gid = new Map(tints.map((c, i) => [c, `${id}g${i}`]));
  out += `<defs><radialGradient id="${id}now"><stop offset="0" stop-color="#ffd9a0" stop-opacity=".26"/><stop offset=".5" stop-color="#ffc27a" stop-opacity=".07"/><stop offset="1" stop-color="#ffc27a" stop-opacity="0"/></radialGradient>${[...gid].map(([c, g]) => `<radialGradient id="${g}"><stop offset="0" stop-color="${c}" stop-opacity=".55"/><stop offset=".25" stop-color="${c}" stop-opacity=".16"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`).join('')}</defs>`;

  // the pool of light at "now"
  const o = pr(0, 0, 0);
  if (o) out += `<ellipse cx="${f1(o[0])}" cy="${f1(o[1])}" rx="${f1(U * 0.95 * o[3])}" ry="${f1(U * 0.95 * o[3] * Math.sin(cam.pitch))}" fill="url(#${id}now)"/>`;
  // the automated Digest: the same faint band, lifted a little only on a page that documents a link to it
  const band = S.band; let bd = '';
  for (const b of bandBins(S, 1, 24)) bd += `<path d="${ring(b.r0, -0.03, band.a0, band.a1, 10)}${ring(b.r1, -0.03, band.a1, band.a0, 10).replace('M', 'L')}Z" opacity="${((digestLinked ? 0.07 : 0.02) + b.a * (digestLinked ? 0.13 : 0.04)).toFixed(2)}"/>`;
  out += `<g class="sky-band" fill="${band.tint}">${bd}</g>`;
  // time axis
  out += `<g class="sky-rings">${S.rings.map((r) => `<path d="${ring(S.tm.rho(r.t))}"${r.major ? ' class="major"' : ''}/>`).join('')}<path d="${ring(R0)}" class="now"/></g>`;

  // every other piece of work, quiet, exactly where the universe has it
  const shown = new Set([me.id, ...nbBodies.map((b) => b.id)]);
  const sp = (b) => { const w = pos.get(b.id) ?? place(S, b, 1, []); return { b, w, p: pr(w[0], w[1], w[2]) }; };
  const far = (arr) => arr.map(sp).filter((x) => inView(x.p, 30)).sort((a, b) => b.p[2] - a.p[2]);
  const obstacles = []; const litBoxes = [];
  let dim = '';
  for (const { b, p } of far(P.lights.filter((b) => !shown.has(b.id)).concat(P.clusters))) {
    const r = Math.max(2.2, bodyRadius(b, p[3], U) * (b.isCluster ? 1 : 0.62));
    dim += `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${f1(r)}" fill="${b.tint}" opacity="${b.isCluster ? 0.16 : 0.34}"/>`;
    obstacles.push({ x: p[0] - r, y: p[1] - r, w: r * 2, h: r * 2 });
  }
  out += `<g class="sky-dim">${dim}</g>`;

  // threads: faint for the rest of the record, bright for this item's own
  const arc = (A, B) => {
    const len = Math.hypot(A.w[0] - B.w[0], A.w[2] - B.w[2]);
    const c = pr((A.w[0] + B.w[0]) / 2, (A.w[1] + B.w[1]) / 2 + 0.07 + len * 0.22, (A.w[2] + B.w[2]) / 2);
    return A.p && B.p && c ? `<path d="M${f1(A.p[0])} ${f1(A.p[1])}Q${f1(c[0])} ${f1(c[1])} ${f1(B.p[0])} ${f1(B.p[1])}"/>` : '';
  };
  const drawn = new Set(P.lights.map((b) => b.id));
  out += `<g class="sky-threads sky-threads--far">${S.threads.filter((t) => t.from.id !== me.id && t.to.id !== me.id && drawn.has(t.from.id) && drawn.has(t.to.id)).slice(0, 60).map((t) => arc(sp(t.from), sp(t.to))).join('')}</g>`;
  const mine = sp(me);
  out += `<g class="sky-threads sky-threads--mine" stroke="${me.tint}">${nbBodies.map((b) => arc(mine, sp(b))).join('')}</g>`;

  // Ken's photograph: the lit window standing at "now" (an honest rectangle; cropping only)
  let plate = '';
  if (o && inView(o, 80)) {
    const w = Math.max(30, U * 0.2 * o[3]), h = w * 1.25;
    plate = `<g class="sky-plate"><rect x="${f1(o[0] - w / 2 - 3)}" y="${f1(o[1] - h - 3)}" width="${f1(w + 6)}" height="${f1(h + 6)}" fill="#0a0908" opacity=".6"/><image href="${esc(ctx.base + COPY.portrait.src)}" xlink:href="${esc(ctx.base + COPY.portrait.src)}" x="${f1(o[0] - w / 2)}" y="${f1(o[1] - h)}" width="${f1(w)}" height="${f1(h)}" preserveAspectRatio="xMidYMin slice"/><rect x="${f1(o[0] - w / 2)}" y="${f1(o[1] - h)}" width="${f1(w)}" height="${f1(h)}" fill="none" stroke="#ffecce" stroke-opacity=".6"/></g>`;
    litBoxes.push({ x: o[0] - w / 2 - 4, y: o[1] - h - 4, w: w + 8, h: h + 8 });
  }

  // the item and what it connects to, as the same kinds of light the universe uses
  const shape = (b, p, r, hero) => {
    const c = b.tint; let s = `<circle r="${f1(r * (hero ? 7.5 : 5.5))}" fill="url(#${gid.get(c)})"/>`;
    if (b.type === 'build') { const L = f1(r * (hero ? 4.6 : 3.8)); s += `<path d="M${-L} 0H${L}M0 ${-L}V${L}" stroke="${c}" stroke-width="${hero ? 1.3 : 1}" opacity=".85"/><circle r="${f1(r * 0.7)}" fill="#fff8ec"/>`; }
    else if (b.type === 'essay') { const ang = o ? Math.round((Math.atan2(o[1] - p[1], o[0] - p[0]) * 180) / Math.PI) : 0; s += `<circle r="${f1(r)}" fill="#17120c" stroke="${c}" stroke-width="1"/><path d="M0 ${f1(-r)}A${f1(r)} ${f1(r)} 0 0 1 0 ${f1(r)}A${f1(r * 0.45)} ${f1(r)} 0 0 0 0 ${f1(-r)}Z" fill="${c}" transform="rotate(${ang})"/>`; }
    else { const k = b.type === 'short' ? 0.8 : 1; s += `<ellipse rx="${f1(r * 1.9 * k)}" ry="${f1(r * 0.55 * k)}" fill="none" stroke="${c}" stroke-width="1" transform="rotate(-16)"/><circle r="${f1(r * 0.72)}" fill="${c}"/>`; }
    if (hero) s += `<circle r="${f1(r * 2.4 + 7)}" class="sky-here"/>`;
    return s;
  };
  let lit = ''; const cands = { wide: [], tall: [] };
  const front = [...nbBodies.map(sp), mine].filter((x) => x.p);
  for (const { b, w, p } of front) {
    const hero = b === me; const r = Math.max(hero ? 6.5 : 4.5, bodyRadius(b, p[3], U) * (hero ? 1.25 : 1));
    const foot = pr(w[0], 0, w[2]);
    lit += `${foot ? `<path class="sky-stalk" d="M${f1(p[0])} ${f1(p[1])}L${f1(foot[0])} ${f1(foot[1])}"/>` : ''}<g transform="translate(${f1(p[0])} ${f1(p[1])})">${shape(b, p, r, hero)}</g>`;
    litBoxes.push({ x: p[0] - r * 1.4, y: p[1] - r * 1.4, w: r * 2.8, h: r * 2.8 });
    if (!inView(p)) continue;
    for (const k of ['wide', 'tall']) {
      const fs = FONT[k]; const t = shortTitle(titleOf(b.item), hero ? (k === 'tall' ? 20 : 34) : k === 'tall' ? 17 : 28);
      cands[k].push({ id: b.id, hero, tint: b.tint, x: p[0], y: p[1], r: hero ? r * 2.4 + 7 : r * 1.6, w: t.length * fs * (hero ? 0.6 : 0.56) + 6, h: fs * 1.25, pri: hero ? 1e6 : 1e5 + b.pri, t });
    }
  }
  out += `${plate}<g class="sky-lit">${lit}</g>`;

  // labels, once for wide frames and once for phones: the item, its neighbours, theme names, "now", the Digest when linked
  for (const k of ['wide', 'tall']) {
    // labels may cross the quiet dots (they carry a dark outline), never the lit bodies or the photograph
    const fs = FONT[k]; const boxes = litBoxes.slice(); let g = `<g class="sky-labels sky-labels--${k}" font-size="${fs}">`;
    const hit = (a, b) => a.x < b.x + b.w + 4 && a.x + a.w + 4 > b.x && a.y < b.y + b.h + 2 && a.y + a.h + 2 > b.y;
    const m = k === 'tall' ? 44 : 30;                              // clear of the feathered edge
    const free = (bx) => bx.x >= m && bx.y >= m * 0.8 && bx.x + bx.w <= VW - m && bx.y + bx.h <= VH - m * 0.8 && !boxes.some((q) => hit(bx, q));
    if (o && inView(o, 0)) {
      const t = k === 'tall' ? 'Now' : `Now · ${fmtDate(graph.time.end)}`; const tw = t.length * fs * 0.52;
      for (const bx of [{ x: o[0] - tw / 2, y: o[1] + 8, w: tw, h: fs * 1.25 }, { x: o[0] - tw / 2, y: o[1] + 8 + fs * 1.4, w: tw, h: fs * 1.25 }]) {
        if (!free(bx)) continue; boxes.push(bx); g += `<text class="sky-now" x="${f1(o[0])}" y="${f1(bx.y + fs)}" text-anchor="middle">${esc(t)}</text>`; break;
      }
    }
    const sectorLabel = (s) => {
      const sf = fs * 1.25; const tw = s.label.length * sf * 0.43;
      for (const rho of [1.1, 0.94, 0.78, 0.62, 0.46]) {
        const p = pr(Math.cos(s.mid) * rho, 0, Math.sin(s.mid) * rho); if (!p) continue;
        const bx = { x: p[0] - tw / 2, y: p[1] - sf, w: tw, h: sf * 1.3 }; if (!free(bx)) continue;
        boxes.push(bx); g += `<text class="sky-sector${s.id === item.theme ? ' is-own' : ''}" x="${f1(p[0])}" y="${f1(p[1])}" fill="${s.tint}" font-size="${f1(sf)}">${esc(s.label)}</text>`; return;
      }
    };
    const own = S.sectors.find((s) => s.id === item.theme); if (own) sectorLabel(own);   // the item's own theme is always named first
    const list = (k === 'tall' ? cands[k].sort((a, b) => b.pri - a.pri).slice(0, 3) : cands[k].slice()).sort((a, b) => b.pri - a.pri);
    const inset = k === 'tall' ? 34 : 22;                       // keep labels clear of the feathered edge
    const placed = placeNear(list, boxes, { x0: inset, y0: inset * 0.6, x1: VW - inset, y1: VH - inset * 0.6, pad: fs * 0.28 });
    if (digestLinked) {
      const t = k === 'tall' ? 'Automated Digest' : `Automated Digest · ${band.status}`; const tw = t.length * fs * 0.5;
      for (const rho of [0.9, 0.72, 1.03, 0.56, 0.42, 0.3]) {
        const p = pr(Math.cos(band.mid) * rho, -0.03, Math.sin(band.mid) * rho); if (!p) continue;
        const bx = { x: p[0] - tw / 2, y: p[1] + fs * 0.3, w: tw, h: fs * 1.3 }; if (!free(bx)) continue;
        boxes.push(bx); g += `<text class="sky-digest" x="${f1(bx.x)}" y="${f1(bx.y + fs)}" fill="${band.tint}">${esc(t)}</text>`; break;
      }
    }
    for (const s of S.sectors.filter((x) => x.id !== item.theme).slice(0, k === 'tall' ? 1 : 99)) sectorLabel(s);
    for (const c of list) {
      const L = placed.get(c.id); if (!L) continue;
      const tx = L.align === 'r' ? L.x + c.w : L.align === 'c' ? L.x + c.w / 2 : L.x;
      if (L.leader) { const ex = Math.max(L.x, Math.min(c.x, L.x + c.w)), ey = L.y + c.h / 2 < c.y ? L.y + c.h : L.y; g += `<path class="sky-leader" d="M${f1(c.x)} ${f1(c.y)}L${f1(ex)} ${f1(ey)}"/>`; }
      g += `<text${c.hero ? ' class="sky-me"' : ''} x="${f1(tx)}" y="${f1(L.y + fs * 0.98)}" text-anchor="${L.align === 'r' ? 'end' : L.align === 'c' ? 'middle' : 'start'}">${esc(c.t)}</text>`;
    }
    out += g + '</g>';
  }
  return out + '</svg>';
}

/**
 * Label placement for the sky. Tries beside, below and above each body, then steps outward on a ring and ties the
 * label back with a short leader, so the item and every neighbour gets a name even when they sit close together.
 * Pushes each placed box onto `boxes`. Returns Map id -> { x, y, align, leader }.
 */
function placeNear(list, boxes, { x0, y0, x1, y1, pad }) {
  const out = new Map();
  const ok = (r) => r.x >= x0 && r.y >= y0 && r.x + r.w <= x1 && r.y + r.h <= y1 && !boxes.some((q) => r.x < q.x + q.w + pad && r.x + r.w + pad > q.x && r.y < q.y + q.h + pad && r.y + r.h + pad > q.y);
  const ANG = [0, 180, 90, 270, 35, 145, 325, 215, 60, 120, 300, 240, 15, 165, 345, 195].map((d) => (d * Math.PI) / 180);
  for (const c of list) {
    let hit = null;
    for (const d of [c.r + 8, c.r + 30, c.r + 58, c.r + 92, c.r + 130, c.r + 175].concat(c.hero ? [c.r + 225, c.r + 280] : [])) {
      for (const a of ANG) {
        const cs = Math.cos(a), sn = Math.sin(a); const px = c.x + cs * d, py = c.y + sn * d;
        const align = cs > 0.35 ? 'l' : cs < -0.35 ? 'r' : 'c';
        const r = { x: align === 'l' ? px : align === 'r' ? px - c.w : px - c.w / 2, y: sn > 0.35 ? py : sn < -0.35 ? py - c.h : py - c.h / 2, w: c.w, h: c.h };
        if (ok(r)) { hit = { x: r.x, y: r.y, align, leader: d > c.r + 20 }; break; }
      }
      if (hit) break;
    }
    if (hit) { out.set(c.id, hit); boxes.push({ x: hit.x, y: hit.y, w: c.w, h: c.h }); }
  }
  return out;
}

/** One plain sentence under the sky, derived from the same data. */
export function skyCaption(item, graph) {
  const theme = graph.sector[item.theme]; const { items: nb } = neighbours(item, graph);
  const kind = (typeLabel[item.type] ?? 'Item').toLowerCase() === 'writing' ? 'essay' : (typeLabel[item.type] ?? 'item').toLowerCase();
  const names = nb.map((it) => (it.type === 'digest' ? 'the automated Digest' : titleOf(it)));
  const join = (a) => (a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);
  const pieces = nb.filter((it) => it.type !== 'digest'); const digest = nb.some((it) => it.type === 'digest');
  const to = pieces.length <= 2 ? names : [`${pieces.length} other pieces of work`].concat(digest ? ['the automated Digest'] : []);
  return `This ${kind} sits in ${theme?.label ?? 'the universe'}, ${fmtDate(item.date, item.precision)}.${to.length ? ` Documented threads connect it to ${join(to)}.` : ' It has no documented threads yet.'}`;
}
