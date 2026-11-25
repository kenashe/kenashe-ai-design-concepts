// Round 2 · Direction A · The Modern Technologist
// Region renderers. Pure ES module: no DOM access, runs in Node (prerender) and in the browser
// (publishing demo, ?demo= homepage). Every list, count, date and position below comes from the graph.
import { esc, fmtDate, typeLabel, hrefFor, THEMES } from '../../lib/graph.js';
import { DEMO_STEPS } from '../../lib/publish-demo.js';

export const BUILT = ['/', '/about/', '/building/zerohuman/', '/building/returning-your-things/'];

/* ------------------------------------------------------------------ helpers */
const TAU = Math.PI * 2;
const SECTOR = TAU / THEMES.length;
const THEME_IX = Object.fromEntries(THEMES.map((t, i) => [t.id, i]));
const themeLabel = (id) => THEMES.find((t) => t.id === id)?.label ?? id;
const DAY = 86400000, MONTH = 30.4375 * DAY;
const r1 = (n) => Math.round(n * 10) / 10;
const fmtN = (n) => Number(n).toLocaleString('en-US');
const plural = (n, one, many = one + 's') => `${fmtN(n)} ${n === 1 ? one : many}`;
export const hash = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967295; };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Where an item links inside the prototype (built pages) or on the live site. */
export function linkOf(it, ctx) {
  if (it.demo) return '#';
  if (it.type === 'video' || it.type === 'short') return it.href;
  if (!it.href) return hrefFor('/building/', ctx, BUILT);
  return hrefFor(it.href, ctx, BUILT);
}
const ext = (url) => /^https?:/.test(url) ? ' rel="noopener"' : '';
const dateOf = (it) => fmtDate(it.date, it.precision);
const kind = (it) => it.automated ? 'Digest · automated' : typeLabel[it.type];
const newAttr = (it) => (it.demo ? ' data-new data-demo' : '');
const ytAttr = (it) => (it.videoId && !it.demo ? ` data-yt="${esc(it.videoId)}" data-yt-title="${esc(it.title)}"` : '');

/** Receipts: the technical layer. Shown when the visitor turns on "Receipts". */
function receipt(it, graph) {
  const t = THEMES.find((x) => x.id === it.theme);
  const text = [it.title, (it.stack || []).join(' '), it.dek].join(' ');
  const hit = t && t.id !== 'life' ? text.match(t.match)?.[0] : null;
  const rel = it.related.length;
  return `<span class="rc" aria-hidden="true">${esc(it.source || 'derived')} → theme <b>${esc(it.theme)}</b> ${hit ? `(rule matched “${esc(hit.trim())}”)` : '(no rule matched, so curiosity)'} · ${plural(rel, 'documented link')}${it.layout ? ` · orbit ${Math.round(((((it.layout.angle * 180) / Math.PI) % 360) + 360) % 360)}° from top` : ''}</span>`;
}

/* ------------------------------------------------------------------ the generative mark
   Every build gets a mark computed from its own data, in the same geometry as the orbit:
   - the bright arc is its theme sector (same angle it occupies around Ken)
   - each stack entry is a tick at a fixed angle for that technology (Ethereum is always in the same place)
   - the hand points to the month it shipped, like a clock face of the year
   - the core is solid when LIVE, hollow when SHIPPED
   - one dot per documented relationship */
export function glyph(it, { size = 96, label = true } = {}) {
  const th = THEME_IX[it.theme] ?? 4;
  const c = th * SECTOR - Math.PI / 2;
  const P = (a, r) => `${r1(Math.cos(a) * r)} ${r1(Math.sin(a) * r)}`;
  const arc = (a0, a1, r) => `M${P(a0, r)}A${r} ${r} 0 0 1 ${P(a1, r)}`;
  const stack = it.stack || [];
  const ticks = stack.map((s, i) => {
    const a = hash(s.toLowerCase()) * TAU;
    return `<path d="M${P(a, 31)}L${P(a, 41 - (i % 3) * 2)}"/>`;
  }).join('');
  const m = it.month ? +it.month.slice(5, 7) - 1 : 0;
  const ha = (m / 12) * TAU - Math.PI / 2;
  const rel = it.related?.length || 0;
  const dots = Array.from({ length: rel }, (_, i) => { const a = c + Math.PI + (i - (rel - 1) / 2) * 0.32; return `<circle cx="${r1(Math.cos(a) * 21)}" cy="${r1(Math.sin(a) * 21)}" r="1.9"/>`; }).join('');
  const live = it.status === 'LIVE';
  const year = Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * TAU - Math.PI / 2; return `<path d="M${P(a, 44.5)}L${P(a, 46.5)}"/>`; }).join('');
  const title = label ? `<title>${esc(`Mark for ${it.title}: ${themeLabel(it.theme)}, ${stack.length} stack items, ${it.status || typeLabel[it.type]}, ${dateOf(it)}, ${rel} documented links`)}</title>` : '';
  return `<svg class="glyph${live ? ' is-live' : ''}" viewBox="-50 -50 100 100" width="${size}" height="${size}" role="img"${label ? '' : ' aria-hidden="true"'} data-theme="${esc(it.theme)}">${title}`
    + `<circle class="g-o" r="46.5"/><g class="g-y">${year}</g>`
    + `<path class="g-s" d="${arc(c - SECTOR / 2 + 0.06, c + SECTOR / 2 - 0.06, 46.5)}"/>`
    + `<circle class="g-i" r="31"/><g class="g-t">${ticks}</g><g class="g-d">${dots}</g>`
    + `<path class="g-h" d="M0 0L${P(ha, 26)}"/><circle class="g-hd" cx="${r1(Math.cos(ha) * 26)}" cy="${r1(Math.sin(ha) * 26)}" r="2.4"/>`
    + (live ? `<circle class="g-c" r="6.5"/><circle class="g-cr" r="11"/>` : `<circle class="g-c g-c--h" r="5.5"/>`)
    + `</svg>`;
}

