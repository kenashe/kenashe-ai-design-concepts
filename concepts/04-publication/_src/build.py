#!/usr/bin/env python3
"""Concept 04 · The Independent Publication — static page generator.

Reads ../../../shared/content.json (the single source of truth) and writes plain static HTML:
  concepts/04-publication/index.html
  concepts/04-publication/writing/4-tips-for-making-ai-videos-that-feel-like-films/index.html
The output needs no build step to be served; this script only exists so the copy stays
in lock-step with content.json. Run:  python3 _src/build.py
"""
import json, html, re, datetime, pathlib

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent            # concepts/04-publication
REPO = ROOT.parent.parent     # repo root
C = json.loads((REPO / "shared/content.json").read_text())

e = lambda s: html.escape(str(s), quote=True)
MON = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split()

def d_short(iso):
    y, m, d = map(int, iso[:10].split("-"))
    return f"{MON[m-1]} {d}, {y}"

def d_long(iso):
    return datetime.date(*map(int, iso[:10].split("-"))).strftime("%B %-d, %Y")

def ext(url, text, cls="", extra=""):
    c = f' class="{cls}"' if cls else ""
    return f'<a{c} href="{e(url)}" rel="noopener"{extra}>{text}</a>'

SNAP = C["_meta"]["snapshotDate"]                       # 2026-11-25
SNAP_LABEL = f"Snapshot · {d_short(SNAP)}"
SNAP_DATE = datetime.date(*map(int, SNAP.split("-")))
BUILDS, VIDEOS, WRITING, DIGEST = C["builds"], C["videos"], C["writing"], C["digest"]
FILM = C["films"]["returningYourThings"]
SOC = {s["id"]: s for s in C["socials"]}
N_LIVE = sum(b["status"] == "LIVE" for b in BUILDS)
N_SHIP = sum(b["status"] == "SHIPPED" for b in BUILDS)

def build_when(b):
    if b.get("shippedAt"): return b["shippedAt"]
    if b.get("footer"): return b["footer"][0]
    return ""

def authorship_kind(a):
    a = a.lower()
    if "by hand" in a: return "hand"
    if "firsthand" in a: return "firsthand"
    if "original" in a: return "refresh"
    return "assisted"

def authorship(a):
    return f'<span class="authorship" data-kind="{authorship_kind(a)}"><span class="k">Authorship</span> {e(a)}</span>'

def status(s):
    return f'<span class="status status--{s.lower()}">{e(s)}</span>'

# ------------------------------------------------------------------------------------------
# Article content: verbatim from research/writing_4-tips-for-making-ai-videos-that-feel-like-films.(txt|html)
# ------------------------------------------------------------------------------------------
ART = next(w for w in WRITING if w["slug"] == "4-tips-for-making-ai-videos-that-feel-like-films")
VID = next(v for v in VIDEOS if v["id"] == "3MOFBulJd_s")
YT = "3MOFBulJd_s"
FILM_PAGE = "https://kenashe.ai/building/returning-your-things/"
MUSOPEN = "https://commons.wikimedia.org/wiki/File:Robert_Schumann_-_scenes_from_childhood,_op._15_-_i._of_foreign_lands_and_peoples.ogg"

P_OPEN = ("I knew my actors needed character sheets. I didn’t expect my coffee mug to need one, too. In one picture, "
          "a blue flower was painted in the middle of the cup. In another, the same flower was attached to the broken handle. "
          "Both pictures looked fine until I put them next to each other.")
TIPS = [
    ("Give recurring objects a reference sheet.", 12, "0:12"),
    ("Tell the AI what to keep, not just what to change.", 96, "1:36"),
    ("Lock the pictures before you work on sound.", 152, "2:32"),
    ("Choose music for the story, not for every cut.", 224, "3:44"),
]

def words(s):
    return len(re.findall(r"[\w’'-]+", re.sub(r"<[^>]+>", " ", s)))

# ------------------------------------------------------------------------------------------
# Shared chrome
# ------------------------------------------------------------------------------------------
SECTIONS = [
    ("A1", "front", "Front page", "The lead feature, the Build Desk and the notebook."),
    ("B1", "features", "Features & Essays", "Ken’s writing, each with its authorship label."),
    ("C1", "build-desk", "Build Desk", f"{len(BUILDS)} builds on file, reported with LIVE or SHIPPED status."),
    ("D1", "watch", "Watch", "The short film, videos and shorts."),
    ("W", "wire", "The Wire", "The Digest. Automated, machine-published."),
    ("E1", "author", "The Author", "Background, credentials, speaking and judging."),
    ("F1", "press", "Press & Standards", "Coverage, sponsorship rules, the author’s company."),
    ("G1", "follow", "Follow", "RSS, socials and email."),
]

def head(title, desc, depth, extra_head="", preload=("fraunces-normal-100-900.woff2", "newsreader-normal-200-800.woff2")):
    up = "../" * depth
    pre = "".join(f'<link rel="preload" href="{up}concepts/04-publication/fonts/{f}" as="font" type="font/woff2" crossorigin>' for f in preload)
    me = "../" * (depth - 2)  # path to concepts/04-publication/
    pre = "".join(f'\n<link rel="preload" href="{me}fonts/{f}" as="font" type="font/woff2" crossorigin>' for f in preload)
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta name="color-scheme" content="light">
<meta name="theme-color" content="#F1ECE1">
<link rel="icon" href="{up}shared/img/favicon.svg" type="image/svg+xml">{pre}
<link rel="stylesheet" href="{up}shared/concept-flag.css">
<link rel="stylesheet" href="{me}assets/pub.css">
<script>document.documentElement.classList.add('js');{extra_head}</script>
</head>'''

def flag(depth):
    return f'<div class="concept-flag" role="note"><strong>Design concept</strong><span>Concept 04 · The Independent Publication. Not the live KenAshe.ai. Not indexed.</span><a href="{"../" * depth}">All six concepts</a></div>'

def sectionbar(home_prefix, article=False):
    items = []
    for f, sid, name, _ in SECTIONS:
        if sid == "wire":
            items.append(f'<li><a class="wire-link" href="{home_prefix}#{sid}">The Wire <span class="auto">AUTOMATED</span></a></li>')
        else:
            items.append(f'<li><a href="{home_prefix}#{sid}">{e(name)}</a></li>')
    idx = []
    for f, sid, name, d in SECTIONS:
        cls = ' class="is-wire"' if sid == "wire" else ""
        nm = "The Wire · Automated" if sid == "wire" else e(name)
        idx.append(f'<li{cls}><a href="{home_prefix}#{sid}"><span class="f">{f}</span><span class="t">{nm}</span><span class="d">{e(d)}</span></a></li>')
    rm = ""
    progress = ""
    if article:
        rm = '''<div class="rm">
  <button class="rm-btn" type="button" aria-expanded="false" aria-controls="rm-panel"><span class="aa" aria-hidden="true">Aa</span> <span class="lbl">Reading mode</span></button>
  <div class="rm-panel" id="rm-panel" role="group" aria-label="Reading mode" hidden>
    <fieldset><legend>Text size</legend><div class="seg">
      <label><input type="radio" name="size" value="s"><span>S</span></label>
      <label><input type="radio" name="size" value="m"><span>M</span></label>
      <label><input type="radio" name="size" value="l"><span>L</span></label>
      <label><input type="radio" name="size" value="xl"><span>XL</span></label></div></fieldset>
    <fieldset><legend>Typeface</legend><div class="seg">
      <label><input type="radio" name="face" value="serif"><span>Serif</span></label>
      <label><input type="radio" name="face" value="sans"><span>Sans</span></label></div></fieldset>
    <fieldset><legend>Paper</legend><div class="seg">
      <label><input type="radio" name="theme" value="light"><span>Light</span></label>
      <label><input type="radio" name="theme" value="sepia"><span>Sepia</span></label>
      <label><input type="radio" name="theme" value="dark"><span>Dark</span></label></div></fieldset>
    <button type="button" class="reset">Reset to defaults</button>
  </div>
