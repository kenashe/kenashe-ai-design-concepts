# KenAshe.ai · Round 3 · The Living Universe · Style guide

One design system for every page of the prototype. Everything is in `site/assets/site.css` (one stylesheet) and
`site/components.js` (pure functions that return HTML strings; re-exported from `site/render.js`). **Compose pages from
these components. Do not add new colours, type sizes, card styles or button styles.** If a page needs something that is
not here, add it to `components.js` + `site.css` + this file so the next page can reuse it.

## 1. How a page is built

```
site/<production path>/index.html     the page: static shell + <div data-region="name"><!--@name--><!--/@name--></div>
site/regions/<page>.js                 export const <page> = { 'region-name': (graph, ctx) => html }
site/render.js                         registry: imports every regions/*.js and spreads it into `regions`
site/components.js                     the components below + BUILT (production paths the prototype implements)
site/copy.js                           layout copy production keeps in .astro files (verbatim from data/pages.json)
site/assets/site.css                   the design system
site/assets/boot.js                    boot(), mountStage(), applyRegions(), wireShell(), loadPlayer()
```

To add a page: write `site/regions/<page>.js`, add one import and one spread in `site/render.js`, create the HTML with
the shell below, then run `node round-3/tools/prerender.mjs site`. Every region is called with a *prepared* graph
(`prep(graph)` stamps `item.tint` and `theme.tint`, the theme colours derived from `theme.hue`), so components can be
called with plain items. In the browser use `boot()` from `assets/boot.js`: it loads the graph, applies `?demo=`,
re-renders regions and wires the shell.

### Page shell (copy this; `B` = relative path to `round-3/`, `S` = relative path to `site/`)

```html
<!doctype html>
<html lang="en" data-root="site">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<title>…</title><meta name="description" content="…"> <!-- + Open Graph; no rel=canonical in the prototype -->
<meta name="r3:item" content="building:zerohuman">            <!-- item pages only -->
<link rel="icon" href="B/assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="S/assets/fonts/instrument-serif.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="S/assets/fonts/hanken-grotesk.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="B/lib/concept-flag.css">
<link rel="stylesheet" href="S/assets/site.css">
</head>
<body>
<div class="concept-flag" role="note"><strong>Design concept</strong><span>Round 3 · The Living Universe. Not the live KenAshe.ai. Not indexed.</span><a href="B/">Round 3 review</a></div>
<a class="skip" href="#main">Skip to content</a>
<div data-region="header"><!--@header--><!--/@header--></div>
<main id="main"> … one <h1> … </main>
<div data-region="footer"><!--@footer--><!--/@footer--></div>
<div data-region="jsonld" hidden><!--@jsonld--><!--/@jsonld--></div>
<script type="module" src="S/assets/<page>.js"></script>   <!-- at least: import { boot } from './boot.js'; await boot(); -->
</body></html>
```

`header`, `footer` and `jsonld` are regions, so every page prerenders the same shell. The active nav item is derived from
the page path (`activeOf(ctx)`). The concept-flag link doubles as the base path for scripts (`baseOf()`), keep it first.

**Search contract.** The header Search control is `<a class="search-btn" data-search href="…/building/">`. On click,
`boot.js` dispatches a cancelable `r3:search` CustomEvent on `document` (`detail.trigger` = the control). The search
overlay listens for it and calls `event.preventDefault()`; if nobody does, the link goes to the Building index.

## 2. Tokens

| Group | Token | Value | Use |
|---|---|---|---|
| Night | `--void` `--deep` `--surface` `--raise` | `#0a0908` `#0f0d0a` `#15120d` `#1d1913` | page, footer, media placeholders, raised panels |
| Lines | `--line` `--line-2` | `#2c261d` `#463d2e` | hairlines, control borders |
| Text | `--text` `--soft` `--muted` | `#f4efe4` `#d3cbbb` `#a9a08d` | 17.4:1, 12.3:1 and 7.7:1 on `--void`. Nothing dimmer is used for text |
| Accent | `--amber` `--amber-hi` `--amber-ink` `--window` | `#ffb84d` `#ffd08a` `#1b1205` `#ffd9a0` | one primary action per view, links to index pages, focus ring, placeholders; `--window` is the light of Ken's photograph |
| Digest | `--ash` `--ash-deep` `--ash-line` | `#9aa3ad` `#101214` `#2a2f35` | the automated Digest only: cool, dashed, never amber |
| Theme | `--tc` | set inline per item | the item's theme colour, derived from `theme.hue` (`themeColors()` in `assets/universe/scene.js`). Never hardcode a theme colour |

