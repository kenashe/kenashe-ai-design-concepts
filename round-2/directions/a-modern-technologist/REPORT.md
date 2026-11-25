# Round 2 · Direction A · The Modern Technologist

Ken's brief: keep Concept 06's personality-first approach and Concept 02's technical precision, drop the scrapbook, and make him the recognisable person behind a premium, technologically forward site that shows how much he builds.

Pages built (all under `round-2/directions/a-modern-technologist/`):

| Path | Production URL | Notes |
|---|---|---|
| `index.html` | `/` | Homepage. `?demo=build,essay,video` applies the publishing-demo entries |
| `about/index.html` | `/about/` | Bio, background, breadth matrix, credentials, speaking, press, Lucky Domains, sponsorship |
| `building/zerohuman/index.html` | `/building/zerohuman/` | Flagship build with receipts, live status and a block-by-block order replay |
| `building/returning-your-things/index.html` | `/building/returning-your-things/` | The short film, presented as a film first |
| `publish/index.html` | none (prototype only) | Publishing demo |

## What makes it distinctive

* **The person is the fixed point.** You see Ken's face, his name set very large and his tagline within the first second. His portrait is not a hero image next to the content. It is the centre that all the content is arranged around.
* **Breadth reads as geometry, not as a list.** Before reading a word, you can see five themes, roughly 44 dated things, the documented links between them, and a large hatched disc for the automated Digest. Squares are builds, circles are essays, triangles are videos, tall rectangles are shorts.
* **Warmth comes from the person, not from props.** There are no paper textures, polaroids or handwriting. Warmth comes from his photos, his first-person voice (set in Instrument Serif Italic wherever Ken speaks: the tagline's "actually happened", the director's note, "How I work") and one warm signal colour on a cool graphite base.
* **Human work and machine output look different by rule.** Ken's work uses Signal orange and Bone. The automated Digest is always Steel grey, hatched and set in mono, with an "Automated" tag and a status read from the workflow file. The two never share a visual style.
* **Every image-less build gets its own instrument mark.** The mark is generated from the build's data, in the same geometry as the orbit (see below), so 15 builds without screenshots still look deliberate and recognisable.
* **"Receipts" layer, carried over from Concept 06.** A header toggle shows the technical view on top of the human story: each card shows the production file it came from, the theme rule that filed it (with the word that matched), how many documented links it has, and its orbit angle. The orbit's relationship threads also get brighter. It shows how the site is made, which suits a site meant to show what building with AI looks like.

## Signature interaction(s)

**1. The Orbit (homepage hero).** It is server-rendered SVG with a real `<img>` portrait at the centre.
* **Angle = theme.** It uses `item.layout.angle` from graph.js, so the five sectors come from `THEMES`. Sector labels show live counts.
* **Distance from Ken = age.** Rings are calendar months on a square-root scale, so recent months get more room. The window is computed from the data (6 to 24 months), and anything older sits on an "Earlier" ring. That is how the 2016 coat-of-arms essay is placed honestly.
* **Threads = documented relationships** (`graph.edges`), drawn as curves bowed through the centre, because every link runs through one of Ken's pages.
* **Hover, focus or tap a mark.** The mark, its neighbours and their threads light up and everything else dims. The readout beside the orbit shows the item's thumbnail (or generated mark), type, date, theme and "Linked to …". On touch, the first tap explains and the second tap opens. Video marks play in the in-page player.
* **Sector focus.** Click a theme label to isolate that theme.
* **Rewind (month scrubber + Play).** Pick any month and the orbit is rebuilt as it looked then. Items not yet made disappear, every mark drifts outward as it ages, the rings move, and the counts update ("Jun 2026 · 8 builds · 1 essay · 0 videos · 96 automated posts"). The Digest disc is sized by its real cumulative post count, so you can watch the machine's output dwarf the handmade work and then stop growing after the pause. "Play the year" steps through every month (about 13 s, pausable, stops when off-screen or the tab is hidden).
* **Intro, under 2 s.** On first view each mark leaves Ken's edge and travels out to its age, which teaches "distance is time" without a legend. It is skipped for reduced motion and on low-power devices.
* **It grows automatically.** A new build, essay or video appears near Ken in its theme's sector, and pushes last month's work one ring out. A new link in a page adds a thread. Nobody positions anything.

