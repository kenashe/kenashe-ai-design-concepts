# How Round 2 would land in production (sketch, not applied)

Nothing here has been applied to kenashe/kenashe. This shows how any chosen direction would
fit the existing Astro repo with the smallest possible change.

## New files

```
src/data/graph.ts          ← lib/graph.js + the read logic of tools/derive.mjs (≈250 lines, typed)
src/data/youtube.ts        ← reads the channel feed with fast-xml-parser (already a dependency),
                             merges into src/data/youtube-archive.json (committed), falls back to it offline
src/data/youtube-archive.json
src/components/<direction>/*.astro   ← one component per render.js region
```

## Changed files

```
src/data/building-cards.ts ← CURATED list replaced by `hidden?: boolean` on Project (optional; removes double entry)
src/pages/index.astro      ← new homepage markup using the direction's components
src/layouts/BaseLayout.astro ← new design tokens / fonts (self-hosted via @fontsource, as today)
```

## Unchanged (by design)

* `src/content.config.ts` (frozen, D15), every Digest post, `/blog/` URLs, tags, RSS feeds
* `src/data/schema.ts` (`personKenAshe` stays byte-identical with luckydomains.io)
* `src/data/writing.ts`, `builds.ts`, every `/building/*` and `/writing/*` URL and its JSON-LD
* The pipeline, its workflow, IndexNow, `related.json`, `indexing.ts`

## graph.ts in Astro (shape)

```ts
// src/data/graph.ts  (build time only)
import { buildingCards } from './building-cards';
import { essays, authorshipOf } from './writing';
import { personKenAshe } from './schema';
import { credentialTiers } from './credentials';
import { getCollection } from 'astro:content';
import publishingWorkflow from '../../.github/workflows/pipeline.yml?raw';   // same import the Digest page already uses
import { NOINDEX_PREFIXES } from '../utils/indexing';
import { latestVideos } from './youtube';

const pages = import.meta.glob('../pages/{building,writing}/**/*.astro', { query: '?raw', import: 'default', eager: true });
// …same edge extraction as tools/derive.mjs, same buildGraph() as lib/graph.js…
export const graph = buildGraph({ builds, writing, videos, digest, edges, person, credentials });
```

Every page then imports `graph` and renders. Build time stays dominated by the 1,610 Digest posts;
the graph adds milliseconds. No runtime API, no database, no new paid service.

## Interactive islands

Each direction's motion and interaction is plain client-side JavaScript loaded with
`<script>` in the component (Astro bundles it). Direction B's WebGL layer is loaded with a
dynamic `import()` only on capable devices.
