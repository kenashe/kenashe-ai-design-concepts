# Round 3 · The Living Universe · Discovery report

Scope: the video archive (`/videos/`), the project index (`/building/`), the writing index (`/writing/`), the global
search overlay, and the video-archive stress test. Built on the lead's design system and page shell; nothing of the
lead's was edited.

## What was built

| Path (under `round-3/`) | What it is |
|---|---|
| `site/videos/index.html` | Video archive `/videos/` |
| `site/building/index.html` | Project index `/building/` |
| `site/writing/index.html` | Writing index `/writing/` |
| `stress/videos/index.html` | The same archive on `stress/data/sources-3000.json` (2,128 synthetic videos), with the synthetic banner |
| `site/regions/discovery.js` | All region functions and the shared index model (pure; runs in Node and the browser) |
| `site/assets/discovery.js` | Page entry for the four pages: filters, instant search, URL state, "Show 48 more", play in place |
| `site/assets/search.js` | The global search overlay (standalone module; one line adds it to any page) |
| `site/assets/discovery.css`, `site/assets/search.css` | Styles for the index pages and for the overlay |
| `site/STYLEGUIDE.md` → "Discovery components" | Markup and rules for everything added |
| `site/meta.json` → `pages` | Six entries appended (the existing ones untouched) |

Build: `node round-3/tools/prerender.mjs site` and `node round-3/tools/prerender.mjs stress`.

## Needs one line from the page owners: search on the other pages

The overlay works on the four pages above. **The homepage, `/universe/`, the item pages, About and the other stress
pages do not load it**, because I may not edit those files; there the header Search button still falls back to the
Building index, as the lead's contract provides. To switch it on, add to each page (or to its entry script):

```html
<script type="module" src="<S>/assets/search.js"></script>     <!-- or: import './search.js' in home.js / pages.js / universe-page.js -->
```

The script loads its own stylesheet. I verified this on the homepage by injecting exactly that tag in Chromium and
Firefox: the button opens the overlay, results link correctly, no errors.

## How the pages work

### One model for three indexes
`INDEX` in `regions/discovery.js` describes each index: which item types it lists, which URL parameters it has, how it
matches and groups. `itemsOf → groupsOf → resultsHTML` turns the graph into grouped HTML. The prerender calls these
functions with no filters; the page script calls the same functions when a filter changes. On load the script adopts
the prerendered view untouched (no re-render, no flash) unless the URL asks for a filtered view.

Nothing is typed by hand: counts, dates, themes (from `graph.themes`), statuses, stack tags, year and month groups, the
latest video and the Digest state all come from the graph. `?demo=video,build,category` was checked: the placeholder
video becomes the feature and a dashed, labelled card; placeholder builds appear in the project index.

### `/videos/`
* Head: title and one derived line, "Every upload, kept: 9 videos and 7 Shorts since Sep 2026. YouTube's feed lists only
  the newest 15; this archive keeps all 16."
* Feature: `graph.latestVideo`, large, the lead's click-to-load `player()`, its documented threads, Follow on YouTube.
* Archive: grouped by year, and by month inside the newest year. Within a group, long-form videos are landscape cards
  and Shorts are portrait cards (9:16, the pillarboxed thumbnail cropped to its centre), in separate labelled grids.
  Every card says "Video" or "Short" in words, shows date and theme, and lists up to two documented threads as links
  to the build or essay (the rest are counted and shown in full when the card is opened).
