// Round 2 · Direction C · The Creator OS ("The Edit")
// Region functions: (graph, ctx) => htmlString. Pure ES module, no DOM access, runs in Node
// (tools/prerender.mjs) and in the browser (playhead, publishing demo, ?demo=).
// Every list, count, date and position below comes from the graph. Nothing is typed by hand.
import { esc, fmtDate, hrefFor, typeLabel } from '../../lib/graph.js';
import { GALLERY, FRAMES } from './photos.js';
import { DEMO_STEPS } from '../../lib/publish-demo.js';

export const DIR = 'c-creator-os';
/** Production paths this direction implements (everything else opens the live kenashe.ai page). */
export const BUILT = ['/', '/building/', '/building/ai-agent-economy/', '/videos/'];

/* ------------------------------------------------------------------ helpers */
const DAY = 86400000;
const ms = (iso) => Date.parse(iso + 'T00:00:00Z');
const monthIdx = (m) => +m.slice(0, 4) * 12 + (+m.slice(5, 7) - 1);
const idxMonth = (k) => `${Math.floor(k / 12)}-${String((k % 12) + 1).padStart(2, '0')}`;
const monthStart = (m) => ms(m + '-01');
const monthEnd = (m) => monthStart(idxMonth(monthIdx(m) + 1));
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monShort = (m) => `${MON[+m.slice(5, 7) - 1]} ${m.slice(0, 4)}`;
export const monLong = (m) => `${MONTH[+m.slice(5, 7) - 1]} ${m.slice(0, 4)}`;
export const tc = (it) => (it.precision === 'month' ? it.month : it.date).replace(/-/g, '·');
const cap = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const slugOf = (it) => it.id.split(':').slice(1).join(':');
const themeOf = (g, id) => g.themes.find((t) => t.id === id) ?? { id, label: id, hint: '' };
const isMedia = (it) => it.type === 'video' || it.type === 'short';
const human = (g) => g.items.filter((i) => i.date && i.type !== 'digest');
const byDateDesc = (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (a.order ?? 0) - (b.order ?? 0));
/** 480px derivative (see _tools/thumbs.py; Astro's image pipeline in production). Falls back to the original. */
const T = (src) => (src && /assets\/(video|writing|build|frames)\/[^/]+\.webp$/.test(src) ? src.replace(/assets\/(video|writing|build|frames)\//, `directions/${DIR}/thumbs/$1/`) : src);
const img = (src, alt = '', w = 480, h = 270) => `<img src="${esc(T(src))}" alt="${esc(alt)}" loading="lazy" decoding="async" width="${w}" height="${h}"${T(src) !== src ? ` data-full="${esc(src)}" onerror="this.onerror=null;this.src=this.dataset.full"` : ''}>`;
const local = (ctx, path = '') => `${ctx.base}directions/${ctx.dir || DIR}/${path}`;

/** Where an item links. Builds without a write-up point at their entry in the /building/ index. */
export function hrefOf(it, ctx) {
  if (it.demo) return '#';
  if (it.type === 'build' && !it.href) return local(ctx, `building/#${slugOf(it)}`);
  return hrefFor(it.href, ctx, BUILT);
}
const ext = (url) => /^https?:/.test(url) && !url.includes(`directions/`);
const arrow = (url) => (ext(url) ? ' ↗' : ' →');

/** The default cue: the newest thing Ken made. */
export const defaultCue = (g) => g.now[0];

/* ------------------------------------------------------------------ range */
/**
 * The edit's time range. Months come from every dated item and every Digest day. If the record
 * has a long gap (an old essay, years earlier), everything before the gap goes into an "earlier"
 * bin at the head of the timeline instead of squashing the present into a sliver.
 */
export function editRange(g) {
  const items = human(g);
  const months = [...new Set(items.map((i) => i.month).concat(Object.keys(g.digest.perDay || {}).map((k) => k.slice(0, 7))))].sort();
  let split = 0, gap = 0;
  for (let i = 1; i < months.length; i++) {
    const d = monthIdx(months[i]) - monthIdx(months[i - 1]);
    if (d > gap) { gap = d; split = i; }
  }
  const first = gap > 6 ? months[split] : months[0];
  const last = months.at(-1);
  const all = [];
  for (let k = monthIdx(first); k <= monthIdx(last); k++) all.push(idxMonth(k));
  const start = monthStart(first), end = monthEnd(last);
  const archive = items.filter((i) => i.month < first).sort(byDateDesc);
  const archiveMonths = [...new Set(archive.map((i) => i.month))].sort();
  return { first, last, months: all, archiveMonths, start, end, archive, pct: (iso) => ((ms(iso) - start) / (end - start)) * 100 };
}

/* ------------------------------------------------------------------ plates (image-less builds) */
const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967295; };
/** A waveform unique to each build: bar heights from its title, stack and month. */
export function wave(seed, n = 64) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = hash(`${seed}#${i}`), c = (seed.charCodeAt(i % seed.length) % 64) / 64;
    const env = Math.sin((Math.PI * (i + 0.5)) / n) ** 0.5;
    out.push(Math.max(0.07, Math.min(1, (a * 0.6 + c * 0.4) * (0.3 + 0.7 * env))));
  }
  return out;
}
export function plateHTML(it, g, { size = 'm' } = {}) {
  const n = size === 's' ? 28 : 56;
  const v = wave(`${it.title}|${(it.stack || []).join('|')}|${it.month}`, n);
  const w = 1000 / n;
  const bars = v.map((h, i) => `<rect x="${(i * w + w * 0.18).toFixed(1)}" y="${(50 - h * 46).toFixed(1)}" width="${(w * 0.64).toFixed(1)}" height="${(h * 92).toFixed(1)}" rx="${(w * 0.3).toFixed(1)}"/>`).join('');
  const st = it.status ? `<span class="plate__status" data-status="${esc(it.status)}">${esc(it.status)}</span>` : '';
  return `<div class="plate plate--${size}" data-theme="${esc(it.theme)}"${it.demo ? ' data-demo' : ''}>`
    + `<svg viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">${bars}</svg>`
    + `${st}<span class="plate__tc">${esc(tc(it))}</span>`
    + (size === 's' ? '' : `<span class="plate__title">${esc(it.title)}</span><span class="plate__stack">${esc((it.stack || []).join(' · '))}</span>`)
    + `</div>`;
}

