# Round 5 · handoff

Round 4, refined. Same identity, navigation, palette, typefaces and photographs. This round recomposes the phone
introduction, gives projects without pictures a proper presentation, polishes the page transition, and fixes the
update and editorial problems found in review. It is still a design concept: production was only read, nothing was
deployed there, and Rounds 1 to 4 are unchanged in the same repository.

## What changed, mapped to your brief

**1. Positioning and visual direction.** The approved wording is used exactly and is checked by a test: name,
descriptor, statement, personality line, introduction, both actions. Palette, typefaces, photographs, light
reading surfaces and the four navigation items are unchanged. "Videos" is used throughout; *Returning Your Things*
is one project described as a short film.

**2. Phone introduction.** Your portrait now sits beside your name at the top of the page. The header is one line.
The personality line is smaller and lighter than the statement (19 px against 26 px; it was 23 px). The two actions
are full-width, 48 px tall. Measured at 390 px wide, leaving the temporary concept notice out of the count:

| Distance from the top of the page | Round 4 | Round 5 |
|---|---|---|
| Header height | 127 px | 55 px |
| Top of your face | 699 px | 72 px |
| End of the two actions | 667 px | 607 px |
| End of the introduction | 1,127 px | 641 px |
| Featured picture begins | 1,183 px | 673 px |

At 320 px wide the featured picture begins at 732 px (Round 4: 1,207 px). There is no sideways scrolling at either
width. Introduction text is 17 px; nothing on the site is smaller than 14 px. The concept notice adds 38 px in this
round (59 px in Round 4) and would not exist in production.

**3. Projects without pictures.** The coloured title tiles are gone. A project with no picture is a text card:
a small mint mark, the date, the title once, the summary, and "Read about it". Its page opens straight into the
heading, summary and write-up, with no substitute cover. Real images and video thumbnails are kept. Both kinds sit
in one list in date order. A cover image stays optional when you add a project. The homepage rule no longer
requires a picture (see "How the homepage chooses" below); ZeroHuman now appears there.

**4. Character and the one interaction.** The large headings use a slightly narrower cut of the same typeface.
The mint mark from your logo is now a recurring device: it marks text cards and travels into the page as a short
rule above the heading, the way a picture travels for illustrated projects. The transition itself is tidier: the
old page fades quickly, the new one rises in underneath the travelling picture. On a mouse, a card's picture lifts
and tips very slightly when pointed at. Back was verified; reduced motion switches all of it off; without the
transition, links load normally.

**5. Update and editorial fixes.** Each has a regression test (23 tests pass).

* **A. Thumbnails.** The sync now downloads the thumbnail of every video in the feed on every run and compares its
  fingerprint with the stored one. A changed picture replaces the local copy. A download is accepted only if it is
  a complete, valid image; an error page, a cut-off file or a failed request leaves the last good picture in place.
  A thumbnail-only change and a title-only change are tested separately.
* **B. Latest and Featured.** The automatic newest video is labelled "Latest video". Anything you choose is labelled
  "Featured video", "Featured project" or "Featured essay". The date shown is always the selected item's own.
* **C. Homepage selections.** A project with a page links to it. A project with no write-up is shown as an unlinked
  card. A mistyped id is ignored. An item that is also hidden is left out. In the last two cases the build prints a
  plain message and falls back to the automatic choice. No setting can produce a broken link.
* **D. One source per field.** The plain summaries now live in each project's record. See the field table below.
* **E. Real project update.** Demonstrated on the real production files in an isolated copy. See `demo/`.

**6. Copy.** The blog video's description on the site now reads "A look back at my autonomous AI blog and its
results. Publishing is currently paused." The blog project's summary is in the past tense and says the same.
Lucky Domains is "a digital presence studio for the AI era" (footer: "Digital presence studio."). "All written by
me" is gone; the Writing introduction is "Essays, lessons from projects and personal stories.", and each essay keeps
its own authorship label in the list and on its page. "Opinions I'm willing to defend" became "my honest take after
trying things myself". Your Facebook Page is in the follow links. A stray pair of Markdown asterisks in one video
description was found and is now cleaned automatically; a test scans every page for such marks.

**7. Production.** Re-read on November 27: still at `8b35b45`, unchanged since Round 4. See
`production-plan/MIGRATION.md`.

## What you edit, and what follows

| Content or action | What I edit | What updates | When | Implemented or proposed |
|---|---|---|---|---|
| Publish a video | Nothing on the site. Upload to YouTube. | Video archive, "Latest video" on the homepage (unless you chose a feature), "More to watch", thumbnail, link to a project named in the description | Next check (every 30 minutes) plus the site build | Sync script: implemented and tested. Schedule: **proposed, not installed** |
| Change a recent video's title or thumbnail | Nothing on the site. Change it on YouTube. | Title and picture wherever the video appears | Next check | Implemented and tested. Schedule: **proposed, not installed** |
| Change an older video's thumbnail (outside YouTube's latest 15) | Nothing on the site, or press "Run workflow" with "all" ticked to skip the wait | Picture wherever it appears | Daily check, or at once with the button | Implemented and tested (`--all`). Schedule: **proposed, not installed** |
| Change an older video's title or description | One line under `corrections` in the homepage settings file | Wherever the video appears | Next build | Implemented in the prototype |
| Add a project | One record in `src/data/builds.ts`. A page file if it has a write-up. A picture is optional. | Projects list, homepage (newest first), "next project" links, "connected" cards on pages it links to | Next build | Demonstrated on the production files. New templates: proposed |
| Change a project's card title or summary | The `title` or `summary` line in its record | Cards, lists, next and connected links, the opening line of its page | Next build | Demonstrated |
| Change a project page's heading | The title line at the top of its page file | That page's heading and browser tab | Next build | As production works today |
| Write an article | Your existing workflow: a record in `src/data/writing.ts` and the page | Writing list, "And to read", "read next" | Next build | Demonstrated on the production files |
| Change the homepage feature | One line, `featured`, in the settings file | Featured piece and its label; other sections adjust so nothing repeats | Next build | Implemented; settings file in production is proposed |
| Choose the homepage projects | Up to three ids under `homeProjects` | "Things I've made" | Next build | Implemented |
| Hide an item from featured areas | Add its id to `hide` | It leaves the homepage. Its page and its place in the lists stay. | Next build | Implemented |