</div>'''
        progress = '<div class="progress" role="progressbar" aria-label="Reading progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div>'
    plate_cls = "mini-plate mini-plate--on" if article else "mini-plate"
    return f'''<nav class="sectionbar" aria-label="Sections">
  <div class="wrap sectionbar__in">
    <a class="{plate_cls}" href="{home_prefix or './'}#top" aria-label="Ken Ashe, front page">Ken Ashe<span class="ai">.ai</span></a>
    <ul class="sections">{"".join(items)}</ul>
    {rm}
    <button class="sections-btn" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="sections-index"><span class="bars" aria-hidden="true"></span>Sections</button>
  </div>
  {progress}
</nav>
<dialog class="index-dialog" id="sections-index" aria-labelledby="idx-title">
  <div class="index-dialog__in">
    <div class="index-dialog__top"><p id="idx-title">Sections</p><button type="button" class="close-btn">Close</button></div>
    <ol class="index-list">{"".join(idx)}</ol>
    <p class="index-dialog__foot">{e(C["identity"]["footerLine"])}</p>
  </div>
</dialog>'''

def footer(home_prefix, depth):
    up = "../" * depth
    return f'''<footer class="foot" role="contentinfo">
  <div class="wrap foot__in">
    <p class="plate">Ken Ashe<span class="ai">.ai</span></p>
    <p class="line">{e(C["identity"]["footerLine"])}</p>
    <nav aria-label="Footer"><ul>
      <li>{ext("https://kenashe.ai/", "Live KenAshe.ai ↗")}</li>
      <li>{ext(C["press"]["newsroomUrl"], "Newsroom ↗")}</li>
      <li>{ext(SOC["rss"]["url"], "Writing RSS ↗")}</li>
      <li><a href="mailto:{C["identity"]["email"]}">{C["identity"]["email"]}</a></li>
      <li><a href="{up}">All six concepts</a></li>
    </ul></nav>
    <p class="colophon">Colophon: set in Fraunces, Newsreader and Public Sans; The Wire is set in IBM Plex Mono to mark machine output. Content is a snapshot of KenAshe.ai as of {d_long(SNAP)}. This is design concept 04, a prototype: not the live site, not indexed, no cookies, no tracking.</p>
  </div>
</footer>'''

# ------------------------------------------------------------------------------------------
# FRONT PAGE
# ------------------------------------------------------------------------------------------
def yt_link(v, img_prefix, title=None, eager=False, label="Play", start=None, w=1280, h=720, alt=None):
    t = title or v["title"]
    st = f' data-start="{start}"' if start else ""
    load = 'fetchpriority="high"' if eager else 'loading="lazy"'
    alt = alt if alt is not None else ""
    return (f'<a class="yt" href="{e(v["url"])}" rel="noopener" data-yt="{v["id"]}"{st} data-title="{e(t)}" aria-label="{e(label)}: {e(t)} (loads YouTube)">'
            f'<img src="{img_prefix}{e(v["thumbnail"])}" alt="{e(alt)}" width="{w}" height="{h}" {load} decoding="async">'
            f'<span class="play" aria-hidden="true">{e(label)}</span></a>')

def front():
    S = "../../"   # to repo root
    art_rel = "writing/4-tips-for-making-ai-videos-that-feel-like-films/"
    zh = BUILDS[0]
    econ = BUILDS[2]
    snap = C["live"]["zerohumanStatus"]["snapshot"]
    ghs = C["live"]["githubCommits"]["snapshot"][0]
    latest_build = BUILDS[0]
    weekday = SNAP_DATE.strftime("%A, %B %-d, %Y")

    # reading time for the lead essay, computed from the same verbatim body used on the article page
    art_words = article_word_count()
    art_min = max(1, round(art_words / 230))

    # ----- masthead
    out = [head("Concept 04 · The Independent Publication — Ken Ashe",
                "Concept 04 for KenAshe.ai: an independent technology publication with one author. Features and essays, the Build Desk, Watch, and The Wire, the clearly labeled automated Digest.",
                2), '<body id="top">', flag(2),
           '<a class="skip" href="#main">Skip to the front page</a>']
    out.append(f'''<header class="masthead wrap" role="banner">
  <div class="ears">
    <p class="ear"><b>The rule of this paper</b>{e(C["identity"]["footerLine"])}</p>
    <h1 class="nameplate"><a href="#top">Ken Ashe<span class="ai">.ai</span></a></h1>
    <p class="ear ear--r"><b>The Wire · Automated</b><span class="mono">{DIGEST["publishedCount"]:,} machine-published posts as of {d_short(DIGEST["publishedCountAsOf"])}. Kept apart from Ken’s writing, on <a class="inline-link" href="#wire">page W</a>.</span></p>
  </div>
  <p class="motto">{e(C["identity"]["tagline"])}</p>
  <div class="dateline">
    <span>{weekday}</span>
    <span class="hide-m muted">{e(C["identity"]["location"])}</span>
    <span class="hide-m">One author · {len(BUILDS)} builds · {len(WRITING)} essays · {len(VIDEOS)} videos</span>
    <span class="muted">Edition: content as of {d_short(SNAP)}</span>
  </div>
