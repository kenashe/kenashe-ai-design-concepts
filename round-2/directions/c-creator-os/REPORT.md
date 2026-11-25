# Round 2 · Direction C · The Creator OS — "The Edit"

A personal site built like a film editor’s cutting room, not a computer desktop. Ken is a builder **and** a filmmaker, so
the "operating system" here is the one a filmmaker actually lives in: a **program monitor** showing one thing at a time,
**tracks** of colour-coded tape (builds, film and video, writing), the **Digest as its own automated audio-style track** whose
waveform is its real daily output and which goes flat where publishing paused, and a single red **playhead**. Everything
around the edit (what was on the bench, on screen, on paper, the contact sheet of photographs, what he has been into lately)
re-tunes to wherever the playhead sits.

Pages (all under `round-2/directions/c-creator-os/`):

| Page | Path | Notes |
|---|---|---|
| Homepage | `index.html` | The suite (portrait, monitor, edit), Tuned to, Screening room, Receipts and machines, About |
| Building index | `building/index.html` | Production URL `/building/`. Faceted discovery, the edit, the edit decision list |
| AI agent economy | `building/ai-agent-economy/index.html` | Production URL. `r2:item = building:ai-agent-economy`. The 36-second replay, receipts |
| Video index | `videos/index.html` | **Proposed new route** `/videos/` (production has no video index today) |
| Publishing demo | `publish/index.html` | Prototype-only route |
| Homepage with entries | `index.html?demo=build,essay,video` | Any subset of `build,essay,video` works |

## What makes it distinctive

* **A metaphor that belongs to Ken.** A builder-filmmaker’s year shown as an edit: clips on tracks, a program monitor, a
  playhead, timecode (`2026·11·25`), clapperboard stripes on the slate. It reads as a creative environment, not a dashboard:
  there are no KPI tiles, cards grids or admin chrome. The only "numbers" are dates, the Digest’s real counts and metrics that
  exist on build entries.
* **Light desk, black screen.** Bone paper with an ink-black monitor set into it is the opposite of the generic dark SaaS hero,
  and the screen becomes the natural focal point. Colour appears only as tape: one ink per theme, plus one red playhead.
* **Time and precision are honest and visible.** Month-precision builds are drawn as tape spanning their whole month; day-precision
  videos and essays are thin clips on their day; shorts are slimmer pills. The 2016 coat-of-arms essay sits in an "earlier" bin
  behind a dashed splice instead of squashing the present into a sliver (detected automatically from the largest gap in the record).
* **The Digest is visibly a machine.** It lives on its own hatched track labelled AUTOMATED, drawn as a grey waveform of
  real posts per day (from `digest.perDay`), with a dashed flat line and a "Paused · Nov 24, 2026" marker after the last post.
  Everywhere else (nav, Tuned to, the Digest desk) it is labelled automated and separated from Ken’s work.
* **Image-less builds get a voice-print.** 15 of 19 builds have no image, so each gets a generated **plate**: a waveform whose
  bars are computed from its title, stack and month, in its theme ink, with status, timecode, title and stack set over it.
  Every plate is unique, stable across builds, and obviously not a fake screenshot.
* **Receipts that print themselves.** A thermal receipt tape, "printed from builds.ts", lists every build that has a metric,
  then totals (builds, LIVE, SHIPPED, with a write-up, documented links). The ZeroHuman panel reads the live status endpoint.
* **Personal and alive.** Ken’s current headshot is the first image you see, beside his name; the monitor opens on his newest
  video; the contact sheet shows his own photographs (the Guinness label and pint, the iPhone screens, the burr puzzle, the
  film stills) for whatever month you tune to.

## Signature interaction(s)

**1. The Playhead (homepage; also live on the publishing demo).** One cursor over Ken’s entire record.

* **Drag** anywhere on the tracks (mouse or pen) to scrub; the date under the pointer shows in the playhead tag and the nearest
  clip is cued live. On touch, **tap** anywhere on a track to jump; horizontal swipes scroll the edit.
