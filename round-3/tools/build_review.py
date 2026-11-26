"""Build the Round 3 review page: round-3/index.html

python3 round-3/tools/build_review.py

Inputs: site/meta.json, review/answers.json, review/qa.json, review/stress-results.json, ARCHITECTURE.md,
production-plan/MIGRATION.md, site/REPORT-*.md, REPORT.md, screenshots in review/screens/.
"""
import html, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mdlite import md, inline

R3 = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
e = html.escape
J = lambda p, d=None: json.load(open(os.path.join(R3, p))) if os.path.exists(os.path.join(R3, p)) else d
T = lambda p: open(os.path.join(R3, p)).read() if os.path.exists(os.path.join(R3, p)) else ''
body = lambda t: re.sub(r'^#\s+.*\n', '', t, count=1)
SCR = 'review/screens/'
meta = J('site/meta.json'); ans = J('review/answers.json', {}); qa = J('review/qa.json', {}); stress = J('review/stress-results.json', {})
key = lambda path: re.sub(r'(/?index\.html)$', '', path.replace('site/', '', 1) if path.startswith('site/') else path).strip('/').replace('/', '_') or 'home'
url = lambda path: re.sub(r'index\.html$', '', path)
has = lambda f: os.path.exists(os.path.join(R3, SCR, f))

pages = meta['pages']
links = ''.join(f'<a class="btn ghost" href="{e(url(p["path"]))}">{e(p["label"])} <span aria-hidden="true">→</span></a>' for p in pages[1:])
gallery = ''.join(
    f'<figure><a href="{SCR}{key(p["path"])}-{k}-full.webp"><img src="{SCR}{key(p["path"])}-{k}.webp" loading="lazy" alt="{e(p["label"])}, {k}" width="{1440 if k == "desktop" else 780}" height="{900 if k == "desktop" else 1688}"></a><figcaption><a href="{e(url(p["path"]))}">{e(p["label"])}</a> · {k} · <a href="{SCR}{key(p["path"])}-{k}-full.webp">full page</a></figcaption></figure>'
    for p in pages for k in ('desktop', 'mobile') if has(f'{key(p["path"])}-{k}.webp'))
extra = ''.join(
    f'<figure><img src="{SCR}{x["name"]}-{k}.webp" loading="lazy" alt="{e(x["label"])}, {k}" width="{1440 if k != "mobile" else 780}" height="{900 if k != "mobile" else 1688}"><figcaption>{e(x["label"])} · {"Firefox" if k == "firefox" else k}</figcaption></figure>'
    for x in meta.get('extraShots', []) for k in x.get('kinds', ['desktop', 'mobile']) if has(f'{x["name"]}-{k}.webp'))
ff = ''.join(f'<figure><img src="{SCR}{key(p["path"])}-firefox.webp" loading="lazy" alt="{e(p["label"])} in Firefox" width="1440" height="900"><figcaption>{e(p["label"])} · Firefox</figcaption></figure>' for p in pages[:6] if has(f'{key(p["path"])}-firefox.webp'))

answers = ''.join(f'<tr><th scope="row">{e(a["ask"])}</th><td>{inline(a["answer"])}</td><td>{" ".join(f"<a href={chr(34)}{e(l[1])}{chr(34)}>{e(l[0])}</a>" for l in a.get("see", []))}</td></tr>' for a in ans.get('rows', []))
demos = ''.join(f'<tr><th scope="row">{e(a["ask"])}</th><td>{inline(a["answer"])}</td><td>{inline(a["evidence"])}</td></tr>' for a in ans.get('demonstrations', []))

