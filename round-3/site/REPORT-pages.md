# Round 3 · The Living Universe · Interior pages report

Scope: four build pages, one essay page, About and the publishing demonstration, built on the lead's design system and
page shell. Nothing of the lead's or the discovery specialist's was edited. Shared files touched: `site/meta.json`
(eight entries appended, the others kept) and `site/STYLEGUIDE.md` ("Page components" appended at the end).

## What was built

| Path (under `round-3/site/`) | What it is |
|---|---|
| `building/zerohuman/index.html` | The flagship build. Receipts first, the honest limit set large, optional live status |
| `building/returning-your-things/index.html` | The film, as a film: title, logline, the film large and click-to-load, director's note, stills, making-of, credits |
| `building/autonomous-ai-blog/index.html` | The system behind the Digest: derived state, the Nov 25, 2026 update, Ken's video, the write-up, real weekly volume |
| `building/ai-agent-economy/index.html` | The two-agent experiment: both transactions with block-level facts, timeline, video, how it worked |
| `writing/4-tips-for-making-ai-videos-that-feel-like-films/index.html` | A representative essay page: long-form reading, authorship label, video, its own images |
| `about/index.html` | Who Ken is: three real photographs, bio, how he works, background, what he brings, credentials, speaking, press, Lucky Domains, sponsorship, follow |
| `publish/index.html` | The publishing demonstration (prototype-only route) |
| `regions/pages.js`, `regions/pages/{item,builds,about,publish,sky}.js` | Region functions (the stub is now the registry of these five files) |
| `assets/pages.css` | Styles for all of the above (lead's tokens only), 8.5 KB gzipped |
| `assets/pages.js`, `assets/publish.js` | Page entries: boot, search overlay, ZeroHuman live status; the demo's interactivity |
| `tools/check-pages-copy.mjs` | Fails if page copy drifts from `data/page-text/*` or `data/pages.json`, if a transaction hash is typed outside a region, or if the recorded sync run differs from its evidence file |

Build: `node round-3/tools/prerender.mjs site`. Check: `node round-3/site/tools/check-pages-copy.mjs`.

## Design decisions

1. **Every build page opens the way the homepage does.** Title, dek, theme and stack on the left; on the right, a small
   real frame of the universe with this item lit, Ken's photograph standing at "now", and the item's documented threads
   drawn in its theme colour. It is the same scene model the universe draws (`sceneOf`, `partition`, `place`, `project`),
   turned so the item is at the front and fitted to the item, its neighbours and "now". It is a picture, not a second
   interaction: the links are the thread list and "Open the universe here" (`universe/#i=<id>`). Below 1200px the sky
   moves down to sit just above the threads, so the work comes first on phones. The film and the essay keep the sky at
   the end, beside the threads, because there the work itself must come first.
2. **Receipts sit where the claim is.** Three forms, one visual language: *receipt slips* (the quoted request and reply,
   the facts the page states, and the matching transactions side by side), *margin receipts* (from 1200px the
   transaction sits in the margin beside the sentence it backs) and the full *Receipts* list near the end. The head
   links to both counts ("7 receipts", "2 documented threads"). No transaction hash or Etherscan link is typed in a page:
   they come from `item.receipts` through the `rc-<word>` regions.
3. **Honesty is typography, not small print.** On ZeroHuman, Ken's own sentence "As of November 20, 2026, no outside
   agent has bought from it. Both paid orders so far came from my own test buyer." is the page's pull quote, directly
   under the two orders and next to the status block, and it stays in the Limitations list where he wrote it.
4. **Long-form layout.** Sections put the heading in a 15rem side column (sticky) and the text on a 41rem measure at
   18px / 1.68; wide material (slips, figures, the diagram) uses the full column. The essay is a single reading column
   (40rem measure, 17 to 20px / 1.7, a serif initial) with figures wider than the text.
5. **The film is a film.** First screen: "A short film by Ken Ashe · 2026 · 1:54 runtime", the title in serif italic,
   the logline, and the film sized to fit the screen, click to load. Then the director's note set as the page's one
   statement, four stills, the making-of essay and walkthrough video as thread cards with their evidence, credits.
   No stack chips, no "AI demo" framing; "AI-generated imagery" appears only in Ken's own note.
6. **The Digest stays ash on its own system's page.** The build's status line reads "Publishing paused" (derived), the
   state block and the weekly chart are ash, dashed and labelled Automated, and the page's light belongs to the build
   and to Ken's video about it.
7. **About is a person in the universe's atmosphere.** The hero is the name, the tagline and the bio beside his current
   headshot as a lit window, with time rings spreading from the foot of the photograph (CSS only). "How I work" sets his
   own approach statement large and leads straight into the newest work and the universe. Two more photographs (hoodie,
   close-up) appear lower down. Credentials are a quiet list; Lucky Domains is a clearly separate block.
8. **The publishing page shows the real thing.** The preview is not a mock-up: it is the homepage's own `latest-video`,
   `builds` and `writing` regions and the universe's own poster and summary sentence, re-rendered in the browser by the
   site's region functions with the placeholder entries applied.

## How each page derives its data

| Page | From the graph (regions) | Page copy (verbatim source) |
|---|---|---|
| ZeroHuman | kind, status, date, title, dek, theme, stack, receipt and thread counts, sky (`item-head`); the six transactions and the repository (`rc-decision`, `rc-encouragement`, `rc-injection`, `rc-registry`, `rc-repository`, `item-receipts`); threads with `edge.type` and `edge.evidence` (`item-threads`); status snapshot (`zh-status`); more builds (`item-more`) | `data/page-text/building_zerohuman.txt`: 121 lines present, 11 shown through regions |
| Returning Your Things | film line, title, logline, runtime (`film-head`, from `item.metric` and `item.dek`); the film (`film-player`, the video the page embeds); making-of cards with evidence, one step further along each thread (`film-making`); sky and threads (`item-place`) | director's note and credits: `data/pages.json → films.returningYourThings`; "Behind the scenes" paragraph: `page-text/building_returning-your-things.txt` |
| Autonomous AI blog | head as above, with status from `graph.digest.status`; state, published, drafts, total, first and last post, noindex (`blog-status`); Ken's Nov 25 video, found through the edge that links it to this build (`item-video`); weekly volume from `graph.digest.perWeek` (`blog-volume`); threads incl. the Digest | `data/page-text/autonomous-ai-blog.md`: every paragraph, restructured so the current state and the Nov 25 update come first |
| AI agent economy | head; the two transactions (`rc-order`, `rc-delivery`, `item-receipts`); video (`item-video`, from `item.video`); threads | `data/page-text/building_ai-agent-economy.txt`: blocks, times, gas, fees and addresses exactly as the source gives them |
| Essay | kind, date, title, dek, byline with `displayDate` and `authorship`, theme (`essay-head`); video (`item-video`); the film banner (`essay-film`); sky and threads (`item-place`); more writing | `data/page-text/writing_4-tips-….txt`; images from `assets/writing/` with captions from the source |
| About | credentials grouped as `graph.credentials` (`about-credentials`); counts and the newest work (`about-now`); follow links from `copy.js` socials (`about-follow-top`, `about-follow`); "Now · date" under the photo (`hero-now`) | `data/pages.json`: identity, about, whatIBring, press, luckyDomains, work. 100 of 100 strings and every link verified by the check script |
| Publish | the four steps from `DEMO_STEPS` (`publish-steps`); themes (`publish-themes`); the lead's `universe-poster`, `universe-summary`, `latest-video`, `builds`, `writing` | the recorded run, byte-identical to `production-plan/evidence/live-sync-run.txt`; the "when something is down" table and timings from `ARCHITECTURE.md` and `production-plan/sync-videos.yml` |

Notes on derivation:

* **Status of the Digest's build.** `builds.ts` says this build is `LIVE` with the metric "runs daily". The page shows
  `graph.digest.status` instead (`statusOf()` in `regions/pages/item.js`), so it reads "Publishing paused" today and
  flips if the data says publishing. Verified by rendering the regions with `status: 'publishing'`.
* **Internal links in prose** are hand-resolved: pages the prototype implements are relative, everything else goes to
  kenashe.ai. Link targets for external sources were confirmed against the live pages; visible text is from `round-3/data` only.
* **ZeroHuman live status.** Prerendered as "Snapshot · as documented Nov 25, 2026". With scripts, the public status
  endpoint is read once (6 s timeout, no credentials); on success the block is relabelled "Live · read HH:MM UTC" and
  shows worker health, mode, the name check, the latest block seen, the last look at the chain and paid orders
  delivered, with the sentence that this count includes Ken's own test buyer. The response is validated and written as
  text only. On failure the snapshot stays and says so.

## The publishing demonstration

* Four step cards from `DEMO_STEPS`: where Ken types (`step.where`), how much (`step.effort`), the snippet, the note.
* "Apply this step" toggles a step (any combination; "Apply all four", "Reset"). Each applied card shows what that one
  step changed, computed by `describeChanges()` against the graph without it. The address keeps `?demo=…`, so a state
  can be shared, and the same keys open the homepage and the full universe with the same entries.
* Beside the steps: the universe's poster, the counts sentence and the themes, all re-rendered. With the fourth step a
  sixth theme (Robotics) appears by itself, takes a sector and a derived colour, and is marked as a placeholder.
* Below: the homepage's own latest-video, builds and writing regions, with new entries flashed and marked.
* "Uploading a video: the automatic path": the five things the scheduled job does, the typical delay (up to 30
  minutes plus the 8 to 10 minute build, or straight away with Run workflow), what happens when YouTube is unreachable
  (nothing changes; the site builds from the archive), the cost, the recorded real run quoted unedited, and the plain
  statement that the workflow is proposed and not installed.
* A "what happens when something is down" table and the link to the stress test.

## Measured

Chromium, `networkidle`, every outside host blocked (gzip-equivalent = text gzipped, fonts and images as they are).

| Page | Requests | Gzip-equivalent | HTML (gzipped) | Height at 1440 | Height at 390 |
|---|---|---|---|---|---|
| ZeroHuman | 33 | 263 KB | 15 KB | 8,070px | 12,739px |
| Returning Your Things | 39 | 541 KB | 12 KB | 5,075px | 6,125px |
| Autonomous AI blog | 34 | 300 KB | 18 KB | 10,252px | 14,943px |
| AI agent economy | 34 | 302 KB | 15 KB | 8,614px | 12,543px |
| Essay | 37 | 487 KB | 13 KB | 6,948px | 8,302px |
| About | 37 | 292 KB | 7 KB | 7,072px | 11,671px |
| Publish | 33 | 262 KB | 19 KB | 8,361px | 12,405px |

The film and essay pages are heavier because of their 1280px stills. My own code: `pages.css` 8.5 KB, the five region
files 15 KB, `pages.js` 1.6 KB, `publish.js` 1.5 KB (all gzipped). The sky adds about 17 KB of SVG per page before gzip.

## QA results

Scripted, 7 pages × 390 / 768 / 1440px × JavaScript on and off, in **Chromium and Firefox** (84 runs):

* No console errors, no 404s, no horizontal overflow, exactly one `<h1>` per page, no broken images.
* No rendered text under 14px, SVG labels included (measured after scaling). Sky labels on phones measure 14.1px.
* No request to an outside host except the optional ZeroHuman status read; pages are complete with every outside host blocked.
* The only tap-target finding is not mine: the footer's "About" link is 43px wide (lead's component).
* JavaScript off: all content, receipts, threads, skies, charts and players (as links to YouTube) are present. The demo
  hides its controls and says plainly that applying steps needs JavaScript; ZeroHuman shows the dated snapshot.
