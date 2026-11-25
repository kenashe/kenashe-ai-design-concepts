// Autonomous AI Blog page: the Digest nebula explored day by day.
import { baseOf, ctxFor, loadSources, graphFrom, wirePlayers, mountStage } from './boot.js';
import { fmtDate } from '../../../lib/graph.js';

const base = baseOf(); const ctx = ctxFor(base);
wirePlayers();
try {
  const src = await loadSources(base);
  const graph = graphFrom(src, base);
  const stage = document.getElementById('nebula');
  const api = mountStage(stage, { graph, ctx, full: false, maxLabels: 12 });
  // Day scrubber: every publishing day from data, one step each.
  const days = Object.entries(graph.digest.perDay).sort(([a], [b]) => (a < b ? -1 : 1));
  const hist = document.getElementById('hist'); const svg = hist.querySelector('svg.hist-big');
  const row = document.createElement('div'); row.className = 'day-scrub';
  const range = document.createElement('input'); range.type = 'range'; range.min = 0; range.max = days.length - 1; range.step = 1; range.value = days.length - 1;
  range.setAttribute('aria-label', 'Choose a publishing day to light up its posts');
  const out = document.createElement('output'); row.append(range, out); svg.after(row);
  const rects = new Map([...svg.querySelectorAll('rect[data-d]')].map((r) => [r.dataset.d, r]));
  let on = null;
  const show = (i) => {
    const [d, n] = days[i]; const label = `${fmtDate(d)} · ${n} post${n === 1 ? '' : 's'}`;
    out.textContent = label; range.setAttribute('aria-valuetext', label);
    on?.classList.remove('on'); on = rects.get(d); on?.classList.add('on');
    api?.highlightDay(d, label);
  };
  range.addEventListener('input', () => show(+range.value));
  svg.addEventListener('pointermove', (e) => {
    const r = svg.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width;
    const t0 = Date.parse(days[0][0]); const t1 = Date.parse(graph.stats.lastDate); const t = t0 + x * (t1 - t0 + 864e5);
    let best = 0; for (let i = 0; i < days.length; i++) if (Math.abs(Date.parse(days[i][0]) - t) < Math.abs(Date.parse(days[best][0]) - t)) best = i;
    range.value = best; show(best);
  });
  show(days.length - 1);
} catch (e) { console.info('Nebula stayed static:', e.message); }