def stress_table():
    if not stress: return ''
    names = {'real/': 'Real · 44', '300/': '300', '1000/': '1,000', '3000/': '3,000', '3000-digest/': '3,000 + 55k Digest'}
    rows = ''
    for k, r in stress.items():
        b, ds, tier = k.split('|')
        if 'error' in r: continue
        rows += f'<tr><td>{names.get(ds, ds)}</td><td>{b.title()} · {"WebGL" if r["renderer"] == "webgl" else "Canvas 2D"}</td><td>{r["items"]:,}</td><td>{r["lightsDrawn"]}</td><td>{r["clustersDrawn"]}</td><td>{r["labelsDrawn"]}</td><td>{r["threadsDrawn"]}</td><td>{r["sceneBuildMs"]} ms</td><td>{r["avgDrawMs"]:.1f} / {r["worstDrawMs"]:.0f} ms</td><td>{r["avgFrameMs"]:.0f} ms</td><td>{r["domNodes"]:,}</td></tr>'
    return f'<div class="tbl"><table><thead><tr><th>Dataset (personal items)</th><th>Browser · renderer</th><th>Items</th><th>Lights drawn</th><th>Clusters</th><th>Labels</th><th>Threads</th><th>Scene build</th><th>Draw per frame (avg / worst)</th><th>Frame interval*</th><th>DOM nodes</th></tr></thead><tbody>{rows}</tbody></table></div>'

def qa_table():
    if not qa: return ''
    rows = ''
    for p, r in qa.items():
        f = r.get('firefox') or {}
        ffok = all(not v['errors'] and v['overflow'] <= 0 and v['h1'] for v in f.values()) if f else None
        rows += (f'<tr><td><a href="../{e(p)}">{e(p.replace("round-3/", "") or "review page")}</a></td><td>{"pass" if r["ok"] else "see notes"}</td><td>{r["weight_kb"]} KB</td>'
                 f'<td>{r["height"] / 900:.1f} / {r["height_mobile"] / 844:.1f}</td><td>{r["text"]["min"]:g} / {r["text_mobile"]["min"]:g} px</td><td>{len(r["errors"])}</td><td>{len(r["failed"]) + len(r["broken"])}</td>'
                 f'<td>{"none" if max(int(v) for v in r["overflow"].values()) <= 0 else "YES"}</td><td>{"still" if r["reduced_motion_changed_px"] < 400 else "moves"}</td><td>{r["nojs_text"]:,}</td><td>{"ok" if not r["offline_page_errors"] else "errors"}</td><td>{"ok" if not r["kbd_bad"] else "check"}</td><td>{"ok" if ffok else ("n/a" if ffok is None else "check")}</td></tr>')
    ok = sum(1 for r in qa.values() if r['ok'])
    return f'''<p class="section-p">{ok} of {len(qa)} pages pass every automated check.</p>
<div class="tbl"><table><thead><tr><th>Page</th><th>Result</th><th>Weight (gzip)</th><th>Length in viewports (desktop / mobile)</th><th>Smallest text (desktop / mobile)</th><th>Console errors</th><th>Broken requests</th><th>Overflow</th><th>Reduced motion</th><th>Text with JS off (chars)</th><th>Outside hosts blocked</th><th>Keyboard focus</th><th>Firefox</th></tr></thead><tbody>{rows}</tbody></table></div>'''

reports = ''.join(f'<details><summary>{e(t)}</summary><div class="md">{md(body(T(f)), 2)}</div></details>' for t, f in [('Lead: design system, homepage, universe, stress test', 'site/REPORT-lead.md'), ('Discovery: video archive, indexes, search', 'site/REPORT-discovery.md'), ('Interior pages and publishing demo', 'site/REPORT-pages.md')] if T(f))
sw = ''.join(f'<span class="sw" style="--c:{e(h)}" title="{e(n)}"><i></i>{e(n)} {e(h)}</span>' for n, h in meta.get('palette', []))

