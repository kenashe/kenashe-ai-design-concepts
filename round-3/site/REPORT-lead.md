# Round 3 · The Living Universe · Lead designer-engineer report

Scope of this report: the design system and page shell, the homepage, the universe renderer and scene model, the
dedicated `/universe/` page, and the future-scale stress test. The Videos, Building and Writing indexes, the search
overlay, item pages, About and the publishing page are built by the specialists on top of this.

## What was built

| Path (under `round-3/`) | What it is |
|---|---|
| `site/index.html` | Homepage `/` |
| `site/universe/index.html` | The universe full screen, with list view, thread list and Digest status (proposed new route `/universe/`) |
| `site/STYLEGUIDE.md`, `site/assets/site.css` | The Round 3 design system: tokens, shell, components |
| `site/components.js` | Component helpers and `BUILT` (re-exported by `site/render.js`) |
| `site/render.js`, `site/regions/{shell,home,universe}.js` | Region registry and the regions of my pages |
| `site/copy.js`, `site/tools/check-copy.mjs` | Layout copy (verbatim from `data/pages.json`) and a check that fails if it drifts |
| `site/assets/boot.js` | `boot()`, `mountStage()`, `applyRegions()`, `?demo=build,essay,video,category`, click-to-load players, the `r3:search` event |
| `site/assets/universe/{scene,poster,universe,gl,cards}.js` | Scene model and level of detail, SVG poster, Canvas 2D renderer, raw WebGL light layer, selection cards |
| `site/assets/{home,universe-page}.js` | Page entries |
| `stress/` (`index.html`, `real/`, `300/`, `3000/`, `3000-digest/`, `render.js`, `assets/`, `tools/make-pages.mjs`, `_template.html`) | The stress test, synthetic data only |
| `site/meta.json` | Name, one-liner, signature, palette, type, pages |

Build: `node round-3/tools/prerender.mjs site` and `node round-3/tools/prerender.mjs stress` (see Known issues for why
the two are run separately). Stress pages are generated from one template with `node round-3/stress/tools/make-pages.mjs`.

## Design decisions

### 1. Identity: Ken is where the light comes from
The first screen is one composition, not a hero in front of a backdrop.

* **The photograph is a lit window standing at "now".** The universe's time axis has t = 1 (the present) at its centre.
  Ken's current headshot stands exactly there, as an honest rectangle (CSS crop and box-shadow only; nothing touches his
  face or removes the office background). The bright office behind him is used as what it is: the brightest thing in a
  night sky. A pool of warm light falls from it onto the plane, essays are drawn as planets whose lit side faces it, and
  the inner ring of the time axis is drawn in the same window colour. The caption under it reads `Now · Nov 25, 2026`
  from `graph.time.end`.
* **It is a real object in the scene.** The window stands on the plane, so work on the far side passes behind it and is
  really occluded (not labelled, not clickable) until the slow drift or a selection brings it round. Nothing is placed
  inside the present: the time-to-radius mapping starts at `R0`, the foot of the window.
* **The name is a title.** "Ken Ashe" is set in Instrument Serif at up to 168px with a faint warm gradient toward the
  window, next to the photograph; the tagline (verbatim) is serif italic, the subline (verbatim) is plain text.
* **The newest video is the newest light.** `graph.latestVideo` is announced inside the hero as a small card, tied by a
  dotted leader to its actual body in the universe. "Watch the latest video" is the one amber action; it scrolls to the
  feature and starts the player. "Explore the universe" and YouTube / X follow links complete the calls to action.
* **Not Direction A's device.** No circular portrait, no rings around a face; the portrait is rectangular, stands on a
  tilted plane, and the universe is not centred on the page but on him.
* **Mobile is its own layout.** Positioning line, the name at 92px, then the window standing in the universe at full
  width, then the tagline and the primary action: all inside the first 844px screen even with the prototype's tall
  concept bar. Subline, the latest-video card and follow links are in the second screen. Controls collapse to three
  icon buttons at the side of the stage; the selection card becomes a bottom sheet.

