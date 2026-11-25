"""Build the Round 2 review page: round-2/index.html

python3 round-2/tools/build_review.py

Inputs: round-2/directions/*/meta.json + REPORT.md, round-2/ARCHITECTURE.md,
round-2/review/comparison.json, round-2/review/qa.json (optional), screenshots in round-2/review/screens/.
"""
import html, json, os, re

R2 = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
e = html.escape


def inline(s):
    s = e(s, quote=False)
    s = re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
    s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])', r'<em>\1</em>', s)
    s = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', lambda m: f'<a href="{m.group(2)}">{m.group(1)}</a>', s)
    return s


def md(text, shift=1):
    """Small Markdown subset: headings, paragraphs, lists (2 levels), tables, code fences, quotes, rules."""
    out, lines, i = [], text.split('\n'), 0
    while i < len(lines):
        ln = lines[i]
        if ln.startswith('```'):
            j = i + 1; buf = []
            while j < len(lines) and not lines[j].startswith('```'): buf.append(lines[j]); j += 1
            out.append('<pre><code>' + e('\n'.join(buf)) + '</code></pre>'); i = j + 1; continue
        m = re.match(r'^(#{1,6})\s+(.*)', ln)
        if m:
            lvl = min(6, len(m.group(1)) + shift); out.append(f'<h{lvl}>{inline(m.group(2))}</h{lvl}>'); i += 1; continue
        if re.match(r'^\s*\|', ln):
            rows = []
            while i < len(lines) and re.match(r'^\s*\|', lines[i]): rows.append(lines[i]); i += 1
            cells = [[c.strip() for c in r.strip().strip('|').split('|')] for r in rows]
            body = [c for c in cells[1:] if not all(re.match(r'^:?-+:?$', x) for x in c)]
            out.append('<div class="tbl"><table><thead><tr>' + ''.join(f'<th>{inline(c)}</th>' for c in cells[0]) + '</tr></thead><tbody>' +
                       ''.join('<tr>' + ''.join(f'<td>{inline(c)}</td>' for c in r) + '</tr>' for r in body) + '</tbody></table></div>')
            continue
        if re.match(r'^\s*([-*]|\d+\.)\s+', ln):
            ordered = bool(re.match(r'^\s*\d+\.', ln)); tag = 'ol' if ordered else 'ul'; items = []
            while i < len(lines) and (re.match(r'^\s*([-*]|\d+\.)\s+', lines[i]) or (lines[i].startswith('  ') and lines[i].strip())):
                l = lines[i]
                if re.match(r'^\s{2,}([-*]|\d+\.)\s+', l) and items: items[-1][1].append(re.sub(r'^\s*([-*]|\d+\.)\s+', '', l))
                elif re.match(r'^\s*([-*]|\d+\.)\s+', l): items.append([re.sub(r'^\s*([-*]|\d+\.)\s+', '', l), []])
                elif items: items[-1][0] += ' ' + l.strip()
                i += 1
            out.append(f'<{tag}>' + ''.join(f'<li>{inline(a)}' + (('<ul>' + ''.join(f'<li>{inline(x)}</li>' for x in sub) + '</ul>') if sub else '') + '</li>' for a, sub in items) + f'</{tag}>')
            continue
        if ln.startswith('>'):
            buf = []
            while i < len(lines) and lines[i].startswith('>'): buf.append(lines[i].lstrip('> ')); i += 1
            out.append('<blockquote>' + inline(' '.join(buf)) + '</blockquote>'); continue
        if re.match(r'^\s*(-{3,}|\*{3,})\s*$', ln): out.append('<hr>'); i += 1; continue
        if not ln.strip(): i += 1; continue
        buf = []
        while i < len(lines) and lines[i].strip() and not re.match(r'^(#|```|\s*\||\s*([-*]|\d+\.)\s|>)', lines[i]): buf.append(lines[i].strip()); i += 1
        out.append('<p>' + inline(' '.join(buf)) + '</p>')
    return '\n'.join(out)


def sections(report_md):
    """Split a REPORT.md into (title, html) by its ## headings; drop the top # title."""
    body = re.sub(r'^#\s+.*\n', '', report_md, count=1)
    parts = re.split(r'^##\s+(.+)$', body, flags=re.M)
    intro = md(parts[0], 2) if parts[0].strip() else ''
    return intro, [(parts[k].strip(), md(parts[k + 1], 2)) for k in range(1, len(parts), 2)]


dirs = sorted(d for d in os.listdir(os.path.join(R2, 'directions')) if os.path.exists(os.path.join(R2, 'directions', d, 'meta.json')))
COMP = json.load(open(os.path.join(R2, 'review', 'comparison.json'))) if os.path.exists(os.path.join(R2, 'review', 'comparison.json')) else {}
QA = json.load(open(os.path.join(R2, 'review', 'qa.json'))) if os.path.exists(os.path.join(R2, 'review', 'qa.json')) else {}
SCR = 'review/screens/'