/** Visual for any item: real image if it has one, a plate if it is a build without one. */
function thumbHTML(it, g, size = 'm') {
  if (it.image) return img(it.image);
  if (it.type === 'digest') return digestWave(g, { h: 60 });
  return plateHTML(it, g, { size });
}

/* ------------------------------------------------------------------ the edit (timeline) */
export const TRACKS = [
  { id: 'build', code: 'B1', label: 'Builds', types: ['build'] },
  { id: 'video', code: 'V1', label: 'Film & video', types: ['video', 'short'] },
  { id: 'essay', code: 'W1', label: 'Writing', types: ['essay'] },
];

function layoutLanes(clips, dayW = 1.25) {
  const ends = [];
  clips.sort((a, b) => a.x - b.x || (a.it.order ?? 0) - (b.it.order ?? 0));
  for (const c of clips) {
    const s = c.kind === 'day' ? c.x - dayW / 2 : c.x;
    const e = c.kind === 'day' ? c.x + dayW / 2 : c.x + c.w;
    let l = ends.findIndex((v) => v <= s + 0.01);
    if (l < 0) { l = ends.length; ends.push(e); } else ends[l] = e;
    c.lane = l;
  }
  return Math.max(1, ends.length);
}

function clipHTML(it, c, g, ctx, cueId) {
  const th = themeOf(g, it.theme);
  const label = `${typeLabel[it.type]}: ${it.title}. ${fmtDate(it.date, it.precision)}. ${th.label}.`;
  const tip = `${it.title} · ${fmtDate(it.date, it.precision)}`;
  return `<a class="clip clip--${c.kind} clip--${it.type}" href="${esc(hrefOf(it, ctx))}" data-id="${esc(it.id)}" data-theme="${esc(it.theme)}" data-type="${it.type}" data-date="${it.date}" data-month="${it.month}"`
    + ` style="--x:${c.x.toFixed(3)};--w:${(c.w || 0).toFixed(3)};--l:${c.lane}" aria-label="${esc(label)}" data-tip="${esc(tip)}"${c.x > 66 ? ' data-tip-end' : ''}`
    + `${it.id === cueId ? ' aria-current="true"' : ''}${it.demo ? ' data-demo' : ''}><span class="clip__t" aria-hidden="true">${esc(it.title)}</span></a>`;
}

function digestWave(g, { h = 40, range = null } = {}) {
  const d = g.digest;
  const R = range;
  const days = Object.entries(d.perDay || {}).sort();
  if (!days.length) return '';
  const max = Math.max(...days.map(([, n]) => n));
  const t0 = R ? R.start : ms(days[0][0]), t1 = R ? R.end : ms(d.last) + 12 * DAY;
  const X = (iso) => ((ms(iso) - t0) / (t1 - t0)) * 1000;
  const bw = Math.max(1.2, (DAY / (t1 - t0)) * 1000 * 0.62);
  const bars = days.map(([day, n]) => { const bh = (n / max) * (h - 4); return `<rect x="${X(day).toFixed(2)}" y="${((h - bh) / 2).toFixed(2)}" width="${bw.toFixed(2)}" height="${bh.toFixed(2)}"/>`; }).join('');
  const flat = d.status !== 'publishing' ? `<line x1="${(X(d.last) + bw * 2).toFixed(1)}" y1="${h / 2}" x2="1000" y2="${h / 2}" class="flat"/>` : '';
  return `<svg class="dwave" viewBox="0 0 1000 ${h}" preserveAspectRatio="none" aria-hidden="true" focusable="false">${bars}${flat}</svg>`;
}

/**
 * The edit: every build, video, short and essay as a clip on a track, the Digest as a separate
 * automated track (its real daily volume), and a playhead. Works as plain links with JS off.
 */