### 2. The Digest is an undercurrent, not a body
Round 2 drew one grain per post (1,399 grains: the largest, brightest shape). Now:

* It is **not a light and not counted**. The `digest` item has no body; headline counts and the poster title count only
  builds, essays, videos and shorts.
* It is **one faint band** lying 0.03 units below the plane inside the Web & search sector, built from
  `graph.digest.perWeek`: each week's posts are spread over the radial interval that week occupies and binned into at
  most 32 segments. Opacity is normalised to the densest segment and capped (≤ 0.14 at rest), the tint is ash
  (`#8a939d` paused, a dull warm `#b3a58f` when publishing), and it is drawn before everything else.
* **Constant cost and constant weight at any volume.** 1,399 posts → 25 segments; 55,179 posts → 32 segments. With the
  Digest publishing for 16 years it is still a haze under the work (see `stress/3000-digest/`).
* A 14px label, `Automated Digest · paused`, derived from `graph.digest.status`, sits at the band's outer end. Hovering
  or selecting it (or "Show the Digest" on `/universe/`) reveals the detail on demand: the band lifts, one hairline per
  published week appears, and a card shows the shared Digest status block (derived status line, counts, date range,
  noindex, weekly sparkline, archive link, link to the build that explains it). If the status were `publishing` the
  label, the tint and a slow shimmer along the band would say so.
* On the page it is one compact ash strip with a dashed border, after everything of Ken's, and a small column in the
  footer; in the nav it carries an "automated" tag.

### 3. Time to radius
`rho(t) = R0 + (1 − R0) · log1p(age / τ) / log1p(span / τ)` with `age = (tNow − t) · span`, `R0 = 0.235`, `τ = 30 days`
(`scene.js → timeModel`). `t` is `item.layout.t`.

* With **one year** of work (today) it is close to linear but gives recent months more room: the newest 44 days, which
  hold half of all items, get 36 % of the radius.
* With **sixteen years** the newest year still owns about half of the radius and every older year is compressed a little
  more; nothing is ever dropped off the disk. Work older than the modern record (the 2016 essay) sits on the rim, which
  is labelled "Before Nov 2025".
* The time axis adapts: quarter rings while the record is under about 2.5 years, year rings after that.
* **Replay growth** runs `tNow` from 0 to 1. Everything is placed where it was at that moment, so the universe literally
  grows outward from Ken. The pace is half calendar, half item count, so busy months get the time they deserve. The same
  slider scrubs manually (arrow keys step one month).

### 4. Level of detail (thresholds)
`scene.js → partition(S, { tNow, budget, clusterBudget, expanded })` decides what exists on screen. Only its output is
projected, drawn, labelled and hit-tested, so a frame costs about the same with 44 or 3,000 items.

| What | Rule |
|---|---|
| Individual lights | Whole months, newest first, until the **budget** is reached: 240 (desktop), 180 (low-power devices), 110 (stage narrower than 700px). The prerendered poster uses 100. Today's 44 items are all lights and there are no clusters |
| Clusters | Everything older, from `graph.clusters()`: **month** clusters to finish the quarter the window cut, then **quarter** clusters, then, once about 60 clusters exist (55 % of a budget of 110; about 33 on phones), whole **year** clusters. A cluster is a soft body sized by √count in its theme colour, labelled like `2033 · 102` |
| Resolving | Selecting a cluster (click, tap or Enter) opens a card with its counts by kind and its five most connected pieces, and **opens** it: its items fade up as lights. Zooming in past 62 % of the home distance opens the cluster nearest the centre of view; zooming back out closes them. At most three clusters are open at once. Selecting or following a thread to an item that lives inside a cluster opens that cluster first |
| Threads | Only `graph.edges`. At rest: all of them up to 70; with more, the 70 between the highest-priority visible lights. The focused item always shows all of its own threads; a thread whose other end is inside a cluster ends at that cluster |
| Labels | By `item.priority` × nearness, 4 to 14 per view by area (never more), 15.5px titles (14.5px on phones), theme names in 21px serif italic, time labels 14px. Greedy collision avoidance against other labels, bodies, the photograph, the copy column, cards and controls; focus plus context (the focused item and its neighbours are placed first, the rest dim). Placement is recomputed a few times a second and each label rides with its body, so nothing jitters |
| Hit-testing | A uniform 56px grid over the projected bodies, rebuilt per frame; a query touches nine cells |
| Stalks and halos | Stalks are skipped above 420 bodies; above 130 bodies the Canvas 2D tier uses flat strokes instead of gradients for small bodies and drops halos on distant ones |
| DOM | One focusable element for the whole universe; no anchor per body. The list view is grouped by year in `<details>`; only the newest years (up to 90 items, always the newest year) are in the HTML, older years fill in when opened |
| Poster | 100 lights as links, older periods as cluster circles, the Digest as ≤ 24 paths. 32 KB raw (8 KB gzipped) for the real site, 88 KB raw (14 KB gzipped) at 3,000 items |