* Keyboard: tab order is skip link, header, search, back link, receipts and threads links, universe link, then content.
  Every stop shows the focus ring. The film starts from the keyboard (Enter on the player; a `youtube-nocookie.com`
  iframe replaces the link). The demo's buttons are real buttons with `aria-pressed`; its result is announced through
  one polite status line.
* Touch (390px, touch emulation): applying a step by tap works; nothing depends on hover.
* Reduced motion: these pages have no ambient motion at all; with the preference set, the "new entry" flash is removed
  (0 running animations) and state changes still apply.
* Search: the header control opens the discovery specialist's overlay on all seven pages (one import in the page entry).
* `?demo=build,essay,video,category` on the item pages and About: regions re-render without errors and the banner appears.
* `node site/tools/check-pages-copy.mjs`: all page copy matches its sources; `check-copy.mjs` (lead) still passes.
* Looked at in screenshots at 1440 and 390 (and 768, 1024, 1200, 1280 for the head) in Chromium, and at 1440 and 390 in Firefox.

## Accessibility notes

* Landmarks and one `<h1>` per page; sections are labelled by their headings; heading levels follow the page structure.
* The sky is `role="img"` with a full sentence as its name (where the item sits and what it connects to), the same
  sentence is printed under it, and the thread list beside it carries the links.