export function editHTML(g, ctx, opts = {}) {
  const R = editRange(g);
  const defs = (opts.tracks ?? TRACKS.map((t) => t.id)).map((id) => TRACKS.find((t) => t.id === id));
  const cue = opts.cue ?? defaultCue(g);
  const span = R.end - R.start;
  const ruler = R.months.map((m, i) => {
    const x = ((monthStart(m) - R.start) / span) * 100, w = ((monthEnd(m) - monthStart(m)) / span) * 100;
    const yr = i === 0 || m.endsWith('-01') ? `<i>’${m.slice(2, 4)}</i>` : '';
    return `<span class="ruler__m" style="--x:${x.toFixed(3)};--w:${w.toFixed(3)}" data-month="${m}">${MON[+m.slice(5, 7) - 1]}${yr}</span>`;
  }).join('');
  const archYears = [...new Set(R.archive.map((i) => i.date.slice(0, 4)))].join(' ');
  const hasArch = R.archive.length > 0;

  const rows = defs.map((t) => {
    const its = human(g).filter((i) => t.types.includes(i.type));
    const main = its.filter((i) => i.month >= R.first);
    const arch = its.filter((i) => i.month < R.first);
    const clips = main.map((it) => it.precision === 'month'
      ? { it, kind: 'month', x: ((monthStart(it.month) - R.start) / span) * 100, w: ((monthEnd(it.month) - monthStart(it.month)) / span) * 100 }
      : { it, kind: 'day', x: R.pct(it.date), w: 0 });
    const lanes = Math.max(layoutLanes(clips), arch.length);
    const archClips = arch.map((it, i) => clipHTML(it, { kind: 'arch', x: 50, w: 0, lane: i }, g, ctx, cue?.id)).join('');
    return `<div class="trk trk--${t.id}" role="group" aria-label="${esc(t.label)} track, ${plural(its.length, 'clip')}" style="--lanes:${lanes}">`
      + `<div class="trk__head"><b>${t.code}</b><span>${esc(t.label)}</span><em>${its.length}</em></div>`
      + `<div class="trk__arch">${archClips}</div>`
      + `<div class="trk__area">${clips.map((c) => clipHTML(c.it, c, g, ctx, cue?.id)).join('')}</div></div>`;
  }).join('');

  const d = g.digest;
  const digestRow = opts.digest === false ? '' : `<div class="trk trk--auto" role="group" aria-label="The Digest, automated: ${esc(d.statusLine)}">`
    + `<div class="trk__head"><b>A1</b><span>${esc(d.name)}</span><em class="auto-tag">${esc(d.label)}</em></div>`
    + `<div class="trk__arch"></div>`
    + `<div class="trk__area"><a class="dtrack" href="${esc(hrefOf(g.byId.get('digest'), ctx))}" data-id="digest" aria-label="${esc(`${d.name}, automated. ${d.statusLine} ${d.published.toLocaleString('en-US')} posts published, last on ${fmtDate(d.last)}.`)}">${digestWave(g, { h: 40, range: R })}`
    + `<span class="dtrack__st" style="--x:${R.pct(d.last).toFixed(3)}" data-status="${esc(d.status)}">${esc(cap(d.status))} · ${fmtDate(d.last)}</span></a></div></div>`;

  const cx = cue && cue.month >= R.first ? (cue.precision === 'month' ? R.pct(cue.date) : R.pct(cue.date)) : null;
  const themes = g.themes.filter((t) => human(g).some((i) => i.theme === t.id));
  const legend = themes.map((t) => `<button type="button" class="chip" data-solo="${t.id}" data-theme="${t.id}" aria-pressed="false" title="${esc(t.hint)}"><i aria-hidden="true"></i>${esc(t.label)}</button>`).join('');
  const legendStatic = themes.map((t) => `<li data-theme="${t.id}"><i aria-hidden="true"></i>${esc(t.label)}</li>`).join('');
  const controls = opts.controls === false ? '' : `<div class="edit__bar">`
    + `<div class="transport js-only" role="group" aria-label="Playhead controls">`
    + `<button type="button" class="tbtn" data-act="first" aria-label="Go to the earliest clip"><span aria-hidden="true">⇤</span></button>`
    + `<button type="button" class="tbtn" data-act="prev" aria-label="Previous clip (J or left arrow)"><span aria-hidden="true">◂</span><kbd>J</kbd></button>`
    + `<button type="button" class="tbtn tbtn--play" data-act="play" aria-pressed="false"><span class="ico" aria-hidden="true"></span><span class="lbl">Play the year</span></button>`
    + `<button type="button" class="tbtn" data-act="next" aria-label="Next clip (L or right arrow)"><kbd>L</kbd><span aria-hidden="true">▸</span></button>`
    + `<button type="button" class="tbtn" data-act="last" aria-label="Go to the newest clip"><span aria-hidden="true">⇥</span></button>`
    + `</div>`
    + `<div class="legend js-only" role="group" aria-label="Solo a theme">${legend}</div>`
    + `<ul class="legend no-js-only" aria-label="Themes">${legendStatic}</ul>`
    + `</div>`;

  return `<div class="edit${hasArch ? ' edit--arch' : ''}" data-edit data-first="${R.first}" style="--months:${R.months.length}">`
    + controls
    + `<div class="edit__scroll" tabindex="-1"><div class="edit__grid">`
    + `<div class="ruler" aria-hidden="true"><div class="trk__head ruler__head">${plural(human(g).length, 'clip')}</div><div class="trk__arch ruler__arch">${hasArch ? `<span>${esc(archYears)}</span>` : ''}</div><div class="trk__area ruler__area">${ruler}</div></div>`
    + rows + digestRow
    + `<div class="ph-layer" aria-hidden="true">${R.months.map((m) => `<i class="gl" style="--x:${(((monthStart(m) - R.start) / span) * 100).toFixed(3)}"></i>`).join('')}<div class="ph" data-playhead style="--x:${cx == null ? 0 : cx.toFixed(3)}"${cx == null ? ' data-arch' : cx > 92 ? ' data-end' : cx < 6 ? ' data-start' : ''}><span class="ph__tag">${cue ? esc(tc(cue)) : ''}</span></div><div class="scrub-tip" hidden></div></div>`
    + `</div></div>`
    + `<p class="edit__readout sr-only" aria-live="polite" data-readout></p>`
    + `</div>`;
}

/* ------------------------------------------------------------------ the monitor */
function metaRows(it, g) {
  const rows = [];
  const th = themeOf(g, it.theme);
  rows.push(['Date', fmtDate(it.date, it.precision)]);
  if (it.status) rows.push(['Status', it.status]);
  if (it.metric) rows.push(['Receipt', it.metric]);
  if (it.authorship) rows.push(['Made', it.authorship]);
  const stack = it.stack?.length ? `<div class="mon__stack"><dt>Stack</dt><dd>${it.stack.map((s) => `<span>${esc(s)}</span>`).join('')}</dd></div>` : '';
  return `<dl class="mon__meta">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}${stack}</dl>`;
}

export function threadsHTML(it, g, ctx, max = 5) {
  const rel = it.related.map((id) => g.byId.get(id)).filter(Boolean).sort(byDateDesc);
  if (!rel.length) return `<p class="threads threads--none">No documented links yet. A link written into a page becomes a thread here.</p>`;
  return `<ul class="threads">${rel.slice(0, max).map((r) => `<li><a href="${esc(hrefOf(r, ctx))}" data-cue="${esc(r.id)}" data-theme="${esc(r.theme)}"><i aria-hidden="true"></i><span class="threads__k">${esc(typeLabel[r.type])}</span> ${esc(r.title)}</a></li>`).join('')}${rel.length > max ? `<li class="threads__more">+${rel.length - max} more</li>` : ''}</ul>`;
}

function ctaFor(it, ctx) {
  const url = hrefOf(it, ctx);
  if (it.demo) return `<span class="cta cta--ghost">Placeholder entry · not a real page</span>`;
  const label = it.type === 'build' ? (it.href ? (it.cta && it.cta !== 'Read the build' ? it.cta : 'Open the build') : 'See it in the index')
    : it.type === 'essay' ? 'Read the essay' : isMedia(it) ? 'Watch on YouTube' : 'Open the archive';
  return `<a class="cta" href="${esc(url)}">${esc(label)}<span aria-hidden="true">${arrow(url)}</span></a>`;
}

function screenHTML(it, g) {
  if (isMedia(it)) {
    if (it.demo || !it.embed) return `<div class="scr scr--ph"><img src="${esc(it.image)}" alt="Placeholder video thumbnail"><span class="scr__badge">Placeholder</span></div>`;
    return `<a class="scr scr--video" href="${esc(it.href)}" data-play="${esc(it.videoId)}" data-embed="${esc(it.embed)}" aria-label="Play video: ${esc(it.title)}"><img src="${esc(it.image)}" alt="" width="1280" height="720" decoding="async"><span class="scr__play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span><span class="scr__badge">${it.type === 'short' ? 'Short' : 'Video'} · plays here</span></a>`;
  }
  if (it.type === 'digest') {
    const d = g.digest;
    return `<div class="scr scr--digest"><span class="scr__auto">${esc(d.label)} · ${esc(cap(d.status))}</span>${digestWave(g, { h: 80 })}<span class="scr__count">${d.published.toLocaleString('en-US')}</span><span class="scr__cap">posts published by the pipeline, ${fmtDate(d.first)} to ${fmtDate(d.last)}</span></div>`;
  }
  if (it.image) return `<div class="scr scr--img"><img src="${esc(it.heroImage || it.image)}" alt="${esc(it.imageAlt || `${it.title}: project image`)}" decoding="async"></div>`;
  return `<div class="scr scr--plate">${plateHTML(it, g, { size: 'l' })}</div>`;
}

