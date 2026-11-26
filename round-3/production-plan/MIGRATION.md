# Proposed incremental migration and rollback plan

**Status: proposal only.** Nothing here has been applied. Production (`kenashe/kenashe`, Vercel,
the Digest pipeline) was read, never changed. Reviewed at `eb9a67b` (Nov 25, 2026, the merge of
PR #156); no commits have landed on `master` since the Round 2 snapshot. One PR was open at the
time of review (#154, a Digest prompt change, unrelated to the site's templates).

The plan is five phases. Each is one pull request, ships on its own, leaves the live site fully
working, and can be undone by reverting that one pull request. Phases 1 to 3 change nothing a
visitor can see.

## Ground rules carried over from production's own docs

* Commits are authored and committed as `Ken Ashe <kenashe@gmail.com>` (Vercel Hobby skips others).
* `npm run build` before every push; a broken build leaves the previous deploy live.
* `src/content.config.ts` stays frozen. `personKenAshe` in `src/data/schema.ts` stays byte-identical.
* `BaseHead.astro` keeps owning canonical URLs, the robots meta, Open Graph tags, the two RSS
  links and the `rel="me"` links. `src/utils/indexing.ts` keeps owning what is noindexed. The
  sitemap filter in `astro.config.mjs` is not touched. Because the redesign changes page bodies
  and styles but not these files, **every existing URL, canonical, robots directive, sitemap
  entry, structured-data node and feed is preserved by construction**.
* The Digest pipeline, its workflow (currently paused by the commented schedule), IndexNow,
  `related.json`, tags, topic hubs, `/blog/*` URLs and the 1,092 redirects in `vercel.json` are untouched.
* Workflow files are added by Ken (agent tokens have no `workflows` scope).

## Phase 0 · Validation in a preview (no merge)

Goal: prove the approved architecture works inside the real Astro build before anything is merged.

1. Branch `redesign/graph`. Add `src/data/graph.ts` (see Phase 1) and one throwaway page that prints the graph's counts.
2. Open a draft PR. Vercel builds a preview URL (previews are already noindex by Vercel's header).
3. Check: build time vs the current 8 to 10 minutes (the graph adds page-source scanning and reads
   Digest frontmatter Astro has already loaded; expected cost is well under a second);
   `npm run check:indexing`; the existing node tests; the nine Round 3 pipeline tests ported to `src/data/*.test.ts`.
4. Decide: go / adjust. **Rollback:** close the PR. Nothing was merged.

## Phase 1 · Content graph, invisible (1 PR, ~1 to 2 days)

Adds, without using them anywhere visible:

| File | From the prototype | Notes |
|---|---|---|
| `src/data/graph.ts` | `lib/graph.js` + read logic of `tools/derive.mjs` | Typed. Imports `buildingCards`, `essays`, `personKenAshe`, `credentialTiers`; reads page sources with `import.meta.glob('../pages/{building,writing}/**/*.astro', { query: '?raw' })`; Digest via `getCollection('blog')`; status from the same `pipeline.yml?raw` import the Digest project page already uses; `NOINDEX_PREFIXES` from `utils/indexing.ts`. |
| `src/data/youtube-archive.json` | `source/youtube-archive.json` | Seeded with the 16 videos known today. |
| `src/assets/video/*.webp` | `assets/video/` | Thumbnails; `astro:assets` makes the sizes. |
| `scripts/sync-videos.mjs` | `tools/sync-videos.mjs` | Unchanged apart from default paths. |
| `src/data/graph.test.ts` | `tools/pipeline.test.mjs` | Run with `node --experimental-strip-types --test`, like the existing tests. |

Optional in the same PR: replace the `CURATED` title list in `building-cards.ts` with an optional
`hidden?: boolean` on `Project` (removes today's double entry for new projects), and add the optional
`topic?: string` field to `Project` and `Essay`. Both are additive.

**Visible change:** none. **Rollback:** revert the PR.

## Phase 2 · Automatic video sync (1 PR + one workflow file, ~half a day)

1. Ken copies `production-plan/sync-videos.yml` to `.github/workflows/sync-videos.yml`.
2. First run via the "Run workflow" button; confirm it reports `changed=false` (the archive is already current).
3. Next upload: confirm a commit `videos: sync channel feed (<id>)` appears within about 30 minutes,
   authored as Ken, and that Vercel builds it. Validate here whether a push from the Actions bot
   triggers the Vercel build by itself; if it does, delete the deploy-hook step (otherwise it deploys twice).

**Visible change:** none yet (nothing renders the archive until Phase 3 or 4).
**Rollback:** set repo variable `VIDEO_SYNC_ENABLED=false` (instant, no code change), or delete the
workflow file. The archive file simply stops updating; nothing breaks.

## Phase 3 · New pages beside the old site (1 PR, ~3 to 4 days)

Adds routes that do not exist today, using the new design system, without changing any existing page:

* `/videos/` (the archive: long-form and shorts, from the graph)
* `/universe/` (the full-screen universe; decide before merging whether it is indexable, see Open decisions)
* The universe island: `src/components/universe/*` (scene model, Canvas renderer, lazy WebGL layer, prerendered SVG poster component)
* The new design tokens and components in a **scoped** stylesheet (`src/styles/universe.css`) loaded only by the new pages, so current pages cannot be affected.

These pages are reachable by URL but not yet linked from the header, so this phase is a soft launch
Ken can share privately and test on his own devices (the real-GPU check that could not be done in the sandbox).

**Visible change:** two new URLs, unlinked. **Rollback:** revert the PR (removes the two routes; nothing else referenced them).

## Phase 4 · Homepage and shell switch (1 PR, ~3 to 4 days)

* `src/pages/index.astro` body, `Header.astro`, `Footer.astro`, `src/styles/global.css` tokens and fonts
  (Instrument Serif added via `@fontsource`; Hanken Grotesk and JetBrains Mono are already installed; Bricolage Grotesque removed last).
* Homepage JSON-LD (`homeSchema`) is kept as it is; only the visible markup changes.
* Index pages `/building/` and `/writing/` re-skinned and given search and filters; `/blog/` (Digest) gets the new shell only, keeping its automated banner, byline and labels.
* Header gains "Videos" and "Universe"; the Digest link keeps its "automated" marking.

Before merging: side-by-side check of the preview against production for `<title>`, description,
canonical, robots, Open Graph, JSON-LD on `/`, `/about/`, one build page, one essay, `/blog/`, one Digest post
(a script diffing `<head>` between the live site and the preview is part of this PR), Lighthouse on the preview,
and Ken's own review on a phone and a laptop.

**Visible change:** the redesign goes live. **Rollback:** revert this one PR; the previous homepage,
header, footer and styles return on the next build (8 to 10 minutes). Phases 1 to 3 stay in place and keep working.
For a faster rollback, Vercel's "Promote to production" on the previous deployment restores the old site in seconds while the revert builds.

## Phase 5 · Interior pages (1 PR per group, ~2 to 4 days total)

Re-skin `BuildLayout.astro` (all `/building/*` pages at once), the essay layout, `/about/`,
`/newsroom/`, `/work/`; add the receipts and threads blocks from the graph to build and essay pages.
Page copy is not edited. **Rollback:** revert the PR for that group.

## What is deliberately not migrated

* The prototype's `prerender.mjs`, `data/sources.json` and `derive.mjs` as separate steps: Astro's
  build replaces all three.
* The publishing demo and the stress test: they stay in the concepts repository.
* Any runtime service. The site stays fully static.

## Open decisions for Ken before Phase 3

1. Should `/universe/` be indexable? Recommendation: yes, with its own title and description, since the full item list is in its HTML.
2. Cadence of the video sync: every 30 minutes (proposed) or hourly. Either is free on the public repo.
3. Whether to adopt the optional `hidden` and `topic` fields in Phase 1.
4. Which analytics events, if any, to add for universe interactions (none are proposed; current Vercel Web Analytics keeps working unchanged).

## Effort and risk summary

| Phase | Effort | Visible | Risk | Undo |
|---|---|---|---|---|
| 0 Validation | 0.5 day | no | none | close PR |
| 1 Graph | 1 to 2 days | no | low (additive) | revert PR |
| 2 Video sync | 0.5 day | no | low (kill switch) | repo variable |
| 3 New routes | 3 to 4 days | unlinked URLs | low (scoped CSS) | revert PR |
| 4 Homepage + shell | 3 to 4 days | yes | medium | revert PR / promote previous deploy |
| 5 Interior pages | 2 to 4 days | yes | low to medium | revert PR per group |

Total: roughly 10 to 15 working days, spread over as many weeks as Ken likes, with a working site at every step.