### 5. The universe: lighting, depth, motion
* Kinds of light: builds are stars with diffraction spikes (LIVE builds twinkle slightly), essays are planets lit from
  now, videos are ringed bodies, shorts smaller ringed bodies. Colour is the theme (from `theme.hue`), shape is the kind.
* Depth: every light stands on a hairline stalk above the plane; atmospheric perspective fades and warms distant lights;
  depth of field widens and softens halos away from the plane of focus (in the shader on WebGL, by sprite size on Canvas).
* Motion, all data-driven and pausable: a very slow drift, a light travelling along each thread in its documented
  direction, twinkle on LIVE builds, shimmer on the Digest only when publishing.
* **Selecting** on the homepage turns the universe like a turntable around Ken and brings the piece to the front; on
  `/universe/` the camera flies to it and makes room for the card. **Follow a thread** sends a bright light along the
  documented link while the camera travels with it, then selects the other end.
* The card: image or data-derived visual, kind, status, date, theme, receipts count, thread count, dek, one clear link,
  and one button per documented thread with its evidence.

### 6. Tiers
1. **Poster** (`poster.js`): prerendered SVG, real links, works with JS off; also what `?tier=still` shows.
2. **Canvas 2D** (`universe.js`): everything interactive.
3. **WebGL** (`gl.js`, 3 KB, raw, lazy): an additive light layer under the 2D canvas. Loaded only when not reduced
   motion, not Save-Data, more than 2 cores and more than 2 GB; if it fails or loses its context, Canvas 2D keeps drawing.

`?tier=still|canvas|webgl` forces a tier. DPR is capped at 2 (1.5 on low-power devices and for the WebGL layer); low-power
devices run at 30 fps. The loop stops when the stage is off-screen, the tab is hidden, motion is paused or nothing is
changing (measured: 0 frames/s paused, off-screen and under reduced motion).

### 7. Accessibility of the universe
* JS off: the poster's 44 lights are ordinary links with titles; all content sections are plain HTML.
* JS on: the universe is **one tab stop** (`role="application"` with instructions in its label). Arrow keys travel to the
  nearest item in that direction on screen, Enter opens the selected item (or opens a cluster), Escape clears, `+`/`−`
  zoom, Home selects the newest, and on `/universe/` `L` jumps to the list view. Each selection is announced through a polite live region
  ("Build: ZeroHuman, Nov 2026, 2 documented threads. Press Enter to open.") and opens the card, whose thread buttons
  and link are ordinary controls.
* **List view** on `/universe/`: the complete text equivalent, by year, with a "Show in universe" button per item, plus
  every documented thread with its evidence. The homepage links to it ("Explore the universe", "Full screen").
* Touch: tap selects, horizontal drag orbits, pinch zooms. On the homepage the stage is `touch-action: pan-y`, so a
  vertical swipe that starts on the universe scrolls the page (verified with synthetic touch events); the mouse wheel
  never zooms there. On `/universe/` the stage takes all gestures and the wheel zooms toward the pointer.
* Reduced motion: no drift, no travelling lights, no shimmer; camera and labels change instantly; replay does not
  autoplay, the slider steps through time instead. A Pause control is always present. Replay and time slider are a
  button and a native range input with `aria-valuetext`.