/** The clips either side of this moment: a small bin for discovery, computed from dates. */
function aroundHTML(it, g, ctx, max = 6) {
  const chron = human(g).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (b.order ?? 0) - (a.order ?? 0)));
  let i = chron.findIndex((x) => x.id === it.id);
  if (i < 0) i = chron.length; // the Digest sits after its last post
  let lo = Math.max(0, i - 3), hi = Math.min(chron.length, lo + 7);
  lo = Math.max(0, hi - 7);
  const win = chron.slice(lo, hi).filter((x) => x.id !== it.id).slice(-6).slice(0, max);
  return `<div class="around"><h3>Around this moment</h3><ol>${win.map((x) => `<li data-theme="${esc(x.theme)}"><a href="${esc(hrefOf(x, ctx))}" data-cue="${esc(x.id)}"><span class="around__d">${esc(tc(x))}</span><i aria-hidden="true"></i><span class="around__t">${esc(x.title)}</span><span class="around__k">${esc(typeLabel[x.type])}</span></a></li>`).join('')}</ol></div>`;
}

function digestMeta(g) {
  const d = g.digest;
  return `<dl class="mon__meta"><div><dt>Status</dt><dd>${esc(cap(d.status))}</dd></div><div><dt>Published</dt><dd>${d.published.toLocaleString('en-US')}</dd></div><div><dt>Drafts</dt><dd>${d.drafts.toLocaleString('en-US')}</dd></div><div><dt>Last post</dt><dd>${fmtDate(d.last)}</dd></div><div><dt>Search</dt><dd>${d.noindex ? 'noindex' : 'indexed'}</dd></div><div><dt>Author</dt><dd>${esc(d.byline)}</dd></div></dl>`;
}

export function monitorHTML(it, g, ctx) {
  if (!it) return '';
  const th = themeOf(g, it.theme);
  const kind = it.type === 'digest' ? `${g.digest.name} · ${g.digest.label}` : typeLabel[it.type];
  return `<article class="mon" data-id="${esc(it.id)}" data-theme="${esc(it.theme)}" data-type="${it.type}"${it.demo ? ' data-demo' : ''} aria-labelledby="mon-title">`
    + `<div class="mon__slate" aria-hidden="true"><span class="stripes"></span><span class="mon__pgm">Program</span><span>${esc(kind)}</span><span class="mon__th"><i></i>${esc(th.label)}</span><span class="mon__tc">${esc(tc(it))}</span></div>`
    + `<div class="mon__body"><div class="mon__left">${screenHTML(it, g)}${it.type === 'digest' ? digestMeta(g) : metaRows(it, g)}${aroundHTML(it, g, ctx, it.type === 'build' ? 4 : it.type === 'essay' ? 5 : it.type === 'digest' ? 3 : 6)}</div>`
    + `<div class="mon__info"><p class="mon__kind">${esc(kind)}${it.demo ? ' <b class="ph-badge">Placeholder</b>' : ''}</p>`
    + `<h2 class="mon__title" id="mon-title">${esc(it.type === 'digest' ? g.digest.name : it.title)}</h2>`
    + `<p class="mon__dek">${esc(it.type === 'digest' ? g.digest.statusLine : it.dek || '')}</p>`
    + `<div class="mon__threads"><h3>Threads</h3>${threadsHTML(it, g, ctx, 4)}</div>`
    + ctaFor(it, ctx)
    + `</div></div></article>`;
}

/* ------------------------------------------------------------------ tuned: the page at one moment */
function photosFor(items, ctx) {
  const out = [];
  for (const it of items) {
    if (it.type === 'essay' && it.heroImage) out.push({ src: it.heroImage, alt: it.imageAlt, from: it });
    for (const p of GALLERY[it.id] || []) out.push({ src: `${ctx.base}assets/${p.src}`, alt: p.alt, from: it });
    if (isMedia(it) && FRAMES.includes(it.videoId)) for (const n of [1, 2]) out.push({ src: `${ctx.base}assets/frames/${it.videoId}-${n}.webp`, alt: `Frame from the video “${it.title}”.`, from: it });
  }
  return out;
}