Theme colours today (derived, not typed): Film & video `#ff8d5c`, Onchain `#83e2d5`, Web & search `#ffce5c`,
Agents & automation `#ceff5c`, Life & curiosity `#efd4b9`. A new theme gets its colour from its hue; themes whose hues sit
within 22° of each other take different variants (vivid / pale / deep), seed themes first, so existing colours never move.

**Type.** Instrument Serif (display, headings, card titles, the tagline; regular + italic), Hanken Grotesk (text, UI, labels
in the universe), JetBrains Mono (only hashes and code in receipts). Self-hosted in `assets/fonts/`.

| Token | Size | Use |
|---|---|---|
| `--fs-display` | clamp(76px, 11.4vw, 168px) | the name on the homepage only |
| `--fs-h1` | clamp(44px, 6vw, 76px) | page titles on interior pages |
| `--fs-h2` | clamp(34px, 3.5vw, 50px) | section headings |
| `--fs-h3` | clamp(24px, 2vw, 28px) | card titles |
| `--fs-lede` | clamp(20px, 1.6vw, 24px) | intro paragraphs |
| `--fs-body` | 18px (17px ≤ 640px) | body |
| `--fs-sec` | 16px | secondary text, nav, deks in cards |
| `--fs-small` | 15px | kickers, meta lines, control labels |
| `--fs-min` | 14px | **the floor**: badges, evidence lines, footer note, every label in the universe |

Rules: no text under 14px anywhere (SVG and canvas included). No uppercase mono micro-labels; the only uppercase is the
concept flag and the stress banner. Kickers are sentence case sans at 15px. Headings use `text-wrap: balance`.

**Space** `--s1`…`--s9` = 4, 8, 12, 16, 24, 32, 48, 56, 67px. `--gutter` clamp(20px, 4.4vw, 64px). `--max` 78rem; use
`.wrap`. Sections use `.section` (top padding `--s9`). **Radii** `--r1` 3px (images), `--r2` 6px (buttons, panels),
`--r3` 12px (the universe card, menu); pills (999px) only for chips and universe controls. **Motion** `--t-fast` .16s,
`--t` .32s, `--t-slow` .7s, `--ease`; everything collapses under `prefers-reduced-motion`. Tap targets are ≥ 44px.

## 3. Components

All helpers are exported from `site/render.js` (`import { card, row, … } from '../render.js'` or `'../components.js'`).

### Links and utilities
| Helper | Returns |
|---|---|
| `BUILT` | production paths the prototype implements |
| `href(path, ctx)` | a production path → its page in the prototype, or the live kenashe.ai URL if not built |
| `local(path, ctx)` | a file inside `site/` |
| `itemHref(item, ctx)` | where an item links. Builds and essays: their page. **Videos and shorts: `/videos/#v-<videoId>`** (the archive must give each video that id). Demo and synthetic items: `#` |
| `titleOf(item)` | display title (YouTube titles lose trailing hashtags) |
| `when(item)`, `n(x)`, `plural(k, 'thread')`, `esc()` | date, number, count and escaping helpers |
| `prep(graph)` | stamps theme colours; regions get it automatically |
| `themeOf(graph, item)` | the item's theme `{label, tint, …}` |

