# KenAshe.ai design concepts (Round 1)

Six independent, functional design prototypes for a possible KenAshe.ai redesign. **These are concepts only.** None of them is the live site, and none has been selected.

- Review page: `index.html` (GitHub Pages: https://kenashe.github.io/kenashe-ai-design-concepts/)
- Concepts: `concepts/01-kenashe-2/`, `02-living-lab/`, `03-cinematic/`, `04-publication/`, `05-universe/`, `06-human/`. Each has a homepage and at least one interior page.
- Shared content: `shared/content.json`, one content file used by all six. It was taken from the live site and the production data files (read-only) on November 25, 2026.
- Shared assets: `shared/img/` (Ken's portraits, YouTube thumbnails and frames, essay and Digest images).
- Screenshots: `review/screens/` (desktop 1440 px and mobile 390 px, viewport and full page).

## Guardrails
- Every page has `<meta name="robots" content="noindex, nofollow, noarchive">`, and `robots.txt` disallows everything.
- No analytics, no cookies, no forms that send data, and no external fonts. YouTube loads only on click (youtube-nocookie).
- Live indicators read two public endpoints (ZeroHuman `/api/status`, GitHub commits for `kenashe/kenashe`) once per page view. When a request fails they fall back to a dated snapshot.
- No custom domain and no CNAME. The production repo `kenashe/kenashe`, its Vercel project and the Digest pipeline are untouched.

## Tools
- `python3 tools/screenshots.py [slug ...]` regenerates the review screenshots (needs Python Playwright).
- `python3 tools/build_review.py` regenerates `index.html` from `review/concepts.json` and `review/meta.json`.
- `python3 tools/qa.py [slug ...]` checks for console errors, horizontal overflow at 390/768/1440 px, a single h1 and missing alt text, under reduced motion.

## Next rounds
Future rounds go in their own section (for example `/round-2/`), and this round stays online unchanged as an archive.