* Contrast: text 17.4:1, secondary 12.3:1, muted 7.7:1 on the background; canvas labels have a dark outline. No text is
  under 14px in HTML, SVG or canvas (checked by script on every page at 390, 768 and 1440px, JS on and off).

### 8. Homepage after the first screen
Latest video (large click-to-load player, its documented threads, follow, four more to watch, link to the archive) →
newest builds (`graph.featuredBuilds`, with theme, receipts and thread counts; image-less builds get the data-derived
visual) → the film (Returning Your Things, film first: logline, runtime, one action) → latest writing → who is Ken
(photo, `graph.person.description`, CPA and PMP from `graph.credentials`, follow, link to About) → the Digest strip →
footer. Every section links to its index. No stat strips or tiles. On phones the builds and "more to watch" are swipe rails.

## Measured

**Homepage** (Chromium, `networkidle` + 2.5 s, no interaction; gzip-equivalent = text gzipped, fonts and images as is):

| Viewport | Requests | Raw | Gzip-equivalent | Length |
|---|---|---|---|---|
| 1440 × 900 | 36 | 684 KB | **464 KB** | 4,501px = 5.0 viewports |
| 1440 × 900, `?tier=webgl` | 37 | 688 KB | 465 KB | same |
| 390 × 844 | 34 | 636 KB | **415 KB** | 6,222px = 7.4 viewports |

Largest items: film still 72 KB, portrait 40 KB, latest-video poster 35 KB, three fonts 78 KB, `universe.js` 16 KB gz,
HTML 15 KB gz (65 KB raw, of which the poster is 32 KB), `sources.json` 13 KB gz, CSS 10 KB gz. External requests before
interaction: none. `/universe/`: 23 requests, 212 KB gzip-equivalent.

**Stress test** (headless, 1440 × 900 window, stage 1440 × 700, 4 s of orbit and zoom rendering every frame;
`window.__stress.run()`; the sandbox has 2 shared cores and software rendering, so frame intervals are dominated by the
machine, and they vary ±30 % between runs):

| Dataset | Tier | Items | Lights | Clusters | Labels | Threads drawn / total | Digest posts → segments | Scene build ms | LOD pass ms | Draw ms avg / worst | Frame ms avg / p95 / worst | DOM nodes | Heap MB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Real 44 | Chromium Canvas 2D | 44 | 44 | 0 | 13 | 26 / 26 | 1,399 → 25 | 1.0 | 5.3 | 7.3 / 23 | 43 / 100 / 117 | 1,126 | 3.6 |
| Real 44 | Chromium WebGL | 44 | 44 | 0 | 13 | 26 / 26 | 1,399 → 25 | 1.0 | 8.6 | 5.7 / 21 | 80 / 133 / 150 | 1,126 | 4.2 |
| 300 | Chromium Canvas 2D | 304 | 177 | 21 | 11 | 58 / 117 | 1,399 → 4 | 4.6 | 31.5 | 18.2 / 33 | 84 / 117 / 150 | 3,240 | 3.3 |
| 300 | Chromium WebGL | 304 | 227 | 16 | 8 | 70 / 117 | 1,399 → 4 | 1.8 | 29.8 | 5.7 / 24 | 72 / 117 / 233 | 3,240 | 8.1 |
| 1,000 | Chromium Canvas 2D | 995 | 177 | 94 | 12 | 65 / 372 | 1,399 → 2 | 4.0 | 53.0 | 14.2 / 38 | 73 / 133 / 150 | 2,870 | 5.0 |
| 1,000 | Chromium WebGL | 995 | 225 | 87 | 13 | 70 / 372 | 1,399 → 2 | 3.6 | 37.9 | 9.4 / 17 | 107 / 150 / 167 | 2,870 | 7.6 |
| 3,000 | Chromium Canvas 2D | 3,004 | 210 | 181 | 9 | 50 / 1,097 | 1,399 → 1 | 7.2 | 9.6 | 18.2 / 35 | 78 / 117 / 150 | 3,888 | 13.9 |
| 3,000 | Chromium WebGL | 3,004 | 278 | 173 | 10 | 55 / 1,097 | 1,399 → 1 | 7.1 | 10.1 | 11.1 / 65 | 88 / 117 / 133 | 3,888 | 22.4 |
| 3,000 + Digest | Chromium Canvas 2D | 3,004 | 210 | 181 | 11 | 45 / 1,097 | 55,179 → 32 | 7.7 | 43.8 | 21.8 / 81 | 88 / 133 / 150 | 3,948 | 7.8 |
| 3,000 + Digest | Chromium WebGL | 3,004 | 267 | 173 | 13 | 54 / 1,097 | 55,179 → 32 | 5.4 | 9.2 | 9.2 / 45 | 86 / 117 / 133 | 3,948 | 11.2 |
| Real 44 | Firefox Canvas 2D | 44 | 44 | 0 | 13 | 26 / 26 | 1,399 → 25 | 1 | 5 | 24.5 / 37 | 29 / 34 / 50 | 1,126 | n/a |
| 300 | Firefox Canvas 2D | 304 | 177 | 21 | 11 | 58 / 117 | 1,399 → 4 | 13 | 54 | 48.0 / 91 | 53 / 84 / 100 | 3,240 | n/a |
| 1,000 | Firefox Canvas 2D | 995 | 177 | 94 | 12 | 65 / 372 | 1,399 → 2 | 8 | 26 | 47.4 / 71 | 52 / 67 / 83 | 2,870 | n/a |
| 3,000 | Firefox Canvas 2D | 3,004 | 197 | 180 | 12 | 51 / 1,097 | 1,399 → 1 | 9 | 10 | 43.2 / 66 | 47 / 67 / 67 | 3,888 | n/a |
| 3,000 + Digest | Firefox Canvas 2D | 3,004 | 216 | 181 | 9 | 43 / 1,097 | 55,179 → 32 | 13 | 11 | 66.4 / 95 | 72 / 84 / 100 | 3,948 | n/a |

