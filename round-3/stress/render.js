// Stress test · region registry. Re-exports everything from the real prototype (same components, same
// universe, same regions) and adds the few regions only the stress pages need. Synthetic data only.
import { regions as siteRegions, prep, n, plural, esc, fmtDate } from '../site/render.js';
export * from '../site/render.js';

/** The datasets the switcher offers. `dir` is the page folder inside stress/ ('' = stress/index.html). */
export const DATASETS = [
  { id: 'real', dir: 'real/', file: 'data/sources.json', label: 'Real · today' },
  { id: '300', dir: '300/', file: 'stress/data/sources-300.json', label: '300' },
  { id: '1000', dir: '', file: 'stress/data/sources-1000.json', label: '1,000' },
  { id: '3000', dir: '3000/', file: 'stress/data/sources-3000.json', label: '3,000' },
  { id: '3000-digest', dir: '3000-digest/', file: 'stress/data/sources-3000-digest-on.json', label: '3,000 + Digest publishing' },
];

const stress = {
  /** Dataset switcher: plain links between prerendered pages, so it works without JavaScript. */
  'stress-switch': (graph, ctx) => `<nav class="st-switch" aria-label="Dataset"><span>Dataset</span><ul>${DATASETS.map((d) => `<li><a href="${esc(`${ctx.base}stress/${d.dir}`)}"${d.file === ctx.sourcesFile ? ' aria-current="page"' : ''}>${esc(d.label)}</a></li>`).join('')}</ul></nav>`,
  /** What this dataset contains, straight from the graph. */
  'stress-facts': (graph, ctx) => {
    const s = graph.stats; const emerged = graph.themes.filter((t) => !t.seed).map((t) => t.label);
    const synthetic = graph.items.filter((i) => i.synthetic).length;
    return `<p><strong>${n(s.personal)} personal items</strong> (${n(synthetic)} synthetic, ${n(s.personal - synthetic)} real), ${fmtDate(graph.time.start, 'month')} to ${fmtDate(graph.time.end, 'month')} plus earlier work: ${plural(s.builds, 'build')}, ${plural(s.essays, 'essay')}, ${plural(s.videos, 'video')}, ${plural(s.shorts, 'short')}, ${plural(s.relationships, 'documented thread')}.</p>
<p>${plural(s.themes, 'theme')}${emerged.length ? `, of which ${emerged.map(esc).join(', ')} emerged from the data without anyone adding a rule` : ''}. Automated Digest: ${n(graph.digest.published)} posts, status “${esc(graph.digest.status)}”, shown as ${n(graph.digest.perWeek.length)} weekly totals.</p>
<p>Level-of-detail clusters available from the graph: ${n(graph.clusters('month').length)} by month, ${n(graph.clusters('quarter').length)} by quarter, ${n(graph.clusters('year').length)} by year.</p>`;
  },
};

export const regions = { ...siteRegions, ...Object.fromEntries(Object.entries(stress).map(([k, fn]) => [k, (g, c) => fn(prep(g), c)])) };
