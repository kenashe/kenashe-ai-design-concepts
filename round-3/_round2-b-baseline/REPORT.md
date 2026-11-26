# Round 2 · Direction B · The Living Universe

Concept 05 from Round 1, rebuilt as a place you want to stay in, not a diagram. Everything Ken has made is a light in a
three-dimensional sky. Every light, thread and grain of dust is data. The universe is the first thing you see, but it
never stands between a visitor and the content: a normal header nav, a prerendered list of the newest work, and full
interior pages are always there, with or without JavaScript.

Pages built (all under `round-2/directions/b-living-universe/`):

| Path | What it is |
|---|---|
| `index.html` | Homepage: hero universe, latest builds / videos / writing, the Digest ("the dust lane"), constellations, about |
| `index.html?demo=build,essay,video` | The homepage with the three example entries applied |
| `universe/` | **Proposed new route** `/universe/`: full-screen explore view, plus the whole universe as a plain list and every thread |
| `building/autonomous-ai-blog/` | The Digest system, with its derived status and the Digest nebula explored day by day |
| `building/returning-your-things/` | Film first: full-bleed click-to-load film, logline, 1:54, director's note, credits, stills |
| `publish/` | Prototype-only publishing demo |

## What makes it distinctive

* **An astrophotography plate of one person's work.** Warm near-black, real light falloff, diffraction spikes on builds,
  essays as planets lit from "now", videos as ringed bodies, hairline stalks dropping each body to the plane like an orrery.
  No decorative particles: there is no background starfield. If it is visible, it is a build, essay, video, short, a
  documented link, a timeline month, a topic, or one published Digest post.
* **Placement is computed, never authored.** `item.layout` drives everything: the theme gives the angle, age gives the
  distance from "now" at the centre, links and write-ups give the size. New work appears in the right place on the next
  build without anyone positioning it.
* **The Digest is a different phenomenon.** Ken's work floats above the plane. The 1,399 automated posts lie flat in it as
  a dust lane, one grain per post, placed on the day it was published from `digest.perDay`, so the lane's density is the
  real daily volume. Its colour and motion come from `digest.status`: `publishing` is warm and drifting, `paused` (today)
  is ash-grey and completely still. The replay shows it warm while posts were arriving and cooling after the last one.
* **Time is a dimension you can play.** Replay growth rebuilds the universe month by month from the timeline: bodies are
  born at the centre with a flare and drift outward as they age, the dust lane grows day by day, threads appear when both
  ends exist.

## Signature interaction(s)

1. **Fly and follow.** Select any light (click, tap, or Tab to it): the camera flies to it, focus-plus-context dims
   everything that is not documented as related, its threads turn solid, and a card opens with the item and one button
   per documented relationship ("→ links to ZeroHuman · src/pages/building/ai-agent-economy.astro"). Choosing one sends a
   light along that thread and the camera travels with it to the related work.
2. **Replay growth.** A month-by-month replay (and a scrubber, with arrow-key steps) driven by `graph.timeline`; the
   caption reads each month's real counts ("Aug 2026 · 2 new pieces · 280 automated posts").
3. **The nebula, day by day** (Autonomous AI Blog page). A close camera on the dust lane plus a per-day histogram; scrub or
   hover any publishing day and that day's posts light up amber in the nebula with their date and count.
4. **Births** (publish page and `?demo=`). New bodies flare into their computed position and the threads their links
   create draw themselves in.

Ambient motion (all data-driven, all pausable): a slow orbit, light travelling along each thread in its documented
direction, LIVE builds scintillating gently, and the Digest shimmering only if its status is `publishing`.

## Design system

**Type** (all self-hosted latin woff2, 109 KB total)
* Instrument Serif, regular and italic: display, headings, card titles, the tagline. Cinematic, high-contrast, quiet.
* Hanken Grotesk (variable 400–700): body text and every label in the universe. Carried over from production.
* JetBrains Mono: dates, kickers, counts, axis labels, controls. Also from production, so the "receipts" voice stays.

**Palette**

| Role | Hex |
|---|---|
| Void (background) | `#0b0a08` |
| Deep / Surface / Raise | `#100e0b` / `#17140f` / `#1f1b14` |
| Line / Line 2 | `#2a251c` / `#3b3427` |
| Starlight (text) | `#f3eee3` |
| Muted / Dim | `#a89f8c` / `#8b8373` |
| Amber: Ken's accent, focus, placeholders | `#ffb300` |
| Theme light: Film & video (ember) | `#ff9468` |
| Theme light: Onchain (verdigris) | `#86e0d2` |
| Theme light: Web & search (amber gold) | `#ffc35a` |
| Theme light: Agents & automation (production accent2) | `#c8ff4d` |
| Theme light: Life & curiosity (candle) | `#f6cfae` |
| The Digest, paused (ash) | `#8f9cab` |
| The Digest, publishing (warm dust) | `#ffd7a1` |

