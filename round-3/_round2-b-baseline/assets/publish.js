// publish/ (prototype-only): add example entries and watch the universe place them.
import { baseOf, ctxFor, loadSources, graphFrom, mountStage, wirePlayers } from './boot.js';
import { DEMO_STEPS, describeChanges } from '../../../lib/publish-demo.js';
import { rerender } from '../../../lib/regions.js';
import { regions } from '../render.js';
import { esc } from '../../../lib/graph.js';
import { lazyImages } from './lazy.js';

const base = baseOf(); const ctx = ctxFor(base);
wirePlayers();
document.documentElement.classList.add('js');
// Every region except the step instructions themselves is re-run on the new graph.
const live = Object.fromEntries(Object.entries(regions).filter(([k]) => !['demo-steps', 'change-list', 'brand', 'nav'].includes(k)));

try {
  const src = await loadSources(base);
  const baseGraph = graphFrom(src, base);
  let current = baseGraph; const applied = [];
  const stage = document.getElementById('universe');
  const api = mountStage(stage, { graph: baseGraph, ctx, maxLabels: 18 });
  const changes = document.getElementById('changes');
  const buttons = new Map();

  function update(lastKey) {
    const keys = DEMO_STEPS.map((s) => s.key).filter((k) => applied.includes(k));
    const next = graphFrom(src, base, keys);
    const born = next.items.filter((i) => !current.byId.has(i.id)).map((i) => i.id);
    const demoIds = next.items.filter((i) => i.demo).map((i) => i.id);
    api?.setGraph(next, { born });
    rerender(live, next, ctx, { highlight: demoIds }); lazyImages();
    const list = describeChanges(baseGraph, next);
    changes.innerHTML = keys.length ? `<ol class="cl">${list.map((l) => `<li>${esc(l)}</li>`).join('')}</ol>` : regions['change-list'](baseGraph, ctx);
    for (const st of DEMO_STEPS) {
      const on = applied.includes(st.key); const b = buttons.get(st.key);
      b.setAttribute('aria-pressed', String(on)); b.querySelector('span').textContent = on ? `${st.verb} · undo` : st.label;
      const li = document.querySelector(`.step[data-key="${st.key}"]`); li.classList.toggle('is-on', on);
      const it = next.items.find((i) => i.demo && (st.key === 'build' ? i.type === 'build' : st.key === 'essay' ? i.type === 'essay' : i.type === 'video'));
      li.querySelector('.step-state').textContent = on && it ? `Placed in ${next.themes.find((t) => t.id === it.theme).label}${it.related.length ? ` · ${it.related.length} thread${it.related.length > 1 ? 's' : ''}` : ''}` : '';
    }
    current = next;
    const focus = born.find((id) => lastKey === 'build' ? id.startsWith('building:') : lastKey === 'essay' ? id.startsWith('writing:') : id.startsWith('video:')) || born[0];
    if (focus) setTimeout(() => api?.select(focus, { quiet: innerWidth < 860 }), 500);
    else api?.reset();
  }

  for (const st of DEMO_STEPS) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'ubtn step-btn'; b.innerHTML = `<span>${esc(st.label)}</span>`; b.setAttribute('aria-pressed', 'false');
    b.onclick = () => { const i = applied.indexOf(st.key); if (i >= 0) applied.splice(i, 1); else applied.push(st.key); update(i >= 0 ? null : st.key); };
    document.querySelector(`[data-slot="${st.key}"]`).append(b); buttons.set(st.key, b);
  }
  const slot = document.querySelector('[data-slot="reset"]');
  const all = document.createElement('button'); all.type = 'button'; all.className = 'ubtn'; all.textContent = 'Apply all three';
  all.onclick = () => { applied.splice(0, applied.length, ...DEMO_STEPS.map((s) => s.key)); update('build'); };
  const reset = document.createElement('button'); reset.type = 'button'; reset.className = 'ubtn'; reset.textContent = 'Reset';
  reset.onclick = () => { applied.length = 0; update(null); };
  slot.append(all, reset);
} catch (e) { console.info('Publishing demo needs the data file:', e.message); }