/** Media for any item: its real image if it has one, otherwise its generative mark. */
/** An image that loads only when it nears the viewport (site.js), with a <noscript> copy so the
    page is complete without JavaScript. Used below the fold, where source images are full size. */
export function deferImg(src, alt = '', attrs = '') {
  return `<img data-src="${esc(src)}" alt="${esc(alt)}" decoding="async" width="1280" height="720"${attrs}><noscript><img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" width="1280" height="720"${attrs}></noscript>`;
}

function media(it, { cls = '', size = 120, eager = false, defer = false, sizes = '(min-width: 900px) 30vw, 90vw' } = {}) {
  if (it.image) {
    const alt = it.demo ? 'Placeholder image for a publishing-demo entry' : (it.imageAlt || '');
    if (defer) return `<span class="media ${cls}">${deferImg(it.image, alt)}</span>`;
    return `<span class="media ${cls}"><img src="${esc(it.image)}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" width="1280" height="720" sizes="${sizes}"></span>`;
  }
  return `<span class="media media--glyph ${cls}" data-theme="${esc(it.theme)}">${glyph(it, { size })}</span>`;
}

/* ------------------------------------------------------------------ the orbit (signature)
   Ken sits at the centre. Every dated item sits at an angle given by its theme
   (graph.js layout.angle) and at a distance given by how long ago it was made, so the newest
   work is closest to him. Rings are calendar months. Curves are documented relationships,
   bowed through the centre because every one of them runs through Ken's own pages. */
export const ORBIT = { C: 500, R0: 158, R1: 412, RE: 444, RL: 476 };

export function orbitModel(graph, asOf) {
  const now = asOf || graph.stats.lastDate;
  const tNow = Date.parse(now);
  const ages = graph.items.filter((i) => i.date).map((i) => (tNow - Date.parse(i.date)) / MONTH).filter((a) => a <= 24);
  const W = Math.min(24, Math.max(6, Math.ceil(Math.max(...ages) + 0.5)));
  return { now, tNow, W };
}

export function rOfAge(age, W) {
  const { R0, R1, RE } = ORBIT;
  if (age > W) return RE;
  return R0 + Math.sqrt(Math.max(0, age) / W) * (R1 - R0);
}

/** Position of an item as seen from `tNow` (ms). Pure, shared with the browser scrubber. */
export function placeAt(p, tNow, W) {
  const { C, R0 } = ORBIT;
  const t = p.t === 'digest' ? Math.min(tNow, p.d) : p.d;
  const age = (tNow - t) / MONTH;
  let r = rOfAge(age, W) + (age > W ? 0 : (p.j - 0.5) * 14);
  if (p.t === 'digest') r = Math.max(r, R0 + p.s + 14);
  const a = p.a - Math.PI / 2;
  return { x: C + Math.cos(a) * r, y: C + Math.sin(a) * r, r, earlier: age > W };
}

export function markSize(it, digestPosts) {
  const w = it.layout.weight;
  if (it.type === 'digest') return 5 + Math.sqrt(digestPosts) * 0.62;
  if (it.type === 'build') return 7.5 + w * 3.2;
  if (it.type === 'essay') return 6 + w * 2.6;
  if (it.type === 'short') return 6.5 + w * 2;
  return 7.5 + w * 3;
}

export function shape(t, s) {
  const S = r1(s);
  if (t === 'build') return `<rect class="sh" x="${-S}" y="${-S}" width="${S * 2}" height="${S * 2}" rx="1.5"/>`;
  if (t === 'essay') return `<circle class="sh" r="${S}"/>`;
  if (t === 'video') return `<path class="sh" d="M${r1(-S * 0.8)} ${-S}L${r1(S * 1.1)} 0L${r1(-S * 0.8)} ${S}Z"/>`;
  if (t === 'short') return `<rect class="sh" x="${r1(-S * 0.58)}" y="${-S}" width="${r1(S * 1.16)}" height="${S * 2}" rx="${r1(S * 0.3)}"/>`;
  return `<circle class="sh sh--digest" r="${S}"/><circle class="sh-dr" r="${r1(S * 0.42)}"/>`;
}

/** Monthly cumulative Digest posts (from real pubDates) for the scrubber. */
function digestCumulative(graph) {
  const per = Object.entries(graph.digest.perDay).sort(([a], [b]) => (a < b ? -1 : 1));
  const out = {}; let n = 0;
  for (const [day, k] of per) { n += k; out[day.slice(0, 7)] = n; }
  return out;
}

function edgePath(a, b) {
  const { C } = ORBIT;
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const cx = C + (mx - C) * 0.3, cy = C + (my - C) * 0.3;
  return `M${r1(a.x)} ${r1(a.y)}Q${r1(cx)} ${r1(cy)} ${r1(b.x)} ${r1(b.y)}`;
}

function monthsInWindow(graph, W) {
  const last = graph.stats.lastDate;
  const out = [];
  let y = +last.slice(0, 4), m = +last.slice(5, 7);
  for (let i = 0; i < W; i++) { out.push(`${y}-${String(m).padStart(2, '0')}`); m--; if (!m) { m = 12; y--; } }
  return out; // newest first
}

/** Month labels run along the spine between the last and first theme sectors (upper left). */
export function ringLabelAt(lr) {
  const a = -SECTOR / 2 - Math.PI / 2;
  return { x: ORBIT.C + Math.cos(a) * lr, y: ORBIT.C + Math.sin(a) * lr + 3.5 };
}