### Buttons — `button(label, url, { variant, icon, iconAfter, attrs })`
```html
<a class="btn btn--primary" href="…"><svg class="i">…</svg><span>Watch the latest video</span></a>
```
`primary` (amber; one per view), `solid` (cream, on photography), `ghost` (outlined; default), `quiet` (text). Links to an
index page use `.more`: `<a class="more" href="…">All 19 builds<svg class="i">…</svg></a>` (built by `sectionHead`).
Icons: `ICON.play|pause|arrow|out|search|menu|close|youtube|x|rss|list|expand`.

### Section heading — `sectionHead(title, { id, lede, link: { href, label }, level })`
```html
<header class="sec-head"><div><h2 id="builds-h">Newest builds</h2><p class="sec-lede">…</p></div><a class="more" href="…">All 19 builds…</a></header>
```
Every section on the homepage links to its index page this way.

### Kicker, theme, badges — `kicker(item)`, `themeChip(graph, item)`, `placeholderBadge()`, `automatedBadge()`, `glyph(item, size)`
```html
<p class="kicker" style="--tc:#83e2d5"><svg class="glyph">…</svg><span>Build · Live · Nov 2026</span></p>
<span class="theme" style="--tc:#83e2d5">Onchain</span>
<span class="badge-ph">Placeholder</span>     <!-- every demo entry, always -->
<span class="badge-auto">Automated</span>     <!-- accompanies the Digest everywhere -->
```
`glyph` is the kind of light, the same shapes as in the universe: build = star with spikes, essay = planet lit from now,
video = ringed body, short = small ringed body, digest = ash dashes.

### Item card — `card(item, ctx, { level = 3, size = 'md' | 'lg', dek = true, lazy = true, graph })`
```html
<article class="card card--build card--md" data-id="building:zerohuman" style="--tc:#83e2d5">
  <div class="card-media"><img …> | <span class="vis">…</span> <span class="card-play">…</span></div>
  <div class="card-body"><p class="kicker">…</p><h3 class="card-title"><a href="…">ZeroHuman</a></h3>
    <p class="card-dek">…</p><p class="card-meta"><span class="theme">Onchain</span><span class="ct ct--receipts">7 receipts</span><span class="ct ct--threads">2 threads</span></p></div>
</article>
```
Works for builds, essays, videos and shorts. The whole card is one link (the title link stretches). Pass `graph` to show
the theme name. Lay cards out with `<ul class="grid grid--3">` (`grid--2`, `grid--4`); add `grid--rail` to turn the grid
into a swipe rail on phones. `.rail` is a four-up row that is always a rail on phones.

### Row — `row(item, ctx, { thumb = true, dek = false, graph })` inside `<ul class="rows">`
```html
<li class="row row--video" data-id="…" style="--tc:…"><span class="row-media"><img …></span>
  <span class="row-body"><a class="row-title" href="…">Title</a><span class="row-meta">Video · Nov 20, 2026 · 1 thread</span></span></li>
```
`thumb: false` shows the kind glyph instead of an image. Use rows for long lists (archives, search results).

### Data-derived visual — `visual(item)`, `media(item, { size: 'thumb' | 'full', lazy, w, h, alt })`
`media` returns the image (`item.thumb` in lists) or, when the item has none, `visual(item)`: a small plate of the item's
own place in the universe computed only from the item (theme colour, kind glyph, direction, time arcs for its age, one
dotted thread per documented relationship, one tick per stack tag). Never a fake screenshot. Demo items always get it,
with a dashed amber outline. **Always call `media()` instead of writing `<img>` for an item.**

### Video player — `player(item, ctx, { lazy, label })`
```html
<div class="player" data-player data-embed="https://www.youtube-nocookie.com/embed/ID" data-title="…">
  <a class="player-link" href="https://www.youtube.com/watch?v=ID" target="_blank" rel="noopener noreferrer">
    <img …><span class="player-btn">▶</span><span class="player-cap"><strong>Play</strong> …</span></a></div>
```
Click to load: `boot.js` swaps the link for a `youtube-nocookie.com` iframe (delegated, so re-rendered regions work).
Without JS it is a plain link to YouTube. Items with no video (demo, synthetic) render `.player--off` with a note.
Anything with `data-latest` scrolls to `#latest` and starts that player.