* The weekly chart has a text summary as its name, a derived caption, and the same numbers as a table.
* Receipt links are 44px targets on these pages. Quoted payloads wrap instead of scrolling; the two blocks that must keep
  their line breaks (the recorded run, the table on small screens) are focusable scroll regions.
* The decorative poster on the publishing page is `inert` and the stage has a text name, so it adds no tab stops.
* Text uses the lead's three text colours only; theme colours used for text are the light variants (all above 4.5:1 on the background).
* Pull quotes are Ken's own sentences. Where a sentence is also in the running text (ZeroHuman), both are real text, not hidden.

## Content gaps, handled honestly

* **Press items have no URLs in `pages.json`.** Titles are shown as text, with one link to the newsroom, which has them.
* **The "Further reading" paragraph** on the live ZeroHuman and agent-economy pages (a link to a Lucky Domains research
  article) is not in `round-3/data`, so it is not on these pages.
* **"Related builds" lists** in the source are replaced by the threads region (the same items, from `graph.edges`, each
  with its evidence). Their one-line descriptions are not carried over.
* **Dates.** The head shows the graph's date ("Nov 2026" for builds, month precision); exact days appear only where
  Ken's text gives them. Timestamps on the agent-economy page are the two the source gives.
* **Stack** comes from the graph and can be shorter than the list in the write-up's notes (ZeroHuman: six tags).
* **Photographs.** Only the three supplied portraits, film frames and the essay's own images. Nothing generated or
  retouched; cropping and box-shadow only. Alt text for the film stills and the three hat stills was written from the
  images; captions are Ken's.