**2. Generative build marks.** `glyph(item)` in render.js. The marks are consistent across every build: the bright arc is the build's theme sector (the same angle it occupies in the orbit). Each stack technology is a tick at a fixed angle hashed from its name, so "Ethereum" is always in the same place and you learn to read stacks at a glance. A clock hand points to the ship month. The core is solid for LIVE and hollow for SHIPPED. There is one dot per documented relationship. On the ZeroHuman page the mark is shown large with its stack ticks labelled, which proves it is data rather than decoration.

**3. ZeroHuman order replay.** The first paid Decision is replayed step by step: Discover, Pay (block 26427993), five blocks of waiting drawn at Ethereum's 12-second slot spacing, the target block 26427998, the hash and seed, then "index 1 of 3", Deliver, and Verify. The motion explains why the wait makes the choice checkable. You can step back and forward. With JavaScript off, everything is visible as a static ordered list.

**4. About: breadth matrix.** Theme × type, one dot per item, each dot a link, all from the graph.

## Design system

**Type.**
* Mona Sans (variable: weight 200–900, width 75–125%). Display uses wide widths (112–118%) at weights 620–680 with tight tracking (−0.045em). Running text is 100% width at weight 400.
* JetBrains Mono for labels, data, receipts and the whole Digest band.
* Instrument Serif Italic only for Ken's own voice.
* All three are self-hosted latin woff2: 32 + 31 + 22 KB.

**Palette.**

| Name | Hex | Role |
|---|---|---|
| Ink | `#0c0d0f` | Background |
| Carbon | `#131518` | Surfaces |
| Graphite | `#1a1d21` | Raised surfaces, media fallback |
| Line | `#262a30` | Hairlines |
| Line 2 | `#363b43` | Control borders |
| Bone | `#f2eee6` | Text, essays, videos |
| Bone 2 | `#cdc8be` | Secondary text |
| Mist | `#9ba0a7` | Muted text (about 7:1 on Ink) |
| Steel | `#858b93` | Reserved for the automated Digest and scales |
| Signal | `#ff6a2b` | Ken's builds, LIVE, focus, the one accent |
| Paper | `#eeeae2` | The single light "How I work" band and the Lucky Domains card |

**Layout.**
* 1400 px maximum width, fluid gutters (20–64 px), and a 5 : 6.4 asymmetric grid shared by the hero and every section header.
* Section headers are large wide-set words ("Watch", "Builds", "Writing") above a hairline, with a one-line description pulled from the data.
* Interior pages use a sticky numbered table of contents (ZeroHuman) or editorial two-column grids (About).

**Navigation.**
* Mono wordmark `{ ken ashe }` from production's logo text.
* Five plain links: Builds, Watch, Writing, Digest, About.
* The Receipts toggle.
* On mobile the links become a scrollable row with no menu button.
* Videos open in an in-page `<dialog>` player from anywhere: the orbit, rails, cards, the readout and the Digest band.

## Motion and reduced motion

Motion appears only where it explains something:
* The orbit intro shows that distance is time.
* The rewind tween shows time and growth, including the Digest's scale and its stop.
* Thread highlighting shows relationships.
* The replay shows block time.
* Small hover zooms on media.

Nothing loops or autoplays beyond the intro, which takes under 2 s. Play-the-year and the replay are started by the user, have Pause/Stop controls, and stop when off-screen or when the tab is hidden.

With `prefers-reduced-motion: reduce`:
* There is no intro.
* Rewinds jump instead of tweening.
* The replay changes state step by step without block-by-block animation.
* CSS transitions are reduced to almost zero.
* Smooth scrolling is off.

Every state change still works. `hardwareConcurrency ≤ 2`, `deviceMemory ≤ 2` or `saveData` also disable the tweens. There is no canvas or WebGL, so DPR capping does not apply.

## How content is added and updated

* **New project.** One entry at the top of `src/data/builds.ts`, plus a page file if it gets a write-up. This is the same as `DEMO_STEPS[0]`. It appears automatically in:
  * the orbit (Agents & automation sector, nearest Ken);
  * the "Builds" featured three, if it is first in order;
  * the "All N builds" index, with a generated mark;
  * the counts in the orbit, section headers and footer;
  * the About matrix;
  * related lists on any page that links to it.