</header>''')
    out.append(sectionbar(""))
    out.append('<main id="main">')

    # ----- A1 FRONT
    first_two = f'''<p class="dropcap">{e(P_OPEN)}</p>
      <p>These are the four things I’d do again.</p>
      <h4 class="hl-s" style="margin:.2rem 0 .4rem">1. Give recurring objects a reference sheet.</h4>
      <p>I had a sheet for each actor so I could recognize the same two people on a spring rooftop, by the water in summer, and across a kitchen table. The objects needed references for a different reason: they’re how you know whose memory you’re in. A man picks up a piece of pottery in the snow. Cut to the kitchen. You need to recognize that cup without anybody saying a word.</p>'''
    now_items = "".join(f'<li><time datetime="{n["date"]}">{d_short(n["date"])}</time>{e(n["text"])}</li>' for n in C["now"]["items"])
    interests = "".join(f"<li>{e(i)}</li>" for i in C["now"]["interests"])
    out.append(f'''<section class="front wrap" id="front" aria-labelledby="front-h">
  <h2 class="visually-hidden" id="front-h">Front page</h2>
  <div class="grid12">
    <article class="front__lead" aria-labelledby="lead-h">
      <p class="kicker"><span>Feature</span><span class="sep">/</span><span>The making of a short film</span></p>
      <h3 class="hl hl-xl" id="lead-h"><a href="{art_rel}">{e(ART["title"])}</a></h3>
      <p class="dek">{e(ART["dek"])}</p>
      <p class="byline"><span>By <strong>Ken Ashe</strong></span><time datetime="{ART["published"]}">{e(ART["date"])}</time><span>{art_min} min read</span>{authorship(ART["authorship"])}</p>
      <figure class="lead-fig">
        <a href="{art_rel}" tabindex="-1" aria-hidden="true"><img src="{S}{ART["image"]}" alt="{e(ART["imageAlt"])}" width="1280" height="720" fetchpriority="high" decoding="async"></a>
        <figcaption><b>The mug, before and after.</b> I moved the flower on the intact mug. Now the handle and flower can break off together. Still from <em>Returning Your Things</em>, made with AI-generated imagery.</figcaption>
      </figure>
      <div class="cols2 prose">{first_two}</div>
      <div class="jump"><span class="meta">Continued: four lessons, with timestamps into the 4:49 walkthrough</span><a class="more" href="{art_rel}">Read the full feature →</a></div>
    </article>

    <div class="front__mid vr" role="region" aria-label="From the Build Desk">
      <article class="story">
        <p class="kicker"><span>Build Desk</span></p>
        <p class="byline"><span class="dl">{e(zh["shippedAt"])}</span>{status(zh["status"])}</p>
        <h3 class="hl hl-l"><a href="{e(zh["url"])}" rel="noopener">ZeroHuman is open to any agent. No outside agent has bought yet.</a></h3>
        <p>{e(zh["dek"])}</p>
        <p class="honest">As of Nov 20, 2026, both paid orders came from Ken’s own test buyer. The real test is the first wallet he has never seen paying <b>zerohuman.eth</b>.</p>
        <div class="databox" data-live="zerohuman" data-url="{e(C["live"]["zerohumanStatus"]["url"])}">
          <div class="databox__h"><span>zerohuman.eth · service status</span><span class="src" data-state="snapshot" data-snapshot="{SNAP_LABEL}">{SNAP_LABEL}</span></div>
          <dl>
            <dt>Health</dt><dd data-f="healthy">{"Healthy" if snap["healthy"] else "Not healthy"}</dd>
            <dt>Mode</dt><dd data-f="mode">{snap["mode"].capitalize()}</dd>
            <dt>Latest block seen</dt><dd data-f="head">{int(snap["head"]):,}</dd>
            <dt>Orders fulfilled*</dt><dd data-f="orders">{snap["ordersFulfilled"]}</dd>
            <dt>Last tick</dt><dd data-f="tick">{d_short(snap["lastTickAt"])}</dd>
          </dl>
          <p class="databox__f">* All paid orders so far, including Ken’s own test buyer. Dated snapshot from the public /api/status endpoint; replaced with live figures only if this page’s single request succeeds.</p>
        </div>
      </article>
      <article class="story">
        <p class="kicker"><span>Watch</span><span class="sep">/</span><span>Short film · {FILM["runtime"]}</span></p>
        <a href="#watch" tabindex="-1" aria-hidden="true"><img src="{S}{FILM["stills"][2]}" alt="" width="1280" height="720" loading="lazy" decoding="async" style="aspect-ratio:16/9;object-fit:cover;margin-bottom:.7rem"></a>
        <h3 class="hl hl-m"><a href="#watch"><em>Returning Your Things</em></a></h3>
        <p>{e(FILM["logline"])}</p>
        <p class="meta">Released {d_short(FILM["released"])} · Film by Ken Ashe</p>
      </article>
    </div>

    <aside class="front__rail vr notebook" aria-labelledby="now-h">
      <p class="kicker"><span>Now</span></p>
      <h2 id="now-h">From the notebook</h2>
      <p class="lede">What Ken is doing, compiled only from dated entries on the site.</p>
      <ol>{now_items}</ol>
      <div class="desk"><h3>On the desk</h3><ul>{interests}</ul></div>
      <a class="wire-teaser" href="#wire"><b>THE WIRE · AUTOMATED</b>{DIGEST["publishedCount"]:,} machine-published posts as of {DIGEST["publishedCountAsOf"]}. Not Ken’s writing. Read the feed on page W →</a>
    </aside>
  </div>
</section>''')

    # ----- B1 FEATURES
    kinds = {}
    for w in WRITING:
        kinds.setdefault(authorship_kind(w["authorship"]), []).append(w)
    kind_labels = [("all", "All essays", len(WRITING)),
                   ("hand", "Written by hand", len(kinds.get("hand", []))),
                   ("assisted", "Human-directed, AI-assisted", len(kinds.get("assisted", []))),
                   ("firsthand", "Firsthand account", len(kinds.get("firsthand", []))),
                   ("refresh", "AI-assisted refresh", len(kinds.get("refresh", [])))]
    tabs = "".join(
        f'<button type="button" role="tab" data-filter="{k}" data-label="{e(lbl)}" aria-selected="{"true" if k == "all" else "false"}" tabindex="{0 if k == "all" else -1}" aria-controls="essay-list">{e(lbl)}<span class="n">{n}</span></button>'
        for k, lbl, n in kind_labels if n)
    cards = []
    for i, w in enumerate(WRITING):
        big = i < 2
        local = w["slug"] == ART["slug"]
        href = art_rel if local else w["url"]
        rel = "" if local else ' rel="noopener"'
        img = ""
        if i < 5:
            src = "shared/img/writing/film-hat-final.webp" if local else w["image"]
            img = f'<a href="{e(href)}"{rel} tabindex="-1" aria-hidden="true"><img src="{S}{src}" alt="" width="1280" height="720" loading="lazy" decoding="async"></a>'
        hl = "hl-m" if big or i < 5 else "hl-s"
        size = " essay--big" if big else (" essay--text" if i >= 5 else "")
        cards.append(f'''<article class="essay{size}" data-k="{authorship_kind(w["authorship"])}">
      {img}
      <p class="meta"><time datetime="{w["published"]}">{e(w["date"])}</time></p>
      <h3 class="hl {hl}"><a href="{e(href)}"{rel}>{e(w["title"])}</a></h3>
      <p>{e(w["dek"])}</p>
      {authorship(w["authorship"])}
    </article>''')
    out.append(f'''<section class="section wrap" id="features" aria-labelledby="features-h">
  <header class="sec-head"><p class="folio">B1</p><h2 id="features-h">Features <em>&amp;</em> Essays</h2>
    <p class="sec-dek">Essays Ken directs, edits and stands behind. Every piece carries its own authorship label, so you always know how much of it is his hand.</p>
    <p class="sec-side meta">{len(WRITING)} essays · latest {d_short(WRITING[0]["published"])}</p></header>
  <div class="tabs-wrap"><div class="tabs" role="tablist" aria-label="Filter essays by authorship" data-tabs="essay-list" data-status="essay-status">{tabs}</div>
  <p class="tabs-note" id="essay-status" aria-live="polite">Filter by how each essay was made.</p></div>
  <div class="essays" id="essay-list" role="tabpanel" aria-label="Essays">{"".join(cards)}</div>
  <p><a class="more" href="https://kenashe.ai/writing/" rel="noopener">The full Writing archive on KenAshe.ai ↗</a> · <a class="more" href="{e(SOC["rss"]["url"])}" rel="noopener">Writing RSS ↗</a></p>