How to read it: what is drawn stays flat (about 180 to 280 lights, at most about 180 clusters, 8 to 13 labels) while
items grow 68×; this page's own draw cost grows about 2 to 3×; scene build stays under 15 ms; DOM stays under 4,000 nodes
(most of it the list view). In Chromium an empty canvas already costs about 39 ms per frame on this machine, so the
frame-interval columns say more about the sandbox than about the design; they need re-measuring on real hardware (the
panel on each stress page does that in whatever browser opens it). The "threads total" excludes the two edges that point
at the Digest, which is not a body. Stress HTML: 76 KB (real) to 258 KB raw, 17 to 25 KB gzipped.

## QA results
* Chromium and Firefox, 390 / 768 / 1440px, JS on and off, homepage, `/universe/` and all five stress pages: no console
  errors, no 404s, no horizontal overflow, exactly one `<h1>`, no text under 14px.
* JS disabled: homepage and `/universe/` are complete (poster with 44 links, all sections, header menu via `<details>`).
* Reduced motion: 0 frames/s at rest; selection, cards and the time slider work; replay becomes stepping.
* Keyboard: tab order is skip link → nav → search → hero actions → the universe (one stop) → its controls → page.
  Arrow travel, Enter, Escape, zoom keys verified in both browsers.
* Touch emulation (390px, Chromium): vertical swipe on the stage scrolls the page; horizontal drag orbits; tap selects
  and opens the bottom-sheet card; pinch zooms on `/universe/`.
* `?demo=build,essay,video,category`: regions re-render, placeholders are dashed amber and labelled, the new theme
  (Robotics) takes a sector and a derived colour, new bodies flare in, the hero's latest card switches to the placeholder video.
* `?tier=still|canvas|webgl` verified. With every external host blocked the pages are complete; the only external
  request is the youtube-nocookie iframe after a click.
* Search: the button dispatches `r3:search`; a listener that calls `preventDefault()` keeps the page, otherwise it links
  to the Building index.