export function tunedHTML(g, ctx, month) {
  const R = editRange(g);
  const nav = [...R.archiveMonths, ...R.months];
  const m = month && nav.includes(month) ? month : defaultCue(g).month;
  const all = human(g);
  const items = all.filter((i) => i.month === m).sort(byDateDesc);
  const builds = items.filter((i) => i.type === 'build');
  const media = items.filter(isMedia);
  const essays = items.filter((i) => i.type === 'essay');
  const k = nav.indexOf(m), prev = nav[k - 1], next = nav[k + 1];
  const digestN = Object.entries(g.digest.perDay || {}).filter(([d]) => d.startsWith(m)).reduce((s, [, n]) => s + n, 0);
  const sum = [builds.length && plural(builds.length, 'build'), media.length && plural(media.length, 'video'), essays.length && plural(essays.length, 'essay')].filter(Boolean).join(' · ') || 'Nothing on the record';

  const bench = builds.length ? `<ul class="bench">${builds.map((b) => `<li data-id="${esc(b.id)}" data-theme="${esc(b.theme)}"${b.demo ? ' data-demo' : ''}><a href="${esc(hrefOf(b, ctx))}" data-cue="${esc(b.id)}"><span class="bench__vis">${b.image ? img(b.image) : plateHTML(b, g, { size: 's' })}</span><span class="bench__t">${esc(b.title)}</span></a><span class="bench__m"><b data-status="${esc(b.status)}">${esc(b.status)}</b>${b.metric ? ` ${esc(b.metric)}` : ''}</span></li>`).join('')}</ul>`
    : `<p class="empty">No builds dated ${esc(monShort(m))}.</p>`;
  const screen = media.length ? `<ul class="screen">${media.slice(0, 4).map((v) => `<li data-id="${esc(v.id)}"${v.demo ? ' data-demo' : ''}><a href="${esc(hrefOf(v, ctx))}" data-cue="${esc(v.id)}"><span class="screen__vis">${img(v.image)}<em>${v.type === 'short' ? 'Short' : 'Video'}</em></span><span class="screen__t">${esc(v.title)}</span><span class="screen__d">${fmtDate(v.date)}</span></a></li>`).join('')}</ul>${media.length > 4 ? `<a class="more" href="${esc(local(ctx, 'videos/'))}">+${media.length - 4} more in the screening room →</a>` : ''}`
    : `<p class="empty">No uploads in ${esc(monShort(m))}.</p>`;
  const paper = essays.length ? `<ul class="paper">${essays.map((e) => `<li data-id="${esc(e.id)}"${e.demo ? ' data-demo' : ''}><a href="${esc(hrefOf(e, ctx))}" data-cue="${esc(e.id)}"><span class="paper__d">${fmtDate(e.date)}</span><span class="paper__t">${esc(e.title)}</span>${e.authorship ? `<span class="paper__a">${esc(e.authorship)}</span>` : ''}</a></li>`).join('')}</ul>`
    : `<p class="empty">No essays in ${esc(monShort(m))}.</p>`;
  const ph = photosFor(items, ctx).slice(0, 6);
  const photos = ph.length ? `<ul class="sheet">${ph.map((p, i) => `<li${i === 0 ? ' class="sheet__lead"' : ''}><a href="${esc(hrefOf(p.from, ctx))}" data-cue="${esc(p.from.id)}">${img(p.src, p.alt)}</a><span class="sheet__n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span></li>`).join('')}</ul>`
    : `<p class="empty">No photographs or frames attached to ${esc(monShort(m))}.</p>`;

  // Lately: themes and stack across this month and the two before it. Computed, never typed.
  const win = all.filter((i) => monthIdx(i.month) <= monthIdx(m) && monthIdx(i.month) > monthIdx(m) - 3);
  const counts = g.themes.map((t) => ({ t, n: win.filter((i) => i.theme === t.id).length })).filter((x) => x.n).sort((a, b) => b.n - a.n);
  const max = Math.max(1, ...counts.map((x) => x.n));
  const stackN = {};
  for (const b of win.filter((i) => i.type === 'build')) for (const s of b.stack || []) stackN[s] = (stackN[s] || 0) + 1;
  const stack = Object.entries(stackN).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 6);
  const lately = counts.length ? `<ol class="lately">${counts.map(({ t, n }) => `<li data-theme="${t.id}" style="--v:${(n / max).toFixed(3)}"><span class="lately__l">${esc(t.label)}</span><b>${n}</b><span class="lately__bar" aria-hidden="true"></span></li>`).join('')}</ol>` : `<p class="empty">Nothing on the record in these three months.</p>`;

  return `<div class="tuned" data-month="${m}">`
    + `<header class="tuned__head"><p class="eyebrow">Tuned to</p><h2 class="tuned__month" id="tuned-title"><span>${MONTH[+m.slice(5, 7) - 1]}</span> <span class="yr">${m.slice(0, 4)}</span></h2>`
    + `<p class="tuned__sum">${sum}</p>`
    + `<div class="tuned__nav js-only">${prev ? `<button type="button" class="tbtn" data-month-go="${prev}">◂ ${esc(monShort(prev))}</button>` : ''}${next ? `<button type="button" class="tbtn" data-month-go="${next}">${esc(monShort(next))} ▸</button>` : ''}</div>`
    + `<p class="tuned__auto"><span class="auto-tag">${esc(g.digest.label)}</span> Meanwhile the Digest pipeline published ${plural(digestN, 'post')} in ${esc(monShort(m))}. ${esc(g.digest.statusLine)}</p></header>`
    + `<div class="tuned__grid">`
    + `<section class="col col--bench" aria-labelledby="t-bench"><h3 id="t-bench"><span>01</span>On the bench</h3>${bench}</section>`
    + `<section class="col col--screen" aria-labelledby="t-screen"><h3 id="t-screen"><span>02</span>On screen</h3>${screen}</section>`
    + `<section class="col col--paper" aria-labelledby="t-paper"><h3 id="t-paper"><span>03</span>On paper</h3>${paper}</section>`
    + `<section class="col col--photos" aria-labelledby="t-photos"><h3 id="t-photos"><span>04</span>Contact sheet</h3>${photos}</section>`
    + `<section class="col col--lately" aria-labelledby="t-lately"><h3 id="t-lately"><span>05</span>Lately <small>${esc(monShort(idxMonth(monthIdx(m) - 2)))} to ${esc(monShort(m))}</small></h3>${lately}`
    + (stack.length ? `<p class="stackline"><span>In hand</span> ${stack.map(([s, n]) => `<b>${esc(s)}<sup>${n}</sup></b>`).join(' ')}</p>` : '')
    + `<h4>Always curious about</h4><ul class="always">${(g.person.knowsAbout || []).map((k) => `<li>${esc(k)}</li>`).join('')}</ul></section>`
    + `</div></div>`;
}

/* ------------------------------------------------------------------ screening room reel */
export function reelHTML(g, ctx, { limit = 99 } = {}) {
  const vids = g.latest(['video', 'short'], limit);
  return `<ol class="reel" aria-label="Every upload, newest first">${vids.map((v, i) => {
    const appears = v.related.map((id) => g.byId.get(id)).filter((r) => r && !isMedia(r));
    return `<li class="reel__f reel__f--${v.type}" data-id="${esc(v.id)}"${v.demo ? ' data-demo' : ''}>`
      + `<a href="${esc(v.href)}" ${v.embed ? `data-play="${esc(v.videoId)}" data-embed="${esc(v.embed)}"` : ''} data-title="${esc(v.title)}" aria-label="${esc(`${v.type === 'short' ? 'Short' : 'Video'}: ${v.title}, ${fmtDate(v.date)}`)}">`
      + `<span class="reel__img">${img(v.image)}<span class="reel__no" aria-hidden="true">${String(vids.length - i).padStart(2, '0')}</span>${v.demo ? '<b class="ph-badge">Placeholder</b>' : ''}</span>`
      + `<span class="reel__t">${esc(v.title)}</span><span class="reel__d">${v.type === 'short' ? 'Short' : 'Video'} · ${fmtDate(v.date)}${appears.length ? ` · in ${esc(appears[0].title)}` : ''}</span></a></li>`;
  }).join('')}</ol>`;
}