</section>''')

    # ----- C1 BUILD DESK
    written = [b for b in BUILDS if b.get("url") and "Short Film" not in b["stack"]]  # the film is reported in Watch, as a film
    lead = written[0]
    rest = written[1:5]
    def report(b, lead=False):
        when = build_when(b)
        metric = f'<p class="meta">On file: {e(b["metric"])}</p>' if b.get("metric") else ""
        stack = " · ".join(b["stack"])
        cta = e(b.get("cta", "Read the report"))
        if lead:
            return f'''<article class="report report--lead">
      <div>
        <div class="top"><span class="dl">{e(when)}</span>{status(b["status"])}</div>
        <h3 class="hl hl-l"><a href="{e(b["url"])}" rel="noopener">{e(b["title"])}</a></h3>
        <p>{e(b["dek"])}</p>
        <p class="honest">Honest status: no outside agent had bought from ZeroHuman as of Nov 20, 2026. Both paid orders came from Ken’s own test buyer. Next documented step: the first outside wallet paying zerohuman.eth, then ZeroHuman spending its own earnings buying services from other agents.</p>
      </div>
      <div>
        <figure style="margin:0"><img src="{S}shared/img/frames/yZWsJjFnSH0-2.webp" alt="Frame from Ken’s video about two AI agents that buy and sell services on Ethereum." width="1280" height="720" loading="lazy" decoding="async"><figcaption>From “I Built Two AI Agents That Buy and Sell Services on Ethereum,” the experiment ZeroHuman rebuilt from scratch.</figcaption></figure>
        <p class="stack" style="margin-top:.8rem">Stack: {e(stack)}</p>
        {metric}
        <a class="more" href="{e(b["url"])}" rel="noopener">{cta} ↗</a>
      </div>
    </article>'''
        return f'''<article class="report">
      <div class="top"><span class="dl">{e(when)}</span>{status(b["status"])}</div>
      <h3 class="hl hl-m"><a href="{e(b["url"])}" rel="noopener">{e(b["title"])}</a></h3>
      <p>{e(b["dek"])}</p>
      {metric}
      <p class="stack">{e(stack)}</p>
    </article>'''
    reports = report(lead, True) + "".join(report(b) for b in rest)

    rows = []
    for i, b in enumerate(BUILDS, 1):
        t = f'<a href="{e(b["url"])}" rel="noopener">{e(b["title"])}</a>' if b.get("url") else e(b["title"])
        extra = ""
        if b.get("footer") and len(b["footer"]) > 1:
            extra = " · ".join(b["footer"][1:])
        mt = b.get("metric") or extra
        rows.append(f'<tr data-k="{b["status"].lower()}"><td class="num meta">{i:02d}</td><td class="t">{t}</td><td class="st">{status(b["status"])}</td><td class="when">{e(build_when(b))}</td><td class="stk">{e(", ".join(b["stack"]))}</td><td class="mt">{e(mt)}</td></tr>')
    ltabs = "".join(
        f'<button type="button" role="tab" data-filter="{k}" data-label="{e(lbl)}" aria-selected="{"true" if k == "all" else "false"}" tabindex="{0 if k == "all" else -1}" aria-controls="ledger">{e(lbl)}<span class="n">{n}</span></button>'
        for k, lbl, n in [("all", "All builds", len(BUILDS)), ("live", "Live", N_LIVE), ("shipped", "Shipped", N_SHIP)])
    out.append(f'''<section class="section wrap" id="build-desk" aria-labelledby="build-h">
  <header class="sec-head"><p class="folio">C1</p><h2 id="build-h">The Build Desk</h2>
    <p class="sec-dek">Builds reported as stories: what it is, what it runs on, and its honest status. LIVE means it is running now; SHIPPED means it was finished and documented.</p>
    <p class="sec-side meta">{N_LIVE} live · {N_SHIP} shipped · last filed {e(latest_build["shippedAt"])}</p></header>
  <div class="reports">{reports}</div>
  <div class="ledger-wrap">
    <div class="ledger-title"><h3>The ledger <em>of every build</em></h3><p class="meta">Newest first · {len(BUILDS)} entries · from builds.ts</p></div>
    <div class="tabs-wrap"><div class="tabs" role="tablist" aria-label="Filter builds by status" data-tabs="ledger-body" data-status="ledger-status">{ltabs}</div>
    <p class="tabs-note" id="ledger-status" aria-live="polite">Linked titles have a public write-up on KenAshe.ai.</p></div>
    <table class="ledger" id="ledger">
      <caption>Status is exactly as recorded on KenAshe.ai. Dates are month of shipping; entries without a write-up are listed by title only.</caption>
      <thead><tr><th scope="col"><span class="visually-hidden">Number</span></th><th scope="col">Build</th><th scope="col">Status</th><th scope="col">Filed</th><th scope="col" class="stk-col">Stack</th><th scope="col">On the record</th></tr></thead>
      <tbody id="ledger-body" role="tabpanel" aria-label="Builds">{"".join(rows)}</tbody>
    </table>
    <div class="empty-state"><span class="label">Next</span><p>Next experiments are logged here when they ship.</p><p>Nothing is announced before it exists. The documented next step for ZeroHuman: the first outside wallet paying zerohuman.eth, then ZeroHuman spending its own earnings buying services from other agents.</p></div>
  </div>