def page_key(path):
    return re.sub(r'(/?index\.html)$', '', path).strip('/').replace('/', '_') or 'home'


cards, details = [], []
for d in dirs:
    m = json.load(open(os.path.join(R2, 'directions', d, 'meta.json')))
    m['pages'] = [pg for pg in m['pages'] if '?' not in pg['path']]
    rep = open(os.path.join(R2, 'directions', d, 'REPORT.md')).read() if os.path.exists(os.path.join(R2, 'directions', d, 'REPORT.md')) else ''
    home = f'directions/{d}/'
    acc = (COMP.get('accents') or {}).get(m['letter'], '#141414')
    links = ''.join(f'<a class="btn ghost" href="directions/{d}/{re.sub(r"index.html$", "", pg["path"])}">{e(pg["label"])} <span aria-hidden="true">→</span></a>' for pg in m['pages'][1:])
    links += f'<a class="btn ghost" href="directions/{d}/?demo=build,essay,video">Homepage with demo entries</a>'
    cards.append(f'''<article class="card" style="--accent:{acc}">
  <a class="shots" href="{home}" aria-label="Open Direction {e(m['letter'])} homepage">
    <img class="d" src="{SCR}{d}--home-desktop.webp" width="1440" height="900" alt="Direction {e(m['letter'])} homepage, desktop" loading="lazy">
    <img class="m" src="{SCR}{d}--home-mobile.webp" width="780" height="1688" alt="Direction {e(m['letter'])} homepage, mobile" loading="lazy"></a>
  <div class="card-body"><p class="num">Direction {e(m['letter'])}</p><h3><a href="{home}">{e(m['name'])}</a></h3>
    <p class="one">{e(m['oneLiner'])}</p><p class="sig"><b>Signature:</b> {e(m.get('signature', ''))}</p>
    <div class="actions"><a class="btn" href="{home}">Open homepage <span aria-hidden="true">→</span></a>{links}<a class="btn ghost" href="#{d}">Read the report</a></div></div>
</article>''')
    gal = ''.join(
        f'<figure><a href="{SCR}{d}--{page_key(pg["path"])}-{k}-full.webp"><img src="{SCR}{d}--{page_key(pg["path"])}-{k}.webp" loading="lazy" alt="{e(m["name"])}: {e(pg["label"])}, {k}" width="{1440 if k == "desktop" else 780}" height="{900 if k == "desktop" else 1688}"></a><figcaption>{e(pg["label"])} · {k} · <a href="{SCR}{d}--{page_key(pg["path"])}-{k}-full.webp">full page</a></figcaption></figure>'
        for pg in m['pages'] for k in ('desktop', 'mobile'))
    gal += ''.join(f'<figure><img src="{SCR}{d}--demo-{k}.webp" loading="lazy" alt="{e(m["name"])} homepage with the three demo entries applied, {k}" width="{1440 if k == "desktop" else 780}" height="{900 if k == "desktop" else 1688}"><figcaption>Homepage with demo entries · {k}</figcaption></figure>' for k in ('desktop', 'mobile'))
    intro, secs = sections(rep)
    sw = ''.join(f'<span class="sw" style="--c:{e(h)}" title="{e(n)}"><i></i>{e(n)} {e(h)}</span>' for n, h in m.get('palette', []))
    acc_html = ''.join(f'<details{" open" if k < 2 else ""}><summary>{inline(t)}</summary><div class="md">{h}</div></details>' for k, (t, h) in enumerate(secs))
    details.append(f'''<section class="concept" id="{d}" style="--accent:{acc}" aria-labelledby="h-{d}">
  <header class="concept-head"><p class="num">Direction {e(m['letter'])}</p><h2 id="h-{d}">{e(m['name'])}</h2><p class="lede">{e(m['oneLiner'])}</p>
  <p class="meta-line"><b>Type:</b> {e(m.get('type', ''))}</p><div class="swatches">{sw}</div>
  <div class="actions"><a class="btn" href="{home}">Open homepage <span aria-hidden="true">→</span></a>{links}</div></header>
  <div class="gallery">{gal}</div>
  <div class="md intro">{intro}</div>
  <div class="report">{acc_html}</div>
</section>''')

# comparison table
comp_html = ''
if COMP.get('rows'):
    letters = COMP['columns']
    comp_html = '<div class="tbl compare"><table><thead><tr><th scope="col">Dimension</th>' + ''.join(f'<th scope="col">{e(c)}</th>' for c in letters) + '</tr></thead><tbody>'
    group = None
    for r in COMP['rows']:
        if r.get('group') and r['group'] != group:
            group = r['group']; comp_html += f'<tr class="grp"><th colspan="{len(letters) + 1}" scope="colgroup">{e(group)}</th></tr>'
        comp_html += f'<tr><th scope="row">{e(r["label"])}</th>' + ''.join(f'<td>{inline(v)}</td>' for v in r['values']) + '</tr>'
    comp_html += '</tbody></table></div>'

