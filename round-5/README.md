# KenAshe.ai design concepts · Round 5

Round 4, refined: the phone introduction, projects without pictures, the page transition and the update behaviour.
The direction itself is the updated positioning ("Making sense of AI. Making things with it."). A design concept only:
not the live site, not indexed, and separate from production. Rounds 1 to 3 are unchanged elsewhere in this repository.

* Review page: `index.html` · Prototype: `site/` · Update demonstration: `demo/`
* Owner's handoff: `HANDOFF.md` · Migration and rollback plan: `production-plan/MIGRATION.md`
* Proposed (not installed) video workflow: `production-plan/sync-videos.yml`

## How it is built

| File | What it is |
|---|---|
| `data/sources.json` | One record per project, essay and video, derived from production at `8b35b45` with `production-plan/patches/0001` applied, plus the video archive |
| `source/youtube-archive.json` | Every video the sync has ever seen (grows, never shrinks) |
| `content/editorial.json` | The homepage choices: `featured`, `homeProjects`, `hide`, `corrections` |
| `content/copy.json` | Site wording: the approved introduction, page introductions and About text. Project summaries live in the project records |
| `content/pages.json` | Page bodies copied from the live site (prototype stand-in only) |
| `build.mjs` | Turns the four inputs into every page. No dependencies, no network |
| `assets/site.css`, `assets/site.js` | The whole design (one stylesheet) and the play-on-request video player |

## Commands (from the repository root)

```
node round-5/tools/sync-videos.mjs                 # the only step that talks to YouTube
node --import ./round-5/tools/ts-resolve.mjs round-5/tools/derive.mjs <path to a read-only clone of kenashe/kenashe>
python3 round-5/tools/snapshot-pages.py            # prototype only: copy page bodies from the live site
python3 round-5/tools/thumbs.py                    # responsive image sizes
node round-5/build.mjs                             # build round-5/site/
PRODUCTION_COPY=<isolated clone with patches/0001 applied, no remote> node round-5/demo/run.mjs   # the update demonstration
node --test round-5/tools/site.test.mjs            # 23 tests
python3 round-5/tools/qa.py                        # browser checks (needs Python Playwright)
python3 round-5/tools/journey.py && python3 round-5/tools/player.py && python3 round-5/tools/mobile.py
python3 round-5/tools/shots.py && python3 round-5/tools/review.py
```
