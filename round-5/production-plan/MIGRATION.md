# Round 5 · proposed migration and rollback plan

Nothing in this plan has been done. Production (kenashe/kenashe) was read, never changed.
Re-read on November 27, 2026: `master` is still at commit `8b35b45` (PR #157, merged November 26), unchanged
since Round 4. Everything below describes a proposal. The only things that exist are the prototype in this
repository and one isolated local copy of production used for the update demonstration, which was never pushed.

## What production looks like today (re-checked for this round)

* Navigation: Building, Writing, About, Newsroom, Digest. Footer also links Topics, Connect and the legal pages.
* The Digest's scheduled publishing is paused (the `schedule` trigger in `.github/workflows/pipeline.yml` is commented out).
* **Indexing changed since Round 3.** Published Digest articles, the `/blog/` landing page and the topic hubs are
  eligible for indexing again. Only tag listings with fewer than three published articles carry `noindex` and are
  left out of the sitemap (`src/utils/indexing.ts`, `src/pages/blog/tags/[tag].astro`, the sitemap filter in
  `astro.config.mjs`). Round 3's notes said the whole Digest was noindexed; that is no longer true and nothing in this
  plan depends on it.
* `vercel.json` holds 1,092 redirects. Structured data comes from `src/data/schema.ts` and `JsonLd.astro`.
* A project is listed today by adding its record to `src/data/builds.ts` **and** its title to a second list in
  `src/data/building-cards.ts`. The proposal below removes the second step.
* Production's own card for the autonomous blog still reads "runs daily" although publishing is paused. That is
  existing live copy, noted here and not changed.

## What this redesign must not touch

| Kept exactly as it is | Why |
|---|---|
| Every existing URL, including all `/blog/` articles, tags and topic hubs | Nothing is deleted or moved. `/building/` keeps its address and is only labelled "Projects". |
| `src/utils/indexing.ts`, tag `noindex` rules, the sitemap filter, `robots.txt.ts` | Deprioritising the Digest in the design is not an indexing change. |
| Canonical tags and `BaseHead.astro` | The new templates wrap page content; the head stays. |
| `vercel.json` redirects | No route is renamed, so no redirect is added or removed. |
| `src/data/schema.ts` and the Person identity it publishes | It is the master copy mirrored on Ken's other sites. See "Decisions" below. |
| The Digest pipeline, its paused schedule and its kill switch | Out of scope. It stays paused. |
| The current treatment of Digest pages: published articles, `/blog/` and topic hubs index-eligible; tag listings with fewer than three articles `noindex` and out of the sitemap | Carried over exactly. No blanket Digest `noindex` is introduced. |
| Page bodies (`src/pages/building/*.astro`, `src/pages/writing/*`) | Only the frame around them changes. Page H1s are kept as written. |

The prototype's own `noindex`, its missing canonicals and its `robots.txt` exist only to keep the concept out of search.
None of that goes to production.

## Phases (each is one pull request that can be reverted alone)

**Phase 0 · Preview only.** A draft pull request with a Vercel preview build. Nothing merged. Purpose: see the
design with production's real image pipeline and check it on Ken's own phone, Safari and Firefox.

**Phase 1 · Shared records, invisible.** Three small changes, none visible to visitors:

* `src/data/builds.ts`: add the optional `summary` field (the plain-English summary) to each project, and an
  optional `unlisted` flag on the two old records that are not shown. `building-cards.ts` then lists every project
  that is not unlisted, so a new project needs one record and nothing else. The exact change is in
  `patches/0001-proposed-content-fields.patch` (it applies to `8b35b45`; the set and order of cards is identical
  before and after, which the demonstration checks).
* `src/lib/site.ts`: the `model()` function from `round-5/build.mjs` (selection rules, labels, no repeats).
* `src/data/home.ts`: featured, homeProjects, hide, corrections.

The card title (`title` in the record) and the page heading (the title line in each page file) stay two separate
fields, as they are today. Rollback: revert the PR.

**Phase 2 · Videos.** Add `scripts/sync-videos.mjs`, `src/data/youtube-archive.json` (already holding 16 videos) and
the thumbnails, then a new `/videos/` page. The script re-checks thumbnails on every run and refuses corrupt
downloads; a daily run covers videos that have left YouTube's feed. Ken installs `sync-videos.yml` himself (agent tokens cannot add workflow
files, the same rule the Digest pipeline documents). `/videos/` is a new address; it enters the sitemap through the
normal Astro sitemap integration. Rollback: set the repository variable `VIDEO_SYNC_ENABLED=false` (stops the
schedule at once) or revert the PR; the page keeps working from the committed archive either way.

**Phase 3 · New frame and homepage.** New header, footer, fonts (all three are already production dependencies),
colours and homepage. `NAV` in `src/consts.ts` becomes Projects, Videos, Writing, About. Newsroom and the Digest
archive move to the footer, where the Digest is described from the pipeline's actual state. Rollback: revert the PR,
or use Vercel's "Instant Rollback" to the previous deployment while deciding.

**Phase 4 · Index and detail templates.** `/building/`, `/writing/`, and the layouts for project and essay pages.
The picture transition is a few CSS rules plus one shared `Picture` component that gives each item's picture (or,
for a project without one, its mint mark) its name;
no client router and no per-page work. Rollback: revert the PR.

**Phase 5 · About page and wording.** Only after Ken approves the draft copy listed in the handoff.

The prototype's video sync is described as implemented and tested because the script runs and its tests pass.
The schedule that would run it by itself is **not installed anywhere** and must not be described as running until
Ken has installed `sync-videos.yml` and a real run has been seen to succeed.

Rough size: 6 to 9 working days in total, most of it Phases 3 and 4.

## What is not migrated

`round-5/build.mjs` as a build tool (Astro does this job), `tools/snapshot-pages.py` and `content/pages.json`
(production pages already hold their own bodies), `tools/thumbs.py` (Astro's image pipeline does it), the concept
notice, and the demonstration folder.

## Decisions for Ken before Phase 3

1. **Person identity.** `schema.ts` still describes Ken as "AI application builder" with the earlier description, and
   that record is mirrored on other sites. Updating it to the new positioning is a separate, deliberate change that
   should be made everywhere at once. This plan leaves it alone until Ken says so.
2. Whether `/videos/` should be indexable from day one. It is the only new address this plan adds.
3. Sync every 30 minutes or hourly. Both are free on a public repository.
4. Whether Newsroom belongs in the footer (as prototyped) or should stay in the main navigation.
5. Whether the seven smaller builds without pages should each get a short page later.