* **New article.** One entry in `src/data/writing.ts`, the page itself and one image, which is the current workflow. It appears in the readout and "Just shipped" if it is newest, in the Writing list (newest becomes the lead), in the orbit, and as a thread to anything its page links to.
* **New video.** Nothing to edit: upload to YouTube. The feed adds it to the Watch rail (newest first, "Newest" badge), the orbit, "Just shipped" and the player. A kenashe.ai link in its description draws a thread to that page.
* **Try it.** `publish/` applies all three with the real region functions and shows the computed change list. `index.html?demo=build,essay,video` shows the whole homepage with the placeholders, which are dashed and labelled "Demo entry".

## What updates automatically

Everything that repeats, all through `render.js` regions:
* orbit geometry, sectors, sector counts, month rings and the scrubber months;
* readout data, "Just shipped" (`graph.now`), the video rail and its counts;
* featured builds (`featuredBuilds`), the builds index and generated marks;
* the Writing list;
* the Digest band: status word, `statusLine`, per-day histogram from real pubDates, the "last post" marker, published/drafts/typical day/noindex, the latest automated posts, and the video in which Ken explains what happened, found through `digest.relatedBuild` → related videos;
* homepage credentials (CPA and PMP filtered from `graph.credentials`), full credentials on About, and `knowsAbout`;
* the breadth matrix and its totals;
* the ZeroHuman header, mark and related list, and the film page's related list;
* the footer colophon;
* the JSON-LD Person.

If `digest.status` becomes `'publishing'`, the tag reads "Publishing" in Signal, the "last post" marker and the gap disappear, and the orbit's Digest disc stays at "now".

## What requires manual maintenance

* Page copy that production keeps in `.astro` pages: the About bio and background, press, speaking, Lucky Domains, sponsorship, the film's logline, director's note and credits, and the ZeroHuman write-up. All of it is verbatim from `pages.json` / `page-text`.
* The ZeroHuman status **snapshot** values in the HTML, used when the live fetch fails. They are labelled "Snapshot · Nov 25, 2026" and should be refreshed occasionally, or dropped in production in favour of a build-time fetch.
* Theme rules in `lib/graph.js` (shared). One local heuristic: the Watch rail skips the film's own video, because the film has its own band. It finds the film as the build whose `metric` mentions "runtime". A production version could use an explicit flag.
* The homepage film band (a still and the YouTube id) is page copy from `pages.json films`.

## Technical dependencies and ongoing costs

None. The site is static HTML, CSS and vanilla ES modules, with no libraries, frameworks, CDNs, analytics or cookies. Fonts are self-hosted under the OFL. Runtime external requests:
* the optional ZeroHuman status endpoint (ZeroHuman page only, once per view, 6 s timeout; it says "Live" only on success);
* `youtube-nocookie.com`, only after the visitor presses play.

Nothing is billed.

## Performance and browser compatibility

Homepage weight was measured with headless Chromium at 1440×900 and 390×844, before any interaction:
* **16 requests**, **664 KB raw**, about **421 KB** with text gzipped as GitHub Pages and Vercel serve it.
* The HTML is 176 KB raw / 29 KB gzipped, because it carries the prerendered orbit SVG, 19 inline marks and the readout JSON.
* The CSS is 13 KB gzipped, `site.js` + `render.js` + `graph.js` + `publish-demo.js` are about 24 KB gzipped, and the fonts are 84 KB.
* The rest is the portrait (29 KB) and the thumbnails above the fold.

What loads when:
* Below-the-fold build, essay and Digest images use `data-src` with an IntersectionObserver (600 px margin) and a `<noscript>` copy.
* Rail cards use `content-visibility:auto`, so off-screen thumbnails are not fetched.
* `sources.json` (48 KB) is fetched only for `?demo=` and on the publish page.
* Shared assets are full 1280 px webp. Production's Astro `<Image>` would generate 200–400 px thumbnails and cut the remaining image weight by about 70%.

Browser compatibility:
* Requires ES modules, CSS `aspect-ratio`, variable fonts, `<dialog>` and IntersectionObserver. That means Safari 15.4+, Chrome/Edge 98+ and Firefox 98+.
* Without `<dialog>`, videos simply open on YouTube. Without IntersectionObserver, deferred images load immediately.
* With JavaScript off, every page is complete. The orbit is fully prerendered with every mark as a working SVG link. Only the scrubber is hidden, and the demo note appears on `publish/`.

## Accessibility

