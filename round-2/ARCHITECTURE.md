# Round 2 · shared content architecture

**Innovation in the experience. Simplicity in the architecture.**

All three Round 2 directions render the same content through the same small pipeline. They
differ in experience, not in how content is stored. This page is the contract.

## How production works today (reviewed at kenashe/kenashe `eb9a67b`, Nov 25, 2026)

| Content | Single source of truth today | Who/what writes it |
|---|---|---|
| Builds | `src/data/builds.ts` (`projects`) → `src/data/building-cards.ts` (order + `CURATED` list) | Ken, by hand |
| Build write-ups | `src/pages/building/<slug>.astro` (+ notes in `docs/builds/<slug>.md`) | Ken |
| Essays | `src/data/writing.ts` (metadata, image) + `src/pages/writing/<slug>/index.astro` | Ken |
| Digest | `src/content/blog/*.mdx` (content collection, Zod schema frozen) | The pipeline (GitHub Actions) |
| Digest status | `.github/workflows/pipeline.yml` (schedule trigger present = publishing) | Ken (the Nov 2026 pause PR) |
| Digest indexing | `src/utils/indexing.ts` (`NOINDEX_PREFIXES`) | Ken |
| Person / interests | `src/data/schema.ts` (`personKenAshe`, `knowsAbout`; byte-identical with luckydomains.io) | Ken |
| Credentials | `src/data/credentials.ts` | Ken |
| Videos | **No data file.** Video ids are written inside the pages that embed them. | Ken (YouTube) |
| Related posts | `src/data/related.json` (pipeline, pgvector) | The pipeline |

Astro 6 static build on Vercel Hobby. No runtime API, no database at request time.

## What Round 2 adds (one file of logic, no new dependencies)

```
production files (unchanged)                        derived, never typed
───────────────────────────                         ───────────────────────────────────────────
builds.ts / building-cards.ts ─┐
writing.ts ────────────────────┤                     items     every build, essay, video, short + the Digest
pages/building|writing/* ──────┼─► derive ─► graph ─► edges     documented relationships (links, embeds, video descriptions)
content/blog/*.mdx frontmatter ┤                     timeline  by month, Digest volume from real pubDates
workflows/pipeline.yml ────────┤                     themes    rule-based (lib/graph.js THEMES), first match wins
utils/indexing.ts ─────────────┤                     layout    angle from theme, radius from age, size from links
schema.ts / credentials.ts ────┤                     now       newest dated items across every type
YouTube channel feed ──────────┘                     digest    status, counts, latest, all from files
```

* `tools/derive.mjs` reads the production repo **as it is**: it imports the `.ts` data files
  directly (Node 24 strips the types), scans page sources for links and video ids, reads Digest
  frontmatter, the workflow file and the YouTube feed, and writes `data/sources.json`.
* `lib/graph.js` turns that into everything the designs render. Pure functions, no dependencies,
  same code in Node and the browser.
* `tools/prerender.mjs` writes the rendered HTML into each page, the stand-in for Astro's static
  build, so every page works with JavaScript off. JavaScript only enhances.
* `lib/publish-demo.js` adds example entries in production's own formats and re-runs the
  graph in the browser, so you can watch what updates.

In production, `derive.mjs` + `graph.js` become one Astro data module (`src/data/graph.ts`),
evaluated at build time. The region functions become Astro components. Nothing runs at request
time and nothing new is billed.

## Relationships are links you already write

There is no relationships file. An edge exists when:

1. a build or essay page links to another build or essay (`links-to`);
2. a page embeds a YouTube video (`embeds`);
3. a YouTube description links to a kenashe.ai page (`mentions`).

Today that yields 28 relationships, for example `ZeroHuman → AI agent economy`,
`Returning Your Things → 4 Tips… (essay) → video 3MOFBulJd_s`, and
`video DcXaGn-NsgY (Nov 25) → Autonomous AI blog`. Write a link and the map gains a thread.

## Adding content

| You do | What you type | What updates automatically |
|---|---|---|
| **New project** | One entry in `builds.ts` (+ a page if it has a write-up) | Homepage featured builds, project counts, archive, timeline month, theme cluster, universe/OS position, relationships from the page's links |
| **New article** | One entry in `writing.ts`, the page, one image (the current workflow) | Writing list, latest activity, timeline, theme, relationships from its links, thumbnail and social image |
| **New video** | Nothing. Upload to YouTube. | Video rails, latest activity, timeline, theme, relationships from a kenashe.ai link in the description |
| **Digest** | Nothing. Pause or resume = the existing workflow edit | Status line everywhere, counts, archive, per-day volume |

One production simplification is proposed: `building-cards.ts` keeps a `CURATED` list of titles,
so today a new project must be typed twice. Round 2 replaces it with an optional `hidden: true`
on the entry in `builds.ts`.

## What still needs a human

* Theme rules (`THEMES` in `lib/graph.js`): a regex per theme. Reviewed when a new kind of work
  appears; a mis-filed item is fixed by editing the rule, not the item.
* Page copy that lives in `.astro` pages today (about, newsroom, work): unchanged.
* Build imagery: 15 of 19 builds have no image in production. Each direction has a data-derived
  visual for image-less builds, so this is optional, not a gap.
* The YouTube archive file (`source/youtube-archive.json`) is written by the build; it must be
  committed so videos older than the feed's 15-item window stay on the site.

## Running it

```sh
node --import ./round-2/tools/ts-resolve.mjs round-2/tools/derive.mjs /path/to/kenashe   # refresh data/sources.json
node round-2/tools/prerender.mjs                                                          # rewrite the HTML regions
```

Neither step needs npm packages.