Nothing new is installed or running in production. The Digest's publishing remains paused.

### Where each project field lives

| What you see | Where it is written | Where it appears |
|---|---|---|
| Card title, for example "AI agent economy on Ethereum" | `title` in the project's record | Cards, the Projects list, "next project", "connected" cards |
| Plain summary | `summary` in the project's record (new field, proposed) | Cards, and the opening line and search description of the project's page |
| Page heading, for example "I Built Two AI Agents That Buy and Sell Services on Ethereum" | The title line in the page file | The page's heading and browser tab only |
| The write-up, its date line and technical summary | The page file | The project's page only |

The short card title and the longer page heading are two different fields on purpose. Production already works
this way; this round only makes it explicit and tests it. Essays have one title, in `src/data/writing.ts`.

### How the homepage chooses

* **Featured piece:** the item named in `featured`. If that is empty, mistyped or hidden: the newest full-length video.
* **Three projects:** the ones named in `homeProjects`, in your order. Remaining places are filled with the newest
  projects that have a write-up, then projects without one. A picture is not required.
* **Never repeated:** an item already shown, or the same subject in another form, is skipped. That is why the
  autonomous blog project is not among the three today: its video is the featured piece.

## The update demonstration

`demo/` holds a recorded run of six updates. The first three were made by editing the real production files
(`src/data/builds.ts`, `src/data/writing.ts`, page files) in a local copy of the production repository that has no
remote and was never pushed. After each edit the records were re-read and the site rebuilt, and the report lists
the pages and sections that changed. Each edit is saved as a patch.

One limit: Astro could not be installed in my environment (the package registry refused downloads). So
production's own templates were not run. The project and essay records were read by importing the real TypeScript
files, and the example write-ups were read from their page files by a small reader. The pages shown are the
prototype's.

## What was checked

**Observed in a browser** (headless Chromium 148 and headless Firefox 150, on this machine):

* All 26 prototype pages, the review page and the demonstration pages at 320, 390, 820 and 1440 px in Chromium,
  and at 390 and 1440 px in Firefox: no sideways scrolling, no console errors, no missing images, no dead internal
  links, smallest text 14 px, contrast passes, every tab stop shows a focus ring, controls at least 44 px on phones.
* JavaScript off: every page has all its content and navigation; video pictures are plain links to YouTube.
* Outside services blocked: every page renders fully. Nothing contacts YouTube until play is pressed.
* Reduced motion: nothing animates; page changes are instant.
* The transition, in Chromium at desktop and phone size, by click, tap and keyboard: card with a picture to its
  page and Back; text card to its page and Back; essay and Back; Projects list to a project, on to the next
  project, and Back twice. Each arrived on the right page and each ran as a transition. Recorded in the two clips.
* Firefox made the same journeys as ordinary page loads, with no errors.
* The video player in both browsers, with a stand-in for YouTube: opens in place on large pictures and in a viewer
  on small ones; Escape and the Close button close it; the player is removed on close; focus returns to the video
  that was opened; the "Watch on YouTube" fallback is present, including when YouTube is unreachable.
* The preview address was opened and its links followed after publishing (results on the review page).

**Automated tests** (23 pass): eight for the video sync, fifteen for the site, including every case in section 5.

**Read from source, not observed:** that the production record change is type-correct (the TypeScript files import
cleanly; Astro's own check was not run).

**Not tested:**

* **Safari, iPhone and iPad.** Safari's engine cannot run in my environment. Safari 18.2 and later support this
  transition, but I have not seen it there. Please try the preview on your own devices.
* **Real video playback.** The real YouTube player loaded in Chromium, but YouTube answered this machine with
  "Sign in to confirm you're not a bot", so I never saw a video play inside the page.
* **Real phones and screen readers.** Touch was emulated. No screen reader was run.
* **The scheduled workflow.** It has never run, because it is not installed.
* **Production's build** with these changes (see the Astro limit above).

## Remaining limitations

* 5 of 19 projects have a picture or a video to borrow one from. Text cards now make the rest look intended, but a
  real image per project would still add the most.
* The preview is served from the public repository by a free third-party service, because GitHub Pages is still
  switched off for the repository and my access cannot switch it on.
* Project and essay bodies are a copy of your published pages; some diagrams and inline clips were simplified.
* Links to pages outside the prototype (Digest archive, Newsroom, legal pages, RSS) go to the live site.
* The seven smaller builds have no write-ups on the live site either, so they are shown without links.
* Draft wording still awaiting your approval is listed in `content/copy.json` under `draft`: the "Hi, I'm Ken" note,
  the About opening and background, the two About descriptions and the three page introductions.

## Decisions for you

1. The autonomous blog's summary was reworded this round to say publishing is paused. The other 18 summaries are
   the ones you approved, moved into the records unchanged. Please confirm the new one.
2. Production's own Building card for the autonomous blog still says "runs daily". That is live copy, outside this
   pass; say if you want it corrected in the first production change.
3. The public identity record ("AI application builder", mirrored on your other sites) is untouched.
4. Whether Newsroom stays in the footer, as shown.
5. Whether to go ahead with the preview build on the production structure (Phase 0 of the plan).
