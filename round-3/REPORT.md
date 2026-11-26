# Round 3 · design and architecture report

One prototype: **The Living Universe**, evolved from Round 2 Direction B, with Direction A's personal
identity and Direction C's discovery tools. Private design exploration; production untouched.

## The design in one paragraph

Ken's photograph stands as a lit window at "now", the centre of a universe made only of his work. The
newest pieces sit nearest to him; everything older recedes outward. His name, positioning, newest video
and two calls to action share that first screen. Conventional navigation, three index pages and search
sit beside the universe, so it is a signature experience and never a gate.

## Decisions and why

**Identity inside the universe.** The portraits have bright office backgrounds and may not be cut out or
altered, so the photograph is used honestly as a rectangular object in the scene: a window that emits
the universe's light. Essays are lit from it, the plane brightens under it, work on the far side passes
behind it. This ties the person to the data (he is literally where "now" is) without repeating
Direction A's circular portrait in rings. The same window appears in each item page's small sky.

**The Digest, subordinate.** In Round 2 its 1,399 grains were the brightest shape in the sky. Now it is a
single desaturated band under the plane, drawn from weekly totals in at most 32 segments, labelled
"Automated Digest · paused" from the derived status, never counted with personal work, and expandable
on demand. On index pages it is one quiet line; on its own build page the status reads "Publishing
paused" from the same source. If publishing resumes, the wording changes everywhere with no edit.

**One signature interaction.** Select a light, follow a thread, replay growth. Direction C's playhead,
monitor and tracks were not brought over. What was brought over is function: the latest-video feature,
the archive, search and filters, receipts and threads.

**Typography and hierarchy.** Instrument Serif for the name, headings and Ken's own voice; Hanken Grotesk
for reading and interface (already a production font); JetBrains Mono only for hashes. A hard floor of
14 px, body at 17 px. The automated checks measure the smallest rendered text on every page.

**Homepage.** First screen, latest video with its threads and more to watch, newest builds with receipts
and thread counts, the film, latest writing, who Ken is, a small Digest strip, footer. 5.0 desktop
viewports, 7.4 on a phone.

**Level of detail.** Whole recent months as individual lights up to a budget; older work as clusters by
month, quarter and year, opened by selecting or zooming. Time maps to radius logarithmically from the
window's foot, so one year looks almost linear and sixteen years still leave the newest year about half
the radius.

**Progressive enhancement.** Prerendered SVG poster with real links (what JavaScript-off and `?tier=still`
show), then Canvas 2D, then a lazy raw WebGL light layer on capable devices. No graphics library.

## What was built

| Area | Pages |
|---|---|
| Home and universe | `/`, `/universe/` (proposed route) |
| Discovery | `/videos/` (proposed route), `/building/`, `/writing/`, search overlay on every page |
| Interior | `/building/zerohuman/`, `/building/returning-your-things/`, `/building/autonomous-ai-blog/`, `/building/ai-agent-economy/`, `/writing/4-tips-for-making-ai-videos-that-feel-like-films/`, `/about/` |
| Demonstration | `publish/` (prototype only), `?demo=build,essay,video,category` on the homepage |
| Stress (synthetic) | `stress/` at 44, 300, 1,000, 3,000, 3,000 + 55k Digest, and a 2,128-video archive |

Every page is prerendered from the content graph and complete with JavaScript off. Page copy on
interior pages is verbatim from production; two scripts (`site/tools/check-copy.mjs`,
`site/tools/check-pages-copy.mjs`) fail if it drifts.

## Maintainability

* **Adding content** is unchanged from the approved Round 2 model, and videos now need nothing at all:
  see the Architecture section. The publishing demo shows all four cases live.
* **What a person still maintains:** page copy in pages (as today); the seed theme vocabulary, rarely;
  the fallback status values shown on the ZeroHuman page when its live endpoint is unreachable (dated and
  labelled; production could read them at build time instead).
* **Dependencies:** none added. No framework, no graphics library, no paid service. The universe is about
  60 KB of plain modules plus a 3 KB WebGL layer.
* **Design system:** documented in `site/STYLEGUIDE.md` with every component's markup and a helper
  function; the two specialists built eleven pages from it without changing it, which is a fair test of
  whether it can be maintained.

## Performance

Homepage: about 490 KB gzip-equivalent and 45 requests on desktop before any interaction, no outside
requests. Other pages: 220 to 390 KB, except the film page (541 KB) and the essay (487 KB), which carry
1280 px stills that production's image pipeline would serve at the right size. Videos never load
anything from YouTube until play is pressed.

## Accessibility

One `<h1>` per page, landmarks, skip link, visible focus on every tab stop checked, no control under
44 px on phones (the SVG poster's marks are the exception: they are a picture of the universe whose
every item is also an ordinary link in the list beside it). The universe is one tab stop with arrow-key
travel, Escape, and a list view. Reduced motion stops all ambient motion; a pause control is always
present. The search dialog traps focus, restores it on close and is fully keyboard-operable.
Not verified with a screen reader.

## Known issues and honest limits

* Safari, iOS, real GPUs, real phones and screen readers are untested (see Verification).
* On the homepage about a tenth of the lights sit behind the photograph until the drift or a selection
  brings them round. Intended, but worth your judgement.
* At 3,000 items some cluster labels overlap near the rim, and replay runs slowly in the sandbox.
* The project index's "Live" filter still includes the Autonomous AI blog, because `builds.ts` says LIVE;
  its label correctly reads "Publishing paused". Production's own cards have the same mismatch today.
* Search matches substrings ("ens" also finds "screens"); better matches rank first.
* Press items have no per-article links in the data, so About links to the newsroom.
* The "Further reading" paragraph on the live ZeroHuman and agent-economy pages was not in the extracted
  text and is omitted from the prototype pages.
* The publishing demo's universe is the static poster; links beside it open the interactive universe
  with the same example entries.
* On phones the concept notice wraps to three lines at the 14 px floor. It is not part of the design.
* The synthetic data's titles carry no real keywords, so about half of it lands in "Life & curiosity";
  real work, which has real titles and stacks, files far better (today: 34 by rule, 10 fallback).

## Decisions I need from Ken

1. Is the photograph-as-window the right way to put you in the universe, or should a different photo
   (hoodie, close-up) or a larger scale be tried?
2. Should `/universe/` and `/videos/` become real routes, and should `/universe/` be indexable?
3. Video sync every 30 minutes, or hourly?
4. Adopt the optional `topic` and `hidden` fields in `builds.ts`?
5. Proceed to Phase 0 of the migration plan (a preview build in a draft pull request, nothing merged)?
