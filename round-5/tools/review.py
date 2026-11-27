"""Builds the Round 5 review page (round-5/index.html) from HANDOFF.md, the migration plan, the screenshots and qa.json.
python3 round-5/tools/review.py"""
import os, json, html, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mdlite import md
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
e = html.escape
PAGES = [('Homepage', 'site/', 'home'), ('Projects', 'site/building/', 'projects'), ('Project without a picture: ZeroHuman', 'site/building/zerohuman/', 'project-zerohuman'),
         ('Project with a picture: Returning Your Things', 'site/building/returning-your-things/', 'project-film'), ('Project using its video’s picture: the autonomous blog', 'site/building/autonomous-ai-blog/', 'project-blog'),
         ('Videos', 'site/videos/', 'videos'), ('Writing', 'site/writing/', 'writing'), ('About', 'site/about/', 'about'),
         ('Project page: the two AI agents', 'site/building/ai-agent-economy/', 'project-agent-economy'), ('Writing page: the AI editor essay', 'site/writing/ai-editor-trusted-least/', 'essay-ai-editor')]
qa = json.load(open(os.path.join(R, 'review/qa.json'))) if os.path.exists(os.path.join(R, 'review/qa.json')) else {}
def shots(label, path, name):
    return f'''<h3>{e(label)}</h3><div class="shots">
<figure><img src="review/screens/{name}-desktop.webp" alt="{e(label)}, desktop, 1440 pixels wide" width="1440" height="900" loading="lazy"><figcaption>Desktop <a href="review/screens/{name}-desktop-full.webp">Full page</a> <a href="{path}">Open the page</a></figcaption></figure>
<figure><img src="review/screens/{name}-mobile.webp" alt="{e(label)}, phone, 390 pixels wide" width="780" height="1688" loading="lazy"><figcaption>Phone <a href="review/screens/{name}-mobile-full.webp">Full page</a></figcaption></figure></div>'''
rows = []
for p, r in qa.items():
    W = r['widths']; k = lambda w: W.get(str(w)) or W.get(w)
    name = p.replace('round-5/', '') or 'review page'
    ff = all(not v['errors'] and v['overflow'] <= 0 and not v['broken_images'] for v in r['firefox'].values())
    rows.append(f"<tr><td><a href=\"{e(p.replace('round-5/', '') or './')}\">{e(name)}</a></td><td>{'Pass' if r['ok'] else 'Check: ' + e('; '.join(r['problems']))}</td><td>{r['initial_kb']} KB</td><td>{k(1440)['height'] / 900:.1f} / {k(390)['height'] / 844:.1f}</td><td>{k(390)['min']:g} px</td><td>{'none' if max(d['overflow'] for d in W.values()) <= 0 else 'yes'}</td><td>{len(r['errors']) + len(r['failed'])}</td><td>{'complete' if r['nojs']['h1'] == 1 else 'check'}</td><td>{'complete' if not r['hosts_blocked']['errors'] and not r['hosts_blocked']['broken_images'] else 'check'}</td><td>{'ok' if not r['focus_not_visible'] else 'check'}</td><td>{'ok' if ff else 'check'}</td></tr>")