PAGE = f'''<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<title>KenAshe.ai · Round 3 · The Living Universe (design concept, not the live site)</title>
<link rel="icon" href="assets/favicon.svg"><link rel="stylesheet" href="lib/concept-flag.css"><link rel="stylesheet" href="review/review.css">
</head><body>
<div class="concept-flag" role="note"><strong>Design concept</strong><span>Round 3 review. Not the live KenAshe.ai. Not indexed.</span><a href="../round-2/">Round 2</a><a href="../">Round 1</a></div>
<a class="skip" href="#main">Skip to content</a>
<header class="top"><div class="wrap">
<p class="kicker">KenAshe.ai redesign · Round 3 · November 2026</p>
<h1>The Living Universe</h1>
<p class="intro">{e(meta.get("oneLiner", ""))}</p>
<div class="actions" style="margin-bottom:1.6rem"><a class="btn" href="site/">Open the prototype <span aria-hidden="true">→</span></a>{links}<a class="btn ghost" href="stress/">Future-scale stress test <span aria-hidden="true">→</span></a></div>
<nav class="jump" aria-label="On this page"><a href="#answers"><b>01</b> What changed</a><a href="#screens"><b>02</b> Screenshots</a><a href="#architecture"><b>03</b> Architecture</a><a href="#scale"><b>04</b> Stress test</a><a href="#verification"><b>05</b> Verification</a><a href="#migration"><b>06</b> Migration and rollback</a><a href="#report"><b>07</b> Design report</a><a href="../round-2/"><b>R2</b> Round 2</a><a href="../"><b>R1</b> Round 1</a></nav>
</div></header>
<main id="main" class="wrap">
<section id="answers"><h2 class="section-h">How Round 3 answers each request</h2>
<div class="tbl compare"><table><thead><tr><th>You asked for</th><th>What the prototype does</th><th>See it</th></tr></thead><tbody>{answers}</tbody></table></div>
<p class="meta-line"><b>Signature:</b> {e(meta.get("signature", ""))}</p><p class="meta-line"><b>Type:</b> {e(meta.get("type", ""))}</p><div class="swatches">{sw}</div></section>
<section id="screens" class="concept" style="--accent:#ffb300"><h2 class="section-h">Screenshots</h2><p class="section-p">Desktop 1440 px and mobile 390 px in Chromium. Click a picture for the full page.</p><div class="gallery">{gallery}</div>
<h3 class="section-h" style="font-size:1.3rem">Tiers, demo and stress views</h3><div class="gallery flat">{extra}</div>
<h3 class="section-h" style="font-size:1.3rem">Firefox</h3><div class="gallery flat">{ff}</div></section>
<section id="architecture" class="arch"><h2 class="section-h">Architecture</h2>
<h3>What you asked to see demonstrated</h3><div class="tbl compare"><table><thead><tr><th>Question</th><th>Answer</th><th>Evidence</th></tr></thead><tbody>{demos}</tbody></table></div>
<div class="md">{md(body(T("ARCHITECTURE.md")), 1)}</div></section>
<section id="scale"><h2 class="section-h">Future-scale stress test</h2><div class="md">{md(ans.get("stressIntro", ""), 2)}</div>{stress_table()}<div class="md">{md(ans.get("stressNotes", ""), 2)}</div>
<div class="actions"><a class="btn" href="stress/">Open the stress test <span aria-hidden="true">→</span></a></div></section>
<section id="verification"><h2 class="section-h">Verification</h2>{qa_table()}<div class="md">{md(ans.get("verificationNotes", ""), 2)}</div></section>
<section id="migration"><h2 class="section-h">Proposed migration and rollback</h2><div class="md">{md(body(T("production-plan/MIGRATION.md")), 1)}</div></section>
<section id="report" class="concept" style="--accent:#ffb300"><h2 class="section-h">Design and architecture report</h2><div class="md">{md(body(T("REPORT.md")), 1)}</div><h3>Builders' detailed reports</h3><div class="report">{reports}</div></section>
</main>
<footer class="foot wrap"><p>Concept only. Production (kenashe.ai, its repository, Vercel project and Digest pipeline) was read, never modified. Every page is <code>noindex</code>, and <code>robots.txt</code> disallows all crawling. Earlier rounds remain online: <a href="../round-2/">Round 2</a>, <a href="../">Round 1</a>.</p></footer>
</body></html>'''
open(os.path.join(R3, 'index.html'), 'w').write(PAGE)
print('wrote round-3/index.html', len(PAGE))