No purple/blue haze, no glass cards. The only gradient-like light is the falloff around a body and a very faint warm
light at "now".

**Layout.** Desktop hero: headline column on the left over the outer rim of the universe, universe filling the right
three quarters, "Newest light" list bottom-left, controls bottom-right. Below: latest builds (3 cards), videos + writing
side by side, the Digest panel (its own cooler surface), constellations, about. Desktop homepage ≈ 5.9 viewports.
Mobile is designed, not shrunk: the headline sits over the far, sparse side of a near top-down universe that fills the
screen width; labels drop their meta line; controls collapse to icons; cards, videos and constellations become
swipe rails. Mobile homepage ≈ 7.5 viewports.

**Navigation.** A conventional sticky header (Universe · Building · Videos · Writing · Digest · About) on every page,
horizontally scrollable on phones. A skip link. Every list item, card and body is an ordinary link to the same page.

**Data-derived visuals.** 15 of 19 builds have no image. Their cards show the build's *local sky*: the item, its
documented neighbours, the month rings and the Digest grains that fall in that patch of the universe, all drawn from
real scene positions (`localSky()` in `render.js`). The same drawing is used for constellations and "Its neighbourhood"
on interior pages. Small glyphs (star, lit planet, ringed body, dust) mark the type everywhere in lists.

## Motion and reduced motion

* `prefers-reduced-motion: reduce`: no ambient orbit, no travelling lights, no shimmer, no label fades; the camera jumps
  instead of flying; replay does not autoplay, the scrubber steps month by month instead. Selection, threads, cards and
  the day scrubber all still work. CSS transitions are cut to 0.01 ms.
* Pause control on every universe ("Pause motion" / "Play motion", `aria-pressed`). Anything that moves for more than five
  seconds stops with it.
* Data Saver (`navigator.connection.saveData`): starts paused, never loads WebGL.
* Low power (`hardwareConcurrency ≤ 2` or `deviceMemory ≤ 2`): Canvas 2D only, DPR capped at 1.25, animation throttled to
  24 fps. Otherwise DPR is capped at 2 (WebGL layer 1.5).
* Off-screen or hidden tab: the render loop stops (IntersectionObserver + `visibilitychange`) and resumes on return.
* QA override for reviewers: `?tier=webgl`, `?tier=canvas`, `?tier=still`.

## How content is added and updated

Exactly the production workflow; nothing in this direction needs a second entry.

* **New project.** One entry at the top of `projects` in `src/data/builds.ts` (title, status, dek, stack, shippedAt, link),
  plus a page file if it has a write-up. On the next build its theme is chosen by the rules in `THEMES`, its date sets its
  ring, the links on its page become threads, and it appears in the universe, the featured builds (if it is newest), the
  counts, the "Newest light" list, the universe index and its theme's column. Today production also needs the title in
  `CURATED` in `building-cards.ts`; Round 2 proposes an optional `hidden: true` instead.
* **New article.** One entry in `src/data/writing.ts`, the page, one image (the current workflow). It lands as a planet in
  its theme, lit from "now"; every link in the essay becomes a thread; it appears in Writing, Newest light, the index.
* **New video or short.** Nothing on the site: upload to YouTube. The build reads the channel feed (and appends to
  `source/youtube-archive.json`); a kenashe.ai link in the description becomes a thread. It appears as a ringed body and
  in the video and shorts rails, with its local thumbnail.
* **The Digest.** Nothing. The pipeline writes posts; pausing or resuming is the existing workflow edit. Status, colour,
  stillness, counts, histogram and the "hatched since last post" band all follow.

The publishing demo (`publish/`) shows each step's exact snippet, file, effort and note from `DEMO_STEPS`, then re-runs
`buildGraph`, re-renders the real homepage regions with `rerender`, marks new items with `[data-new]`, animates the births
in the universe, and lists the changes computed by `describeChanges`.

## What updates automatically