arch = md(re.sub(r'^#\s+.*\n', '', open(os.path.join(R2, 'ARCHITECTURE.md')).read(), count=1), 1)

qa_html = ''
if QA:
    n = len(QA); ok = sum(1 for r in QA.values() if r.get('robots') and 'noindex' in r['robots'] and r.get('flag') and r.get('h1') == 1 and not r['errors'] and not r['failed'] and not r['broken'] and max(int(v) for v in r['overflow'].values()) <= 0)
    rows = ''.join(f'<tr><td><a href="../{e(p)}">{e(p.replace("round-2/", "") or "review")}</a></td><td>{"yes" if r.get("robots") and "noindex" in r["robots"] else "NO"}</td><td>{r["h1"]}</td><td>{len(r["errors"])}</td><td>{len(r["failed"]) + len(r["broken"])}</td><td>{max(int(v) for v in r["overflow"].values()) <= 0 and "none" or "YES"}</td><td>{r["nojs_text"]:,} chars</td><td>{r["height"]:,} / {r["height_mobile"]:,}</td></tr>' for p, r in QA.items())
    qa_html = f'''<p class="section-p">{ok} of {n} pages pass every check. Pages measured in headless Chromium at 1440, 768 and 390 px; “JS off” is the visible text with JavaScript disabled, which is how the prerendered (production-style) HTML reads.</p>
<div class="tbl"><table><thead><tr><th>Page</th><th>noindex</th><th>h1</th><th>Console errors</th><th>Broken requests</th><th>Overflow</th><th>JS off</th><th>Height desktop / mobile (px)</th></tr></thead><tbody>{rows}</tbody></table></div>'''

PAGE = f'''<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<title>KenAshe.ai · Round 2 design directions (concepts, not the live site)</title>
<link rel="icon" href="assets/favicon.svg"><link rel="stylesheet" href="lib/concept-flag.css"><link rel="stylesheet" href="review/review.css">
</head><body>
<div class="concept-flag" role="note"><strong>Design concepts</strong><span>Round 2 review. Not the live KenAshe.ai. Not indexed.</span><a href="../">Round 1 concepts</a></div>
<a class="skip" href="#main">Skip to content</a>
<header class="top"><div class="wrap">
<p class="kicker">KenAshe.ai redesign · Round 2 · November 2026</p>
<h1>Three refined directions</h1>
<p class="intro">Innovation in the experience. Simplicity in the architecture. Each direction is a working prototype built on the <b>same</b> content pipeline, which reads production's own data files unchanged. They differ in experience, not in how content is stored or published. No direction has been selected.</p>
<nav class="jump" aria-label="On this page"><a href="#directions"><b>01</b> The directions</a><a href="#architecture"><b>02</b> Shared architecture</a><a href="#compare"><b>03</b> Comparison</a>{''.join(f'<a href="#{d}"><b>{e(json.load(open(os.path.join(R2, "directions", d, "meta.json")))["letter"])}</b> {e(json.load(open(os.path.join(R2, "directions", d, "meta.json")))["name"])}</a>' for d in dirs)}<a href="#verification"><b>QA</b> Verification</a><a href="../"><b>R1</b> Round 1</a></nav>
</div></header>
<main id="main" class="wrap">
<h2 class="section-h" id="directions">The directions</h2>
<p class="section-p">Each has a homepage, representative interior pages at production URLs, and a publishing demo that adds an example project, article and video and shows what updates by itself.</p>
<div class="grid">{''.join(cards)}</div>
<section id="architecture" class="arch" aria-labelledby="h-arch"><h2 class="section-h" id="h-arch">One content architecture, three experiences</h2><div class="md">{arch}</div></section>
<section id="compare" aria-labelledby="h-compare"><h2 class="section-h" id="h-compare">Comparison</h2><p class="section-p">{e(COMP.get('intro', ''))}</p>{comp_html}</section>
{''.join(details)}
<section id="verification" aria-labelledby="h-qa"><h2 class="section-h" id="h-qa">Verification</h2>{qa_html}</section>
</main>
<footer class="foot wrap"><p>Concepts only. Production (kenashe.ai, its repository, Vercel project and Digest pipeline) was read, never modified. Every page here is <code>noindex</code>, and <code>robots.txt</code> disallows all crawling.</p></footer>
</body></html>'''
open(os.path.join(R2, 'index.html'), 'w').write(PAGE)
print('wrote round-2/index.html', len(PAGE))