### Receipts — `receipts(item, { limit, empty })`
```html
<ul class="receipts"><li><span class="rc-kind">transaction</span><a href="https://etherscan.io/tx/…">Decision order</a><code title="0x76b5…">0x76b5d2…c0c4c6</code></li></ul>
```
Exactly what is documented on the item. `empty: true` prints an honest empty state.

### Threads (documented relationships) — `threads(item, graph, ctx, { limit, follow, evidence = true, empty })`
```html
<ul class="threads"><li style="--tc:…"><a href="…"><span class="th-glyph">…</span><span class="th-body">
  <span class="th-verb">links to</span> <span class="th-title">ZeroHuman</span><span class="th-ev">Documented in src/pages/building/ai-agent-economy.astro</span></span></a></li></ul>
```
Only `graph.edges`. `follow: true` renders buttons with `data-to` (the universe card uses them to travel along a thread).

### Digest status — `digestStatus(graph, ctx, { compact, level })`, `digestSpark(graph)`, `digestWord(graph)`
```html
<section class="digest-status digest-status--compact" data-status="paused" aria-label="The Digest, automated">
  <div class="ds-head"><span class="badge-auto">Automated</span><h2 class="ds-title">The Digest</h2><span class="ds-state">Paused</span></div>
  <p class="ds-line">Automated publishing is paused. The archive stays public. 1,399 automated posts, …</p>
  <svg class="digest-spark">…</svg><p class="ds-links">…</p></section>
```
The only way the Digest appears: ash, dashed, labelled automated, status and numbers derived (`graph.digest`). Never give
it amber, a card image, or a place among Ken's builds, essays and videos.

### Filter chips — `chips(items, { label, name })`
`items: [{ label, value, count, pressed, href, tint }]`. With `href` they are links (work without JS, `aria-current`);
otherwise buttons with `aria-pressed` that the page script toggles (`data-chips="name"`, `data-value`).
```html
<div class="chips" role="group" aria-label="Kind" data-chips="type"><button class="chip" type="button" data-value="build" aria-pressed="true">Builds<span class="chip-n">19</span></button>…</div>
```

### Follow — `followLinks(ctx, { limit = 2, rss, variant: 'buttons' | 'inline' })`
The real profiles from `copy.js` (YouTube first, then X) and the writing RSS. No counts, no forms.

### Shell — `header(ctx, active)`, `footer(graph, ctx)`, `jsonLdPerson(graph)`
Header: brand, Universe · Building · Videos · Writing · Digest (marked `automated`) · About, Search; below 960px the nav
becomes a `<details>` menu (works without JS). Footer: name, footer line, follow buttons, navigation, the Digest kept
separate in ash.

### The universe — `posterSVG(graph, ctx, 'hero' | 'full')`, `mountStage()`, `itemCard`, `clusterCard`, `digestCard`
```html
<div class="stage" id="stage" data-view="hero">
  <div class="u-poster" data-region="hero-poster"><!--@hero-poster--><!--/@hero-poster--></div>   <!-- tier 1: SVG with real links -->
  <figure class="plate"><img src="…/ken-black-polo-640.webp" alt="…"><figcaption>Now · Nov 25, 2026</figcaption></figure>
</div>
```
`--ox`, `--oy` (where "now" is, as a percentage of the stage) and `--U` (pixels per world unit) are set in CSS; the poster,
the photograph and the canvas all read them, so they always agree. `mountStage(stage, { graph, ctx, mode: 'hero' | 'full',
keepOut, leader, onList })` adds Canvas 2D, lazy WebGL, the card and the controls. The universe is the only signature
interaction: do not add another animated visualisation to a page. Interior pages should link to it
(`local('universe/', ctx) + '#i=' + item.id` selects an item) rather than embed their own.

## 4. Content rules that the components enforce (keep them)
* Counts, dates, statuses, lists, colours and relationships come from the graph. Page copy that production keeps in
  `.astro` files is verbatim from `data/pages.json` / `data/page-text/*`.