</section>''')

    # ----- D1 WATCH
    film_v = next(v for v in VIDEOS if v["id"] == FILM["youtubeId"])
    film_poster = {"thumbnail": "shared/img/build/returning-your-things.webp", "url": film_v["url"], "id": film_v["id"], "title": film_v["title"]}
    credits = "".join(f"<dt>{e(k)}</dt><dd>{e(v)}</dd>" for k, v in FILM["credits"])
    stills = "".join(f'<img src="{S}{s}" alt="" width="1280" height="720" loading="lazy" decoding="async">' for s in FILM["stills"][:3])
    vids = [v for v in VIDEOS if v["kind"] == "video"]
    shorts = [v for v in VIDEOS if v["kind"] == "short"]
    clips = []
    for n, v in enumerate([v for v in vids if v["id"] != YT][:6]):  # the 4:49 making-of plays inside the feature
        dur = f' · {v["duration"]}' if v.get("duration") else ""
        rel = ""
        if v.get("related"):
            r = v["related"]
            if r.endswith("/writing/4-tips-for-making-ai-videos-that-feel-like-films/"):
                rel = f'<a class="inline-link meta" href="{art_rel}">Read the essay</a>'
            else:
                rel = f'<a class="inline-link meta" href="{e(r)}" rel="noopener">Read the write-up ↗</a>'
        clips.append(f'''<article class="clip">
      {yt_link(v, S, label="Play")}
      <h4><a href="{e(v["url"])}" rel="noopener">{e(v["title"])}</a></h4>
      <p class="meta"><time datetime="{v["date"]}">{d_short(v["date"])}</time>{dur}</p>
      {rel}
    </article>''')
    short_li = "".join(f'<li><a href="{e(v["url"])}" rel="noopener"><time datetime="{v["date"]}">{d_short(v["date"])[:-6]}</time><span class="tt">{e(v["title"])} <span aria-hidden="true">↗</span></span></a></li>' for v in shorts)
    out.append(f'''<section class="night" id="watch" aria-labelledby="watch-h">
  <div class="wrap section">
  <header class="sec-head"><p class="folio">D1</p><h2 id="watch-h">Watch</h2>
    <p class="sec-dek">A short film, then the videos. Nothing plays until you press play; players load from youtube-nocookie.com.</p>
    <p class="sec-side meta">1 film · {len(vids)} videos · {len(shorts)} shorts</p></header>
  <div class="film">
    <div>
      {yt_link(film_poster, S, title=film_v["title"], label="Play the film · " + FILM["runtime"], alt="A man in a winter coat carries a cardboard box with a straw hat on top down a snowy brownstone street at night.")}
      <div class="strip" aria-hidden="true">{stills}</div>
      <p class="caption">Stills from <em>Returning Your Things</em>. Film by Ken Ashe, made with AI-generated imagery.</p>
    </div>
    <div>
      <p class="kicker"><span>Short film</span><span class="sep">/</span><span>{FILM["runtime"]}</span><span class="sep">/</span><span>Released {d_short(FILM["released"])}</span></p>
      <h3 class="film__title">Returning Your Things</h3>
      <p class="film__log">{e(FILM["logline"])}</p>
      <div class="note"><h3>Director’s note</h3><blockquote><p>{e(FILM["directorsNote"])}</p></blockquote><cite>Ken Ashe</cite></div>
      <dl class="credits">{credits}</dl>
      <a class="more" href="{art_rel}">Behind the scenes: the essay and 4:49 making-of video →</a><br>
      <a class="more" href="{FILM_PAGE}" rel="noopener">The film page on KenAshe.ai ↗</a>
    </div>
  </div>
  <div class="reel">
    <div class="reel__h"><h3>Videos</h3><a class="more" href="{e(SOC["youtube"]["url"])}" rel="noopener">YouTube {e(SOC["youtube"]["handle"])} ↗</a></div>
    {"".join(clips)}
    <div class="shorts"><h4>Shorts</h4><ul>{short_li}</ul></div>
  </div>
  </div>
</section>''')

    # ----- W THE WIRE
    feed = []
    for p in DIGEST["latest"]:
        tags = " / ".join(p["tags"][:3])
        feed.append(f'<li><p class="slug"><time datetime="{p["date"]}">{p["date"]}</time><span>{e(tags)}</span></p><h3><a href="{e(p["url"])}" rel="noopener">{e(p["title"])}</a></h3><p>{e(p["description"])}</p></li>')
    desks = "".join(f'<li><b>{e(t["name"])}</b>{e(t["angle"])}</li>' for t in DIGEST["topics"])
    cited = next(w for w in WRITING if w["slug"] == "my-automated-blog-got-cited")
    system = next(w for w in WRITING if w["slug"] == "the-digest-is-the-system")
    out.append(f'''<section class="wire-sec wrap" id="wire" aria-labelledby="wire-h">
  <div class="wire">
    <div class="wire__head">
      <div><p class="wire__folio">PAGE W · FEED: THE DIGEST · SOURCE: KENASHE.AI/BLOG</p>
      <h2 class="wire__title" id="wire-h">THE WIRE <span>/ The Digest</span></h2></div>
      <p class="stamp">Automated<small>machine-published</small></p>
    </div>
    <dl class="wire__facts">
      <div><dt>Published</dt><dd class="big">{DIGEST["publishedCount"]:,}</dd><dd>posts as of {DIGEST["publishedCountAsOf"]}</dd></div>
      <div><dt>Cadence</dt><dd>{e(DIGEST["cadence"])}</dd></div>
      <div><dt>Written by</dt><dd>An autonomous system Ken built and is accountable for</dd></div>
      <div><dt>Editorial line</dt><dd>Separate from Features &amp; Essays. No paid placement.</dd></div>
    </dl>
    <p class="wire__notice"><strong>NOTICE</strong> {e(DIGEST["description"])} Ken’s own writing lives in Features &amp; Essays (page B1); nothing on this page is part of it.</p>
    <p class="wire__pipe" data-live="github" data-url="{e(C["live"]["githubCommits"]["url"])}">
      <span>LAST PIPELINE COMMIT</span>
      <span class="src" data-state="snapshot" data-snapshot="SNAPSHOT · {d_short(SNAP).upper()}">SNAPSHOT · {d_short(SNAP).upper()}</span>
      <code data-f="msg">{e(ghs["message"])}</code>
      <span>sha <code data-f="sha">{ghs["sha"]}</code></span>
      <span data-f="date">{d_short(ghs["date"])}</span>
      <span>repo kenashe/kenashe</span>
    </p>
    <ol class="feed" aria-label="Latest {len(DIGEST["latest"])} automated posts">{"".join(feed)}</ol>
    <ul class="desks" aria-label="Topic desks">{desks}</ul>
    <div class="wire__foot">
      <a href="{e(DIGEST["url"])}" rel="noopener">READ THE DIGEST (AUTOMATED) ↗</a>
      <span>Why it exists, in Ken’s words: <a class="inline-link" href="{e(system["url"])}" rel="noopener">{e(system["title"])}</a> · <a class="inline-link" href="{e(cited["url"])}" rel="noopener">{e(cited["title"])}</a></span>
    </div>
    <p class="endwire" aria-hidden="true">— END OF WIRE —</p>
  </div>