* **Step** with `←` `→` or `J` `L` (editor muscle memory), `K` pauses, `↑` `↓` hop to the nearest clip on the track above or below,
  `Home`/`End` jump to the first and newest clip. Clips use a roving tabindex, so Tab lands on the cued clip.
* **Play the year** (button or `Space`) walks the playhead through every clip, oldest to newest, at 2.4 s per clip. It pauses when
  the tab is hidden, when the suite scrolls out of view, or on any manual input.
* **Solo a theme** (Film & video, Onchain, Web & search, Agents & automation, Life & curiosity): other clips fade and stepping
  and playback stay within the theme.
* **Click once** on a clip to cue it; **click it again** (or press Enter) to open its page. Threads in the monitor and the
  "Around this moment" bin cue related clips, so you can follow documented relationships without leaving the suite.
* **Everything re-tunes:** the program monitor (video plays in place, click-to-load), the slate (type, theme, timecode), the
  "Around this moment" bin, the ruler’s active month, and the whole **Tuned to** section: builds on the bench, uploads on
  screen, essays on paper, the contact sheet of photographs and frames, the **Lately** theme bars and "in hand" stack for the
  trailing three months, the Digest’s automated volume for that month, and month-by-month navigation (including empty months,
  which say so).
* The state is linkable: `#cue=building:zerohuman` reopens the homepage on that clip (the agent-economy page links in this way).
* **It grows by itself.** Clips, lanes, months, the earlier bin, theme chips, counts and the Digest waveform are computed from the
  graph. A new build, essay or upload becomes a new clip in the right month, on the right track, in its theme ink, linked by its threads.

**2. The 36-second sale (`/building/ai-agent-economy/`).** A second playhead over the experiment’s only two timestamped events:
payment (block 26385257, 14:58:11 UTC) and delivery (block 26385260, 14:58:47 UTC). A native range input (keyboard and screen
reader friendly) scrubs the 36 seconds; "Replay in real time" runs them at one second per second. Steps before, between and after
are shown as **untimed** segments ("exact timing not recorded") instead of invented timestamps. The active step highlights the
matching evidence: the ENS record JSON, the order receipt and input data, or the delivery receipt with the toaster eulogy.

**3. Command palette.** `⌘K`/`Ctrl K` (or `/` on pages without a search field) searches every build, video, short, essay, the Digest
(labelled automated), pages and actions (Play the year, Solo a theme). On the homepage Enter **cues the clip on the timeline**;
`⌘/Ctrl Enter` opens the page. ARIA combobox/listbox with arrow keys.

## Design system

**Type** (self-hosted woff2, latin subset, 4 files ≈ 137 KB in total, italic loaded only where used):
* *Big Shoulders Display* 500–900 (variable): slate titles, the name, section heads, monitor titles. Condensed and industrial,
  like clapperboard lettering and end credits. The second word of a heading is often set as outline type (`ASHE`, `2026`).
* *Schibsted Grotesk* 400–700 + italic: reading text, UI labels.
* *DM Mono* 400/500: timecode, track codes (B1, V1, W1, A1), receipts, metadata.

**Palette**

| Role | Hex |
|---|---|
| Bone (desk background) | `#ECE8DF` |
| Paper (controls, receipts) | `#F7F4EE` / `#FBFAF6` |
| Ink | `#15130F` (secondary `#3F3B34`, muted `#5C574E`) |
| Monitor black | `#100F0D` (chalk text `#F1ECE2`, muted `#ADA597`) |
| Playhead red (line, marks) | `#FF3B1F` |
| Red for text and buttons | `#D0260B` (white text 5.2:1) / `#C42209` on bone |
| Theme tape: Film & video | `#F26B38` |
| Theme tape: Onchain | `#3A5BF0` |
| Theme tape: Web & search | `#E8B10A` |
| Theme tape: Agents & automation | `#19A974` |
| Theme tape: Life & curiosity | `#D45D9A` |
| Automated (Digest) grey | `#8E887C`, always with hatching and an AUTOMATED tag |
| LIVE green (text) | `#08694A` |