* Image-less items get `visual()`. Demo entries get `placeholderBadge()` and dashed amber. The Digest gets
  `automatedBadge()` and ash.
* Photographs of Ken are shown as honest rectangles with CSS only (`.plate`, `.about-photo`): crop with `object-fit`,
  light with `box-shadow`. Never mask to a cut-out, never filter the face.

## 5. Do not
* Add stat strips, KPI tiles, dashboards, glass cards, gradients in purple or blue, decorative particles or stock imagery.
* Use text under 14px, uppercase mono labels, or `--muted` on anything but secondary text.
* Position anything in the universe by hand, or draw a thread that is not in `graph.edges`.

## Discovery components
Added by the discovery specialist for `/videos/`, `/building/`, `/writing/` and the search overlay. Same tokens, type scale
and spacing as above; nothing here restyles a component from §3. Markup comes from `site/regions/discovery.js` (pure
functions, used by the prerender and by the page script), styles from `site/assets/discovery.css` and
`site/assets/search.css`, behaviour from `site/assets/discovery.js` and `site/assets/search.js`.

**Add search to any page** with one line (the stylesheet is loaded by the script):
`<script type="module" src="S/assets/search.js"></script>` or `import './search.js'` in the page entry. It claims the
header's `r3:search` event, `/` and Ctrl/Cmd+K. Pages that already hold the graph call `provideSearch(graph, ctx)`.

**Index page head** — `.idx-head` (title, one plain derived line `.idx-lede`, `.idx-links`).
```html
<section class="idx-head" aria-labelledby="page-h"><div class="wrap"><h1 id="page-h">Videos</h1>
  <p class="idx-lede" data-region="videos-intro">…</p><p class="idx-links"><a class="more" href="../universe/">See them in the universe…</a></p></div></section>
```

**Index** — `<div class="idx" id="archive" data-index="videos|building|writing">`: filter bar, status line, results.
One model for all three (`INDEX[name]` in `regions/discovery.js`): what it lists, its URL parameters, how it groups.
```html
<div class="idx-bar">
  <div class="idx-row"><label class="idx-search js-only">…<input type="search" name="q"></label>  <!-- instant search -->
    <div class="js-only"><div class="chips" data-chips="kind">…</div></div>                      <!-- chips() from §3 -->
    <label class="idx-select js-only"><span>Stack</span><select data-filter="stack">…</select></label></div>
  <div class="idx-row idx-row--scroll js-only"><span class="idx-l">Theme</span><div class="chips" data-chips="theme">…</div></div>
  <div class="idx-row idx-row--scroll"><span class="idx-l">Year</span><div class="chips" data-chips="year"><a class="chip" href="#y-2026">…</a></div></div>
</div>
<p class="idx-status"><span data-status role="status">16 videos and Shorts, newest first</span><button class="idx-clear js-only" data-clear hidden>Clear filters</button></p>
<div class="idx-results" data-results>…groups…</div>
```
* `.js-only` hides controls that need scripts (`html.js` is set by a one-line inline script in the page head, so nothing
  shifts). Year chips are real anchors to the year groups (`#y-2026`, or `#m-2026-11` while there is only one year); the
  script turns them into a filter. Themes come from `graph.themes`, statuses and stack tags from the items.
* Chip rows with `.idx-row--scroll` become one swipeable line below 900px.
* State lives in the URL: `?q=&kind=&theme=&status=&stack=&year=` (only the parameters the index has).

**Group and section** — year groups (month groups inside the newest year for videos), each with one section per kind.
```html
<section class="idx-group" id="m-2026-11" aria-labelledby="m-2026-11-h"><span class="idx-anchor" id="y-2026"></span>
  <header class="idx-group-head"><h2 id="m-2026-11-h">November 2026</h2><p>6 videos · 1 Short</p></header>
  <div class="idx-sec idx-sec--video" data-g="0" data-sec="video" data-total="6" data-shown="6">
    <p class="idx-sec-h">Videos</p><ul class="vgrid vgrid--video">…</ul>
    <p class="idx-more-p js-only"><button class="idx-more" data-more>Show 48 more videos</button></p>
    <noscript><ul class="idx-plain"><li id="v-…"><a href="…">Title</a> <span>Video · Apr 2, 2041</span></li>…</ul></noscript>
  </div></section>
```
`resultsHTML()` renders the first 12 cards (24 rows) of a section while a budget of 60 lasts; the rest is revealed with
`.idx-more` or, without scripts, is the `.idx-plain` list inside `<noscript>` (no DOM cost when scripts run).

