// About page regions. The biography, background, speaking, press, Lucky Domains and sponsorship copy is page
// copy (verbatim from data/pages.json, kept in about/index.html as production keeps it in about.astro).
// What repeats or changes comes from the graph: credentials, what Ken is making now, follow links.
import { esc, n, plural, row, followLinks, href, local, ICON, COPY } from '../../components.js';

export const about = {
  /** Credentials exactly as graph.credentials groups them. No verify links. */
  'about-credentials': (graph) => `<div class="cred-groups">${graph.credentials.map((g) => `<div class="cred-group"><h3>${esc(g.label)}</h3><ul class="creds creds--stack">${g.items.map((c) => `<li><strong>${esc(c.name)}</strong><span>${esc(c.issuer)}</span></li>`).join('')}</ul></div>`).join('')}</div>`,
  /** The newest work, so the page about the person leads straight back to what he makes. */
  'about-now': (graph, ctx) => {
    const s = graph.stats; const newest = graph.now.filter((i) => i.type !== 'digest').slice(0, 4);
    return `<p class="about-count">${plural(s.builds, 'build')}, ${plural(s.essays, 'essay')}, ${plural(s.videos, 'video')} and ${plural(s.shorts, 'short')} so far, joined by ${plural(s.relationships, 'documented thread')}.</p>
<ul class="rows">${newest.map((it) => row(it, ctx, { graph })).join('')}</ul>
<p class="about-now-links"><a class="btn btn--primary" href="${esc(local('universe/', ctx))}"><span>Explore the universe</span>${ICON.arrow}</a><a class="more" href="${esc(href('/building/', ctx))}">All ${n(s.builds)} builds${ICON.arrow}</a><a class="more" href="${esc(href('/videos/', ctx))}">All ${n(s.videos)} videos and ${n(s.shorts)} shorts${ICON.arrow}</a><a class="more" href="${esc(href('/writing/', ctx))}">All ${n(s.essays)} essays${ICON.arrow}</a></p>`;
  },
  /** The two main follow links, next to the name. */
  'about-follow-top': (graph, ctx) => followLinks(ctx, { limit: 2 }),
  /** Follow: YouTube and X first as buttons, the writing RSS, then every other real profile. */
  'about-follow': (graph, ctx) => `${followLinks(ctx, { limit: 2, rss: true })}
<ul class="follow follow--inline about-elsewhere">${COPY.socials.slice(2).map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer me"><span>${esc(s.label)}</span><span class="follow-h">${esc(s.handle)}</span></a></li>`).join('')}<li><a href="mailto:${esc(COPY.email)}"><span>Email</span><span class="follow-h">${esc(COPY.email)}</span></a></li></ul>`,
};