/* ------------------------------------------------------------------ receipt tape */
export function receiptsHTML(g, ctx) {
  const builds = g.items.filter((i) => i.type === 'build').sort(byDateDesc);
  const withMetric = builds.filter((b) => b.metric);
  const statuses = [...new Set(builds.map((b) => b.status))];
  const gen = g.meta?.generatedAt ? fmtDate(g.meta.generatedAt.slice(0, 10)) : '';
  return `<div class="tape" role="group" aria-label="Receipts from builds.ts">`
    + `<p class="tape__h">KENASHE.AI<br>RECEIPTS</p><p class="tape__s">Printed from builds.ts · ${esc(gen)}${g.meta?.head ? ` · ${esc(g.meta.head.slice(0, 7))}` : ''}</p>`
    + `<ul class="tape__items">${withMetric.map((b) => `<li data-id="${esc(b.id)}"${b.demo ? ' data-demo' : ''}><span class="tape__d">${esc(monShort(b.month).toUpperCase())}</span><a href="${esc(hrefOf(b, ctx))}">${esc(b.title)}</a><span class="tape__dots" aria-hidden="true"></span><b>${esc(b.metric)}</b></li>`).join('')}</ul>`
    + `<dl class="tape__tot"><div><dt>Builds</dt><dd>${builds.length}</dd></div>${statuses.map((s) => `<div><dt>${esc(s)}</dt><dd>${builds.filter((b) => b.status === s).length}</dd></div>`).join('')}<div><dt>With a write-up</dt><dd>${builds.filter((b) => b.hasPage).length}</dd></div><div><dt>Documented links</dt><dd>${g.stats.relationships}</dd></div></dl>`
    + `<p class="tape__f">Metrics appear only where the build entry has one.<br>No view counts. No invented numbers.</p>`
    + `<div class="tape__bc" aria-hidden="true">${wave(g.meta?.head || 'kenashe', 48).map((h) => `<i style="--h:${h.toFixed(2)}"></i>`).join('')}</div></div>`;
}

/* ------------------------------------------------------------------ the Digest desk (automated) */
export function digestHTML(g, ctx) {
  const d = g.digest;
  const rb = d.relatedBuild && g.byId.get(d.relatedBuild);
  const explainer = rb ? rb.related.map((id) => g.byId.get(id)).filter((r) => r && isMedia(r) && r.date >= d.last).sort(byDateDesc)[0] : null;
  const latest = (d.latest || []).slice(0, 3);
  return `<div class="digest" data-status="${esc(d.status)}">`
    + `<div class="digest__top"><span class="auto-tag">${esc(d.label)}</span><span class="digest__st" data-status="${esc(d.status)}"><i aria-hidden="true"></i>${esc(cap(d.status))}</span></div>`
    + `<h3 class="digest__name">${esc(d.name)}</h3><p class="digest__by">${esc(d.byline)}. Not written by Ken; kept apart from his work.</p>`
    + `<p class="digest__line">${esc(d.statusLine)}</p>`
    + `<div class="digest__wave">${digestWave(g, { h: 56 })}<span>${fmtDate(d.first)}</span><span>${fmtDate(d.last)}</span></div>`
    + `<dl class="digest__n"><div><dt>Published</dt><dd>${d.published.toLocaleString('en-US')}</dd></div><div><dt>Drafts</dt><dd>${d.drafts.toLocaleString('en-US')}</dd></div><div><dt>Last post</dt><dd>${fmtDate(d.last)}</dd></div><div><dt>Search</dt><dd>${d.noindex ? 'noindex' : 'indexed'}</dd></div></dl>`
    + (latest.length ? `<p class="digest__lh">Last posts out of the pipeline</p><ul class="digest__latest">${latest.map((p) => `<li><a href="${esc(hrefFor(p.link, ctx, BUILT))}">${esc(p.title)}</a><span>${fmtDate(p.date)}</span></li>`).join('')}</ul>` : '')
    + (explainer ? `<p class="digest__why">Ken on what happened: <a href="${esc(hrefOf(explainer, ctx))}" data-cue="${esc(explainer.id)}">${esc(explainer.title)}</a> (${fmtDate(explainer.date)})</p>` : '')
    + `<a class="cta cta--line" href="${esc(hrefOf(g.byId.get('digest'), ctx))}">Open the archive<span aria-hidden="true"> ↗</span></a></div>`;
}

/* ------------------------------------------------------------------ /building/ index */
const ITYPES = [['build', 'Builds'], ['video', 'Videos'], ['short', 'Shorts'], ['essay', 'Writing']];
export function facetsHTML(g) {
  const all = human(g);
  const builds = all.filter((i) => i.type === 'build');
  const stackN = {};
  for (const b of builds) for (const s of b.stack) stackN[s] = (stackN[s] || 0) + 1;
  const stacks = Object.entries(stackN).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const top = stacks.filter(([, n]) => n > 1), rest = stacks.filter(([, n]) => n === 1);
  const btn = (facet, val, label, n, extra = '') => `<button type="button" class="chip" data-facet="${facet}" data-val="${esc(val)}" aria-pressed="false"${extra}><i aria-hidden="true"></i>${esc(label)}<em>${n}</em></button>`;
  const statuses = [...new Set(builds.map((b) => b.status))];
  return `<div class="facets">`
    + `<div class="facets__search"><label for="q">Search the index</label><input id="q" type="search" placeholder="Title, stack, idea…" autocomplete="off" spellcheck="false"><kbd>/</kbd></div>`
    + `<div class="facet" role="group" aria-labelledby="f-type"><span id="f-type" class="facet__h">Type</span>${ITYPES.map(([t, l]) => btn('type', t, l, all.filter((i) => i.type === t).length, t === 'build' ? ' data-default' : '')).join('')}</div>`
    + `<div class="facet" role="group" aria-labelledby="f-theme"><span id="f-theme" class="facet__h">Theme</span>${g.themes.filter((t) => all.some((i) => i.theme === t.id)).map((t) => btn('theme', t.id, t.label, all.filter((i) => i.theme === t.id).length, ` data-theme="${t.id}"`)).join('')}</div>`
    + `<div class="facet" role="group" aria-labelledby="f-status"><span id="f-status" class="facet__h">Status</span>${statuses.map((s) => btn('status', s, s, builds.filter((b) => b.status === s).length)).join('')}</div>`
    + `<div class="facet facet--stack" role="group" aria-labelledby="f-stack"><span id="f-stack" class="facet__h">Stack</span>${top.map(([s, n]) => btn('stack', s, s, n)).join('')}`
    + (rest.length ? `<details class="facet__more"><summary>${rest.length} more</summary>${rest.map(([s, n]) => btn('stack', s, s, n)).join('')}</details>` : '')
    + `</div><p class="facets__count" aria-live="polite" data-count></p><button type="button" class="tbtn facets__reset" data-reset>Reset</button></div>`;
}