**Layout.** 1440 px max, fluid gutters (18–44 px). Desktop homepage: intro column (name, portrait, tagline, newest builds and
uploads) beside a fixed-height monitor, the full-width edit beneath, so the signature is visible in the first screen. Sections
are separated by heavy ink rules and hairlines, never boxed cards. The one dark band is the Screening room. Receipts are paper
with serrated edges; automated systems use dashed borders and hatching.

**Navigation.** Sticky top bar: Building, Videos, Writing ↗, About, Digest (with live derived status: AUTOMATED · Paused) and
the search button. Under 900 px a native `<details>` menu (works without JS). Built pages stay inside the prototype; every other
production path opens the real kenashe.ai page via `hrefFor()`. Builds without a write-up link to their entry in `/building/#slug`.

## Motion and reduced motion

* Motion is purposeful only: the playhead glides between clips (0.45 s), clips lift on hover, thumbnails scale slightly, the
  receipt for the active replay step lifts, a slow blink on the Live pill. No parallax, no particles, no autoplay.
* Nothing moves on its own except when the visitor presses **Play the year** (stops at the end, pause button, pauses when hidden
  or off-screen) or **Replay in real time** (36 s, pause button). Both remain available under reduced motion because they are
  explicit, essential-to-the-feature state changes; with `prefers-reduced-motion: reduce` every transition and animation is
  cut to instant (and smooth scrolling becomes a jump).
* Video never autoplays; YouTube loads only after a click, from `youtube-nocookie.com`, with the local thumbnail as poster.

## How content is added and updated

The prototype renders the shared graph (`round-2/lib/graph.js`) through `render.js`. Production would do the same at Astro build time.

* **New project.** Add one entry to `src/data/builds.ts` (and a page if it gets a write-up), exactly as today. On the next build it
  appears: as a tape clip in its month on the Builds track, in the homepage newest builds (if newest), in "Tuned to" for its month,
  on the receipt tape if it has a `metric`, in the `/building/` list (numbered, with facets updated: theme, status, every stack term),
  in the palette, and with a generated plate if it has no image. Links written in its page become threads.
* **New article.** One entry in `src/data/writing.ts`, the page, one image (the current workflow). It appears on the Writing track,
  in "Tuned to · On paper", in the contact sheet (its hero image), in the index and palette; links in the page become threads.
  Optional: extra in-essay photographs for the contact sheet go in `photos.js` today (see manual maintenance).
* **New video or short.** Upload to YouTube. Nothing else. The feed adds it to the Film & video track, the monitor (if newest), the
  reel, `/videos/`, "Tuned to · On screen" and the palette; a kenashe.ai link in the description creates the thread ("Appears in …").
* **The Digest.** Nothing. Pausing or resuming the workflow changes `graph.digest.status`; the track marker, nav label, monitor,
  Tuned-to line and Digest desk all switch between "Paused" (dashed flat line) and "Publishing" automatically.
* Try it: `publish/` applies the three example entries with `DEMO_STEPS`/`applyDemo`, redraws this direction’s real regions
  (monitor, edit, tuned, index top, reel) with `rerender`, marks them `[data-new]` and prints `describeChanges`. The homepage
  accepts `?demo=build,essay,video`. Example entries always show placeholder art and badges.

## What updates automatically

Every repeating thing: the edit (clips, lanes, months, the earlier bin, track counts, theme chips), the playhead order, the monitor
default (newest item), "Around this moment", Tuned to (all five columns, Lately bars and stack, month navigation, empty states,
Digest volume per month), newest builds and uploads, the reel and its numbering, the video index by month with "Appears in",
the receipt tape and totals, the Digest desk (status, statusLine, published, drafts, first/last, noindex, latest posts, and Ken’s
explainer video found through the documented `relatedBuild` → video edge), the `/building/` facets, counts and numbered list,
item-page metadata, threads and timeline position, the stats line, credentials (CPA and PMP on the homepage from `graph.credentials`),
the JSON-LD Person from `graph.person`, and the "graph read from production …" footer line.

## What requires manual maintenance

* **Page copy** kept in pages today: the about bio, "what I bring", the film feature (logline, director’s note, from `pages.json`
  `films`), the agent-economy write-up (verbatim from `page-text/`), the ZeroHuman panel’s explanatory text and its dated snapshot.