* Filters: All / Videos / Shorts, themes, and years (months while there is only one year), plus instant text search.
* Playing in place: a card opens into a full-width panel in the grid with the player, dek, all threads with their
  evidence, "Watch on YouTube" and "Show in the universe". Clicking a card loads the player (that click is the
  consent). Arriving by link (`/videos/#v-<videoId>`, which is where the lead's `itemHref` sends every video) opens the
  panel and focuses its play button but does **not** contact YouTube until the visitor presses play.
* Image-less videos get the lead's data-derived visual through `media()` (all 2,112 synthetic ones on the stress page).

### `/building/`
All builds, newest first, grouped by year. Each row: status (lit dot for Live, hollow ring otherwise), date, theme,
title, dek, stack, metric, receipts count, thread count. Filters: search, status, stack (a select of 53 tags), theme,
year. Builds with a page link to it (those not in the prototype open kenashe.ai in a new tab and say so). The seven
builds without a page are rows with a plain title and "No write-up for this one": no link, nothing dead.

### `/writing/`
Ken's nine essays with image and alt text, date, theme, dek and the authorship label from `item.authorship`. Theme and
year filters only; a search field appears on its own once there are more than 12 essays. The Digest is one ash, dashed
line below the essays: Automated badge, derived state, `graph.digest.statusLine`, post count, link to the archive.
Writing RSS is the one follow link in the head.

### Global search
* Opens from the header button (`r3:search`, `preventDefault()` called), `/`, and Ctrl/Cmd+K.
* Native `<dialog>` with `showModal()`: focus is trapped, the page behind is inert, Escape closes, focus returns to
  the control that opened it. If `showModal` is missing the script does not claim the event and the link works.
* Nothing is fetched until first open. On the real site it then fetches `data/search.json` and searches it with
  `search()` from `lib/graph.js`. Pages on other data (the stress pages, `?demo=`) search their own graph with
  `searchIndex(graph)`.
* Kind filters (All, Builds, Videos, Shorts, Writing) carry live counts for the current query. Empty query lists the
  newest work. 20 rows at a time, "Show 20 more" inside the list.
* Rows: thumbnail or data-derived visual, title, kind and status, theme, date; a second link "Show in the universe"
  (`universe/#i=<id>`; on stress pages the stress page that shows that dataset).
* Keyboard: roving focus over real links. Down from the field enters the list, Up and Down move, Right and Left switch
  between a row's two links, Home and End jump, Enter in the field opens the top result, typing anywhere in the list
  goes back to the field. I chose roving focus over `aria-activedescendant` because each row holds two links, which a
  listbox option may not contain.
* The footer says plainly that the automated Digest is not searched and links to its archive.

### Without JavaScript
* All three pages are complete: every card and row is in the HTML, video titles link to YouTube, builds and essays to
  their pages. Controls that need scripts are hidden; the year (or month) chips remain as anchor links to the groups.
* At scale, a section's first 12 cards (24 rows) are rendered while a budget of 60 lasts; **the remainder is a plain
  list of links inside `<noscript>`**, each with its `v-<videoId>` id. With scripts off that is the full archive as a
  readable list (about 2,100 links on the stress page); with scripts on, `<noscript>` content is not parsed into elements,
  so it costs no DOM nodes.
* The header Search button is a normal link to `/building/`.

### Keeping 2,000+ videos pleasant
* Filtering is an in-memory pass over the graph (1 to 3 ms for 2,128 videos). Only the first two screenfuls are written
  to the DOM on a filter change.
* Sections are windowed above 120 items in an index: a section holds cards only while it is within 900px of the
  viewport. Later groups start empty and fill on approach; sections scrolled away are parked with their height kept,
  so the page does not jump. "Show 48 more" adds 48 at a time. The real site (16 videos) is below the threshold, so
  everything stays in the page and in-page find keeps working.

## Measured

Headless, 1440 × 900, sandbox with 2 shared cores and software rendering; median of 7 runs, each from a reset view.
"Total" is filter + DOM write + forced style and layout. The stress page prints the same measurement for whatever
browser opens it (`window.__idx.last`, `window.__r3search.last`).

**Stress archive, 2,128 videos (934 long-form, 1,194 Shorts) in 20 groups**

| Action | Matches | Chromium total ms (filter / DOM / layout) | Firefox total ms | DOM nodes on page after |
|---|---|---|---|---|
| Kind: Shorts | 1,194 | 35 (1.4 / 13 / 18) | 41 | 1,164 |
| Kind: Videos | 934 | 32 (1.1 / 13 / 18) | 56 | 1,405 |
| Theme: Agents & automation | 303 | 44 (1.0 / 18 / 25) | 45 | 1,792 |
| Year: 2033 | 137 | 27 (0.4 / 10 / 11) | 24 | 977 |
| Search "synthetic" | 2,112 | 49 (8 / 13 / 19) | 38 | 1,380 |
| Search "2031-05" | 12 | 14 | 15 | 644 |
| Search "ens" | 2 | 6 | 7 | 337 |
| Search + kind + theme + year | 51 | 10 | 14 | 609 |
| Clear everything | 2,128 | 29 | 46 | 1,380 |
| Typing 20 characters, per keystroke | to 60 | median 34, worst 44 | median 39, worst 73 | |
| "Show 48 more" | | 53 | 65 | 977 → 2,134 |

The filter itself is 0.4 to 8 ms; the rest is writing and laying out about 24 cards whose image is the lead's SVG
visual (about 33 elements per card). Run-to-run variation on this machine is about ±40%.

| DOM nodes, stress archive | |
|---|---|
| At rest after load (scripts on) | 586 to 737 |
| Prerendered HTML as parsed, before parking (scripts on) | 2,594 |
| After scrolling through all 20 groups | 1,102 (24 cards) |
| After opening a deep link to a 2031 video | 2,317 (60 cards) |
| Scripts off (the full list of links) | 8,803 |

**Global search on the stress graph (3,004 items indexed)**: typing "synthetic 2038" → 193 results, 20 rows shown;
`search()` 1.8 ms median, 15 ms total per keystroke in Chromium (3 ms and 35 ms in Firefox); 562 elements in the overlay.
On the real site (44 items): under 0.1 ms to search, 3 to 14 ms total.

**Weight** (Chromium, `networkidle` + 1.5 s, no interaction, text gzipped, images and fonts as is; no external requests):

| Page | 1440px | 390px | HTML raw / gzipped |
|---|---|---|---|
| `/videos/` | 47 requests, 385 KB | 40 requests, 316 KB | 35 / 6 KB |
| `/building/` | 34 requests, 223 KB | 223 KB | 51 / 9 KB |
| `/writing/` | 39 requests, 291 KB | 262 KB | 23 / 6 KB |
| `stress/videos/` | 31 requests, 249 KB | 249 KB | 387 / 36 KB |

My scripts and styles: `discovery.js` 4.1 KB, `search.js` 4.6 KB, `regions/discovery.js` 6.7 KB, `discovery.css` 4.0 KB,
`search.css` 1.6 KB (all gzipped).

## QA results

Python Playwright, Chromium and Firefox (WebKit is not available here).

* **Both browsers, 390 / 768 / 1440px, scripts on and off, all four pages (48 runs)**: no console errors, no failed
  requests, no horizontal overflow, exactly one `<h1>`, no duplicate ids, no visible text under 14px on my pages
  (one exception outside my files, see Known issues), no control under 44px high.
* **Filters and URL state** (both browsers): search, kind, theme, month and stack filters give the expected counts;
  the URL follows (`?kind=short&theme=life&year=2026-10`, `?q=agent&status=LIVE&stack=HyperAgent`); loading such a URL
  restores the view and the pressed states; Clear filters resets.
* **Play in place** (both browsers, YouTube stubbed): clicking or pressing Enter on a card opens the panel and creates
  the `youtube-nocookie.com` iframe; opening another closes the first; Close and Escape return focus to the card;
  `#v-<id>` opens the panel without creating an iframe, clearing filters first if they would hide the video.
* **Search** (both browsers): opens from the button without navigating, from `/` and from Ctrl+K; focus lands in the
  field; arrow keys, Right/Left, Up back to the field; 40 Tab presses never leave the dialog; Escape closes and focus
  returns to the Search button; Enter opens the top result; a result on the same page (a video in this archive)
  closes the overlay and opens that card.
* **Touch emulation, 390px, reduced motion** (Chromium): tapping a filter and a card works, the panel scrolls into
  place instantly, the overlay is full-screen with no overflow and no small targets.
* **External hosts**: none are requested before a visitor presses play.

## Accessibility notes

* Landmarks, skip link to the archive, one `<h1>`, group headings as `<h2>`, card and row titles as `<h3>`.
* Filters are real buttons with `aria-pressed`, real links with `aria-current`, a labelled native select and a
  labelled search field. The result count is a polite live region. "Show 48 more" moves focus to the first new item.
* Cards and rows are one link each (the title, stretched over the card); thread links sit above it and are 44px high.
* Kind is never carried by shape or colour alone: every card and search row says Video, Short, Build or Writing.
* Essay images use the alt text from the data; decorative thumbnails have empty alt; data-derived visuals keep the
  lead's descriptive label.
* Text colours are the lead's tokens only (17.4:1, 12.3:1 and 7.7:1 on the page background; ash on ash for the Digest).
* Reduced motion: scrolling to an opened card is instant; nothing on these pages moves on its own.
* Not tested with a screen reader.

## Known issues and limits

* **Search is not on the lead's or the other specialist's pages yet** (see the top of this report).
* `lib/concept-flag.css` (shared, read-only) sets the concept bar to 12px and its label to 11px, below the 14px floor,
  on every Round 3 page. It needs a fix in the shared file.
* `search()` in `lib/graph.js` matches substrings anywhere in a word, so "ens" also finds "screens" and "license";
  whole-word and title matches rank first. Its tie-break comparator is not symmetric, so two results with the same
  score and date can swap places between Chromium and Firefox. Shared library; I did not change it.
* Windowed sections (large archives only) are not found by the browser's in-page find while parked. Parked sections
  that were never filled reserve an estimated height, so the scrollbar length shifts slightly as they fill.
* Changing a filter re-renders the results, which closes an open player.
* Filter chips show totals for the whole index, not counts for the current filter combination.
* The stress banner is `position: sticky` (the lead's style), so on the stress page it covers the top edge of a
  card scrolled into place.
* On phones Shorts are two per row; a year with many Shorts is a long scroll until filtered.
* Eight of nine essays and eight builds open kenashe.ai because the prototype implements only some item pages; the
  rows say "Opens on kenashe.ai".
* Not verifiable here: Safari and iOS (native `<dialog>`, `100dvh` with a `100vh` fallback, `-webkit-line-clamp`), real
  YouTube playback (requests were stubbed), real devices and GPUs.

## Shared-library changes
None. `data/search.json` is rewritten by the shared prerender tool, as before.

## For production (Astro)
`regions/discovery.js` maps onto Astro components plus one small client script per index. `search.json` should gain a
small `themes` table (id, label, hue) and each record's stack and receipt counts, so the overlay needs no second file;
in the prototype the overlay reads those from the graph. Canonical URLs stay in production's layout
(`https://kenashe.ai/videos/`, `/building/`, `/writing/`) and are omitted here.
