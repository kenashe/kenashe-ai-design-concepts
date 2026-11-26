// Stress test entry. Mounts the same universe as the real site on a synthetic dataset and measures it.
// window.__stress.run() resolves with the numbers shown in the panel (for automated collection).
import { startUniversePage } from '../../site/assets/universe-page.js';

const t0 = performance.now();
const page = await startUniversePage();
const bootMs = performance.now() - t0;
const { api, graph } = page;
const panel = document.getElementById('st-panel');
const fmt = (v, d = 1) => (v == null || Number.isNaN(v) ? 'n/a' : Number(v).toLocaleString('en-US', { maximumFractionDigits: d }));

async function run({ seconds = 4 } = {}) {
  if (!api) return { error: 'no canvas (still tier)' };
  panel.innerHTML = '<p class="st-wait">Measuring: orbiting and zooming the universe for a few seconds…</p>';
  const wasPaused = api.paused;
  const frames = await api.benchmark(seconds);
  api.setPaused(wasPaused);
  await new Promise((r) => setTimeout(r, 700)); // let the view settle so the counts describe the resting view
  const s = api.stats();
  const result = {
    dataset: document.querySelector('meta[name="r3:sources"]').content,
    items: s.items, relationships: s.threadsTotal, themes: graph.themes.length,
    digestPosts: s.digestPosts, digestSegmentsDrawn: s.digestSegments,
    lightsDrawn: s.lights, clustersDrawn: s.clusters, labelsDrawn: s.labels, threadsDrawn: s.threads,
    sceneBuildMs: +s.sceneBuildMs.toFixed(2), lodMs: +s.lodMs.toFixed(2), bootMs: +bootMs.toFixed(0),
    frames: frames.frames, avgFrameMs: +frames.avgFrameMs.toFixed(2), p95FrameMs: +frames.p95FrameMs.toFixed(2), worstFrameMs: +frames.worstFrameMs.toFixed(2),
    avgDrawMs: +frames.avgDrawMs.toFixed(2), worstDrawMs: +frames.worstDrawMs.toFixed(2),
    domNodes: document.getElementsByTagName('*').length,
    heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
    renderer: s.renderer, canvas: `${Math.round(s.width)}×${Math.round(s.height)} @${s.dpr}x`, cores: navigator.hardwareConcurrency ?? null,
  };
  const rows = [
    ['Personal items in the dataset', fmt(result.items, 0)], ['Individual lights drawn', fmt(result.lightsDrawn, 0)], ['Clusters drawn', fmt(result.clustersDrawn, 0)],
    ['Labels drawn', fmt(result.labelsDrawn, 0)], ['Threads drawn (of ' + fmt(result.relationships, 0) + ')', fmt(result.threadsDrawn, 0)],
    ['Digest posts → band segments', `${fmt(result.digestPosts, 0)} → ${fmt(result.digestSegmentsDrawn, 0)}`],
    ['Scene build', `${fmt(result.sceneBuildMs)} ms`], ['Level-of-detail pass', `${fmt(result.lodMs)} ms`], ['Load to interactive', `${fmt(result.bootMs, 0)} ms`],
    ['Frame time, average', `${fmt(result.avgFrameMs)} ms`], ['Frame time, 95th percentile', `${fmt(result.p95FrameMs)} ms`], ['Frame time, worst', `${fmt(result.worstFrameMs)} ms`],
    ['Draw cost per frame, average', `${fmt(result.avgDrawMs)} ms`], ['Draw cost per frame, worst', `${fmt(result.worstDrawMs)} ms`], ['Frames measured', fmt(result.frames, 0)],
    ['DOM nodes on this page', fmt(result.domNodes, 0)], ['JS heap', result.heapMB == null ? 'not exposed by this browser' : `${fmt(result.heapMB)} MB`],
    ['Renderer', `${result.renderer}, ${result.canvas}`],
  ];
  panel.innerHTML = `<dl>${rows.map(([k, v]) => `<div class="st-row"><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl><p class="st-note">Frame time is the interval between rendered frames (it includes the browser’s own work and is capped by the display’s refresh rate); draw cost is the time this page’s code spent inside each frame. ${navigator.hardwareConcurrency ? `This device reports ${navigator.hardwareConcurrency} cores.` : ''}</p>`;
  return result;
}

let last = null;
window.__stress = { run: (o) => (last = run(o)), get last() { return last; }, api, graph };
document.getElementById('st-run')?.addEventListener('click', () => window.__stress.run());
// Auto-run once on load, except for visitors who asked for reduced motion: they press the button instead.
if (!new URLSearchParams(location.search).has('norun') && !matchMedia('(prefers-reduced-motion: reduce)').matches) setTimeout(() => window.__stress.run(), 1200);
