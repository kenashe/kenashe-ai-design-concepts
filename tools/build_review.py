"""Generate the central review page (index.html) from review/concepts.json.

python3 tools/build_review.py
"""
import html, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
C = json.load(open(os.path.join(ROOT, 'review', 'concepts.json')))
META = json.load(open(os.path.join(ROOT, 'review', 'meta.json')))
e = html.escape


def li(items):
    return ''.join(f'<li>{x}</li>' for x in items)


def swatches(pal):
    return ''.join(f'<span class="sw" style="--c:{e(h)}" title="{e(n)} {e(h)}"><i></i>{e(h)}</span>' for n, h in pal)


cards, details, rows = [], [], []
for i, c in enumerate(C, 1):
    s = c['slug']
    home = f'concepts/{s}/'
    interiors = ''.join(
        f'<a class="btn ghost" href="concepts/{s}/{p}">{e(label)} <span aria-hidden="true">→</span></a>'
        for p, label in zip(c['interiors'], c['interiorLabels']))
    cards.append(f'''
<article class="card" id="card-{s}" style="--accent:{c['accent']}">
  <a class="shots" href="{home}" aria-label="Open {e(c['name'])} homepage">
    <img class="d" src="review/screens/{s}-desktop.webp" width="1440" height="900" alt="{e(c['name'])} homepage on desktop" loading="lazy">
    <img class="m" src="review/screens/{s}-mobile.webp" width="780" height="1688" alt="{e(c['name'])} homepage on mobile" loading="lazy">
  </a>
  <div class="card-body">
    <p class="num">Concept {i:02d}</p>
    <h3><a href="{home}">{e(c['name'])}</a></h3>
    <p class="one">{e(c['oneLiner'])}</p>
    <p class="tags">{e(c['tags'])}</p>
    <div class="actions"><a class="btn" href="{home}">Open homepage <span aria-hidden="true">→</span></a>{interiors}<a class="btn ghost" href="#{s}">Read the notes</a></div>
  </div>
</article>''')

    gallery = ''.join(
        f'<figure><a href="review/screens/{s}{suf}-{kind}-full.webp"><img src="review/screens/{s}{suf}-{kind}.webp" loading="lazy" alt="{e(c["name"])} {e(lbl)} on {kind}" width="{1440 if kind == "desktop" else 780}" height="{900 if kind == "desktop" else 1688}"></a><figcaption>{e(lbl)} · {kind} <a href="review/screens/{s}{suf}-{kind}-full.webp">full page</a></figcaption></figure>'
        for suf, lbl in [('', 'Homepage')] + [(('-interior' if j == 0 else f'-interior{j+1}'), l) for j, l in enumerate(c['interiorLabels'])]
        for kind in ('desktop', 'mobile'))

    details.append(f'''
<section class="concept" id="{s}" style="--accent:{c['accent']}" aria-labelledby="h-{s}">
  <header class="concept-head">
    <p class="num">Concept {i:02d}</p>
    <h2 id="h-{s}">{e(c['name'])}</h2>
    <p class="lede">{e(c['philosophy'])}</p>
    <div class="actions"><a class="btn" href="{home}">Open homepage <span aria-hidden="true">→</span></a>{interiors}</div>
  </header>
  <div class="gallery">{gallery}</div>
  <div class="cols">
    <div>
      <h3>Identity</h3>
      <dl class="spec">
        <dt>Typography</dt><dd>{e(c['type'])}</dd>
        <dt>Palette</dt><dd class="pal">{swatches(c['palette'])}</dd>
        <dt>Navigation</dt><dd>{e(c['nav'])}</dd>
        <dt>Layout</dt><dd>{e(c['layout'])}</dd>
        <dt>Live data</dt><dd>{e(c['live'])}</dd>
      </dl>
    </div>
    <div>
      <h3>Animation and interaction</h3>
      <ul class="motion">{li(c['motion'])}</ul>
      <p class="rm"><strong>Reduced motion:</strong> {e(c['reducedMotion'])}</p>
    </div>
    <div>
      <h3>Technical and maintenance</h3>
      <ul>{li(c['maintenance'])}</ul>
      <p class="weight"><strong>Page weight (homepage, transferred before interaction):</strong> {e(c.get('weight', 'n/a'))}</p>
      {('<h3>Known limits of the prototype</h3><ul>' + li(c['known']) + '</ul>') if c.get('known') else ''}
    </div>
  </div>
</section>''')