* **`photos.js`** (local helper): in-essay photographs and the list of video ids that have extracted frames. Production should
  derive both at build time (scan essay `<img>` tags and the frames folder in `derive.mjs`); until then, a new essay’s extra photos
  need one line here. Nothing breaks if it is not updated: the contact sheet just shows the hero image.
* **Thumbnails** (`thumbs/`, made by `_tools/thumbs.py`): 480 px WebP copies of the shared images, standing in for Astro’s image
  pipeline, which produces them automatically in production. A missing thumbnail falls back to the original via `onerror`.
* **Theme rules** (`THEMES` in graph.js) decide tape colours, solo groups, Lately bars and facets. Mis-filings are fixed by editing a rule.
* The ZeroHuman snapshot values shown when the live request fails (healthy, public, block 26,492,255, last tick Nov 25, 2026 12:40 UTC,
  2 orders) come from the Round 1 dated snapshot and should be refreshed occasionally.

## Technical dependencies and ongoing costs

* No frameworks, no CDNs, no npm packages, no analytics, no cookies, no forms. Static HTML, one CSS file, vanilla ES modules.
* Self-hosted fonts (SIL OFL). The thumbnail script uses Python Pillow on the author’s machine only (not at runtime).
* Optional runtime requests, once per view, labelled honestly: ZeroHuman `/api/status` (marked "Live · read HH:MM UTC" only on success,
  otherwise "Snapshot · Nov 25, 2026") and the GitHub commits API for `kenashe/kenashe` (footer shows "Live · latest production commit …"
  on success, otherwise the graph’s own snapshot line). YouTube only after a click.
* Hosting cost: unchanged (Vercel Hobby static build in production; GitHub Pages for the prototype). Nothing is billed per request.

## Performance and browser compatibility

Measured with Playwright + Chrome DevTools protocol, page load to network idle without interaction (lazy images the browser chose to
fetch included; click-to-load video excluded):

| Viewport | Requests | Raw bytes | Gzip-equivalent (as served by GitHub Pages / Vercel) |
|---|---|---|---|
| 1440 × 900 | 42 | 828 KB | **≈ 592 KB** |
| 390 × 844 | 34 | 717 KB | **≈ 480 KB** |

What loads when: HTML with every region prerendered (≈ 100 KB raw / ≈ 20 KB gzip), one CSS file (76 KB / ≈ 15 KB), 3 fonts, the
headshot (40 KB) and the newest video thumbnail (35 KB) for the first screen. Then, deferred as an ES module, the interactive layer:
`render.js` (the same region functions as the prerender), `graph.js`, `sources.json` (47 KB / ≈ 9 KB), `edit.js`, `site.js`. Below-fold
images are `loading="lazy"` 480 px thumbnails (10–21 KB each). The palette builds its index from the already-loaded graph.

Homepage length: **5,419 px at 1440** (≈ 6.0 viewports of 900) and **8,343 px at 390** (≈ 9.9 viewports of 844).

Compatibility: current Chrome/Edge, Safari 16.4+ and Firefox 113+ (uses `color-mix()`, container query units for plate type with
`max()` pixel fallbacks, CSS masks and `<dialog>`). Older browsers get the prerendered content with simpler
styling; nothing depends on JS to be readable.

## Accessibility

* One `<h1>` per page, `header`/`nav`/`main`/`footer` landmarks, skip link, labelled regions and groups (each track is a labelled group
  with its clip count; the Digest track’s label includes its status line).
* Every clip is a real `<a>` with a full accessible name (type, title, date, theme). Roving tabindex in the edit; arrow keys, J/K/L,
  Home/End, Space; an `aria-live` readout announces "On the monitor: …" after each cue. All controls are `<button>`s with names; theme
  solo buttons use `aria-pressed`.
* The replay uses a native range input with `aria-valuetext` and step buttons. The palette is a modal `<dialog>` with combobox/listbox.
* Visible focus everywhere (3 px red outline). Contrast checked: body text ≥ 9:1, muted text 5.9:1, white on the red button 5.2:1, tape
  labels 5.3–6.3:1. The automated grey is used only for non-text marks, always with a text label.
