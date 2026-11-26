# Round 3 · architecture

**Innovation in the experience. Simplicity in the architecture.**

The Round 2 architecture is kept: production's own files are the single source of truth, a small
pure library turns them into everything the site draws, pages are prerendered and then enhanced.
Round 3 strengthens it in the six places Ken asked about. Each claim below is backed by a test in
`tools/pipeline.test.mjs` (9 of 9 pass) or by a recorded run in `production-plan/evidence/`.

```
production files (unchanged)                  one committed data file            derived at build, never typed
────────────────────────────                  ─────────────────────────          ─────────────────────────────────────
builds.ts / building-cards.ts ─┐                                                  items, relationships, receipts
writing.ts ────────────────────┤                                                  themes (seeded, inherited, emergent)
pages/building|writing/* ──────┼──► derive ──► graph ──────────────────────────►  sectors, positions, clusters (LOD)
content/blog frontmatter ──────┤      ▲                                           timeline, latest video, archives
workflows/pipeline.yml ────────┤      │                                           search index, Digest status
utils/indexing.ts, schema.ts ──┘      │
                                      │
YouTube feed ──► sync-videos ──► youtube-archive.json + thumbnails   (the only step that uses the network)
   (every 30 min, GitHub Actions, commits only when something is new; the commit triggers the normal Vercel build)
```

Production was reviewed read-only at `eb9a67b` (no change since the Round 2 snapshot). The Digest
is still paused (schedule commented out in `pipeline.yml`) and still noindexed (`/blog`, `/topics`
in `NOINDEX_PREFIXES`); both facts are read from those files, not typed.

## 1 · A new YouTube upload refreshes the content and rebuilds the site by itself

* `tools/sync-videos.mjs` reads the channel feed, merges it into `youtube-archive.json`, downloads
  missing thumbnails, and reports `changed=true|false`.
* `production-plan/sync-videos.yml` (proposed GitHub Actions workflow) runs it every 30 minutes and on
  demand. When `changed` is true it commits the archive and the thumbnail as Ken and pushes; the push
  is what makes Vercel rebuild, as for any commit. When nothing is new there is no commit and no build.
* Cost: $0. `kenashe/kenashe` is a public repository, so Actions minutes are free. No webhook
  endpoint, server or paid service. Kill switch: repo variable `VIDEO_SYNC_ENABLED=false`.
* Typical delay from upload to live: up to 30 minutes for the next run plus the 8 to 10 minute build;
  the "Run workflow" button skips the wait.
* Evidence: `production-plan/evidence/live-sync-run.txt` is a real run against Ken's live feed, starting
  from an archive that lacked his newest video; the run added it, stored the link in its description
  (`/building/autonomous-ai-blog`), downloaded its 109 KB thumbnail, and a second run changed nothing.
  Test 1 covers the same flow against a local stand-in for YouTube.

## 2 · The video archive outlives the feed's 15-item window

The feed only ever lists the latest 15 uploads. The archive file is append-only and committed with
the site, so a video stays on the site after it leaves the feed. Links found in descriptions are stored
in the archive too, so relationships survive as well. Test 2 pushes 28 videos through a 15-item feed
in three steps and checks that all 28 remain. The real archive already holds 16 (one more than the feed).

## 3 · Thumbnails are acquired with no manual step

For every archived video without a thumbnail, the sync tries `maxresdefault`, then `sddefault`, then
`hqdefault`, rejects YouTube's tiny grey placeholder, saves the file (WebP via `sharp`, which Astro
already installs; JPEG otherwise) and records its path. A failed download leaves `thumbnail: null`
and is retried on every later run. While it is null the site draws the item's data-derived visual
instead of a broken image (`item.image === null` is a designed state). Tests 3 and 5.

## 4 · The site works when external services are unavailable

| If this is down | What happens |
|---|---|
| YouTube feed at sync time | The run logs it, changes nothing, exits cleanly. The site builds from the archive. (Test 4: HTTP 500, garbage response, unreachable host.) |
| Thumbnail host at sync time | The video is archived without a thumbnail; retried next run. (Test 3) |
| Anything at build time | `derive` makes no network requests at all (asserted in test 4). The build is a pure function of the repository. |
| YouTube when a visitor presses play | The poster is a local image; the player is click-to-load; the title is an ordinary link to YouTube. |
| ZeroHuman status endpoint | The page shows a dated snapshot label instead of "Live". |
| JavaScript, Canvas or WebGL in the visitor's browser | Every page is prerendered and complete; the universe falls back WebGL → Canvas → static SVG with real links. |