## Browser notes
* **Chromium** (headless, SwiftShader): Canvas 2D and WebGL tiers both render; the sandbox reports 2 cores, so the default
  path there is the throttled Canvas 2D tier. SwiftShader logs a harmless "GPU stall due to ReadPixels" warning when
  screenshots are taken with the WebGL layer.
* **Firefox** (headless): identical layout and behaviour on Canvas 2D. WebGL cannot be created in this headless build, so
  `?tier=webgl` falls back to Canvas 2D without errors (the fallback path is therefore tested, the WebGL path in Firefox is not).
  Software Canvas 2D is slower there (see table).
* Features used: ES modules, Canvas 2D, ResizeObserver, IntersectionObserver, pointer events, `color-mix()` (guarded by
  `@supports` with a fallback), `mask-image` (prefixed and unprefixed), `text-wrap` (progressive), `aspect-ratio`,
  `overflow: clip`, `svh` with a `vh` fallback. No `:has()`, no import attributes, no top-level features newer than
  Safari 16 / Firefox 115 / Chrome 110 except where guarded.

## Not verified
* Real GPUs, high-refresh displays and real phones: frame times above are software rendering on 2 cores.
* Safari and iOS (WebKit is not available here). Points to check there: `-webkit-mask-image` on the mobile stage, pinch
  on a `touch-action: pan-y` element on the homepage (iOS may give the gesture to page zoom; `/universe/` uses
  `touch-action: none`), and `svh`.
* Firefox WebGL, screen readers (roles and live region are in place but untested with VoiceOver or NVDA), and real
  `navigator.connection.saveData`.

## Known issues
* `node round-3/tools/prerender.mjs` with no argument stops at `round-3/_round2-b-baseline/render.js` (the tool treats
  that folder as a root and its Round 2 imports do not resolve). Run it per root (`… site`, `… stress`), or let the tool
  skip folders that start with `_`. I did not change the shared tool.
* `round-3/lib/concept-flag.css` is empty (0 bytes), so `site.css` carries the same concept-flag rules as a fallback
  (at 14px to respect the floor). If the shared file is filled in later the two agree.
* Work on the far side directly behind the photograph is hidden on the homepage until the drift or a selection brings
  it round. That is intended (the window is an object in the scene), but at rest about a tenth of the lights are behind it.
* The JS-off poster's label sizes are in SVG units, so they scale with the stage: 15 to 19px on the homepage, 14 to 24px on
  `/universe/` depending on the window. The framing presets (`VIEWS` in `poster.js`) describe typical viewports; on
  unusual ones a poster label can sit under the copy column. The canvas tier measures the real layout and does not have this.
* A label can fade out while another fades in during fast camera moves; for a few frames the two may overlap.
* The newest items sit close to the photograph's foot; when one is selected on the homepage its label may be placed
  below rather than beside it.
* If a single month ever held more items than 1.5 × the light budget, the lowest-priority items of that month would be
  neither lights nor clusters until zoomed (not reachable with the synthetic data; the list view always has them).
* Replay at 3,000 items re-partitions on every month change (about 10 to 50 ms each here), so in this sandbox it runs
  at about 20 fps; on real hardware this needs checking.
* Video cards link to `/videos/#v-<videoId>`; the video archive page needs to give each video that id.
* `stage.__universe`, `screenOf()` and `_debug()` are QA hooks; production would drop them.

## Shared-library changes
None. Local helpers instead: `site/copy.js` (layout copy the graph does not carry: tagline, subline, trust line, footer
line, socials, RSS; checked against `data/pages.json` by `site/tools/check-copy.mjs`), `titleOf()` (drops trailing
hashtags from YouTube titles for display), `themeColors()` (colour from `theme.hue`), and `ctxFor()` in `boot.js`
(gives the browser the same `ctx.page` the prerender uses, so the header's active state survives a re-render).

## For production (Astro)
`scene.js`, `poster.js`, `universe.js`, `gl.js` and `cards.js` are plain modules and move as they are; `components.js`
functions map one to one onto Astro components; the poster is generated at build time. `rel=canonical` is omitted in the
prototype and stays in production's layout (`https://kenashe.ai/`, and a new one for `/universe/`).
