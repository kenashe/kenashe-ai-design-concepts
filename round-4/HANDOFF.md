# Round 4 · handoff

A new direction for KenAshe.ai, built as a working prototype in `round-4/`. It is a design concept: it is not the
live site, production was only read, and Rounds 1 to 3 are unchanged in the same repository.

## The design in brief

* **Your name is the identity.** "Ken Ashe" is set very large in real text, with your photograph beside it, the
  approved headline and introduction word for word, and the two actions: *Watch my videos* goes to the video
  archive, *Explore my projects* goes to the project index.
* **One personality detail.** "Occasionally getting carried away." appears once, as a small tilted note on your
  photograph. It is not repeated anywhere else.
* **Four navigation items**, each a plain link: Projects, Videos, Writing, About. Your name goes home.
* **A short homepage in five parts:** introduction, one featured piece, three projects, a few things to watch and
  read, a short personal note with follow links. Nothing appears twice, and the same subject is not shown in two
  forms (a project and its own video, for example).
* **Colour from your YouTube banner:** deep graphite for the introduction, the personal note and the footer; soft
  white for everything you read; mint as the one accent. On light surfaces the mint is darkened to a teal so text
  links stay readable.
* **Type:** Bricolage Grotesque for your name and headings, Hanken Grotesk for reading, JetBrains Mono for a few
  small labels. All three are already fonts the live site ships.
* **No Universe, no status panels, no counters, no decorative controls.** Technical evidence lives on the project
  pages, in a section called "Explore further" at the end.
* **The Digest** is out of the navigation and off the homepage. The footer links to its archive and says
  "Automated articles. Publishing is paused." That sentence is read from the pipeline's real state, not typed in.

## The one distinctive interaction

When someone opens a project or an essay, **its picture travels from the card into the opening of the page**, and
travels back when they return. It works from the homepage, the indexes, "next project" links and related items.

* The links are ordinary links. The effect is the browser's own page-to-page transition, switched on by two lines of
  CSS, so there is nothing to break.
* Keyboard and touch get the same thing, because it is triggered by navigation, not by the mouse.
* With reduced motion switched on, pages change instantly.
* Browsers that do not support it (Firefox today) simply load the page.
* **No setup per item.** Every picture is named from the item's own record. A new project gets the transition by
  existing. A project with no picture gets a title card drawn from its title, and that travels too.

## What you do to update the site

| Content or action | What I do | What updates automatically | When it updates | Demonstrated or proposed |
|---|---|---|---|---|
| Publish a video | Upload it to YouTube. Nothing on the website. | Video archive (as the latest video); homepage feature, unless you have chosen one; "More to watch"; its thumbnail; a link to the project if the description contains that project's kenashe.ai address | At the next scheduled check (every 30 minutes) plus the normal site build, or straight away with the "Run workflow" button | The sync script is **demonstrated**: tested, and run for real against your channel feed. The schedule that runs it is **proposed and not installed**. |
| Add a project | Add one record to the project list (`src/data/builds.ts`). Add a page file if it deserves a write-up. | Project index; "next project" links; the homepage three, once it has a picture or you choose it; the picture transition | Next site build after you save (a few minutes) | **Demonstrated** in the prototype. The production wiring is **proposed**. |
| Write an article | The workflow you use today: a record in `src/data/writing.ts` and the essay page. | Writing index; homepage "And to read"; "read next" links | Next site build | **Demonstrated** in the prototype. Your existing workflow is unchanged. |
| Change the homepage feature | Change one line, `featured`, in the homepage settings file. | The featured piece. The other homepage sections adjust so nothing repeats. | Next site build | **Demonstrated**. The settings file in production (`src/data/home.ts`) is **proposed**. |
| Leave the feature alone | Nothing. | Your newest full-length video is featured. | With each new video | **Demonstrated** |
| Correct a title or thumbnail | Project or essay: fix it in its record. Video: fix it on YouTube, or add one line under `corrections` in the settings file. | Every place the item appears | Next site build or sync | **Demonstrated** (automated test) |
| Hide an item from featured areas | Add its id to `hide` in the settings file. | It leaves the homepage and featured spots. Its page and its archive entry stay. | Next site build | **Demonstrated** |
| The Digest | Nothing. It stays paused. | The footer wording follows the pipeline's state. | n/a | **Demonstrated**. No automation was changed. |