</section>''')

    # ----- E1 AUTHOR
    a = C["about"]
    creds = [c for c in a["credentials"] if "(CPA)" in c["name"] or "(PMP)" in c["name"]]
    cred_li = "".join(f'<li><b>{e(c["name"])}</b><span>{e(c["issuer"])}</span></li>' for c in creds)
    cred_li += f'<li><b>{e(a["memberships"][0].split(" (")[0])}</b><span>Member, {e(a["memberships"][0].split("(")[1].rstrip(")"))}</span></li>'
    cred_li += f'<li><b>{e(a["veteran"])}</b></li>'
    speak = ""
    for s in a["speaking"]:
        links = "".join(ext(l["url"], e(l["label"]) + " ↗", "inline-link") for l in s["links"])
        speak += f'<li><span class="yr">{s["year"]}</span><h4>{e(s["event"])}<span>{e(s["role"])}</span></h4><p>{e(s["detail"])}</p><div class="links">{links}</div></li>'
    bring = "".join(f'<li><span class="n">{i}</span><b>{e(x["title"])}</b><span>{e(x["body"])}</span></li>' for i, x in enumerate(C["whatIBring"], 1))
    comment = "".join(f"<li>{e(x)}</li>" for x in a["availableForComment"])
    out.append(f'''<section class="section wrap" id="author" aria-labelledby="author-h">
  <header class="sec-head"><p class="folio">E1</p><h2 id="author-h">The Author</h2>
    <p class="sec-dek">Who writes, builds and is accountable for everything in this paper, including the automated parts.</p>
    <p class="sec-side meta">{e(C["identity"]["trustLine"])}</p></header>
  <div class="author">
    <div class="staff-col">
      <figure class="portrait"><img src="{S}{a["portraits"][0]["src"]}" alt="{e(a["portraits"][0]["alt"])}" width="1122" height="1402" loading="lazy" decoding="async"></figure>
      <div class="staff">
        <h3>Masthead</h3>
        <dl>
          <dt>Author &amp; editor</dt><dd>Ken Ashe</dd>
          <dt>Builds, video &amp; film</dt><dd>Ken Ashe</dd>
          <dt>Title</dt><dd>{e(C["identity"]["title"])}</dd>
          <dt>The Wire</dt><dd class="mono">An autonomous system Ken built and is accountable for</dd>
          <dt>Based in</dt><dd>{e(C["identity"]["location"])}</dd>
          <dt>Letters</dt><dd><a class="inline-link" href="mailto:{C["identity"]["email"]}">{C["identity"]["email"]}</a></dd>
        </dl>
      </div>
    </div>
    <div class="author__body">
      <p class="kicker"><span>About the author</span></p>
      <h3 class="hl hl-l">Ken Ashe, {e(C["identity"]["title"])}</h3>
      <p class="dropcap">{e(a["bio"])}</p>
      <p>{e(a["background"][0])}</p>
      <p>{e(a["background"][1])}</p>
      <figure class="pull"><blockquote style="margin:0"><p>Build first, test what actually happens, document the failures alongside the wins, and keep evidence separate from claims.</p></blockquote><figcaption><cite>Ken Ashe, on his approach</cite></figcaption></figure>
      <ul class="bring">{bring}</ul>
      <a class="more" href="https://kenashe.ai/about/" rel="noopener">Full biography and credentials on KenAshe.ai ↗</a>
    </div>
    <div class="author__aside">
      <div><h3 class="side-h">Credentials</h3><ul class="creds">{cred_li}</ul></div>
      <div><h3 class="side-h">Speaking &amp; judging</h3><ul class="speaking">{speak}</ul></div>
      <div><h3 class="side-h">Available for comment on</h3><ul class="comment-list">{comment}</ul></div>
    </div>
  </div>
</section>''')

    # ----- F1 PRESS & STANDARDS & COMPANY
    pr = C["press"]
    profiles = sorted(pr["profiles"], key=lambda p: (not p.get("pinned"),))
    prof_li = "".join(f'<li><p class="o"><span class="{"pin" if p.get("pinned") else ""}">{e(p["outlet"])}</span><time>{e(p["date"])}</time></p><h4>“{e(p["title"])}”</h4><p>{e(p["summary"])}</p></li>' for p in profiles)
    comm_li = "".join(f'<li><p class="o"><span>{e(p["outlet"])}</span><time>{e(p["date"])}</time></p><h4>“{e(p["title"])}”</h4></li>' for p in pr["commentary"])
    w = C["work"]
    incl = "".join(f"<li><span>{e(x)}</span></li>" for x in w["includes"])
    ld = C["luckyDomains"]
    out.append(f'''<section class="section wrap" id="press" aria-labelledby="press-h">
  <header class="sec-head"><p class="folio">F1</p><h2 id="press-h">Press <em>&amp;</em> Standards</h2>
    <p class="sec-dek">Coverage of Ken and his work, the rules for sponsored tests, and a disclosure about the company he founded.</p>
    <p class="sec-side"><a class="more" href="{e(pr["newsroomUrl"])}" rel="noopener">Newsroom &amp; media kit ↗</a></p></header>
  <div class="trio">
    <div>
      <h3 class="side-h">In the press · profiles</h3>
      <ul class="clips">{prof_li}</ul>
      <h3 class="side-h" style="margin-top:1.6rem">Commentary &amp; expert quotes</h3>
      <ul class="clips clips--small">{comm_li}</ul>
    </div>
    <aside class="standards" aria-labelledby="std-h">
      <span class="label">Editorial standards</span>
      <h3 id="std-h">{e(w["headline"])}</h3>
      <p class="sub">{e(w["subhead"])}</p>
      <p>{e(w["intro"])}</p>
      <h4>What a sponsored test includes</h4>
      <ol>{incl}</ol>
      <div class="not">
        <p><b>What payment does not buy</b>{e(w["doesNotBuy"])}</p>
        <p><b>The Wire is not for sale</b>{e(w["notInDigest"])} {e(w["rules"])}</p>
      </div>
      <p style="margin:1rem 0 0"><a class="more" href="mailto:{C["identity"]["email"]}?subject=Sponsor%20an%20honest%20test">Propose a test: {C["identity"]["email"]}</a><br><a class="more" href="{e(w["url"])}" rel="noopener">How sponsored work runs ↗</a></p>
    </aside>
    <aside class="company" aria-labelledby="ld-h">
      <p class="kicker"><span>The author’s company</span></p>
      <h3 id="ld-h">{e(ld["name"])}</h3>
      <p class="disclose">Disclosure: {e(ld["role"])} It is his separate company.</p>
      <p>{e(ld["description"])}</p>
      <p><a class="more" href="{e(ld["url"])}" rel="noopener">luckydomains.io ↗</a></p>
      <div class="empty-state" style="grid-template-columns:1fr"><span class="label" style="grid-row:auto">Future ventures</span><p>Next experiments are logged here when they ship.</p><p>Ken’s experiments, like ZeroHuman, are reported on the Build Desk. They are not Lucky Domains ventures.</p></div>
    </aside>
  </div>
