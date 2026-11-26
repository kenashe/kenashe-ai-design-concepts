// Future-scale stress data. SYNTHETIC: never shown in the real prototype.
//
//   node round-3/tools/synthesize.mjs            # writes round-3/stress/data/sources-{300,1000,3000}.json
//
// Takes the real sources.json and appends several years of generated work with obviously
// synthetic titles ("Synthetic build 2028-03 #12"), so the universe, search, archives and the
// build can be exercised at 300, 1,000 and 3,000 personal items. Deterministic (seeded).
// It also introduces kinds of work that do not exist today, to exercise theme emergence:
//   · builds tagged with stacks nobody has used yet ("Robotics", "3D printing")
//   · videos that share a new hashtag (#homelab)
//   · entries that carry an explicit `topic: 'Hardware'`
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const R = join(dirname(fileURLToPath(import.meta.url)), '..');
const real = JSON.parse(readFileSync(join(R, 'data/sources.json'), 'utf8'));
const out = join(R, 'stress/data'); mkdirSync(out, { recursive: true });

function rng(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
const pad = (n, w = 2) => String(n).padStart(w, '0');
const REAL_STACK = [...new Set(real.builds.flatMap((b) => b.stack))];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function make(target, { digestResumes = false } = {}) {
  const rand = rng(target * 7919);
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const src = structuredClone(real);
  const realCount = src.builds.length + src.writing.length + src.videos.length;
  const perMonth = { build: 3, essay: 1.6, video: 5, short: 6.4 }; // ≈ 190 a year, a busy but plausible pace
  const rate = Object.values(perMonth).reduce((a, b) => a + b, 0);
  const monthsNeeded = Math.ceil((target - realCount) / rate);
  let y = 2026, m = 12; let n = 0; const newBuilds = [];
  const count = (k) => { const base = Math.floor(perMonth[k]); return base + (rand() < perMonth[k] - base ? 1 : 0); };
  for (let k = 0; k < monthsNeeded; k++, m++) {
    if (m > 12) { m = 1; y++; }
    const ym = `${y}-${pad(m)}`; const yearsIn = k / 12;
    const day = () => `${ym}-${pad(1 + Math.floor(rand() * 27))}`;
    for (let i = count('build'); i > 0; i--) {
      n++; const id = `building:synthetic-build-${pad(n, 4)}`;
      let stack = [pick(REAL_STACK), pick(REAL_STACK)]; let topic = null;
      if (yearsIn > 1 && rand() < 0.12) stack = ['Robotics', 'ROS'];            // a new kind of work, no rule for it
      else if (yearsIn > 1.5 && rand() < 0.1) stack = ['3D printing', 'Bambu Lab'];
      else if (yearsIn > 2 && rand() < 0.06) { stack = ['KiCad']; topic = 'Hardware'; } // explicit topic
      const hasPage = rand() < 0.6;
      src.builds.push({ id, slug: id.slice(9), title: `Synthetic build ${ym} #${n}`, status: rand() < 0.5 ? 'LIVE' : 'SHIPPED',
        dek: 'Synthetic placeholder used only for the future-scale stress test.', stack, shippedAt: `${MONTHS[m - 1]} ${y}`, footer: null, metric: null,
        month: ym, link: hasPage ? `/building/${id.slice(9)}/` : null, cta: null, hasPage, order: -n, source: 'synthetic', pageImage: null, topic, receipts: [], synthetic: true });
      newBuilds.push(id);
      if (newBuilds.length > 3 && rand() < 0.3) src.edges.push({ from: id, to: newBuilds[newBuilds.length - 2 - Math.floor(rand() * Math.min(20, newBuilds.length - 2))], type: 'links-to', evidence: 'synthetic' });
    }
    for (let i = count('essay'); i > 0; i--) {
      n++; const id = `writing:synthetic-essay-${pad(n, 4)}`; const date = day();
      src.writing.push({ id, slug: id.slice(8), title: `Synthetic essay ${ym} #${n}`, date, displayDate: date, dek: 'Synthetic placeholder used only for the future-scale stress test.',
        authorship: 'Synthetic', image: null, link: `/writing/${id.slice(8)}/`, source: 'synthetic', topic: null, receipts: [], synthetic: true });
      if (newBuilds.length && rand() < 0.6) src.edges.push({ from: id, to: newBuilds[newBuilds.length - 1 - Math.floor(rand() * Math.min(6, newBuilds.length))], type: 'links-to', evidence: 'synthetic' });
    }
    for (const kind of ['video', 'short']) for (let i = count(kind); i > 0; i--) {
      n++; const vid = `SYN${pad(n, 8)}`; const date = day();
      const homelab = yearsIn > 1 && rand() < 0.08;
      src.videos.push({ id: `video:${vid}`, videoId: vid, title: `Synthetic ${kind} ${ym} #${n}`, date, published: `${date}T15:00:00+00:00`, kind, url: '#',
        summary: 'Synthetic placeholder used only for the future-scale stress test.', hashtags: homelab ? ['homelab'] : [], thumbnail: null, source: 'synthetic', synthetic: true });
      if (!homelab && newBuilds.length && rand() < (kind === 'video' ? 0.55 : 0.25)) src.edges.push({ from: `video:${vid}`, to: newBuilds[newBuilds.length - 1 - Math.floor(rand() * Math.min(6, newBuilds.length))], type: 'mentions', evidence: 'synthetic' });
    }
  }
  // production order: newest first
  src.builds.sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : a.order - b.order)).forEach((b, i) => (b.order = i));
  src.writing.sort((a, b) => (a.date < b.date ? 1 : -1));
  src.videos.sort((a, b) => (a.published < b.published ? 1 : -1));
  const end = `${y}-${pad(m > 12 ? 12 : m)}-28`;
  if (digestResumes) {
    // Worst case for the Digest: publishing resumes at ten posts a day until the end of the range.
    const d = src.digest; let t = Date.parse('2026-12-01');
    for (; t <= Date.parse(end); t += 86400000) { const k = new Date(t).toISOString().slice(0, 10); const c = 8 + Math.floor(rand() * 4); d.perDay[k] = c; d.published += c; }
    Object.assign(d, { status: 'publishing', publishingPaused: false, last: end, statusLine: 'Publishes automatically, about ten posts a day.' });
  }
  src._meta = { ...src._meta, synthetic: true, note: `SYNTHETIC stress data: ${realCount} real items plus generated future work to about ${target} personal items, through ${end}. Not real projects.` };
  return src;
}

for (const [target, opts] of [[300, {}], [1000, {}], [3000, {}], [3000, { digestResumes: true }]]) {
  const s = make(target, opts); const name = `sources-${target}${opts.digestResumes ? '-digest-on' : ''}.json`;
  writeFileSync(join(out, name), JSON.stringify(s));
  console.log(name, 'builds', s.builds.length, 'essays', s.writing.length, 'videos', s.videos.length, 'edges', s.edges.length, 'digest', s.digest.published, s._meta.note.split('through ')[1]);
}