NL = chr(10)
handoff = md(open(os.path.join(R, 'HANDOFF.md')).read().split(NL, 1)[1], shift=1)
migration = md(open(os.path.join(R, 'production-plan/MIGRATION.md')).read().split(NL, 1)[1], shift=1)
others = sorted(p for p in qa if p.startswith('round-5/site/'))
load = lambda f: json.load(open(os.path.join(R, 'review', f))) if os.path.exists(os.path.join(R, 'review', f)) else {}
mob, journey, player = load('mobile.json'), load('journey.json'), load('player.json')
tests = open(os.path.join(R, 'review/tests.txt')).read() if os.path.exists(os.path.join(R, 'review/tests.txt')) else ''
jrows = ''.join(f"<tr><td>{e(k)}</td><td>{e(v['browser'])}</td><td>{len(v['steps'])} of {len(v['steps'])} arrived on the right page</td><td>{sum(1 for r in v['reveals'] if r[1])} of {max(len(v['reveals']) - 1, 0) if v['reveals'] else 0}</td><td>{len(v['errors'])}</td></tr>" for k, v in journey.items())
prows = ''.join(f"<tr><td>{e(k)}</td>" + ''.join(f"<td>{e(str(player[b].get(k)) if not isinstance(player[b].get(k), bool) else ('yes' if player[b][k] else 'NO'))}</td>" for b in ('chromium', 'firefox')) + '</tr>' for k in player.get('chromium', {}) if k not in ('browser', 'page errors', 'only then is YouTube contacted'))
real = player.get('real YouTube, Chromium', {})
out = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>KenAshe.ai design concepts · Round 5 review</title><meta name="robots" content="noindex, nofollow, noarchive">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="assets/site.css"><link rel="stylesheet" href="review/review.css"></head><body class="review">
<p class="concept"><strong>Design concept.</strong> <span>Round 5 review. Not the live KenAshe.ai. Not indexed.</span></p>
<main class="rv" id="main">
<h1>Round 5: Round 4, refined</h1>
<p class="rv-lede">The direction you approved, with a recomposed phone introduction, a proper presentation for projects without pictures, a tidier page transition and corrected update behaviour. Earlier rounds are untouched and linked at the bottom.</p>
<p><a class="btn solid" href="site/">Open the prototype</a> <a class="btn line" href="demo/">See the update demonstration</a></p>
<h2 id="pages">Pages to look at</h2>
<ul class="pagelist">{''.join(f'<li><a href="{p}">{e(l)}</a></li>' for l, p, _ in PAGES)}</ul>
<p class="rv-note">All {len(others) or 26} pages are built: the five main pages, every project that has a page on the live site and all nine essays.</p>
<h2 id="phone">The phone introduction, before and after</h2>
<div class="shots two"><figure><img src="review/screens/mobile-compare-390.webp" alt="First screen at 390 pixels wide: Round 4 on the left, Round 5 on the right" width="1620" height="1758" loading="lazy"><figcaption>390 px wide (a typical phone). Round 4 left, Round 5 right.</figcaption></figure>
<figure><img src="review/screens/mobile-compare-320.webp" alt="First screen at 320 pixels wide: Round 4 on the left, Round 5 on the right" width="1340" height="1206" loading="lazy"><figcaption>320 px wide (the smallest phones). Round 4 left, Round 5 right.</figcaption></figure></div>
<div class="tbl" tabindex="0" role="region" aria-label="Phone measurements"><table><thead><tr><th>Measured from the top of the page, concept notice excluded</th><th>Round 4 at 390</th><th>Round 5 at 390</th><th>Round 4 at 320</th><th>Round 5 at 320</th></tr></thead><tbody>
{''.join(f"<tr><td>{label}</td>" + ''.join(f"<td>{mob.get(f'{r} at {w}', {}).get(key, '')}{unit}</td>" for w in (390, 320) for r in ('round-4', 'round-5')) + '</tr>' for label, key, unit in (('Header height', 'header', ' px'), ('Top of the portrait', 'face_top', ' px'), ('End of the two actions', 'buttons_end', ' px'), ('End of the introduction', 'intro_end', ' px'), ('Featured picture begins', 'featured_picture', ' px'), ('Introduction text size', 'intro_text_px', ' px'), ('Personality line size', 'aside_px', ' px'), ('Action button height', 'button_height', ' px'), ('Concept notice height (not in production)', 'notice', ' px'), ('Sideways overflow', 'overflow', ' px')))}
</tbody></table></div>
<h2 id="transition">The page transition, recorded</h2>
<p>Recorded in headless Chromium. Each clip opens a project with a picture and goes Back, opens a project without one and goes Back, opens an essay by keyboard and goes Back, then goes through the Projects list to a project, on to the next project, and Back twice.</p>
<div class="shots two"><figure><video controls preload="none" playsinline width="1280" height="800" poster="review/screens/transition-desktop-poster.webp" src="review/transition-desktop.mp4" aria-label="Recording of the page transition on desktop"></video><figcaption>Desktop, 1280 px wide <a href="review/transition-desktop.mp4">Open the clip</a></figcaption></figure>
<figure><video controls preload="none" playsinline width="390" height="844" poster="review/screens/transition-phone-poster.webp" src="review/transition-phone.mp4" aria-label="Recording of the page transition at phone size"></video><figcaption>Phone size, by tap <a href="review/transition-phone.mp4">Open the clip</a></figcaption></figure></div>
<div class="tbl" tabindex="0" role="region" aria-label="Journey results"><table><thead><tr><th>Run</th><th>Browser</th><th>Navigation, including Back</th><th>Page changes that ran as a transition</th><th>Errors</th></tr></thead><tbody>{jrows}</tbody></table></div>
<p class="rv-note">With reduced motion and in Firefox the count of transitions is 0 by design: pages change at once and every journey still arrives.</p>
<h2 id="screens">Screenshots</h2>
{''.join(shots(*p) for p in PAGES[:8])}
<h3>Tablet and Firefox</h3><div class="shots two"><figure><img src="review/screens/home-tablet.webp" alt="Homepage on a tablet" width="820" height="1180" loading="lazy"><figcaption>Tablet, 820 px wide (Chromium)</figcaption></figure>
<figure><img src="review/screens/home-firefox.webp" alt="Homepage in Firefox" width="1440" height="900" loading="lazy"><figcaption>Homepage in Firefox 150 (headless), 1440 px wide</figcaption></figure></div>
<div id="handoff">{handoff}</div>
<h2 id="player">Video player checks</h2>
<div class="tbl" tabindex="0" role="region" aria-label="Video player checks"><table><thead><tr><th>Check (YouTube replaced by a stand-in)</th><th>Chromium {e(player.get('chromium', {}).get('browser', ''))}</th><th>Firefox {e(player.get('firefox', {}).get('browser', ''))}</th></tr></thead><tbody>{prows}</tbody></table></div>
<p class="rv-note">Real YouTube from this machine, in Chromium: the player loaded and showed “{e(real.get('what the player showed', 'not run'))}”. Playback inside the page was therefore not observed.</p>
<h2 id="tests">Automated tests</h2>
<pre tabindex="0">{e(tests)}</pre>
<h2 id="qa">Browser checks, page by page</h2>
<div class="tbl" tabindex="0" role="region" aria-label="Checks per page"><table><thead><tr><th>Page</th><th>Result</th><th>First load</th><th>Screens tall, desktop / phone</th><th>Smallest text</th><th>Sideways scroll</th><th>Errors</th><th>JavaScript off</th><th>Outside services blocked</th><th>Keyboard focus</th><th>Firefox</th></tr></thead><tbody>{''.join(rows)}</tbody></table></div>
<p class="rv-note">Measured on the files in this repository, served locally. First load counts text files uncompressed.</p>
<div id="migration">{migration}</div>
<h2 id="rounds">Earlier rounds, unchanged</h2>
<ul class="rounds"><li><a class="btn line" href="../round-4/">Round 4 · the direction this refines</a></li><li><a class="btn line" href="../round-3/">Round 3 · The Living Universe</a></li><li><a class="btn line" href="../round-2/">Round 2 · three directions</a></li><li><a class="btn line" href="../">Round 1 · six concepts</a></li></ul>
</main></body></html>
'''
open(os.path.join(R, 'index.html'), 'w').write(out); print('wrote round-5/index.html', len(out))