</section>''')

    # ----- G1 FOLLOW
    soc_order = ["youtube", "x", "tiktok", "instagram", "linkedin", "github", "facebook", "rss"]
    soc_li = "".join(f'<li><a href="{e(SOC[k]["url"])}" rel="noopener"><span class="n">{e(SOC[k]["label"])}</span><span class="h">{e(SOC[k]["handle"] or "kenashe.ai/writing/rss.xml")} ↗</span></a></li>' for k in soc_order)
    out.append(f'''<section class="section wrap" id="follow" aria-labelledby="follow-h">
  <header class="sec-head"><p class="folio">G1</p><h2 id="follow-h">Follow</h2>
    <p class="sec-dek">There is no email list and no sign-up form. Take the paper by RSS, or follow Ken where he publishes.</p></header>
  <div class="follow">
    <div class="follow__lede">
      <h3>Letters to the editor</h3>
      <p>Questions, corrections, press, or a product that deserves an honest test.</p>
      <a class="email" href="mailto:{C["identity"]["email"]}">{C["identity"]["email"]}</a>
    </div>
    <ul class="socials">{soc_li}</ul>
  </div>
</section>''')
    out.append("</main>")
    out.append(footer("", 2))
    out.append('<script src="assets/pub.js" defer></script>\n</body>\n</html>')
    return "\n".join(out)

# ------------------------------------------------------------------------------------------
# ARTICLE PAGE
# ------------------------------------------------------------------------------------------
def article_body(S):
    """Verbatim essay text. Returns HTML. S = path prefix to repo root."""
    def chip(i):
        title, sec, t = TIPS[i]
        return (f'<p class="chip-row"><a class="chip" href="https://www.youtube.com/watch?v={YT}&amp;t={sec}s" rel="noopener" '
                f'data-yt="{YT}" data-start="{sec}" data-t="{t}" aria-controls="player-{i+1}"><span class="lbl">Watch from</span> <span class="t">{t}</span></a></p>')
    def h2(i):
        return f'<h2 id="tip-{i+1}"><span class="no">{i+1}.</span><span>{e(TIPS[i][0])}</span></h2>'
    def sn(n, html_):
        return f'<span class="sn" id="sn-{n}" role="note"><span class="n">{n}</span>{html_}</span>'
    def ref(n):
        return f'<button type="button" class="sn-ref" aria-controls="sn-{n}" aria-label="Note {n}">{n}</button>'
    hats = [("film-hat-original.webp", "Original: a hesitant reach, but his eyes miss the hat.", "A", ""),
            ("film-hat-overcorrected.webp", "First correction: he looks at the hat, but now he lunges.", "B", ""),
            ("film-hat-final.webp", "Final: the original reach, with his eyes on the brim.", "C", " final")]
    sheet = "".join(f'<figure class="{c.strip()}"><span class="frame-no" aria-hidden="true">15{l}</span><img src="{S}shared/img/writing/{f}" alt="{e(cap)}" width="980" height="653" loading="lazy" decoding="async"><figcaption>{e(cap)}</figcaption></figure>' for f, cap, l, c in hats)
    dn = FILM["directorsNote"]
    cr = dict(FILM["credits"])
    return f'''
<p>I knew my actors needed character sheets.{ref(1)}{sn(1, f'From the director’s note<span class="q">“{e(dn)}”</span>')} {e(P_OPEN.split("sheets. ",1)[1])}</p>
<p>These are the four things I’d do again. If you’d rather see the story before the spoilers, <a href="{FILM_PAGE}" rel="noopener">watch <em>Returning Your Things</em> first</a>.{ref(2)}{sn(2, f'<em>Returning Your Things</em>. {e(FILM["logline"])} Runtime {FILM["runtime"]}; released {d_long(FILM["released"])}.<span class="src-line">Film by {e(cr["Film by"])}</span>')} The film is 1:54; the walkthrough below is 4:49.</p>
<figure id="video" class="wide">
  {yt_link(VID, S, title="Ken Ashe: " + VID["title"], label="Play the walkthrough · " + VID["duration"], alt="Title card for the video 4 Tips for Making AI Videos That Feel Like Films, with a still of a man carrying a box in the snow and Ken on camera.")}
  <figcaption class="caption" style="display:flex;gap:1rem;flex-wrap:wrap;justify-content:space-between"><span><b>Video.</b> {e(VID["title"])} · {VID["duration"]} · {d_short(VID["date"])}</span><span>{ext(VID["url"], "Watch on YouTube ↗", "inline-link")} · {ext(SOC["youtube"]["url"], "More on my YouTube channel →", "inline-link")}</span></figcaption>
</figure>
{h2(0)}
{chip(0)}
<p>I had a sheet for each actor so I could recognize the same two people on a spring rooftop, by the water in summer, and across a kitchen table. The objects needed references for a different reason: they’re how you know whose memory you’re in. A man picks up a piece of pottery in the snow. Cut to the kitchen. You need to recognize that cup without anybody saying a word.</p>
<p>I liked the broken piece. The fix was to go back to the intact mug and move the painted flower closer to the handle. That’s the detail I’d put on a prop sheet next time: not just what the object looks like, but which part of it the audience will see again.</p>
{h2(1)}
{chip(1)}
<p>In shot 15,{ref(3)}{sn(3, 'The three versions of shot 15 are below, in order: original, first correction, final.')} the wind takes her hat. I liked the man’s reach, but he was looking to the side instead of at the brim. The next image fixed his gaze and pitched his whole body forward. Now he looked determined to catch it. That was right for the summer memory and wrong for the winter street, where he’s about to let it go.</p>
<figure class="wide" style="margin-block:1.8rem">
  <div class="contact-sheet">{sheet}</div>
  <figcaption class="sheet-cap"><b>Shot 15, three passes.</b> Frames from <em>Returning Your Things</em>; AI-generated imagery directed by Ken Ashe.</figcaption>