* One `<h1>` per page, with landmarks, a skip link, and an extra "Skip the orbit" link that appears on focus before the orbit's 44 links.
* Every mark is a focusable SVG `<a>` with a full `aria-label` (type, date, title, theme, link count). Focus moves the readout just as hover does.
* Sector labels act as toggle buttons (`role="button"`, `aria-pressed`). Month chips, play, rail, receipts and replay controls are real `<button>` elements with pressed states.
* The orbit has `<title>` and a long `<desc>` that explains the encoding.
* Visible 2 px Signal focus rings, and a white focus halo on marks.
* Contrast: body Bone on Ink is about 16:1, Mist about 7:1, Signal on Ink about 6.8:1, Steel at least 4.9:1 on every surface, and dark text on Signal buttons about 7:1.
* Alt text on every photo. Decorative thumbnails in rails have empty alt because the title is adjacent.
* Reduced motion is respected (see above). Nothing moves for more than 5 s without a control.

## Long-term maintenance risks

* **Orbit density.** Most items currently fall in the last three months. The square-root ring scale and the computed window (capped at 24 months, then "Earlier") keep it legible for years. Past roughly 150 dated items, small marks will crowd and the intro and tween should switch to fading the oldest rings (a small change in `orbitModel`).
* **Theme drift.** One misfiled item shows up as a mark in the wrong sector. The fix is the shared regex, which the Receipts layer makes visible ("rule matched …").
* **Homepage HTML size** grows linearly with items, about 1.5 KB gzipped per item for the readout JSON and SVG. That is fine for years. Otherwise move the readout JSON to a static file.
* **Live status snapshot** values go stale (see manual maintenance).

## Migration difficulty from the current Astro site

**Moderate. About 4–6 focused days.**

* `render.js` regions map one-to-one to Astro components (`<Orbit>`, `<Readout>`, `<Latest>`, `<VideoRail>`, `<Builds>`, `<Writing>`, `<DigestBand>`, `<Breadth>`, `<Related>`). They are pure string functions over the graph, so each becomes a `.astro` component with the same markup, taking about a day in total.
* `graph.ts` (from `derive.mjs` + `graph.js`) is the shared Round 2 work, needed by every direction.
* `site.js` / `zerohuman.js` are framework-free and can be imported as-is in a `<script>`.
* The CSS is one file. It moves to a global stylesheet with no build tooling.
* The page copy for About, the film and ZeroHuman stays where it lives today, re-skinned.
* **Reusable without changes:** the fonts, all assets, the content files and the Digest pipeline.
* **New work:** responsive image sizes via `astro:assets` for thumbnails, and an optional build-time ZeroHuman status read.

## Content gaps handled honestly

* **15 of 19 builds have no image.** Each gets a generated mark from its data, never a fake screenshot.
* **Builds without a page** (`href` null, e.g. "Media pitch triage") link to the live `/building/` index rather than a made-up URL.
* **ZeroHuman has no video.** The page says "No video for this build." The limitations list ends with the guardrail fact: no outside agent had bought as of Nov 20, 2026, and both paid orders came from Ken's own test buyer. "Orders fulfilled" in the live panel carries a note that it includes Ken's test orders.
* **The Digest** is labelled automated everywhere. Its pause is shown as data: the histogram ends, a dashed marker reads "Last post Nov 24, 2026", the stats show "noindex", and Ken's Nov 25 video is linked plainly under "What happened, in my words".
* **The 2016 coat-of-arms essay** is shown on an "Earlier" ring instead of being stretched onto the timeline.
* **Press items have no URLs** in the data, so they are listed without links. Forbes appears only as "Forbes Business Council · Member (2026–Present)".
* **Credentials** have no "verify" links. CPA and PMP only on the homepage, the full list on About. The technical background is worded exactly as provided.
* **Demo entries** always use the shared placeholder SVGs, dashed outlines and a "Demo entry" tag.

## Known issues

* Pressing Escape while focus is inside a playing cross-origin YouTube iframe may not reach the dialog. The visible Close button, or clicking the backdrop, always works.
* Month labels on the orbit's spine hide when rings are closer than 13 units (older months, square-root scale), so some months are labelled only on the scrubber below.
* The ZeroHuman order replay draws the five waiting blocks at Ethereum's nominal 12-second slots. It is labelled as such: these are not measured timestamps, and the delivery block is not stated on the page, so it is not shown.
* The thumbnail weight below the fold depends on the shared 1280 px images (see Performance).
* Local helpers only. No shared-library changes were needed: `render.js` re-implements the orbit placement from `item.layout` and imports `DEMO_STEPS` for the steps region.
