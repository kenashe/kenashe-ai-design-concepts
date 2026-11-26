# Round 4 · proposed migration and rollback plan

Nothing in this plan has been done. Production (kenashe/kenashe) was read, never changed.
Reviewed at commit `8b35b45` (PR #157, merged November 26, 2026).

## What production looks like today (re-checked for this round)

* Navigation: Building, Writing, About, Newsroom, Digest. Footer also links Topics, Connect and the legal pages.
* The Digest's scheduled publishing is paused (the `schedule` trigger in `.github/workflows/pipeline.yml` is commented out).
* **Indexing changed since Round 3.** Published Digest articles, the `/blog/` landing page and the topic hubs are
  eligible for indexing again. Only tag listings with fewer than three published articles carry `noindex` and are
  left out of the sitemap (`src/utils/indexing.ts`, `src/pages/blog/tags/[tag].astro`, the sitemap filter in
  `astro.config.mjs`). Round 3's notes said the whole Digest was noindexed; that is no longer true and nothing in this
  plan depends on it.
* `vercel.json` holds 1,092 redirects. Structured data comes from `src/data/schema.ts` and `JsonLd.astro`.

## What this redesign must not touch

| Kept exactly as it is | Why |
|---|---|
| Every existing URL, including all `/blog/` articles, tags and topic hubs | Nothing is deleted or moved. `/building/` keeps its address and is only labelled "Projects". |
| `src/utils/indexing.ts`, tag `noindex` rules, the sitemap filter, `robots.txt.ts` | Deprioritising the Digest in the design is not an indexing change. |
| Canonical tags and `BaseHead.astro` | The new templates wrap page content; the head stays. |
| `vercel.json` redirects | No route is renamed, so no redirect is added or removed. |
| `src/data/schema.ts` and the Person identity it publishes | It is the master copy mirrored on Ken's other sites. See "Decisions" below. |
| The Digest pipeline, its paused schedule and its kill switch | Out of scope. It stays paused. |
| Page bodies (`src/pages/building/*.astro`, `src/pages/writing/*`) | Only the frame around them changes. Page H1s are kept as written. |

The prototype's own `noindex`, its missing canonicals and its `robots.txt` exist only to keep the concept out of search.
None of that goes to production.

## Phases (each is one pull request that can be reverted alone)

**Phase 0 · Preview only.** A draft pull request with a Vercel preview build. Nothing merged. Purpose: see the
design with production's real image pipeline and check it on Ken's own phone, Safari and Firefox.

**Phase 1 · Shared records, invisible.** Add `src/lib/site.ts` (the `model()` function from `round-4/build.mjs`, about
70 lines) and `src/data/home.ts` (featured, homeProjects, hide, corrections). Optionally add three optional fields to
a project record in `builds.ts`: `plain` (the short plain-English summary), `image`, and nothing else. No page uses
them yet, so visitors see no change. Rollback: revert the PR.

**Phase 2 · Videos.** Add `scripts/sync-videos.mjs`, `src/data/youtube-archive.json` (already holding 16 videos) and
the thumbnails, then a new `/videos/` page. Ken installs `sync-videos.yml` himself (agent tokens cannot add workflow
files, the same rule the Digest pipeline documents). `/videos/` is a new address; it enters the sitemap through the
normal Astro sitemap integration. Rollback: set the repository variable `VIDEO_SYNC_ENABLED=false` (stops the
schedule at once) or revert the PR; the page keeps working from the committed archive either way.

**Phase 3 · New frame and homepage.** New header, footer, fonts (all three are already production dependencies),
colours and homepage. `NAV` in `src/consts.ts` becomes Projects, Videos, Writing, About. Newsroom and the Digest
archive move to the footer, where the Digest is described from the pipeline's actual state. Rollback: revert the PR,
or use Vercel's "Instant Rollback" to the previous deployment while deciding.

**Phase 4 · Index and detail templates.** `/building/`, `/writing/`, and the layouts for project and essay pages.
The picture transition is two CSS rules plus one shared `Picture` component that gives each item's picture its name;
no client router and no per-page work. Rollback: revert the PR.

**Phase 5 · About page and wording.** Only after Ken approves the draft copy listed in the handoff.

Rough size: 6 to 9 working days in total, most of it Phases 3 and 4.

## What is not migrated

`round-4/build.mjs` as a build tool (Astro does this job), `tools/snapshot-pages.py` and `content/pages.json`
(production pages already hold their own bodies), `tools/thumbs.py` (Astro's image pipeline does it), the concept
notice, and the demonstration folder.

## Decisions for Ken before Phase 3

1. **Person identity.** `schema.ts` still describes Ken as "AI application builder" with the earlier description, and
   that record is mirrored on other sites. Updating it to the new positioning is a separate, deliberate change that
   should be made everywhere at once. This plan leaves it alone until Ken says so.
2. Whether `/videos/` should be indexable from day one.
3. Sync every 30 minutes or hourly. Both are free on a public repository.
4. Whether Newsroom belongs in the footer (as prototyped) or should stay in the main navigation.
5. Whether the seven smaller builds without pages should each get a short page later.