/** Bezel: a fine scale on the outer ring, long ticks at theme boundaries. */
function bezel() {
  const { C, R1 } = ORBIT; const r = R1 + 8; let d = '';
  for (let i = 0; i < 180; i++) {
    const a = (i / 180) * TAU - Math.PI / 2 - SECTOR / 2;
    const major = i % 36 === 0, mid = i % 6 === 0;
    const l = major ? 14 : mid ? 6 : 3;
    d += `M${r1(C + Math.cos(a) * r)} ${r1(C + Math.sin(a) * r)}L${r1(C + Math.cos(a) * (r + l))} ${r1(C + Math.sin(a) * (r + l))}`;
  }
  return `<path class="bezel" d="${d}"/>`;
}

/** Short label beside a key mark, pushed outward along its own radius. */
function markLabel(it, p) {
  return `<text class="ml" x="0" y="${r1(p.s + 17)}" text-anchor="middle" aria-hidden="true">${esc(it.type === 'digest' ? 'DIGEST · AUTOMATED' : it.title)}</text>`;
}

export function orbitSVG(graph, ctx, { asOf } = {}) {
  const { C, R0, R1, RE, RL } = ORBIT;
  const { tNow, W } = orbitModel(graph, asOf);
  const cum = digestCumulative(graph);
  const dated = graph.items.filter((i) => i.date);
  const pts = new Map();
  for (const it of dated) {
    const s = markSize(it, it.type === 'digest' ? graph.digest.published : 0);
    const p = { id: it.id, t: it.type, a: it.layout.angle, j: it.layout.jitter, d: Date.parse(it.date), s };
    pts.set(it.id, { ...p, ...placeAt(p, tNow, W) });
  }
  // rings at calendar-month starts
  const months = monthsInWindow(graph, W);
  const rings = months.map((m, i) => {
    const age = (tNow - Date.parse(m + '-01')) / MONTH;
    const r = rOfAge(age, W);
    const next = i === 0 ? R0 : rOfAge((tNow - Date.parse(months[i - 1] + '-01')) / MONTH, W);
    const lr = (r + next) / 2;
    const lab = `${MON[+m.slice(5) - 1]}${m.endsWith('-01') || i === months.length - 1 ? ' ’' + m.slice(2, 4) : ''}`;
    const fits = r - next >= 13 || i === months.length - 1;
    const L = ringLabelAt(lr);
    return `<g class="ring" data-m="${m}"><circle r="${r1(r)}" cx="${C}" cy="${C}"/><text x="${r1(L.x)}" y="${r1(L.y)}"${fits ? '' : ' class="ring-hide"'}>${esc(lab.toUpperCase())}</text></g>`;
  }).join('');
  // sector dividers + labels (counts derived)
  const sectors = THEMES.map((t, i) => {
    const a0 = i * SECTOR - SECTOR / 2 - Math.PI / 2, ac = i * SECTOR - Math.PI / 2;
    const n = dated.filter((it) => it.theme === t.id && it.type !== 'digest').length;
    const lower = Math.sin(ac) > 0.15;
    const span = SECTOR / 2 - 0.05;
    const P = (a, r) => `${r1(C + Math.cos(a) * r)} ${r1(C + Math.sin(a) * r)}`;
    const rr = lower ? RL + 9 : RL;
    const d = lower ? `M${P(ac + span, rr)}A${rr} ${rr} 0 0 0 ${P(ac - span, rr)}` : `M${P(ac - span, rr)}A${rr} ${rr} 0 0 1 ${P(ac + span, rr)}`;
    return `<path class="div" d="M${P(a0, R0 + 4)}L${P(a0, RL + 14)}"/>`
      + `<path id="sl-${t.id}" class="sl-path" d="${d}"/>`
      + `<a class="sec" href="#builds" data-theme="${t.id}" aria-label="${esc(`${t.label}: ${n} items. ${t.hint}`)}"><path class="sec-hit" d="M${P(ac - SECTOR / 2, R0)}L${P(ac - SECTOR / 2, RL + 22)}A${RL + 22} ${RL + 22} 0 0 1 ${P(ac + SECTOR / 2, RL + 22)}L${P(ac + SECTOR / 2, R0)}A${R0} ${R0} 0 0 0 ${P(ac - SECTOR / 2, R0)}Z"/>`
      + `<text class="sec-l"><textPath href="#sl-${t.id}" startOffset="50%" text-anchor="middle">${esc(t.label.toUpperCase())}<tspan class="sec-n"> · ${n}</tspan></textPath></text></a>`;
  }).join('');
  // documented relationships
  const edges = graph.edges.map((e) => {
    const a = pts.get(e.from), b = pts.get(e.to); if (!a || !b) return '';
    return `<path class="e" data-a="${esc(e.from)}" data-b="${esc(e.to)}" data-type="${esc(e.type)}" d="${edgePath(a, b)}"><title>${esc(`${graph.byId.get(e.from).title} ${e.type} ${graph.byId.get(e.to).title} (${e.evidence})`)}</title></path>`;
  }).join('');
  // marks (oldest first so the newest draw on top)
  const named = new Set(['digest']);
  const order = [...dated].sort((a, b) => (a.type === 'digest' ? -1 : b.type === 'digest' ? 1 : a.date < b.date ? -1 : 1));
  const marks = order.map((it) => {
    const p = pts.get(it.id);
    const rot = it.type === 'build' ? ` rotate(${r1((it.layout.angle * 180) / Math.PI)})` : '';
    const lbl = `${kind(it)}, ${dateOf(it)}: ${it.title}. ${themeLabel(it.theme)}.${it.related.length ? ` ${plural(it.related.length, 'documented link')}.` : ''}`;
    const link = linkOf(it, ctx);
    return `<a class="m m--${it.type}${it.status === 'LIVE' ? ' is-live' : ''}" href="${esc(link)}"${ext(link)}${ytAttr(it)} data-id="${esc(it.id)}" data-t="${it.type}" data-th="${esc(it.theme)}" data-d="${p.d}"${it.type === 'digest' ? ` data-d0="${Date.parse(graph.digest.first)}"` : ''} data-a="${r1(it.layout.angle * 1000) / 1000}" data-j="${r1(it.layout.jitter * 1000) / 1000}" data-s="${r1(p.s)}" data-rel="${esc(it.related.join(' '))}"${newAttr(it)} aria-label="${esc(lbl)}">`
      + `<g class="mk" transform="translate(${r1(p.x)} ${r1(p.y)})"><g class="mk-r"${rot ? ` transform="${rot.trim()}"` : ''}>${shape(it.type, p.s)}</g><circle class="halo" r="${r1(p.s + 9)}"/>${named.has(it.id) ? markLabel(it, p) : ''}</g></a>`;
  }).join('');
  const earlier = dated.some((it) => pts.get(it.id).earlier)
    ? `<circle class="ring-e" cx="${C}" cy="${C}" r="${RE}"/><text class="ring-el" x="${r1(ringLabelAt(RE).x)}" y="${r1(ringLabelAt(RE).y)}">EARLIER</text>` : '';
  const desc = `Ken Ashe at the centre, surrounded by ${dated.length} dated items. Angle is the theme, distance from Ken is how long ago it was made (rings are months, ${W} shown), shape is the type: squares are builds, circles are essays, triangles are videos, tall rectangles are shorts, and the hatched disc is the automated Digest, sized by its post count. ${graph.edges.length} curves are documented relationships. Every mark is a link.`;
  return `<svg class="orbit-svg" viewBox="0 0 1000 1000" role="group" aria-labelledby="orbit-t orbit-d" data-w="${W}" data-now="${tNow}">`
    + `<title id="orbit-t">Everything Ken has made, arranged around him</title><desc id="orbit-d">${esc(desc)}</desc>`
    + `<defs><pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" class="hatch-bg"/><line x1="0" y1="0" x2="0" y2="5" class="hatch-ln"/></pattern></defs>`
    + `<g class="grid"><circle class="ring-0" cx="${C}" cy="${C}" r="${R0}"/>${rings}<circle class="ring-1" cx="${C}" cy="${C}" r="${R1 + 8}"/>${bezel()}${earlier}</g>`
    + `<g class="secs">${sectors}</g><g class="edges">${edges}</g><g class="marks">${marks}</g>`
    + `<script type="application/json" class="orbit-cum">${JSON.stringify(cum)}</script></svg>`;
}