A recorded run of all of this is on the demonstration page (`round-4/demo/`). It applies each update to a separate
copy of the site and lists exactly which pages and sections changed. The example entries exist only there.

One limit to know about: YouTube's feed lists only your latest 15 uploads. A retitled video is picked up
automatically while it is still among those 15. For an older video, use `corrections`.

### Three different states, kept apart

* **Works in the prototype today:** everything on the pages; the picture transition; choosing or hiding featured
  items; corrections; the video archive of 16 videos (one more than YouTube's feed now lists); the thumbnail
  fallback; the sync script itself.
* **Proposed for production, not built there:** the shared records module, the homepage settings file, the new
  templates, the `/videos/` page, and the scheduled workflow file (`production-plan/sync-videos.yml`).
* **Installed and running:** nothing new. Production is exactly as it was. The Digest's publishing remains paused.

## Wording that needs your approval

Your introduction, headline, actions and bio line are used exactly as you wrote them. I wrote the following for
the prototype from facts already on your site, and it should not go to production until you have read it. All of
it is in one file, `content/copy.json`, under `draft`:

* A one or two sentence plain-English summary for each of the 19 projects.
* The short "Hi, I'm Ken." note on the homepage.
* The About page's opening paragraph and a first-person version of your background.
* The two "What you'll find here" descriptions on the About page, and the one-line introductions on the Projects,
  Videos and Writing pages.

Project and essay page bodies are your own published words, copied from the live site unchanged.

## What was checked

All 26 prototype pages, the demonstration pages and this review page were loaded automatically at 320, 390, 820
and 1440 pixels wide in headless Chromium 148, and at 390 and 1440 in headless Firefox 150.

* No horizontal overflow at any width.
* Smallest text anywhere is 14 px; body text is 17 to 20 px. Every text and background pair meets WCAG AA contrast.
* No console errors, no failed requests, no missing images, no dead internal links.
* Every tab stop shows a visible focus ring. Controls are at least 44 px on phones.
* With JavaScript off, every page has all of its content and navigation. Video pictures are plain links to YouTube.
* With every outside service blocked, every page still renders completely. No page contacts any outside service
  until someone presses play.
* With reduced motion on, nothing animates and page changes are instant.
* Homepage: about 5 desktop screens and 7 phone screens tall; about 450 KB on first load including fonts.
* The transition was confirmed in Chromium by mouse and by keyboard, forwards and back. Firefox navigated normally
  without it, as designed.
* 14 automated tests pass (`node --test round-4/tools/site.test.mjs`): four for the video sync, ten for the site.

### Not verified

* **Safari and iOS.** Safari's engine cannot run in my environment. Safari 18.2 and later support this kind of
  page transition, but I have not seen it there. Please try it on your iPhone and Mac.
* **Real phones and real touch.** Touch was emulated.
* **Screen readers.** Structure, labels and focus order were checked by script; no screen reader was run.
* **Actual YouTube playback.** The player loads on request and falls back to a YouTube link; I did not confirm a
  video plays inside the embedded player.
* **The scheduled workflow** has never run, because it is not installed.

## Known limits

* Only 5 of the 19 projects have a picture of their own or a video to borrow one from. The rest use title cards.
  The design is noticeably stronger with pictures, so the most useful next step for content is one image per project.
* Project and essay bodies keep production's structure, so a few technical pages are long. The plain summary, the
  picture and the main action come first.
* Links to pages outside the prototype (Digest archive, Newsroom, legal pages, RSS) go to the live site.
* The seven smaller builds have no pages on the live site either, so they are listed without links.
* No structured data is set in the prototype. Production keeps its own.

## Before production

See `production-plan/MIGRATION.md`: five small pull requests, each reversible alone, none touching URLs,
canonicals, robots rules, the sitemap filter, redirects, structured data or the Digest pipeline. The first step is a
preview build you can try on your own devices.

Decisions I need from you:

1. Is this the direction? If yes, which parts to change before going further.
2. The draft wording above.
3. Whether to update the public identity record ("AI application builder") to the new positioning, everywhere at once.
4. Whether Newsroom moves to the footer, as shown.
5. Whether to go ahead with the preview build.
