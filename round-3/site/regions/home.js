// Homepage regions. Everything here is derived from the graph; the hero copy itself (name, tagline,
// subline) is page copy and lives in index.html, as it does in production's index.astro.
import { esc, fmtDate, titleOf, card, row, player, threads, kicker, media, button, sectionHead, digestStatus, followLinks, href, local, itemHref, plural, n, themeChip, glyph, ICON, when, COPY } from '../components.js';
import { posterSVG } from '../assets/universe/poster.js';

// The film is a page-level editorial choice (one film, presented as a film first). If it is ever removed the section disappears.
const FILM_ID = 'building:returning-your-things';

export const home = {
  'hero-poster': (graph, ctx) => posterSVG(graph, ctx, 'hero', { hrefOf: (it) => itemHref(it, ctx) }),
  'hero-now': (graph) => `Now · ${esc(fmtDate(graph.time.end))}`,
  /** The newest video, announced inside the hero. */
  'hero-latest': (graph, ctx) => {
    const v = graph.latestVideo ?? graph.now[0]; if (!v) return '';
    const isVideo = v.type === 'video';
    return `<a class="hero-latest${v.demo ? ' is-ph' : ''}" href="#latest" data-id="${esc(v.id)}" data-latest style="--tc:${v.tint}">
<span class="hl-media">${media(v, { lazy: false, w: 480, h: 270 })}<span class="card-play" aria-hidden="true">${ICON.play}</span></span>
<span class="hl-body"><span class="hl-k">${isVideo ? 'Latest video' : 'Newest'} · ${esc(when(v))}${v.demo ? ' · placeholder' : ''}</span><span class="hl-t">${esc(titleOf(v))}</span></span></a>`;
  },
  /** Latest video feature: large click-to-load player, its documented threads, and what to watch next. */
  'latest-video': (graph, ctx) => {
    const v = graph.latestVideo; if (!v) return '<p class="empty wrap">No videos yet. The newest upload appears here on its own.</p>';
    const more = graph.latest('video', 3).slice(1).concat(graph.latest('short', 2));
    const yt = COPY.socials[0];
    return `<div class="wrap latest-grid">
<div class="latest-player">${player(v, ctx, { lazy: true, label: 'Play the latest video' })}</div>
<div class="latest-info"><p class="eyebrow">Latest video · ${esc(when(v))}${v.demo ? ' · placeholder' : ''}</p>
<h2 id="latest-h">${esc(titleOf(v))}</h2>
${v.dek ? `<p class="latest-dek">${esc(v.dek)}</p>` : ''}
${v.related.length ? `<div class="latest-threads"><h3>Documented threads</h3>${threads(v, graph, ctx, { limit: 3 })}</div>` : ''}
<p class="latest-cta">${button(`Follow on ${yt.label}`, yt.url, { variant: 'ghost', icon: ICON.youtube, attrs: 'rel="noopener noreferrer me"' })}</p></div></div>
<div class="wrap latest-more">${sectionHead('More to watch', { level: 3, link: { href: href('/videos/', ctx), label: `All ${n(graph.stats.videos)} videos and ${n(graph.stats.shorts)} shorts` } })}
<ul class="rail">${more.map((it) => `<li>${card(it, ctx, { level: 4, dek: false })}</li>`).join('')}</ul></div>`;
  },
  /** Newest builds with receipts and thread counts. */
  builds: (graph, ctx) => `<div class="wrap">${sectionHead('Newest builds', { id: 'builds-h', lede: 'Shipped, tested, and documented, failures included.', link: { href: href('/building/', ctx), label: `All ${n(graph.stats.builds)} builds` } })}
<ul class="grid grid--3 grid--rail">${graph.featuredBuilds.map((b) => `<li>${card(b, ctx, { graph })}</li>`).join('')}</ul></div>`,
  /** The film, presented as a film first. */
  film: (graph, ctx) => {
    const f = graph.byId.get(FILM_ID); if (!f) return '';
    return `<div class="film-frame">${f.image ? `<img src="${esc(f.image)}" alt="" width="1280" height="720" loading="lazy" decoding="async">` : ''}
<div class="film-copy wrap"><p class="film-k">A short film by ${esc(COPY.name)}${f.metric ? ` · ${esc(f.metric)}` : ''}</p>
<h2 id="film-h">${esc(f.title)}</h2><p class="film-log">${esc(f.dek)}</p>
<p>${button(f.cta || 'Watch the film', itemHref(f, ctx), { variant: 'solid', icon: ICON.play })}</p></div></div>`;
  },
  /** Latest writing. */
  writing: (graph, ctx) => `<div class="wrap">${sectionHead('Latest writing', { id: 'writing-h', link: { href: href('/writing/', ctx), label: `All ${n(graph.stats.essays)} essays` } })}
<ul class="essays">${graph.latest('essay', 3).map((e) => `<li class="essay${e.demo ? ' is-ph' : ''}" data-id="${esc(e.id)}" style="--tc:${e.tint}"><a class="essay-media" href="${esc(itemHref(e, ctx))}" tabindex="-1" aria-hidden="true">${media(e, { w: 480, h: 270 })}</a><div>${kicker(e)}<h3 class="essay-title"><a href="${esc(itemHref(e, ctx))}">${esc(e.title)}</a></h3></div></li>`).join('')}</ul></div>`,
  /** Who is Ken: description from graph.person, CPA and PMP from graph.credentials, follow links. */
  about: (graph, ctx) => {
    const creds = graph.credentials.map((g) => g.items[0]).filter(Boolean);
    return `<div class="wrap about-grid">
<figure class="about-photo"><img src="${esc(ctx.base + COPY.portraitAlt.src)}" srcset="${esc(ctx.base + COPY.portraitAlt.src)} 640w, ${esc(ctx.base + COPY.portraitAlt.src2x)} 1280w" sizes="(min-width: 900px) 360px, 70vw" alt="${esc(COPY.portraitAlt.alt)}" width="640" height="685" loading="lazy" decoding="async"></figure>
<div class="about-copy"><h2 id="about-h">Who is Ken?</h2>
<p class="about-lede">${esc(graph.person.description)}</p>
<ul class="creds">${creds.map((c) => `<li><strong>${esc(c.name)}</strong><span>${esc(c.issuer)}</span></li>`).join('')}</ul>
<div class="about-cta">${followLinks(ctx, { limit: 2, rss: true })}<a class="more" href="${esc(href('/about/', ctx))}">More about Ken${ICON.arrow}</a></div></div></div>`;
  },
  /** The Digest: small, quiet, automated, status derived. */
  'digest-strip': (graph, ctx) => `<div class="wrap">${digestStatus(graph, ctx, { compact: true })}</div>`,
};