**Video card** — `videoCard(item, graph, ctx)`; `li.vcard.vcard--video|short#v-<videoId>` wrapping the lead's `.card`.
Long-form is landscape (`.vgrid--video`: 4 / 3 / 2 columns, a compact row on phones); a Short is portrait
(`.vcard-media--short`, 9:16; `.vgrid--short`: 6 / 4 / 3 / 2 columns). Meta line `Video · Nov 20, 2026` + theme;
`.vthreads` lists up to two documented threads as links. The title link goes to YouTube (the no-JS path); with scripts
the card opens in place: `li.is-open` spans the grid and holds **`.vpanel`** (`videoPanel()`): the §3 `player()`, kicker,
title, dek, `threads()` with evidence, "Watch on YouTube", "Show in the universe", Close.

**Build row** — `buildRow(item, graph, ctx)` in `<ul class="blist">`.
```html
<li class="brow" style="--tc:…"><div class="brow-media">media()</div>
  <div class="brow-body"><p class="brow-k"><span class="bstatus bstatus--live">Live</span><span>Nov 2026</span><span class="theme">Onchain</span></p>
    <h3 class="brow-title"><a href="…">ZeroHuman</a></h3><p class="brow-dek">…</p><ul class="brow-stack"><li>AI Agents</li>…</ul>
    <p class="brow-meta"><span class="brow-metric">open to any agent</span><span class="ct ct--receipts">7 receipts</span><span class="ct ct--threads">2 threads</span></p></div>
  <p class="brow-go"><span class="more">Read the build →</span></p></li>
```
`.bstatus--live` is a lit dot in the theme colour, any other status a hollow ring. A build without a page gets
`.brow--nopage`: its title is plain text and `.brow-go` says so (`.brow-note`); never a dead link.

**Essay row** — `essayRow(item, graph, ctx)` in `<ul class="wlist">`: image (with its alt text), date, theme, title, dek,
and the authorship label `<span class="auth"><span class="auth-l">Authorship</span> Written by hand</span>`.

**Digest line** — `.digest-line` (region `writing-digest`): the Digest on the writing page as one ash, dashed line with
`automatedBadge()`, the derived state (`digestWord`), `graph.digest.statusLine`, the post count and a link to its archive.

**Search overlay** — `dialog.gs` built by `search.js`: `.gs-head` (field, Close), `.gs-kinds` (chips with live counts),
`.gs-status` (live region), `.gs-list` of `.gs-row` (`a.gs-main` with `media()`, title, kind · status, theme, date, and
`a.gs-uni` "Show in the universe" → `universe/#i=<id>`), `.gs-foot` (keys, and the note that the automated Digest is
not searched, with a link to its archive).

## Page components