Positions of every body (theme → direction, date → ring, links → size); threads (only `graph.edges`); month rings and
their labels (from `graph.timeline`); the replay months and captions; topic sectors (from `graph.themes`); hero counts;
"Newest light" (`graph.now`); featured builds; video and shorts rails; writing list; constellations (connected components
of the edge graph); local skies; the universe index and thread list; Digest status line, badge, colour, motion, counts,
first/last dates, noindex flag, per-day histogram, busiest day, top tags and latest posts; the Results paragraph and the
"posts next to N essays" sentence on the Autonomous AI Blog page; JSON-LD Person (from `graph.person`); credentials.

## What requires manual maintenance

* Page copy that already lives in production `.astro` pages: the Autonomous AI Blog write-up, the film's director's note,
  credits and stills selection, the about bio and approach paragraphs, Lucky Domains line, footer links.
* Theme rules (`THEMES` in `lib/graph.js`) when a new kind of work appears.
* Alt text for the film stills on the film page.
* The camera presets in `render.js` (`POSTER_VIEWS`): only if the shape of the universe changes a lot (for example a
  sixth theme). They are framing, not positions.

## Technical dependencies and ongoing costs

None beyond the shared Round 2 pipeline. No frameworks, no npm packages, no CDN, no external fonts, no analytics, no
cookies, no runtime API. **WebGL is raw WebGL in `assets/gl.js` (3.2 KB, 1.6 KB gzipped), no library**: a single point-sprite
shader that gives each light a gaussian core plus an inverse-square tail, accumulates additively, and enlarges/softens
out-of-focus grains for depth of field. It is lazy-imported only when the device is capable (not reduced motion, not Save-Data,
≥ 4 cores, ≥ 4 GB) and is purely additive: if it fails to load, compile or loses its context, the Canvas 2D renderer keeps
drawing its own sprites. Hosting cost unchanged (static files).

Files: `render.js` (regions + SVG poster + local skies), `assets/scene.js` (pure scene model, label placement; shared by
Node and browser), `assets/universe.js` (Canvas 2D renderer, camera, input, accessibility layer), `assets/gl.js`,
`assets/boot.js` (graph loading, controls, `?demo=`), small page entries (`home.js`, `explore.js`, `aab.js`, `publish.js`,
`film.js`), `assets/players.js` (click-to-load YouTube), `assets/lazy.js` (deferred images). No shared-library changes
were needed.

## Performance and browser compatibility

Measured with Playwright/Chromium, homepage at 1440 × 900 after `networkidle` + 2.5 s, no scrolling:
**20 requests, 596 KB raw, about 315 KB gzipped** (GitHub Pages serves gzip). At 390 px it is the same set.

| What | Raw | Gzip |
|---|---|---|
| HTML (prerendered, both poster SVGs inline) | 193 KB | 41 KB |
| Fonts (4 woff2) | 109 KB | 109 KB |
| JS (universe, render, scene, boot, graph, publish-demo, regions, home, players, lazy) | ≈ 110 KB | ≈ 37 KB |
| `data/sources.json` | 47 KB | 11 KB |
| CSS | 30 KB | 7 KB |
| First build card image | 71 KB | 71 KB |
| `gl.js` (capable devices only, lazy) | 3 KB | 1.6 KB |

What loads when: HTML with the complete static poster and all lists first (first paint needs no JS); fonts with
`font-display: swap` (two preloaded); then the modules fetch `sources.json`, build the graph in the browser and fade the
canvas over the poster; WebGL is imported afterwards if capable. Below-the-fold images load as they approach the viewport
(`data-src` + IntersectionObserver, with a `<noscript>` copy so JS-off keeps every image). YouTube iframes only on click.

Compatibility: evergreen Chromium, Firefox, Safari (ES modules, Canvas 2D, IntersectionObserver, ResizeObserver,
`:has()` used only for a cosmetic fade). Without WebGL: Canvas 2D. Without JS or Canvas: the SVG poster with real links.
Tested headless Chromium with SwiftShader WebGL: both tiers render and animate; the sandbox reports 2 cores, so the default
path there is the throttled Canvas 2D tier (`?tier=webgl` exercises WebGL).

## Accessibility

* One `<h1>` per page, header/nav/main/footer landmarks, skip link, breadcrumb on interior pages.
* Every body is a real `<a>`: in the poster SVG with JS off, and as a layer of transparent anchors that follow their
  bodies on the canvas. Tab order is newest first. Focus flies the camera and opens the card; Enter on an already focused
  body follows the link; arrow keys move to the spatial neighbour (←/→ around, ↑ newer, ↓ older); Escape closes.
  Each anchor's label includes type, title, date and number of documented links.
* The card is an `aria-live` region; "Follow a thread" options are buttons; replay scrubber and day scrubber are native
  range inputs with `aria-valuetext`; pause is a toggle button with `aria-pressed`.