* **Video descriptions** from YouTube contain markdown asterisks, so video thread cards on the film page omit the dek.

## Known issues

* **The same build says "Live" elsewhere.** The lead's `kicker()` and the Building index print `item.status`, so the
  Autonomous AI blog reads "Live" on cards while its own page reads "Publishing paused". Moving `statusOf()` into
  `components.js` would make them agree. I did not edit the lead's file.
* **Firefox live status is unverified in this sandbox as configured**: its Firefox rejects the sandbox proxy's
  certificate, so the request fails and the snapshot path is what runs (it also logs the browser's own network error).
  With certificate errors ignored, the Live path works in Firefox.
* **Safari and iOS are untested** (no WebKit here). Features to check there: `display: contents` on the build-page head
  below 1200px, `inert` (Safari 15.5+), SVG `<image>` in the sky, `aspect-ratio`, `min()` / `max()` in lengths.
* **Sky labels are estimated, not measured.** Widths are computed from character counts, so a long title can sit a few
  pixels closer to a neighbour than intended. On phones the sky names the item, up to two neighbours and its theme; the
  rest are in the thread list.
* **`rc-<word>` matches receipts by label.** If a receipt is renamed in the data, its slip shows "This receipt is not in
  the content graph" and the full Receipts list still shows everything.
* **The demo's universe is the prerendered poster**, not the interactive canvas (placeholders are dashed amber rings;
  the new theme is named). The links beside it open the homepage and the full universe with the same steps applied.
* **Long pages on phones.** The two long write-ups are 15 to 18 phone screens. That is the length of Ken's text; nothing was cut.
* Headless Chromium full-page screenshots sometimes paint large images black on very tall pages; element screenshots
  and the image checks show they load.
* The pages were assembled from one shared shell, so their `<head>` and shell regions are identical by construction;
  the page files themselves are the source of truth from here on.

## Shared-library changes

None. Local helpers instead: `statusOf()`, `kickerLine()`, `videoOf()`, `universeHref()` (in `regions/pages/item.js`),
`localSky()` with its own label placement (in `regions/pages/sky.js`, built on the lead's exported scene functions).

## For production (Astro)

The region functions map onto components (`ItemHead`, `Sky`, `Receipts`, `Threads`, `DigestState`, `WeeklyVolume`); the
sky is generated at build time like the poster. Page copy stays in the `.astro` pages where it lives today. `rel=canonical`
is omitted in the prototype and stays in production's layout for the six real routes; `/publish/` is prototype-only.