The QA run loads every page with all outside hosts blocked and with JavaScript off (see the verification report).

## 5 · New kinds of work without editing theme rules

Round 2 filed everything with five fixed keyword rules. Round 3 keeps those as a seed vocabulary and
adds four mechanisms, tried in this order (`classify()` in `lib/graph.js`):

1. **topic**: an optional `topic: 'Hardware'` on an entry. Typed once, only when Ken wants control.
2. **rule**: the seed vocabulary (Film & video, Onchain, Web & search, Agents & automation).
3. **stack**: a build with no keyword match goes where earlier builds with the same stack tags were filed.
4. **emerged**: when four or more still-unfiled items share a tag (a stack tag, or a video hashtag), that tag becomes a theme by itself.
5. **linked**: a video or essay with no other signal takes the theme of the work it links to.
6. otherwise **Life & curiosity**.

Themes are a dynamic list. Each gets an arc of the universe sized by how much work it holds, so a new
theme makes its own room and existing work stays in its own theme (test 6). The build reports how every
item was filed (`stats.filedBy`), and the design can show it as a receipt. In the stress data, "Robotics",
"3D printing" and "Homelab" emerge without any rule, and "Hardware" appears from a `topic`.

Today's real data: 34 items filed by rule, 10 in Life & curiosity; no item needs a `topic`.

## 6 · The universe with hundreds or thousands of personal items

See "Future-scale stress test" in the Round 3 report for measured numbers. The architecture side:

* `graph.clusters('year'|'quarter'|'month')` summarises personal work by theme and period. The renderer
  draws clusters when there are too many items for the view and individual lights for the focused region.
* Positions stay computed: angle from the theme's arc, time from the date. Nothing is positioned by hand at any scale.
* `item.priority` (connections, substance, recency) decides which labels are shown.
* The Digest is summarised per week (`digest.perWeek`): 1,399 posts are 29 values today; a 55,179-post Digest is under 900.
* Search runs over a compact prebuilt index (`data/search.json`); 3,004 items search in about 1 ms.
* Graph build time: 10 ms for today's 44 items, about 120 ms for 3,004 (test 7).

## Adding content (unchanged from Round 2, one improvement)

| Ken does | He types | Updates by itself |
|---|---|---|
| New project | One entry in `builds.ts` (+ a page if it has a write-up) | Homepage builds, counts, index and filters, timeline, theme and sector, universe position, receipts found in the page, relationships from its links |
| New article | Entry in `writing.ts`, the page, one image (today's workflow) | Writing list, latest activity, universe, theme, relationships, thumbnail and social image |
| New video | Nothing. Upload to YouTube | Latest-video feature, video archive, universe, theme, relationships from a kenashe.ai link in the description, thumbnail |
| New kind of work | Nothing extra (or one optional `topic`) | A new theme and sector appear |
| Digest | Nothing. Pause or resume is the existing workflow edit | Status wording everywhere, counts, weekly volume |

## What still needs a person

* Page copy that lives in `.astro` pages (about, newsroom, build write-ups): unchanged from today.
* The seed vocabulary, rarely: only to rename or merge themes.
* Reviewing the first run of the sync workflow, and copying the workflow file into `.github/workflows` (agents cannot).

## Dependencies and recurring cost

No new npm dependency (sharp and fast-xml-parser are already installed; the sync script needs neither
to run). No runtime API, database or paid service. GitHub Actions on a public repository: free.
Vercel Hobby: unchanged; each new video adds one normal build.

## Running the prototype pipeline

```sh
node round-3/tools/sync-videos.mjs                                                   # YouTube → archive + thumbnails
node --import ./round-3/tools/ts-resolve.mjs round-3/tools/derive.mjs /path/to/kenashe   # production files → data/sources.json
python3 round-3/tools/thumbs.py                                                      # small images (astro:assets in production)
node round-3/tools/prerender.mjs                                                     # fill the HTML regions, write data/search.json
node --test round-3/tools/pipeline.test.mjs                                          # 9 architecture tests
node round-3/tools/synthesize.mjs                                                    # regenerate the synthetic stress data
```