/** Readout data for the orbit (title, date, theme, media) as JSON, so hovering needs no fetch. */
function orbitData(graph, ctx) {
  const out = {};
  for (const it of graph.items.filter((i) => i.date)) {
    out[it.id] = {
      k: kind(it), t: it.type, ti: it.title, dk: it.dek ? it.dek.slice(0, 180) + (it.dek.length > 180 ? '…' : '') : '', dt: dateOf(it),
      th: themeLabel(it.theme), h: linkOf(it, ctx), img: it.image || null, st: it.status || null, yt: it.demo ? null : it.videoId || null,
      rel: it.related.map((r) => graph.byId.get(r)?.title).filter(Boolean), demo: !!it.demo,
      g: it.image ? null : glyph(it, { size: 64, label: false }),
    };
  }
  return JSON.stringify(out).replace(/</g, '\\u003c');
}

const monthName = (m) => `${MON[+m.slice(5) - 1]} ${m.slice(0, 4)}`;

/* ------------------------------------------------------------------ regions */
export const regions = {
  /* Homepage hero: the orbit, its controls and readout seed data. */
  orbit(graph, ctx) {
    const { W } = orbitModel(graph);
    const months = monthsInWindow(graph, W).reverse();
    const chips = months.map((m, i) => `<button type="button" class="chip" data-month="${m}"${i === months.length - 1 ? ' aria-pressed="true"' : ' aria-pressed="false"'}><span class="chip-l">${MON[+m.slice(5) - 1]}</span><span class="chip-y">${i === 0 || m.endsWith('-01') ? '’' + m.slice(2, 4) : ''}</span><span class="vh"> ${m.slice(0, 4)}</span></button>`).join('');
    const portrait = `${ctx.base}assets/portrait/ken-black-polo-square-`;
    return `<div class="orbit" data-orbit>`
      + `<div class="orbit-stage">${orbitSVG(graph, ctx)}`
      + `<figure class="orbit-me"><img src="${portrait}640.webp" srcset="${portrait}640.webp 640w, ${portrait}1280.webp 1122w" sizes="(min-width: 1100px) 220px, 32vw" width="640" height="640" alt="Ken Ashe smiling, wearing a black polo, in a bright office." fetchpriority="high"><figcaption class="vh">Ken Ashe</figcaption></figure>`
      + `<p class="orbit-now" aria-hidden="true"><span data-orbit-asof>${esc(fmtDate(graph.stats.lastDate))}</span></p></div>`
      + `<div class="orbit-time" role="group" aria-label="Rewind the orbit to a month">`
      + `<button type="button" class="play" data-orbit-play aria-label="Play the year" hidden><svg viewBox="0 0 16 16" aria-hidden="true"><path class="i-play" d="M4 2.5v11l9-5.5z"/><path class="i-pause" d="M4 2.5h3v11H4zM9 2.5h3v11H9z"/></svg></button>`
      + `<div class="chips">${chips}</div></div>`
      + `<p class="orbit-count" data-orbit-count aria-live="polite">${counts(graph)}</p>`
      + `<script type="application/json" class="orbit-data">${orbitData(graph, ctx)}</script>`
      + `</div>`;
  },

  /* Hero readout: legend by default, the hovered item when exploring. Starts on the newest item. */
  readout(graph, ctx) {
    const it = graph.now[0];
    return `<div class="ro-item" data-ro-item>${readoutItem(it, graph, ctx, 'Newest')}</div>`
      + `<div class="ro-legend"><p class="eyebrow">How to read the orbit</p><ul class="legend">`
      + `<li><svg viewBox="-10 -10 20 20" aria-hidden="true">${shape('build', 6)}</svg>Build</li>`
      + `<li><svg viewBox="-10 -10 20 20" aria-hidden="true" class="lg-essay">${shape('essay', 5.5)}</svg>Writing</li>`
      + `<li><svg viewBox="-10 -10 20 20" aria-hidden="true" class="lg-video">${shape('video', 6)}</svg>Video</li>`
      + `<li><svg viewBox="-10 -10 20 20" aria-hidden="true" class="lg-short">${shape('short', 6.5)}</svg>Short</li>`
      + `<li><svg viewBox="-10 -10 20 20" aria-hidden="true" class="lg-digest">${shape('digest', 7.5)}</svg>Digest · automated</li></ul>`
      + `<p class="ro-rule">Angle is the theme. Distance from me is time: the newer it is, the closer it sits. Curves are links I actually wrote between pages.</p></div>`;
  },

  /* "Just shipped": the four newest dated items across every type. */
  latest(graph, ctx) {
    return `<ol class="latest">${graph.now.map((it) => {
      const link = linkOf(it, ctx);
      return `<li data-id="${esc(it.id)}"${newAttr(it)}><a href="${esc(link)}"${ext(link)}${ytAttr(it)} class="lt">${media(it, { cls: 'lt-m', size: 56, sizes: '160px' })}<span class="lt-t"><span class="meta"><b>${esc(kind(it))}</b> ${esc(dateOf(it))}</span><span class="lt-h">${esc(it.title)}</span></span></a></li>`;
    }).join('')}</ol>`;
  },

  /* Videos & shorts rail. The film has its own band, so its embed is skipped here. */
  videos(graph, ctx) {
    const film = graph.items.find((i) => i.type === 'build' && i.theme === 'film' && i.metric && /runtime/.test(i.metric));
    const vids = graph.latest(['video', 'short'], 40).filter((v) => !film || v.videoId !== film.video);
    return `<div class="rail" data-rail><ol class="rail-track" tabindex="0" aria-label="Videos and shorts">${vids.map((v, i) => {
        const link = linkOf(v, ctx);
        return `<li class="vc${v.type === 'short' ? ' vc--short' : ''}${i === 0 ? ' vc--first' : ''}" data-id="${esc(v.id)}"${newAttr(v)}><a href="${esc(link)}"${ext(link)}${ytAttr(v)} class="vc-a"><span class="vc-m">${v.image ? `<img src="${esc(v.image)}" alt="" loading="lazy" decoding="async" width="1280" height="720">` : ''}<span class="vc-play" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M5 3v10l8-5z"/></svg></span>${i === 0 ? '<span class="vc-new">Newest</span>' : ''}</span>`
          + `<span class="meta"><b>${esc(kind(v))}</b> ${esc(dateOf(v))}${v.related.length ? ` · <span class="vc-rel">linked to ${esc(graph.byId.get(v.related[0]).title)}</span>` : ''}</span><span class="vc-t">${esc(v.title)}</span></a>${receipt(v, graph)}</li>`;
      }).join('')}</ol>`
      + `<div class="rail-ctl"><button type="button" class="rbtn" data-rail-prev aria-label="Previous videos" hidden>←</button><button type="button" class="rbtn" data-rail-next aria-label="More videos" hidden>→</button><a class="tlink" href="https://www.youtube.com/@KenAshe" rel="noopener">YouTube channel ↗</a></div></div>`;
  },

  'watch-head'(graph) {
    return `<h2 id="watch-h">Watch</h2><p class="sec-sub">A short film, ${plural(graph.stats.videos, 'video')} and ${plural(graph.stats.shorts, 'short')}, newest first. Every one plays right here, and loads from YouTube only when you press play.</p>`;
  },

  /* Builds: featured three, then every build as a mark you can open. */
  builds(graph, ctx) {
    const f = graph.featuredBuilds;
    const all = graph.items.filter((i) => i.type === 'build').sort((a, b) => a.order - b.order);
    const rest = all.filter((b) => !f.includes(b));
    const live = all.filter((b) => b.status === 'LIVE').length;
    const themeCount = new Set(all.map((b) => b.theme)).size;
    const card = (b, i) => {
      const link = linkOf(b, ctx);
      return `<li class="fb${i === 0 ? ' fb--lead' : ''}" data-id="${esc(b.id)}"${newAttr(b)}><a href="${esc(link)}"${ext(link)} class="fb-a">${media(b, { cls: 'fb-m', size: i === 0 ? 300 : 200, defer: true })}`
        + `<span class="fb-b"><span class="meta"><b class="st st--${esc((b.status || '').toLowerCase())}">${esc(b.status || '')}</b> ${esc(dateOf(b))} · ${esc(themeLabel(b.theme))}</span>`
        + `<span class="fb-t">${esc(b.title)}</span><span class="fb-d">${esc(b.dek)}</span>`
        + `<span class="fb-f">${b.metric ? `<span class="metric">${esc(b.metric)}</span>` : ''}<span class="stack">${b.stack.slice(0, 4).map((s) => `<span>${esc(s)}</span>`).join('')}</span></span>`
        + `<span class="fb-cta">${esc(b.cta || 'Open')} →</span></span></a>${receipt(b, graph)}</li>`;
    };
    const row = (b) => {
      const link = linkOf(b, ctx);
      return `<li class="br" data-id="${esc(b.id)}"${newAttr(b)}><a href="${esc(link)}"${ext(link)} class="br-a">${b.image ? media(b, { cls: 'br-m', defer: true }) : `<span class="br-g">${glyph(b, { size: 56 })}</span>`}`
        + `<span class="br-b"><span class="meta"><b class="st st--${esc((b.status || '').toLowerCase())}">${esc(b.status || '')}</b> ${esc(dateOf(b))}</span><span class="br-t">${esc(b.title)}</span>`
        + `<span class="br-x">${b.metric ? `<span class="metric">${esc(b.metric)}</span> ` : ''}${esc(b.stack.slice(0, 3).join(' · '))}</span></span></a>${receipt(b, graph)}</li>`;
    };
    return `<div class="sec-h"><h2 id="builds-h">Builds</h2><p class="sec-sub">${plural(all.length, 'project')} across ${themeCount} themes, ${fmtN(live)} live right now. Image-less builds wear a mark generated from their own data: theme arc, stack ticks, ship month, status and links.</p></div>`
      + `<ol class="fbs">${f.map(card).join('')}</ol>`
      + `<details class="idx"><summary><span class="idx-s"><span class="idx-l">All ${plural(all.length, 'build')}</span><span class="idx-strip" aria-hidden="true">${rest.map((b) => glyph(b, { size: 30, label: false })).join('')}</span></span><span class="idx-o" aria-hidden="true">+</span></summary>`
      + `<ol class="brs">${rest.map(row).join('')}</ol></details>`;
  },

  /* Ken's writing. Kept apart from the automated Digest. */
  writing(graph, ctx) {
    const es = graph.latest('essay', 40);
    return `<div class="sec-h"><h2 id="writing-h">Writing</h2><p class="sec-sub">${plural(es.length, 'essay')} by me, with the photos I took along the way. The automated Digest lives separately, below.</p></div>`
      + `<ol class="ws">${es.map((w, i) => {
        const link = linkOf(w, ctx);
        return `<li class="w${i === 0 ? ' w--lead' : ''}" data-id="${esc(w.id)}"${newAttr(w)}><a href="${esc(link)}"${ext(link)} class="w-a">${media(w, { cls: 'w-m', size: 80, defer: true })}<span class="w-b"><span class="meta"><b>${esc(themeLabel(w.theme))}</b> ${esc(dateOf(w))}</span><span class="w-t">${esc(w.title)}</span>${i === 0 ? `<span class="w-d">${esc(w.dek)}</span>` : ''}<span class="w-au">${esc(w.authorship || '')}</span></span></a>${receipt(w, graph)}</li>`;
      }).join('')}</ol>`;
  },

  /* The Digest: automated, status derived from the workflow file, volume from real pubDates. */
  digest(graph, ctx) {
    const d = graph.digest;
    const per = Object.entries(d.perDay).sort(([a], [b]) => (a < b ? -1 : 1));
    const t0 = Date.parse(d.first), tEnd = Math.max(Date.parse(graph.stats.lastDate), Date.parse(d.last));
    const span = (tEnd - t0) / DAY + 1;
    const max = Math.max(...per.map(([, n]) => n));
    const Wd = 1000, Hd = 120;
    const x = (day) => ((Date.parse(day) - t0) / DAY / span) * Wd;
    const bars = per.map(([day, n]) => `<rect x="${r1(x(day))}" y="${r1(Hd - (n / max) * (Hd - 18))}" width="${r1(Math.max(1.4, Wd / span - 1))}" height="${r1((n / max) * (Hd - 18))}"/>`).join('');
    const xl = x(d.last) + Wd / span;
    const stopped = d.status !== 'publishing';
    const gap = stopped && tEnd > Date.parse(d.last) ? `<rect class="dg-gap" x="${r1(xl)}" y="0" width="${r1(Wd - xl)}" height="${Hd}"/>` : '';
    const mticks = [];
    for (let t = new Date(d.first.slice(0, 7) + '-01T00:00:00Z'); t.getTime() <= tEnd; t.setUTCMonth(t.getUTCMonth() + 1)) {
      const iso = t.toISOString().slice(0, 10); if (Date.parse(iso) < t0) continue;
      mticks.push(`<text x="${r1(x(iso))}" y="${Hd + 16}">${MON[t.getUTCMonth()].toUpperCase()}</text>`);
    }
    const build = graph.byId.get(d.relatedBuild);
    const vids = build ? build.related.map((r) => graph.byId.get(r)).filter((i) => i && (i.type === 'video' || i.type === 'short')) : [];
    const stateWord = stopped ? (d.publishingPaused ? 'Paused' : esc(d.status)) : 'Publishing';
    const perDayAvg = Math.round(d.published / per.length);
    return `<div class="dg-head"><p class="dg-tag"><span class="auto">Automated</span><span class="dg-state dg-state--${esc(d.status)}">${stateWord}</span></p>`
      + `<h2 id="digest-h">${esc(d.name)}</h2><p class="dg-line">${esc(d.statusLine)}</p></div>`
      + `<div class="dg-body"><div class="dg-main"><figure class="dg-fig"><svg viewBox="0 -4 ${Wd} ${Hd + 22}" preserveAspectRatio="none" role="img" aria-label="${esc(`Automated posts per day from ${fmtDate(d.first)} to ${fmtDate(d.last)}, at most ${max} a day.${stopped ? ' Nothing published since.' : ''}`)}"><g class="dg-bars">${bars}</g>${gap}${stopped ? `<line class="dg-stop" x1="${r1(xl)}" x2="${r1(xl)}" y1="0" y2="${Hd}"/>` : ''}<g class="dg-x">${mticks.join('')}</g></svg>`
      + `<figcaption><span>Posts per day, from the posts’ own publish dates</span>${stopped ? `<span class="dg-last">Last post ${esc(fmtDate(d.last))}</span>` : ''}</figcaption></figure>`
      + `<dl class="dg-stats"><div><dt>Published</dt><dd>${fmtN(d.published)}</dd></div><div><dt>Drafts</dt><dd>${fmtN(d.drafts)}</dd></div><div><dt>Typical day</dt><dd>~${perDayAvg}</dd></div><div><dt>Search</dt><dd>${d.noindex ? 'noindex' : 'indexed'}</dd></div></dl></div>`
      + `<div class="dg-more"><p class="dg-l">Latest automated posts</p><ul class="dg-list">${d.latest.slice(0, 3).map((p) => `<li><a href="${esc(hrefFor(p.link, ctx, BUILT))}" rel="noopener">${esc(p.title)}</a><span class="meta">${esc(fmtDate(p.date))} · ${esc(d.byline)}</span></li>`).join('')}</ul>`
      + `${vids.length ? `<p class="dg-l">What happened, in my words</p>${vids.map((v) => `<a class="dg-vid" href="${esc(v.href)}" rel="noopener"${ytAttr(v)} data-id="${esc(v.id)}">${v.image ? deferImg(v.image) : ''}<span><span class="meta"><b>${esc(kind(v))}</b> ${esc(dateOf(v))}</span>${esc(v.title)}</span></a>`).join('')}` : ''}`
      + `<p class="dg-links"><a class="tlink" href="${esc(hrefFor(d.link, ctx, BUILT))}" rel="noopener">Digest archive ↗</a>${build ? `<a class="tlink" href="${esc(linkOf(build, ctx))}" rel="noopener">How the pipeline works ↗</a>` : ''}</p></div></div>`
      + `<p class="rc" aria-hidden="true">status from ${esc(d.evidence.join(' · '))}</p>`;
  },

  /* Homepage credentials: CPA and PMP only (production rule); full list on About. */
  'cred-short'(graph) {
    const all = graph.credentials.flatMap((g) => g.items);
    const short = all.filter((c) => /\((CPA|PMP)\)/.test(c.name));
    return short.map((c) => `<span class="cred"><b>${esc(c.name.match(/\(([^)]+)\)/)[1])}</b>${esc(c.name.replace(/\s*\([^)]*\)/, ''))}</span>`).join('');
  },

  /* About: full credentials from graph.credentials. */
  credentials(graph) {
    return graph.credentials.map((g) => `<div class="cg"><h3 class="cg-h">${esc(g.label)}</h3><ul>${g.items.map((c) => `<li><span class="cg-n">${esc(c.name)}</span><span class="cg-i">${esc(c.issuer)}</span></li>`).join('')}</ul></div>`).join('');
  },

  /* About: what Ken knows about, from the Person schema (knowsAbout). */
  knows(graph) {
    return `<ul class="knows">${graph.person.knowsAbout.map((k) => `<li>${esc(k)}</li>`).join('')}</ul>`;
  },

  /* About: the breadth matrix. Theme × type, one dot per item, all derived. */
  breadth(graph, ctx) {
    const types = [['build', 'Builds'], ['essay', 'Writing'], ['video', 'Videos'], ['short', 'Shorts']];
    const human = graph.items.filter((i) => i.type !== 'digest');
    const head = `<div class="bm-r bm-h"><span></span>${types.map(([, l]) => `<span>${l}</span>`).join('')}<span>Total</span></div>`;
    const rows = THEMES.map((t) => {
      const mine = human.filter((i) => i.theme === t.id);
      return `<div class="bm-r"><span class="bm-th"><b>${esc(t.label)}</b><i>${esc(t.hint)}</i></span>${types.map(([ty]) => {
        const its = mine.filter((i) => i.type === ty);
        return `<span class="bm-c">${its.map((i) => { const link = linkOf(i, ctx); return `<a href="${esc(link)}"${ext(link)} class="bm-d bm-d--${ty}" data-id="${esc(i.id)}" title="${esc(i.title)}"><span class="vh">${esc(i.title)}</span></a>`; }).join('')}</span>`;
      }).join('')}<span class="bm-n">${mine.length}</span></div>`;
    }).join('');
    return `<div class="bm" role="group" aria-label="Everything on the site, by theme and type">${head}${rows}</div>`
      + `<p class="bm-foot">${plural(human.length, 'thing')} I made, ${plural(graph.edges.length, 'documented link')} between them, since ${esc(monthName(graph.stats.firstMonth))}. Themes are assigned by rule, not by hand.</p>`;
  },

  /* About: newest three, so the About page is never stale. */
  'about-latest'(graph, ctx) { return regions.latest({ ...graph, now: graph.now.slice(0, 3) }, ctx); },

  /* ZeroHuman page header, from the build entry. */
  'zh-head'(graph, ctx) {
    const b = graph.byId.get(ctx.item);
    if (!b) return '';
    return `<p class="meta zh-meta"><b class="st st--${esc(b.status.toLowerCase())}">${esc(b.status)}</b> ${esc(dateOf(b))} · ${esc(themeLabel(b.theme))}${b.metric ? ` · <span class="metric">${esc(b.metric)}</span>` : ''}</p>`
      + `<h1 class="zh-h1">${esc(b.title)}</h1><p class="zh-dek">${esc(b.dek)}</p>`
      + `<ul class="stack stack--lg">${b.stack.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>${receipt(b, graph)}`;
  },
  'zh-glyph'(graph, ctx) {
    const b = graph.byId.get(ctx.item);
    if (!b) return '';
    // Stack labels sit at their tick's angle; neighbours closer than 16° step outward so none overlap.
    const ang = (b.stack || []).map((s) => ({ s, a: hash(s.toLowerCase()) * 360 })).sort((x, y) => x.a - y.a);
    ang.forEach((t, i) => { const prev = ang[i - 1]; t.tier = prev && t.a - prev.a < 16 ? (prev.tier + 1) % 2 : 0; });
    const tick = ang.map((t) => `<li style="--a:${r1(t.a)}deg;--t:${t.tier};--l:${Math.cos((t.a * Math.PI) / 180) < -0.2 ? 1 : Math.cos((t.a * Math.PI) / 180) < 0.2 ? 0.5 : 0}"><span><i>${esc(t.s)}</i></span></li>`).join('');
    return `<div class="zg">${glyph(b, { size: 360 })}<ol class="zg-ticks" aria-hidden="true">${tick}</ol></div><p class="zg-cap">This build’s mark: ${esc(themeLabel(b.theme))} arc, ${plural(b.stack.length, 'stack tick')}, hand on ${esc(MON[+b.month.slice(5) - 1])}, solid core for ${esc(b.status)}, ${plural(b.related.length, 'dot')} for documented links.</p>`;
  },

  /* Related items for any interior page, from documented relationships only. */
  related(graph, ctx) {
    const b = graph.byId.get(ctx.item);
    if (!b) return '';
    const rel = b.related.map((r) => graph.byId.get(r)).filter(Boolean);
    if (!rel.length) return `<p class="empty">No documented links from this page yet. When one is written, it appears here.</p>`;
    return `<ol class="rel">${rel.map((r) => {
      const link = linkOf(r, ctx);
      const e = graph.edges.find((x) => (x.from === b.id && x.to === r.id) || (x.to === b.id && x.from === r.id));
      return `<li data-id="${esc(r.id)}"${newAttr(r)}><a href="${esc(link)}"${ext(link)}${ytAttr(r)} class="rel-a">${media(r, { cls: 'rel-m', size: 64, sizes: '200px' })}<span><span class="meta"><b>${esc(kind(r))}</b> ${esc(dateOf(r))}</span><span class="rel-t">${esc(r.title)}</span><span class="rel-e">${esc(e ? (e.from === b.id ? `This page ${e.type.replace('-', ' ')} it` : `It ${e.type.replace('-', ' ')} this page`) : '')}</span></span></a></li>`;
    }).join('')}</ol>`;
  },

  /* Film page: the film's build entry and its stills. */
  'film-head'(graph, ctx) {
    const b = graph.byId.get(ctx.item);
    if (!b) return '';
    return `<p class="meta"><b>Short film</b> ${esc(dateOf(b))}${b.metric ? ` · ${esc(b.metric)}` : ''}</p>`;
  },

  /* Publishing demo: the three example steps, exactly as publish-demo.js defines them. */
  'demo-steps'() {
    return `<ol class="ds">${DEMO_STEPS.map((st, i) => `<li class="ds-s" data-step="${esc(st.key)}">`
      + `<div class="ds-h"><span class="ds-n">${i + 1}</span><h3>${esc(st.label)}</h3><button type="button" class="ds-b" data-apply="${esc(st.key)}" aria-pressed="false" hidden>Apply</button></div>`
      + `<dl class="ds-m"><div><dt>Where</dt><dd><code>${esc(st.where)}</code></dd></div><div><dt>Effort</dt><dd>${esc(st.effort)}</dd></div></dl>`
      + `<pre class="code ds-code"><code>${esc(st.snippet)}</code></pre><p class="ds-note">${esc(st.note)}</p></li>`).join('')}</ol>`;
  },

  /* JSON-LD Person, generated from the same schema data production uses. Lives in <head>. */
  jsonld(graph) {
    const p = graph.person;
    const ld = { '@context': 'https://schema.org', '@type': 'Person', name: p.name, jobTitle: p.jobTitle, description: p.description, url: 'https://kenashe.ai/', image: p.image, knowsAbout: p.knowsAbout, sameAs: p.sameAs };
    return `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`;
  },

  /* Shared footer line: when the data was generated, and what is in it. */
  colophon(graph) {
    const s = graph.stats;
    return `${plural(s.builds, 'build')} · ${plural(s.essays, 'essay')} · ${plural(s.videos, 'video')} · ${plural(s.shorts, 'short')} · ${plural(s.relationships, 'documented link')} · newest ${esc(fmtDate(s.lastDate))}`;
  },
};

export function counts(graph, asOfLabel) {
  const s = graph.stats;
  return `<span class="cnt-as">${asOfLabel ? esc(asOfLabel) : 'Now'}</span> <b data-c="build">${s.builds}</b> builds <b data-c="essay">${s.essays}</b> essays <b data-c="video">${s.videos + s.shorts}</b> videos <span class="cnt-dg"><b data-c="digest">${fmtN(s.digestPublished)}</b> automated posts</span>`;
}

export function readoutItem(it, graph, ctx, lead = '') {
  if (!it) return '';
  const link = linkOf(it, ctx);
  const rel = it.related.map((r) => graph.byId.get(r)?.title).filter(Boolean);
  return `<p class="eyebrow">${lead ? `<span class="ro-lead">${esc(lead)}</span>` : ''}${esc(kind(it))} · ${esc(dateOf(it))} · ${esc(themeLabel(it.theme))}</p>`
    + `<a class="ro-a" href="${esc(link)}"${ext(link)}${ytAttr(it)}>${media(it, { cls: 'ro-m', size: 64, sizes: '200px' })}<span class="ro-t">${esc(it.title)}</span></a>`
    + (rel.length ? `<p class="ro-rel">Linked to ${rel.map(esc).join(', ')}</p>` : '');
}