export function indexListHTML(g, ctx, { types = null, limit = null } = {}) {
  const all = human(g).filter((i) => !types || types.includes(i.type)).sort(byDateDesc);
  const chron = human(g).slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (b.order ?? 0) - (a.order ?? 0)));
  const num = (it) => String(chron.indexOf(it) + 1).padStart(3, '0');
  const list = limit ? all.slice(0, limit) : all;
  let lastMonth = '';
  return `<ol class="edl">${list.map((it) => {
    const th = themeOf(g, it.theme);
    const url = hrefOf(it, ctx);
    const head = it.month !== lastMonth ? `<li class="edl__month" aria-hidden="true"><span>${esc(monLong(it.month))}</span></li>` : '';
    lastMonth = it.month;
    const vis = isMedia(it) ? img(it.image) : thumbHTML(it, g, 's');
    const text = [it.title, it.dek, (it.stack || []).join(' '), th.label, it.status, typeLabel[it.type], it.metric].filter(Boolean).join(' ').toLowerCase();
    return head + `<li class="edl__row" id="${esc(slugOf(it))}" data-id="${esc(it.id)}" data-type="${it.type}" data-theme="${esc(it.theme)}" data-status="${esc(it.status || '')}" data-stack="${esc((it.stack || []).join('|'))}" data-text="${esc(text)}"${it.demo ? ' data-demo' : ''}>`
      + `<span class="edl__n" aria-hidden="true">${num(it)}</span>`
      + `<span class="edl__vis">${vis}</span>`
      + `<div class="edl__main"><p class="edl__k"><span class="edl__type">${esc(typeLabel[it.type])}</span><span class="edl__th"><i aria-hidden="true"></i>${esc(th.label)}</span>${it.status ? `<b class="stamp" data-status="${esc(it.status)}">${esc(it.status)}</b>` : ''}${it.demo ? '<b class="ph-badge">Placeholder</b>' : ''}</p>`
      + `<h3 class="edl__t">${url !== '#' ? `<a href="${esc(url)}">${esc(it.title)}</a>` : esc(it.title)}</h3>`
      + `<p class="edl__dek">${esc(it.dek || '')}</p>`
      + (it.stack?.length ? `<ul class="edl__stack">${it.stack.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : '')
      + `</div><div class="edl__side"><span class="edl__tc">${esc(tc(it))}</span>${it.metric ? `<span class="edl__metric">${esc(it.metric)}</span>` : ''}${it.related.length ? `<span class="edl__rel">${plural(it.related.length, 'thread')}</span>` : ''}${it.type === 'build' && !it.hasPage && !it.demo ? '<span class="edl__note">Card only, no write-up yet</span>' : ''}</div></li>`;
  }).join('')}</ol>`;
}

/* ------------------------------------------------------------------ item pages */
const pageItem = (g, ctx) => (ctx.item ? g.byId.get(ctx.item) : null);
export function itemHeadHTML(g, ctx) {
  const it = pageItem(g, ctx);
  if (!it) return '';
  const th = themeOf(g, it.theme);
  return `<dl class="ihead"><div><dt>Status</dt><dd><b class="stamp" data-status="${esc(it.status)}">${esc(it.status)}</b></dd></div><div><dt>Shipped</dt><dd>${fmtDate(it.date, it.precision)}</dd></div><div><dt>Theme</dt><dd class="ihead__th" data-theme="${esc(it.theme)}"><i aria-hidden="true"></i>${esc(th.label)}</dd></div><div class="ihead__stack"><dt>Stack</dt><dd>${it.stack.map((s) => `<span>${esc(s)}</span>`).join('')}</dd></div><div><dt>Threads</dt><dd>${plural(it.related.length, 'documented link')}</dd></div></dl>`;
}
export function itemRelatedHTML(g, ctx) {
  const it = pageItem(g, ctx);
  if (!it) return '';
  const rel = it.related.map((id) => g.byId.get(id)).filter(Boolean).sort(byDateDesc);
  return `<ul class="rel">${rel.map((r) => `<li data-theme="${esc(r.theme)}"><a href="${esc(hrefOf(r, ctx))}"><span class="rel__vis">${isMedia(r) ? img(r.image) : thumbHTML(r, g, 's')}</span><span class="rel__k">${esc(typeLabel[r.type])} · ${fmtDate(r.date, r.precision)}</span><span class="rel__t">${esc(r.title)}</span></a></li>`).join('')}</ul>`;
}
export function itemPositionHTML(g, ctx) {
  const it = pageItem(g, ctx);
  if (!it) return '';
  return editHTML(g, ctx, { cue: it, controls: false });
}

/* ------------------------------------------------------------------ video index (proposed route) */
export function videoIndexHTML(g, ctx) {
  const vids = g.latest(['video', 'short'], 999);
  const months = [...new Set(vids.map((v) => v.month))];
  return months.map((m) => `<section class="vmonth" aria-labelledby="vm-${m}"><h2 class="vmonth__h" id="vm-${m}"><span>${MONTH[+m.slice(5, 7) - 1]}</span> ${m.slice(0, 4)} <em>${plural(vids.filter((v) => v.month === m).length, 'upload')}</em></h2><ul class="vgrid">${vids.filter((v) => v.month === m).map((v) => {
    const appears = v.related.map((id) => g.byId.get(id)).filter((r) => r && !isMedia(r));
    return `<li class="vcard vcard--${v.type}" data-id="${esc(v.id)}" data-theme="${esc(v.theme)}"${v.demo ? ' data-demo' : ''}><a class="vcard__play" href="${esc(v.href)}" ${v.embed ? `data-play="${esc(v.videoId)}" data-embed="${esc(v.embed)}"` : ''} aria-label="${esc(`Play: ${v.title}`)}">${img(v.image)}<span class="scr__play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span></a>`
      + `<p class="vcard__k"><span>${v.type === 'short' ? 'Short' : 'Video'}</span><span>${fmtDate(v.date)}</span><span class="vcard__th"><i aria-hidden="true"></i>${esc(themeOf(g, v.theme).label)}</span></p><h3 class="vcard__t">${esc(v.title)}</h3><p class="vcard__dek">${esc(v.dek || '')}</p>`
      + (appears.length ? `<p class="vcard__in">Appears in ${appears.map((r) => `<a href="${esc(hrefOf(r, ctx))}">${esc(r.title)}</a>`).join(', ')}</p>` : '')
      + `</li>`;
  }).join('')}</ul></section>`).join('');
}

/* ------------------------------------------------------------------ small regions */
function statsLine(g) {
  const s = g.stats;
  return `${plural(s.builds, 'build')} · ${plural(s.videos, 'video')} · ${plural(s.shorts, 'short')} · ${plural(s.essays, 'essay')} · ${plural(s.relationships, 'documented link')}`;
}
function jsonLd(g) {
  const p = g.person;
  const data = { '@context': 'https://schema.org', '@type': 'Person', name: p.name, jobTitle: p.jobTitle, description: p.description, url: 'https://kenashe.ai/', image: p.image, knowsAbout: p.knowsAbout, sameAs: p.sameAs };
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}
function credsShort(g) {
  const all = g.credentials.flatMap((c) => c.items);
  const abbr = all.map((c) => c.name.match(/\(([^)]+)\)/)?.[1]).filter(Boolean);
  // Homepage rule (pages.json credentialsRule): CPA and PMP only; the full list lives on About.
  return abbr.filter((a) => a === 'CPA' || a === 'PMP').map((a) => `<span>${esc(a)}</span>`).join('');
}
function credsFull(g) {
  return g.credentials.map((grp) => `<div><h3>${esc(grp.label)}</h3><ul>${grp.items.map((c) => `<li>${esc(c.name)}<span>${esc(c.issuer)}</span></li>`).join('')}</ul></div>`).join('');
}
function nowLine(g, ctx) {
  const n = g.now[0];
  return `<a href="${esc(hrefOf(n, ctx))}" data-cue="${esc(n.id)}"><span class="nowline__k">${esc(typeLabel[n.type])} · ${fmtDate(n.date, n.precision)}</span> ${esc(n.title)}</a>`;
}
function latestBuilds(g, ctx) {
  return `<ul class="latest-b">${g.latest('build', 3).map((b) => `<li data-id="${esc(b.id)}"${b.demo ? ' data-demo' : ''}><a href="${esc(hrefOf(b, ctx))}" data-cue="${esc(b.id)}"><b data-theme="${esc(b.theme)}"><i aria-hidden="true"></i>${esc(b.title)}</b><span>${esc(monShort(b.month))}</span></a></li>`).join('')}</ul>`;
}
function latestVideos(g, ctx) {
  return `<ul class="latest-v">${g.latest(['video', 'short'], 3).map((v) => `<li data-id="${esc(v.id)}"${v.demo ? ' data-demo' : ''}><a href="${esc(hrefOf(v, ctx))}" data-cue="${esc(v.id)}">${img(v.image, '', 128, 72).replace(' loading="lazy"', '')}<span><b>${esc(v.title)}</b><em>${v.type === 'short' ? 'Short' : 'Video'} · ${fmtDate(v.date)}</em></span></a></li>`).join('')}</ul>`;
}

/* ------------------------------------------------------------------ publishing demo steps */
export function demoStepsHTML() {
  return DEMO_STEPS.map((st, i) => `<section class="step" data-step="${st.key}" aria-labelledby="st-${st.key}">`
    + `<div class="step__h"><h2 id="st-${st.key}"><span>0${i + 1}</span>${esc(st.label)}</h2><button type="button" class="tbtn tbtn--play js-only" data-apply="${st.key}" aria-pressed="false"><span class="lbl">Apply</span></button></div>`
    + `<div class="step__body"><p class="step__where"><b>Where</b>${esc(st.where)}</p><p>${esc(st.effort)}</p><pre><code>${esc(st.snippet)}</code></pre><p class="step__note">${esc(st.note)}</p></div></section>`).join('');
}

/* ------------------------------------------------------------------ regions */
export const regions = {
  jsonld: (g) => jsonLd(g),
  'stats-line': (g) => esc(statsLine(g)),
  'now-line': (g, ctx) => nowLine(g, ctx),
  'latest-builds': (g, ctx) => latestBuilds(g, ctx),
  'latest-videos': (g, ctx) => latestVideos(g, ctx),
  'edit-monitor': (g, ctx) => monitorHTML((ctx.cue && g.byId.get(ctx.cue)) || defaultCue(g), g, ctx),
  'edit-timeline': (g, ctx) => editHTML(g, ctx, { cue: (ctx.cue && g.byId.get(ctx.cue)) || defaultCue(g) }),
  tuned: (g, ctx) => tunedHTML(g, ctx, ctx.month),
  reel: (g, ctx) => reelHTML(g, ctx),
  receipts: (g, ctx) => receiptsHTML(g, ctx),
  digest: (g, ctx) => digestHTML(g, ctx),
  'creds-short': (g) => credsShort(g),
  'creds-full': (g) => credsFull(g),
  'build-count': (g) => String(g.stats.builds),
  'video-count': (g) => String(g.stats.videos + g.stats.shorts),
  'index-facets': (g) => facetsHTML(g),
  'index-list': (g, ctx) => indexListHTML(g, ctx),
  'index-list-builds': (g, ctx) => indexListHTML(g, ctx, { types: ['build'], limit: 6 }),
  'bench-timeline': (g, ctx) => editHTML(g, ctx, { cue: g.latest('build', 1)[0], tracks: ['build', 'video', 'essay'], controls: false }),
  'item-head': (g, ctx) => itemHeadHTML(g, ctx),
  'item-related': (g, ctx) => itemRelatedHTML(g, ctx),
  'item-position': (g, ctx) => itemPositionHTML(g, ctx),
  'video-index': (g, ctx) => videoIndexHTML(g, ctx),
  'source-line': (g) => (g.meta?.head ? `Snapshot · graph read from production ${esc(g.meta.head.slice(0, 7))}, ${fmtDate(g.meta.generatedAt.slice(0, 10))}` : ''),
  'demo-steps': () => demoStepsHTML(),
  'digest-status': (g) => `<span class="auto-tag">${esc(g.digest.label)}</span> ${esc(cap(g.digest.status))}`,
};
