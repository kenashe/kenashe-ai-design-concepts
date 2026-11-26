// Publishing demonstration regions (prototype-only route /publish/).
// The four steps come from DEMO_STEPS (lib/publish-demo.js): what Ken types, where, how much, and the note.
// The page then re-renders the real homepage and universe regions with the placeholder entries applied.
import { DEMO_STEPS } from '../../../lib/publish-demo.js';
import { esc, n, plural, placeholderBadge } from '../../components.js';

export const publish = {
  'publish-steps': () => `<ol class="pub-steps">${DEMO_STEPS.map((s, i) => `<li class="pub-step" data-step="${esc(s.key)}" id="step-${esc(s.key)}">
<div class="pub-step-head"><span class="pub-num" aria-hidden="true">${i + 1}</span><h3>${esc(s.label)}</h3></div>
<dl class="pub-what"><div><dt>Where Ken types</dt><dd>${esc(s.where)}</dd></div><div><dt>How much</dt><dd>${esc(s.effort)}</dd></div></dl>
<pre class="code" tabindex="0" aria-label="${esc(`Example for: ${s.label}`)}"><code>${esc(s.snippet)}</code></pre>
<p class="pub-note">${esc(s.note)}</p>
${s.key === 'video' ? '<p class="pub-more"><a class="more" href="#video-path">How the automatic path works</a></p>' : ''}
<p class="pub-apply"><button class="btn btn--ghost" type="button" data-apply="${esc(s.key)}" aria-pressed="false"><span>Apply this step</span></button><span class="pub-applied" hidden>${placeholderBadge()} <a href="#preview">See the universe and the homepage rebuilt</a></span></p>
<div class="pub-changes" data-changes="${esc(s.key)}" hidden><h4>What this changed, computed from the data</h4><ul></ul></div>
</li>`).join('')}</ol>`,
  /** The themes the universe is divided into right now. A theme made only of placeholder entries is marked. */
  'publish-themes': (graph) => `<ul class="pub-themes" aria-label="Themes right now">${graph.themes.map((t) => {
    const items = graph.items.filter((i) => i.theme === t.id && i.type !== 'digest'); const ph = items.length > 0 && items.every((i) => i.demo);
    return `<li class="${ph ? 'is-ph' : ''}" data-id="theme:${esc(t.id)}" style="--tc:${t.tint}"><span class="theme">${esc(t.label)}</span><span class="pub-theme-n">${n(t.count)}</span>${ph ? placeholderBadge() : ''}</li>`;
  }).join('')}</ul><p class="pub-themes-note">${plural(graph.themes.length, 'theme')}, each with its own sector of the universe. None of them is typed anywhere.</p>`,
};
