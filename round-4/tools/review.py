"""Builds the Round 4 review page (round-4/index.html) from HANDOFF.md, the migration plan, the screenshots and qa.json.
python3 round-4/tools/review.py"""
import os, json, html, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mdlite import md
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
e = html.escape
PAGES = [('Homepage', 'site/', 'home'), ('Projects', 'site/building/', 'projects'), ('Videos', 'site/videos/', 'videos'), ('Writing', 'site/writing/', 'writing'), ('About', 'site/about/', 'about'),
         ('Project page: the two AI agents', 'site/building/ai-agent-economy/', 'project-agent-economy'), ('Project page: ZeroHuman (title card, receipts)', 'site/building/zerohuman/', 'project-zerohuman'),
         ('Project page: Returning Your Things', 'site/building/returning-your-things/', 'project-film'), ('Writing page: the AI editor essay', 'site/writing/ai-editor-trusted-least/', 'essay-ai-editor'),
         ('Writing page: 4 tips for AI videos', 'site/writing/4-tips-for-making-ai-videos-that-feel-like-films/', 'essay-4-tips')]
qa = json.load(open(os.path.join(R, 'review/qa.json'))) if os.path.exists(os.path.join(R, 'review/qa.json')) else {}
def shots(label, path, name):
    return f'''<h3>{e(label)}</h3><div class="shots">
<figure><img src="review/screens/{name}-desktop.webp" alt="{e(label)}, desktop, 1440 pixels wide" width="1440" height="900" loading="lazy"><figcaption>Desktop <a href="review/screens/{name}-desktop-full.webp">Full page</a> <a href="{path}">Open the page</a></figcaption></figure>
<figure><img src="review/screens/{name}-mobile.webp" alt="{e(label)}, phone, 390 pixels wide" width="780" height="1688" loading="lazy"><figcaption>Phone <a href="review/screens/{name}-mobile-full.webp">Full page</a></figcaption></figure></div>'''
rows = []
for p, r in qa.items():
    W = r['widths']; k = lambda w: W.get(str(w)) or W.get(w)
    name = p.replace('round-4/', '') or 'review page'
    ff = all(not v['errors'] and v['overflow'] <= 0 and not v['broken_images'] for v in r['firefox'].values())
    rows.append(f"<tr><td><a href=\"{e(p.replace('round-4/', '') or './')}\">{e(name)}</a></td><td>{'Pass' if r['ok'] else 'Check: ' + e('; '.join(r['problems']))}</td><td>{r['initial_kb']} KB</td><td>{k(1440)['height'] / 900:.1f} / {k(390)['height'] / 844:.1f}</td><td>{k(390)['min']:g} px</td><td>{'none' if max(d['overflow'] for d in W.values()) <= 0 else 'yes'}</td><td>{len(r['errors']) + len(r['failed'])}</td><td>{'complete' if r['nojs']['h1'] == 1 else 'check'}</td><td>{'complete' if not r['hosts_blocked']['errors'] and not r['hosts_blocked']['broken_images'] else 'check'}</td><td>{'ok' if not r['focus_not_visible'] else 'check'}</td><td>{'ok' if ff else 'check'}</td></tr>")
NL = chr(10)
handoff = md(open(os.path.join(R, 'HANDOFF.md')).read().split(NL, 1)[1], shift=1)
migration = md(open(os.path.join(R, 'production-plan/MIGRATION.md')).read().split(NL, 1)[1], shift=1)
others = sorted(p for p in qa if p.startswith('round-4/site/') and p.replace('round-4/', '') not in [x[1] for x in PAGES])
out = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>KenAshe.ai design concepts · Round 4 review</title><meta name="robots" content="noindex, nofollow, noarchive">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="assets/site.css"><link rel="stylesheet" href="review/review.css"></head><body class="review">
<p class="concept"><strong>Design concept.</strong> Round 4 review. Not the live KenAshe.ai. Not indexed.</p>
<main class="rv" id="main">
<h1>Round 4: a simpler, personal creator site</h1>
<p class="rv-lede">One complete new direction built on the updated positioning: your name, your photograph, your approved introduction, four plain navigation items and a short homepage. The Universe is gone from this round. Earlier rounds are untouched and linked at the bottom.</p>
<p><a class="btn solid" href="site/">Open the prototype</a> <a class="btn line" href="demo/">See the update demonstration</a></p>
<h2 id="pages">Pages in the prototype</h2>
<ul class="pagelist">{''.join(f'<li><a href="{p}">{e(l)}</a></li>' for l, p, _ in PAGES)}</ul>
<p class="rv-note">All {len([p for p in qa if p.startswith('round-4/site/')]) or 26} pages are built: every project that has a page on the live site ({len([o for o in others if '/building/' in o]) + 3}) and all nine essays.</p>
<h2 id="transition">The picture transition</h2>
<figure><img src="review/screens/transition.webp" alt="Four frames: a project card's picture on the homepage growing into the picture at the top of the project page, and returning" width="1440" height="900" loading="lazy">
<figcaption>Frames captured in Chromium while opening a project from the homepage (top) and going back (bottom right).</figcaption></figure>
<h2 id="screens">Screenshots</h2>
{''.join(shots(*p) for p in PAGES[:6] + PAGES[8:9])}
<h3>Firefox</h3><div class="shots"><figure><img src="review/screens/home-firefox.webp" alt="Homepage in Firefox" width="1440" height="900" loading="lazy"><figcaption>Homepage in Firefox 150 (headless), 1440 pixels wide</figcaption></figure>
<figure><img src="review/screens/home-tablet.webp" alt="Homepage on a tablet" width="820" height="1180" loading="lazy"><figcaption>Tablet, 820 pixels wide (Chromium)</figcaption></figure></div>
<div id="handoff">{handoff}</div>
<h2 id="qa">Automated checks, page by page</h2>
<div class="tbl" tabindex="0" role="region" aria-label="Checks per page"><table><thead><tr><th>Page</th><th>Result</th><th>First load</th><th>Screens tall, desktop / phone</th><th>Smallest text</th><th>Sideways scroll</th><th>Errors</th><th>JavaScript off</th><th>Outside services blocked</th><th>Keyboard focus</th><th>Firefox</th></tr></thead><tbody>{''.join(rows)}</tbody></table></div>
<p class="rv-note">Measured on the files in this repository, served locally the way GitHub Pages serves them. First load counts text files uncompressed; GitHub Pages and Vercel compress them.</p>
<div id="migration">{migration}</div>
<h2 id="rounds">Earlier rounds, unchanged</h2>
<ul class="rounds"><li><a class="btn line" href="../round-3/">Round 3 · The Living Universe</a></li><li><a class="btn line" href="../round-2/">Round 2 · three directions</a></li><li><a class="btn line" href="../">Round 1 · six concepts</a></li></ul>
</main></body></html>
'''
open(os.path.join(R, 'index.html'), 'w').write(out); print('wrote round-4/index.html', len(out))