* Reduced motion respected (see above). Video, play-the-year and replay have pause controls. Works fully with JS disabled: the edit is
  a set of links positioned by CSS, the monitor shows the newest item, filters and transport are hidden rather than broken.

## Long-term maintenance risks

* **Scale of the edit.** At ~45 clips a year the timeline is comfortable. Several years of uploads will crowd the Film & video track;
  the range already compresses gaps into the earlier bin, and the next step would be a year switcher on the ruler (data-derived).
* **Theme regexes** drive colour and filters; new kinds of work may land in Life & curiosity until a rule is added (the demo’s
  example essay and video land there, which is visible and honest).
* `photos.js` and `thumbs/` drift if not regenerated; both fail soft.
* Two optional third-party endpoints may change shape; both degrade to dated snapshots.

## Migration difficulty from the current Astro site

Moderate and incremental, with most work reusable as-is:

| Piece | Astro equivalent | Effort |
|---|---|---|
| `graph.js` + `derive.mjs` (shared) | `src/data/graph.ts`, evaluated at build | shared across directions |
| `render.js` region functions | `EditTimeline.astro`, `ProgramMonitor.astro`, `Tuned.astro`, `Reel.astro`, `ReceiptTape.astro`, `DigestDesk.astro`, `BuildIndex.astro`, `Plate.astro` (string templates port almost line for line) | 2–3 days |
| `edit.js` (≈ 12 KB), `site.js` palette/video/live (≈ 11 KB), `building.js`, `economy.js` | `<script>` islands, unchanged | 1 day |
| Pages | `index.astro`, `building/index.astro`, `building/ai-agent-economy.astro` (existing copy kept), new `videos/index.astro` | 1–2 days |
| Thumbnails | `astro:assets` `<Image>` with widths | hours |
| QA, content review | | 1 day |

Roughly **5–7 developer days**. Existing data files, page copy, the Digest pipeline, related.json and URLs stay as they are. The only
production data change proposed is the shared one (`hidden: true` instead of the `CURATED` list), plus optionally recording essay
photographs and video frames in `derive.mjs`.

## Content gaps handled honestly

* **Empty months** (Jan, Mar, Apr, Jul 2026) are shown on the edit as empty and Tuned to says "No builds dated Mar 2026" etc.
* **Image-less builds** use generated plates, never fake screenshots; card-only builds say "Card only, no write-up yet" and link to their index entry.
* **ZeroHuman**: "Outside buyers 0" with the footnote that both paid orders came from Ken’s own allowlisted test buyer as of Nov 20, 2026.
* **The Digest** is never written about as Ken’s writing; its status and every count are derived; the explainer video is linked
  plainly ("Ken on what happened") through the documented edge.
* **Agent economy timing**: only the two block timestamps are shown as times; everything else is labelled "time not recorded".
  Only one purchase is shown. The Lucky Domains research link appears once, under further reading, with no product framing.
* **No metrics invented**: receipts list only build `metric` fields; no views, likes or subscribers anywhere. Videos show no duration
  except the film’s documented 1:54 runtime.
* **Returning Your Things** is presented as a film first (logline, runtime, director’s note), with credits on the film’s page.
* **Videos page** is labelled a proposed route; demo entries are always placeholders.

## Known issues

* The thumbnail `onerror` fallback is an inline attribute; a strict CSP would need it moved into `site.js`.
* "Play the year" restarts from the first clip of the main range (Dec 2025) when started at the newest clip; the 2016 essay in the earlier bin is reached by stepping or Home.
* Touch devices tap to jump rather than drag-scrub (dragging scrolls the edit, which is the expected mobile behaviour).
* The publishing demo’s "Tuned to" and monitor follow the newest item; ties on the same date are ordered by the graph’s `now` sort
  (the example essay leads), which matches `describeChanges`.
* Live readings depend on two public endpoints; in restricted networks the page shows the dated snapshot (by design).
* `/videos/` is a proposed route and has no production counterpart yet.