Interior pages (item pages, About, the publishing demonstration). Regions in `site/regions/pages.js` (split into
`regions/pages/{item,builds,about,publish,sky}.js`), styles in `site/assets/pages.css` (loaded after `site.css`; the
lead's tokens only), behaviour in `site/assets/pages.js` and `site/assets/publish.js`. Every page uses the §1 shell,
adds `<link rel="stylesheet" href="S/assets/pages.css">` and, for item pages, `<meta name="r3:item" content="…">`.
Page copy is typed in the page file (as production keeps it in `.astro` pages); everything that repeats or changes is a
region. `node round-3/site/tools/check-pages-copy.mjs` fails if copy drifts from `data/page-text/*` or `data/pages.json`,
if a transaction hash is typed outside a region, or if the recorded sync run differs from its evidence file.

**Item page frame** — `main.ip.ip--build|ip--film|ip--essay > article.ip-article`.
```html
<header class="ip-head" data-region="item-head">…</header>       <!-- builds: title left, the sky right -->
<div data-region="item-tint" hidden>…</div>                         <!-- <style>.ip{--tc:<theme colour>}</style>, derived -->
<div class="ip-body wrap"> <section class="sec"><h2 class="sec-h">…</h2><div class="sec-main">…</div></section> … </div>
<section class="ip-band ip-band--receipts" id="receipts" data-region="item-receipts">…</section>
<section class="ip-band ip-band--threads" id="threads" data-region="item-threads">…</section>
<section class="ip-more" data-region="item-more">…</section>
```
`.sec` puts the heading in a 15rem side column from 1000px (sticky) and above the content below that. `.sec-main`
holds `.prose` (41rem measure, 18px / 1.68), wide blocks (`.slips`, `.pair`, figures) and `.with-margin`.

| Region | Shows (all from the graph) |
|---|---|
| `item-head` | `kickerLine()` (kind · status · date), `h1` title, dek, theme, stack, links to `#receipts` and `#threads` with counts, and `skyFigure()` |
| `essay-head` | the same without the sky, plus the byline: name, `displayDate`, the authorship label |
| `item-video` | `player()` for the item's documented video (`item.video`, else a video that links to it), its title and date |
| `item-receipts` | every `item.receipts` entry (`receipts()`), with a tally by kind. Empty when there are none |
| `rc-<word>` | the item's receipts whose label starts with, or whose kind is, `<word>` (`decision`, `encouragement`, `registry`, `injection`, `repository`, `order`, `delivery`), for placing a transaction beside the sentence it backs |
| `item-threads` | `threads()` with evidence, and "Open the universe here" (`universe/#i=<id>`) |
| `item-place` | sky and threads side by side (film and essay pages, where the work comes first) |
| `item-more` | the three newest other builds (or essays) as cards, and the link to the index |
| `item-tint` | the item's theme colour as `--tc` for the page's own markers and rules; never typed |

`statusOf(graph, item)`: a build's status is its own, except the build named by `graph.digest.relatedBuild`, which
reports the Digest's derived state ("Publishing paused" today, "Publishing" if the data says so).

**The sky (its place in the universe)** — `localSky(item, graph, ctx)`, `skyFigure()`, `skyCaption()` in `regions/pages/sky.js`.
```html
<figure class="ip-sky" style="--tc:…"><svg class="sky" viewBox="0 0 720 540" role="img" aria-label="Where ZeroHuman sits …">…</svg>
  <figcaption><span>This build sits in Onchain, Nov 2026. Documented threads connect it to …</span> <a class="more" href="…/universe/#i=building:zerohuman">Open the universe here</a></figcaption></figure>
```
A prerendered frame of the same scene the universe draws (`sceneOf`, `partition`, `place`, `project` from
`assets/universe/`), turned so the item is at the front and fitted to "now", the item and its documented neighbours.
Ken's photograph stands at "now" as an SVG `<image>` (cropping only). The item is the lit body with a dotted ring;
neighbours are lit, in their kind of light; its own threads are drawn in its theme colour; every other piece of work is
a quiet dot where the universe has it; the Digest is the same faint band and is named only on a page that documents a
link to it. It is a picture, not a second interaction: the links are the thread list beside it and the universe link.
Two label sets keep every label at 14px or more: `.sky-labels--wide` (17 units, shown when the frame is at least 594px
wide) and `.sky-labels--tall` (27 units, phones; the frame runs edge to edge and is never drawn narrower than 375px).
On build pages the sky sits in the head from 1200px; below that it moves down (CSS `order`) to sit just above the threads.

**Receipt slip** — `article.slip`: a heading, the quoted request and reply (`pre.code`, `figure.say`), the facts the page
states (`dl.facts > div > dt + dd`) and the matching transactions (`rc-<word>` region). Lay out with `.slips` (two up).
**Margin receipt** — `aside.margin` inside `.with-margin` next to `.prose`: from 1200px the transaction sits in the
margin beside the sentence it backs; below that it follows the paragraph.
**Quoted payload** — `pre.code` (wraps; JSON exactly as sent). `pre.code.code--scroll[tabindex=0]` keeps line breaks and scrolls.
**Someone speaking** — `figure.say > figcaption + blockquote` (an agent's request, a reply).
**Pull quote** — `blockquote.pull` (+ optional `.pull-by`): one of Ken's own sentences set in serif italic. Either it
replaces the sentence in the text or the sentence also stays where it was written; never invented.
**Steps** — `ol.steps` (serif numerals in the theme colour; `.when` for a block number and time).
**Pair** — `.pair > div` (two things side by side under a theme-colour rule). **Tags** — `ul.tags`. **Diagram** —
`figure.diagram > .layer > .nodes > .node`. **Update** — `.update` (a dated update, ruled in the theme colour).
**Link row** — `p.inline-links` (external links as 44px targets).

**ZeroHuman status** — region `zh-status` → `.zh-status[data-zh-status]`. Prerendered as "Snapshot · as documented
<date>" with what the page documents. `pages.js` asks the public status endpoint once per view (6 s timeout, no
credentials, response written as text only); on success the rows are replaced and the label becomes "Live · read
HH:MM UTC" (`data-state="live"`); otherwise the snapshot stays and says so.

**Film** — regions `film-head` (film line, italic `h1`, logline), `film-player` (`.film-screen`, the `player()` sized to
fit the first screen), `film-making` (`ul.thread-cards > li.thread-card`: the lead's `card()` followed by `.thread-ev`,
how the two are related and where that is documented; then one step further along each thread). Page copy:
`.film-note` (the director's note as `.pull`), `.stills` (film frames), `dl.credits`. `essay-film` → `a.film-banner`.

**Essay** — `.essay-body`: paragraphs at 17 to 20px / 1.7 on a 40rem measure, a serif initial, `h2` per section,
`p.watch-from` (a link into the video at a time), `figure.fig`, `.fig-row` (three stills side by side), `.pull`.

**The Digest's system** — regions `blog-status` (the lead's `.digest-status` block with `dl.blog-facts`: published,
drafts, first and last post, noindex; no card image, ash, dashed) and `blog-volume` (`figure.blog-volume`: one ash bar
per week from `graph.digest.perWeek`, axis text in HTML, a derived caption, and the same numbers in a table inside
`<details>`). Both carry `automatedBadge()` and `data-status`.

**About** — `.about-hero` (trust line, `h1`, tagline, bio, `followLinks`, `figure.window`; the hero's rings are a CSS
`repeating-radial-gradient` centred on the foot of the photograph: time rings spreading from where Ken stands),
`figure.window` (a photograph as a lit window: `object-fit` and `box-shadow` only), `.about-sec` (side heading +
`.about-main`), `.about-approach`, `ul.brings`, `.cred-groups` (region `about-credentials`, from `graph.credentials`),
`ol.engagements`, `ul.press`, `.company` (Lucky Domains, a separate company), regions `about-now` (counts + `row()` of
the newest work + links to the universe and the indexes) and `about-follow`.

**Publishing demonstration** — region `publish-steps` → `ol.pub-steps > li.pub-step[data-step]` from `DEMO_STEPS`
(`.pub-what` where and how much, `pre.code.code--scroll` the snippet, `.pub-note`, a toggle `button[data-apply]`
with `aria-pressed`, `.pub-changes` filled by `describeChanges()`). `.pub-preview` holds the universe's own poster in
`.stage.pub-stage` (phone-size labels so they stay above 14px in a 33rem frame), the `universe-summary` sentence and
region `publish-themes` (`ul.pub-themes`; a theme made only of placeholder entries is dashed amber with
`placeholderBadge()`). `.pub-home` holds the homepage's own `latest-video`, `builds` and `writing` regions. `ol.flow`
(numbered steps), `.pub-facts`, `table.down` inside `.table-scroll`.
