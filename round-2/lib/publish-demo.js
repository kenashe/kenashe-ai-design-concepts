// Publishing demo shared by all three Round 2 directions.
// Each step adds ONE example entry in the exact shape production already uses, then the page
// re-runs buildGraph() and re-renders. The entries are placeholders, labeled as such, never
// real projects. Nothing is saved; reload to reset.
import { buildGraph, fmtDate } from './graph.js';

const TODAY = '2026-11-25';

export const DEMO_STEPS = [
  {
    key: 'build', label: 'Add a project', verb: 'Project added',
    where: 'src/data/builds.ts',
    effort: 'One entry in builds.ts, plus a page file if the project gets a write-up.',
    snippet: `// src/data/builds.ts  (top of the projects array)
{
  title: 'Example project',
  status: 'LIVE',
  dek: 'A placeholder project added by the publishing demo.',
  stack: ['HyperAgent', 'AI Agents'],
  shippedAt: 'Nov 2026',
  link: '/building/example-project/',
},`,
    note: 'Today production also needs the title added to CURATED in building-cards.ts. Round 2 proposes replacing that list with an optional `hidden: true` flag in builds.ts, so a project is entered exactly once.',
    apply(src) {
      src.builds.forEach((b) => (b.order += 1));
      src.builds.unshift({ id: 'building:example-project', slug: 'example-project', title: 'Example project', status: 'LIVE',
        dek: 'A placeholder project added by the publishing demo to show what updates on its own.', stack: ['HyperAgent', 'AI Agents'],
        shippedAt: 'Nov 2026', footer: null, metric: null, month: '2026-11', link: '/building/example-project/', cta: null, hasPage: true,
        order: 0, source: 'src/data/builds.ts', pageImage: null, demo: true });
    },
  },
  {
    key: 'essay', label: 'Publish an article', verb: 'Article published',
    where: 'src/data/writing.ts + src/pages/writing/example-essay/index.astro',
    effort: 'One metadata entry, the page itself, and one image file. Exactly the current workflow.',
    snippet: `// src/data/writing.ts  (top of the essays array)
{
  slug: 'example-essay',
  title: 'Example essay',
  date: 'November 25, 2026',
  published: '2026-11-25',
  dek: 'A placeholder essay added by the publishing demo.',
  authorship: 'Written by hand',
  image: { file: 'example-essay.jpg', alt: '…' },
},
// …and the page links to /building/example-project/, which becomes a relationship.`,
    note: 'Relationships are not entered anywhere. A link written in the essay is the relationship.',
    apply(src) {
      src.writing.unshift({ id: 'writing:example-essay', slug: 'example-essay', title: 'Example essay', date: TODAY, displayDate: 'November 25, 2026',
        dek: 'A placeholder essay added by the publishing demo. Its page links to the example project.', authorship: 'Written by hand',
        image: null, link: '/writing/example-essay/', source: 'src/data/writing.ts', demo: true });
      if (src.builds.some((b) => b.id === 'building:example-project'))
        src.edges.push({ from: 'writing:example-essay', to: 'building:example-project', type: 'links-to', evidence: 'link in the essay page' });
    },
  },
  {
    key: 'video', label: 'Upload a video', verb: 'Video uploaded',
    where: 'YouTube (no file to edit)',
    effort: 'Nothing on the site. The next build reads the channel feed. A kenashe.ai link in the description creates the relationship.',
    snippet: `<!-- YouTube channel feed, read at build time -->
<entry>
  <yt:videoId>EXAMPLEvid1</yt:videoId>
  <title>Example video</title>
  <published>2026-11-25T18:00:00+00:00</published>
  <media:description>… kenashe.ai/building/example-project/</media:description>
</entry>`,
    note: 'The feed only lists the latest 15 uploads, so the build appends each one to source/youtube-archive.json and nothing falls off the site.',
    apply(src) {
      src.videos.unshift({ id: 'video:EXAMPLEvid1', videoId: 'EXAMPLEvid1', title: 'Example video', date: TODAY, published: `${TODAY}T18:00:00+00:00`,
        kind: 'video', url: '#demo-video', summary: 'A placeholder upload added by the publishing demo.', thumbnail: 'demo/video.svg', source: 'YouTube channel feed', demo: true });
      if (src.builds.some((b) => b.id === 'building:example-project'))
        src.edges.push({ from: 'video:EXAMPLEvid1', to: 'building:example-project', type: 'mentions', evidence: 'YouTube description' });
    },
  },
];

const clone = (o) => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));

/** Apply the first `n` steps (or a list of keys) to a copy of sources. */
export function applyDemo(src, keys) {
  const s = clone(src);
  for (const st of DEMO_STEPS) if (keys.includes(st.key)) st.apply(s);
  return s;
}

/** Placeholder art for demo items (no real thumbnails exist for them). */
export function patchDemoImages(graph, base = '') {
  for (const it of graph.items) if (it.id.includes('example') || it.id.includes('EXAMPLE')) {
    it.demo = true;
    it.image = `${base}assets/demo/${it.type === 'build' ? 'build' : it.type === 'essay' ? 'essay' : 'video'}.svg`;
    if (it.type === 'video') { it.embed = null; it.href = '#'; }
    if (it.type !== 'video') it.href = '#';
  }
  return graph;
}

/** Human-readable list of what changed between two graphs. Computed, not scripted. */
export function describeChanges(before, after) {
  const out = [];
  const s0 = before.stats, s1 = after.stats;
  for (const [k, label] of [['builds', 'Project count'], ['essays', 'Essay count'], ['videos', 'Video count'], ['relationships', 'Documented relationships']])
    if (s0[k] !== s1[k]) out.push(`${label}: ${s0[k]} → ${s1[k]}`);
  const f0 = before.featuredBuilds.map((b) => b.title).join(', '), f1 = after.featuredBuilds.map((b) => b.title).join(', ');
  if (f0 !== f1) out.push(`Homepage featured builds now: ${f1}`);
  const n0 = before.now[0]?.title, n1 = after.now[0]?.title;
  if (n0 !== n1) out.push(`Latest activity now leads with “${n1}”`);
  const newIds = after.items.filter((i) => !before.byId.has(i.id));
  for (const it of newIds) {
    out.push(`${it.title}: placed in ${after.themes.find((t) => t.id === it.theme).label}, ${fmtDate(it.date, it.precision)} on the timeline`);
    if (it.related.length) out.push(`${it.title}: linked to ${it.related.map((r) => after.byId.get(r).title).join(', ')}`);
  }
  const m = after.timeline[0]; if (m) out.push(`Timeline ${m.month}: ${m.items.length} items this month`);
  return out;
}

export { buildGraph };
