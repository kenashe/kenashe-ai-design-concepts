// Publishing demo for the Round 3 prototype.
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
        order: 0, source: 'src/data/builds.ts', pageImage: null, topic: null, receipts: [], demo: true });
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
        image: null, link: '/writing/example-essay/', source: 'src/data/writing.ts', topic: null, receipts: [], demo: true });
      if (src.builds.some((b) => b.id === 'building:example-project'))
        src.edges.push({ from: 'writing:example-essay', to: 'building:example-project', type: 'links-to', evidence: 'link in the essay page' });
    },
  },
  {
    key: 'video', label: 'Upload a video', verb: 'Video uploaded',
    where: 'YouTube. Nothing to edit on the site.',
    effort: 'Nothing. A scheduled GitHub Action reads the channel feed, adds the video to the archive file, downloads its thumbnail, commits both and triggers the normal rebuild.',
    snippet: `# .github/workflows/sync-videos.yml  (runs every 30 minutes, free on a public repo)
- run: node scripts/sync-videos.mjs        # feed -> archive + thumbnail
- if: steps.sync.outputs.changed == 'true'
  run: |
    git add src/data/youtube-archive.json src/assets/video/
    git commit -m "videos: 1 new upload" && git push   # push = Vercel rebuild

// src/data/youtube-archive.json  (written by the workflow, never by hand)
{ "videoId": "EXAMPLEvid1", "title": "Example video", "kind": "video",
  "published": "2026-11-25T18:00:00+00:00",
  "mentions": ["/building/example-project/"],      // from the description
  "thumbnail": "video/EXAMPLEvid1.webp" }`,
    note: 'The feed only lists the latest 15 uploads; the archive file keeps every video ever seen, so nothing falls off. If YouTube is unreachable, the run changes nothing and the site keeps building from the archive.',
    apply(src) {
      src.videos.unshift({ id: 'video:EXAMPLEvid1', videoId: 'EXAMPLEvid1', title: 'Example video', date: TODAY, published: `${TODAY}T18:00:00+00:00`,
        kind: 'video', url: '#demo-video', summary: 'A placeholder upload added by the publishing demo.', hashtags: [], thumbnail: null, source: 'YouTube channel feed', demo: true });
      if (src.builds.some((b) => b.id === 'building:example-project'))
        src.edges.push({ from: 'video:EXAMPLEvid1', to: 'building:example-project', type: 'mentions', evidence: 'YouTube description' });
    },
  },
  {
    key: 'category', label: 'Start a new kind of work', verb: 'New theme emerged',
    where: 'src/data/builds.ts (the same file, nothing new)',
    effort: 'Nothing extra. Four example builds share a stack tag no earlier build used, so the tag becomes its own theme and the universe makes room for it.',
    snippet: `// src/data/builds.ts : four ordinary entries that happen to share a new stack tag
{ title: 'Example robot arm',   stack: ['Robotics', 'ROS'], shippedAt: 'Nov 2026', ... },
{ title: 'Example rover',       stack: ['Robotics'],        shippedAt: 'Nov 2026', ... },
{ title: 'Example gripper',     stack: ['Robotics'],        shippedAt: 'Oct 2026', ... },
{ title: 'Example line tracer', stack: ['Robotics'],        shippedAt: 'Oct 2026', ... },

// No theme rule was edited. To name or merge a theme yourself, add one optional field:
//   topic: 'Hardware'`,
    note: 'Filing order: an optional topic, then the seed vocabulary, then the stack shared with earlier builds, then tags shared by four or more unfiled items (a new theme), then the theme of linked work, then Life & curiosity.',
    apply(src) {
      const names = ['Example robot arm', 'Example rover', 'Example gripper', 'Example line tracer'];
      src.builds.forEach((b) => (b.order += names.length));
      names.forEach((title, i) => src.builds.unshift({ id: `building:example-robotics-${i + 1}`, slug: `example-robotics-${i + 1}`, title, status: 'SHIPPED',
        dek: 'A placeholder build added by the publishing demo to show a new theme emerging.', stack: i ? ['Robotics'] : ['Robotics', 'ROS'],
        shippedAt: i < 2 ? 'Nov 2026' : 'Oct 2026', footer: null, metric: null, month: i < 2 ? '2026-11' : '2026-10', link: null, cta: null, hasPage: false,
        order: names.length - 1 - i, source: 'src/data/builds.ts', pageImage: null, topic: null, receipts: [], demo: true }));
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

/** Mark demo items. They have no image, so the design's own data-derived visual is used, plus a placeholder badge. */
export function patchDemoImages(graph) {
  for (const it of graph.items) if (/example/i.test(it.id)) {
    it.demo = true; it.image = null; it.href = '#';
    if (it.type === 'video' || it.type === 'short') it.embed = null;
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
  const t0 = new Set(before.themes.map((t) => t.id));
  for (const t of after.themes) if (!t0.has(t.id)) out.push(`New theme “${t.label}” (${t.count} items) appeared on its own and took a sector of the universe`);
  for (const it of newIds) {
    out.push(`${it.title}: filed under ${after.themes.find((t) => t.id === it.theme).label} (${it.filedBy}), ${fmtDate(it.date, it.precision)} on the timeline`);
    if (it.related.length) out.push(`${it.title}: linked to ${it.related.map((r) => after.byId.get(r).title).join(', ')}`);
  }
  if (after.latestVideo?.id !== before.latestVideo?.id) out.push(`Latest video feature now shows “${after.latestVideo.title}”`);
  const m = after.timeline[0]; if (m) out.push(`Timeline ${m.month}: ${m.items.length} items this month`);
  return out;
}

export { buildGraph };