def li_inline(items):
    return '<ul>' + ''.join(f'<li>{e(x)}</li>' for x in items) + '</ul>'


rows = []
for i, c in enumerate(C, 1):
    rows.append(f'<tr><th scope="row"><a href="#{c["slug"]}">{i:02d} · {e(c["name"])}</a></th><td>{e(c["mode"])}</td><td>{li_inline(c["strengths"])}</td><td>{li_inline(c["tradeoffs"])}</td><td>{e(c["effort"])}</td></tr>')

page = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<title>KenAshe.ai redesign · Six design concepts for review</title>
<meta name="description" content="Six independent design prototypes for a KenAshe.ai redesign. Concepts only, not the live site.">
<link rel="icon" href="shared/img/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="shared/concept-flag.css">
<link rel="stylesheet" href="review/review.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="concept-flag" role="note"><strong>Design concepts</strong><span>Review page for six KenAshe.ai prototypes. Not the live site. Not indexed.</span><a href="https://kenashe.ai/" rel="noopener">Live KenAshe.ai</a></div>
<header class="top">
  <div class="wrap">
    <p class="kicker">KenAshe.ai · Redesign exploration · Round 1 · {e(META['date'])}</p>
    <h1>Six directions for KenAshe.ai</h1>
    <p class="intro">{META['intro']}</p>
    <nav aria-label="Concepts" class="jump">{''.join(f'<a href="#{c["slug"]}" style="--accent:{c["accent"]}"><b>{i:02d}</b> {e(c["name"])}</a>' for i, c in enumerate(C, 1))}</nav>
  </div>
</header>
<main id="main">
  <section class="wrap grid-wrap" aria-labelledby="h-all">
    <h2 id="h-all" class="section-h">All six concepts</h2>
    <p class="section-p">Each card opens a working prototype. The large image is the desktop homepage at 1440 px; the inset is the mobile homepage at 390 px. Concepts are listed in brief order, not ranked.</p>
    <div class="grid">{''.join(cards)}</div>
  </section>

  <section class="wrap how" aria-labelledby="h-how">
    <h2 id="h-how" class="section-h">How these were built</h2>
    <div class="how-grid">{''.join(f'<div><h3>{e(t)}</h3><p>{b}</p></div>' for t, b in META['how'])}</div>
  </section>

  <section class="wrap" aria-labelledby="h-cmp">
    <h2 id="h-cmp" class="section-h">Side by side</h2>
    <p class="section-p">Strengths and tradeoffs, so the differences are easy to weigh. No winner is selected.</p>
    <div class="table-wrap" tabindex="0" role="region" aria-label="Comparison table">
    <table class="cmp">
      <thead><tr><th scope="col">Concept</th><th scope="col">Mode</th><th scope="col">Strengths</th><th scope="col">Tradeoffs</th><th scope="col">Production effort</th></tr></thead>
      <tbody>{''.join(rows)}</tbody>
    </table>
    </div>
  </section>

  <div class="details">{''.join(details)}</div>

  <section class="wrap how" aria-labelledby="h-tech">
    <h2 id="h-tech" class="section-h">Technical and maintenance notes for every direction</h2>
    <div class="how-grid">{''.join(f'<div><h3>{e(t)}</h3><p>{b}</p></div>' for t, b in META['tech'])}</div>
  </section>

  <section class="wrap how" aria-labelledby="h-next">
    <h2 id="h-next" class="section-h">Giving feedback</h2>
    <div class="how-grid">{''.join(f'<div><h3>{e(t)}</h3><p>{b}</p></div>' for t, b in META['next'])}</div>
  </section>
</main>
<footer class="foot"><div class="wrap"><p>{META['footer']}</p></div></footer>
</body>
</html>'''
open(os.path.join(ROOT, 'index.html'), 'w').write(page)
print('wrote index.html', len(page))