* The poster SVG has a `<title>` summarising counts; local skies have `aria-label`s; the universe index on `/universe/`
  is a complete text equivalent of the map, and every thread is listed with its evidence.
* Visible amber focus rings; text contrast ≥ 4.5:1 on the void background for body copy; labels in the universe have a dark
  stroke so they stay legible over light.
* Reduced motion, pause controls, and off-screen stopping as above. Touch: horizontal drag orbits, vertical scroll
  still scrolls the page (`touch-action: pan-y`).

## Long-term maintenance risks

* **Label legibility as the universe grows.** Placement is greedy collision avoidance with a per-viewport budget, priority by
  size, recency and type, and focus-plus-context for selection. It degrades gracefully (fewer labels), but at several
  hundred items the outer rings will need a cluster label per month/theme. The hook is `labelPriority` in `scene.js`.
* **The dense "now" region.** Newest work always piles near the centre; the perceptual radius curve (`mapR`) and a small
  deterministic separation pass handle today's density. A very prolific month may need the curve retuned (one number).
* **Prerendered HTML weight** grows with the dust (two inline posters ≈ 50 KB each raw, 10 KB each gzipped). If the Digest
  resumes for a year, switch the poster to aggregate grains per day.
* **Canvas text measurement** depends on fonts having loaded; on a cold cache the first frame uses fallback metrics and the
  next frame corrects itself.
* **Theme rules decide direction.** A mis-filed item appears in the wrong sector; fix the regex, not the item.

## Migration difficulty from the current Astro site

Moderate, mostly mechanical, about **6–9 working days** for one developer:

* `derive.mjs` + `graph.js` become `src/data/graph.ts` (shared Round 2 work, about 1 day).
* Region functions become Astro components with the same markup: `LatestBuilds`, `VideoRail`, `WritingList`, `DigestStatus`,
  `Constellations`, `ItemHead`, `Related`, `UniversePoster` (SVG generated at build time; `scene.js` is pure and runs in
  Astro as-is). About 2–3 days.
* The interactive universe is a client-side island: `universe.js`, `scene.js`, `gl.js`, `boot.js` copied as plain modules,
  loaded with a `<script type="module">` on pages that have a stage. The browser fetch of `sources.json` would become a
  small generated JSON (or an inline `<script type="application/json">`). About 1–2 days including the build hook.
* Pages: homepage, `/building/autonomous-ai-blog/` and `/building/returning-your-things/` reuse their existing content; the
  new `/universe/` route is one page. About 1–2 days.
* Reusable as-is: all CSS, fonts (Hanken Grotesk and JetBrains Mono are already production fonts), the click-to-load
  player, the deferred-image helper, the local-sky visual for image-less builds.

## Content gaps handled honestly

* 15 of 19 builds have no imagery: they get their local sky, labelled "Drawn from its place in the universe".
* No video index exists in production: "Videos" in the nav goes to the homepage video rail, and "All videos" goes to YouTube.
  `/universe/` is the only new route, labelled as proposed.
* The Autonomous AI Blog build is `LIVE` with metric "runs daily" in `builds.ts`, but the Digest is paused. The page and the
  universe card show the derived status instead ("Scheduled publishing paused" plus `statusLine`), never the stale metric.
* Digest drafts (211) have no per-day dates, so they are shown as a count, not as grains.
* Demo entries use the shared placeholder art, dashed amber rings, "(placeholder)" in their labels, a "Placeholder" tag in
  cards, and a fixed banner on `?demo=`.
* No view counts, likes or invented metrics anywhere; only `item.metric` where it exists.
* The 2016 essay and everything older than the layout span share the outer rim (graph.js clamps them); the rim ring is
  labelled with the newest month that sits there.

## Known issues

* Labels fade in and out as the universe slowly orbits; a label can disappear for a moment when another one wins its space.
  Hysteresis keeps this rare but not zero.
* The Canvas 2D tier draws the dust lane's haze with additive sprites; it is softer and slightly brighter than the WebGL tier.
* On very short desktop windows (< 640 px tall) the hero copy and the "Newest light" list can sit close together.
* The poster SVG and the first canvas frame match in framing, but labels can differ because the canvas measures real text
  widths and knows where the headline sits; the cross-fade hides it.
* `stage.__universe` and `_debug()` are exposed on the stage element as a QA hook; production would drop them.
* Headless screenshots cannot show the motion; use `?tier=webgl` on a real browser to see the full experience.