</figure>
<p>The most useful part of my next note was “the original picture was fine.” Once I named what to preserve, I could ask for the small change I actually wanted.</p>
<figure class="pq pq--out"><blockquote style="margin:0"><p>Getting a sound in sync and wanting to hear it are two different decisions.</p></blockquote><figcaption>From tip 3</figcaption></figure>
{h2(2)}
{chip(2)}
<p>I made a silent review copy with each shot number and its start time underneath the picture. Instead of scrubbing around for “that bit in the snow,” I could say “shot 15” and keep the discussion about his eyes. I settled the pictures and their timing before trying the sound again.</p>
<figure class="pq pq--out"><blockquote style="margin:0"><p>The pianist keeps playing. I didn’t need a new cue to tell me how to feel about that cut.</p></blockquote><figcaption>From tip 4</figcaption></figure>
<p>That also made it easier to turn something down. I tried footsteps in the snow and a gust as the hat blew away. Even with the gust in the right place, I didn’t want it in the finished film. Getting a sound in sync and wanting to hear it are two different decisions.</p>
{h2(3)}
{chip(3)}
<p>The first piano score didn’t feel consistent to me. I asked whether there was a classical melody in the public domain that we could use instead. I ended up choosing Donald Betts playing Schumann’s <em>Of Foreign Lands and Peoples</em>.{ref(4)}{sn(4, f'From the film’s credits. <b>Music:</b> {e(cr["Music"])}. <b>Piano:</b> {e(cr["Piano"])}')} The composition and the performance have separate rights; <a href="{MUSOPEN}" rel="noopener">Musopen released this particular recording into the public domain</a>.</p>
<p class="endmark">My test was the hat. In summer, he puts it back on her head. In the next picture he’s walking alone, with the hat behind him in the snow. The pianist keeps playing. I didn’t need a new cue to tell me how to feel about that cut.</p>
<p><a class="more" href="{FILM_PAGE}" rel="noopener">Watch the finished film: Returning Your Things →</a></p>
'''

def article_word_count():
    """Same rule as article.js: body text minus figures, sidenotes, chips, note markers, pull quotes."""
    from bs4 import BeautifulSoup
    soup = BeautifulSoup("<div>" + article_body("") + "</div>", "html.parser")
    for sel in ["figure", ".sn", ".chip-row", ".sn-ref", ".pq"]:
        for n in soup.select(sel):
            n.decompose()
    return len(re.findall(r"[\w’'-]+", soup.get_text(" ")))

def article():
    S = "../../../../"
    HOME = "../../"
    wc = article_word_count()
    mins = max(1, round(wc / 230))
    pref = ("try{var s=JSON.parse(localStorage.getItem('pub04-reading'))||{};var d=document.documentElement;"
            "if(s.size&&s.size!=='m')d.dataset.size=s.size;if(s.face==='sans')d.dataset.face='sans';"
            "if(s.theme&&s.theme!=='light')d.dataset.theme=s.theme;}catch(e){}")
    rel_slugs = ["ai-editor-trusted-least", "bambu-lab-burr-puzzle-solution", "the-digest-is-the-system"]
    rel = []
    for s in rel_slugs:
        w = next(x for x in WRITING if x["slug"] == s)
        rel.append(f'''<article>
      <a href="{e(w["url"])}" rel="noopener" tabindex="-1" aria-hidden="true"><img src="{S}{w["image"]}" alt="" width="1280" height="720" loading="lazy" decoding="async"></a>
      <p class="meta"><time datetime="{w["published"]}">{e(w["date"])}</time></p>
      <h3 class="hl hl-s"><a href="{e(w["url"])}" rel="noopener">{e(w["title"])}</a></h3>
      <p>{e(w["dek"])}</p>
      <p style="margin-top:.6rem">{authorship(w["authorship"])}</p>
    </article>''')
    socials = "".join(f'<li>{ext(SOC[k]["url"], e(SOC[k]["label"]) + " ↗")}</li>' for k in ["youtube", "x", "tiktok", "instagram", "linkedin", "github"])
    out = [head(f"Concept 04 · {ART['title']} — Ken Ashe",
                "Concept 04 feature article: Ken Ashe on four lessons from making the short film Returning Your Things. Human-directed, AI-assisted.",
                4, extra_head=pref),
           '<body class="is-article" id="top">', flag(4),
           '<a class="skip" href="#main">Skip to the article</a>']
    out.append(sectionbar(HOME, article=True))
    out.append(f'''<main id="main">
<article aria-labelledby="art-h">
  <header class="art-head wrap">
    <nav class="art-crumb meta" aria-label="Breadcrumb"><a href="{HOME}">Front page</a><span aria-hidden="true">/</span><a href="{HOME}#features">Features &amp; Essays</a><span aria-hidden="true">/</span><span>The making of a short film</span></nav>
    <p class="kicker"><span>Feature</span><span class="sep">/</span><span>Behind <em>Returning Your Things</em></span></p>
    <h1 class="art-title" id="art-h">4 Tips for Making AI Videos That <em>Feel Like Films</em></h1>
    <p class="art-dek">{e(ART["dek"])}</p>
    <div class="art-by">
      <div class="who"><img src="{S}shared/img/portrait/ken-black-polo-square-640.webp" alt="" width="640" height="640" decoding="async"><div><b>By Ken Ashe</b><span>{e(C["identity"]["title"])}</span></div></div>
      <div class="bits byline" style="margin:0"><time datetime="{ART["published"]}">{e(ART["date"])}</time><span>{VID["duration"]} video</span><span data-readtime>{mins} min read · {wc} words</span>{authorship(ART["authorship"])}</div>
    </div>
    <figure class="art-hero">
      <img src="{S}{ART["image"]}" alt="{e(ART["imageAlt"])}" width="1280" height="720" fetchpriority="high" decoding="async">
      <figcaption><b>The mug, before and after.</b> I moved the flower on the intact mug. Now the handle and flower can break off together. Stills from <em>Returning Your Things</em>, made with AI-generated imagery.</figcaption>
    </figure>
  </header>
  <div class="art-grid wrap">
    <div class="art-body prose">{article_body(S)}</div>
    <div class="endbox">
      <section class="authorbox" aria-labelledby="ab-h">
        <img src="{S}shared/img/portrait/ken-black-polo-square-640.webp" alt="{e(C["about"]["portraits"][0]["alt"])}" width="640" height="640" loading="lazy" decoding="async">
        <div>
          <p class="kicker"><span>About the author</span></p>
          <h2 id="ab-h">Ken Ashe</h2>
          <p>{e(C["about"]["bio"])}</p>
          <p class="meta">{e(C["identity"]["trustLine"])}</p>
          <ul>{socials}</ul>
        </div>
      </section>
      <section class="related" aria-labelledby="rel-h">
        <header class="sec-head"><p class="folio">B2</p><h2 id="rel-h" style="font-size:clamp(1.8rem,3.4vw,2.6rem)">Related reading</h2></header>
        <div class="related__grid">{"".join(rel)}</div>
        <p style="margin-top:1.4rem"><a class="more" href="{HOME}#features">More Features &amp; Essays →</a> · <a class="more" href="{HOME}#watch">Watch the film on the front page →</a></p>
      </section>
    </div>
  </div>
</article>
</main>''')
    out.append(footer(HOME, 4))
    out.append(f'<script src="{HOME}assets/pub.js" defer></script>\n<script src="{HOME}assets/article.js" defer></script>\n</body>\n</html>')
    return "\n".join(out)

if __name__ == "__main__":
    (ROOT / "index.html").write_text(front())
    p = ROOT / "writing/4-tips-for-making-ai-videos-that-feel-like-films"
    p.mkdir(parents=True, exist_ok=True)
    (p / "index.html").write_text(article())
    print("words:", article_word_count())
