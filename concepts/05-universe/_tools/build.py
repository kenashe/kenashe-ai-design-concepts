#!/usr/bin/env python3
"""Generates concepts/05-universe/index.html from shared/content.json.

Run from anywhere:  python3 concepts/05-universe/_tools/build.py
The output is plain static HTML (no runtime build step). Every fact comes from
shared/content.json; this script only decides *where* things sit in space.
"""
import json, html, math, hashlib, datetime, pathlib

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent.parent           # repo root
OUT = HERE.parent / "index.html"
C = json.loads((ROOT / "shared" / "content.json").read_text())

e = lambda s: html.escape(str(s), quote=True)
S = "../../"                                # path from this page to repo root

# ---------------------------------------------------------------- clusters
# Five real topic sectors, in an order where neighbours are related.
CLUSTERS = [
    ("agents",   "Agents"),
    ("identity", "Ethereum · ENS · domains"),
    ("film",     "Film & video"),
    ("writing",  "Writing & the web"),
    ("auto",     "Automation"),
]
TAGMAP = {
    "AI Agents": "agents", "Agents": "agents", "Multi-Agent": "agents", "HyperAgent": "agents",
    "ChatGPT Skills": "agents", "Cassidy AI": "agents", "Social Simulation": "agents",
    "Grok Bot": "agents", "xAI templates": "agents", "Fable 5": "agents", "Ollama": "agents",
    "Ethereum": "identity", "ENS": "identity", "ERC-8004": "identity",
    "Short Film": "film", "AI-generated imagery": "film", "AI Video": "film",
    "Video Production": "film", "HeyGen": "film", "ffmpeg": "film",
    "Astro": "writing", "Tailwind": "writing", "MDX": "writing", "Markdown": "writing",
    "WebP": "writing", "GitHub Pages": "writing", "Vercel": "writing", "sharp": "writing",
    "GPT Image 2": "writing", "Web3Forms": "writing",
    "Automation": "auto", "GitHub Actions": "auto", "n8n": "auto", "SEO": "auto", "Gmail": "auto",
    "Google Sheets": "auto", "Cloudflare": "auto", "Airtable": "auto", "pgvector": "auto",
    "Railway": "auto", "Python": "auto", "Weather + news APIs": "auto", "Mac Mini": "auto",
}
MONTHS = {m: i for i, m in enumerate(["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], 1)}

def month_date(s):
    """'Nov 2026' / 'June 2026' -> (iso mid-month, label)."""
    mon, yr = s.split()[0][:3], int(s.split()[-1])
    return f"{yr}-{MONTHS[mon]:02d}-15", f"{mon} {yr}"

def slugify(t):
    out = "".join(ch.lower() if ch.isalnum() else "-" for ch in t)
    while "--" in out: out = out.replace("--", "-")
    return out.strip("-")

def fmt_date(iso):
    d = datetime.date.fromisoformat(iso)
    return d.strftime("%b ") + str(d.day) + d.strftime(", %Y")

# Precise dates documented on the long-form pages (research/*.txt):
PRECISE = {
    "ZeroHuman": ("2026-11-16", "Nov 16, 2026"),          # building_zerohuman
    "AI agent economy on Ethereum": ("2026-11-10", "Nov 10, 2026"), # mainnet order tx time
}

bodies = []
def add(**kw):
    bodies.append(kw)

# ---------------------------------------------------------------- builds
film = C["films"]["returningYourThings"]
for b in C["builds"]:
    date_src = b.get("shippedAt") or (b.get("footer") or [None])[0]
    iso, label = month_date(date_src)
    if b["title"] in PRECISE:
        iso, label = PRECISE[b["title"]]
    weights = {}
    for t in b["stack"]:
        k = TAGMAP.get(t)
        if k: weights[k] = weights.get(k, 0) + 1
    bid = slugify(b["title"])
    if b["title"] == "Returning Your Things":
        # The film is ONE body: the build entry and the YouTube release are the same work.
        add(id="returning-your-things", kind="film", title=film["title"], date=film["released"],
            dateLabel=fmt_date(film["released"]), status=b["status"], dek=film["logline"],
            stack=b["stack"], weights={"film": 3}, url=b["url"], cta="Read the film page on kenashe.ai",
            yt=film["youtubeId"], duration=film["runtime"], img="shared/img/frames/QhOYaj_bDZY-1.webp",
            note="Directed by Ken Ashe with AI-generated imagery. " + film["credits"][1][0] + ": " + film["credits"][1][1] + ".")
        continue
    extra = {}
    if b["title"] == "ZeroHuman":
        extra = dict(local="systems/zerohuman/", liveKey="zerohuman")
    if b["title"] == "AI explainer producer":
        extra = dict(img="shared/img/build/ai-explainer-producer-status-board.webp")
    foot = [f for f in (b.get("footer") or [])[1:]]
    extra["monthOnly"] = b["title"] not in PRECISE
    add(id=bid, kind="build", title=b["title"], date=iso, dateLabel=label, status=b["status"],
        dek=b["dek"], stack=b["stack"], weights=weights or {"agents": 1}, url=b.get("url"),
        cta=b.get("cta"), metric=b.get("metric"), footer=foot, **extra)

# ---------------------------------------------------------------- videos
VIDEO_TOPIC = {   # topic sector a video talks about (in addition to Film & video)
    "3MOFBulJd_s": {"film": 2}, "efqdAo9-IBU": {"identity": 1}, "yZWsJjFnSH0": {"agents": 1, "identity": 1},
    "Sft8JZ_afb4": {"writing": 1}, "r4rIS5pACGY": {"agents": 1}, "3sx6NNPbopQ": {"agents": 1},
    "dcK_1nMhy8w": {"identity": 1}, "L8LzPXzMbQg": {"identity": 1}, "O0Hv932JmLM": {"identity": 1},
    "_MAhfwQxdvA": {"agents": 1, "auto": 1}, "NlbBuqLaofQ": {"writing": 1}, "qjLGYqxV_iM": {"identity": 1},
    "ujUpw18fklM": {"agents": 1}, "iEjd1OvHLS0": {"agents": 1},
}
for v in C["videos"]:
    if v["kind"] == "film":
        continue
    w = {"film": 1}
    for k, n in VIDEO_TOPIC.get(v["id"], {}).items(): w[k] = w.get(k, 0) + n
    add(id="v-" + v["id"], kind="short" if v["kind"] == "short" else "video", title=v["title"],
        date=v["date"], dateLabel=fmt_date(v["date"]), dek=None, weights=w, url=v["url"],
        yt=v["id"], duration=v.get("duration"), img=v["thumbnail"])

# ---------------------------------------------------------------- writing
ESSAY_TOPIC = {
    "4-tips-for-making-ai-videos-that-feel-like-films": {"film": 2},
    "bambu-lab-burr-puzzle-solution": {"film": 1},
    "ashe-family-coat-of-arms": {},
    "iphone-18-pro-att-activation-failure": {},
    "ai-editor-trusted-least": {"film": 1},
    "my-automated-blog-got-cited": {"auto": 2},
    "you-can-use-ai-to-learn-almost-anything-even-ai": {"agents": 1},
    "ai-agents-reasoning-from-events-that-never-happened": {"agents": 2},
    "the-digest-is-the-system": {"auto": 2},
}
for w in C["writing"]:
    wt = {"writing": 2}
    for k, n in ESSAY_TOPIC.get(w["slug"], {}).items(): wt[k] = wt.get(k, 0) + n
    add(id="w-" + w["slug"], kind="essay", title=w["title"], date=w["published"], dateLabel=w["date"],
        dek=w["dek"], weights=wt, url=w["url"], authorship=w["authorship"], img=w["image"], imgAlt=w["imageAlt"])

# ---------------------------------------------------------------- the Digest (one marker + nebula)
D = C["digest"]
add(id="digest", kind="digest", title="The Digest", date=D["publishedCountAsOf"],
    dateLabel=f"{D['publishedCount']:,} posts as of {fmt_date(D['publishedCountAsOf'])}",
    dek=D["description"], weights={"auto": 1}, url=D["url"], status="AUTOMATED", liveKey="github")

# ---------------------------------------------------------------- real connections
LINKS = [
    ("zerohuman", "ai-agent-economy-on-ethereum", "ZeroHuman is the next step after this first experiment, rebuilt from scratch"),
    ("zerohuman", "autonomous-seo-agent", "Listed as a related build on the ZeroHuman page"),
    ("ai-agent-economy-on-ethereum", "v-yZWsJjFnSH0", "The experiment's video"),
    ("returning-your-things", "w-4-tips-for-making-ai-videos-that-feel-like-films", "Making-of essay for the film"),
    ("returning-your-things", "v-3MOFBulJd_s", "Making-of video for the film"),
    ("w-4-tips-for-making-ai-videos-that-feel-like-films", "v-3MOFBulJd_s", "The essay's 4:49 video walkthrough"),
    ("ai-explainer-producer", "v-L8LzPXzMbQg", "ENSv2 explainer linked from the build"),
    ("ai-explainer-producer", "v-dcK_1nMhy8w", "ENSv2 follow-up linked from the build"),
    ("autonomous-seo-agent", "v-_MAhfwQxdvA", "The build's demo video"),
    ("v-Sft8JZ_afb4", "w-bambu-lab-burr-puzzle-solution", "Video and written walkthrough"),
    ("v-NlbBuqLaofQ", "w-ashe-family-coat-of-arms", "The Guinness label from the coat-of-arms essay"),
    ("v-iEjd1OvHLS0", "w-you-can-use-ai-to-learn-almost-anything-even-ai", "Short linked to the essay"),
    ("digest", "ai-blog-automation-v2", "The pipeline that publishes the Digest daily"),
    ("ai-blog-automation-v1", "ai-blog-automation-v2", "v2 replaced the v1 pipeline"),
    ("digest", "w-my-automated-blog-got-cited", "Essay about the Digest being cited"),
    ("digest", "w-the-digest-is-the-system", "Essay on the Digest's role on the site"),
    ("kenashe-ai", "rebuilding-the-image-pipeline", "Rebuilt this site's image pipeline"),
]
ids = {b["id"] for b in bodies}
for a, b, why in LINKS:
    assert a in ids and b in ids, (a, b)

# ---------------------------------------------------------------- geometry (computed here, JS only projects)
T0 = datetime.date(2025, 12, 1)           # left edge of the main axis
T1 = datetime.date(2026, 11, 30)
SPAN = 14.0                                # world units for the main axis
POW = 2.1                                  # time widens toward the present (axis is labelled by month)
BREAK = -SPAN / 2 - 1.6                    # the 2016 essay sits beyond an axis break
def u_of(iso):
    d = datetime.date.fromisoformat(iso) if isinstance(iso, str) else iso
    if d < T0:
        return BREAK
    f = (d - T0).days / (T1 - T0).days
    return -SPAN / 2 + SPAN * f ** POW

def h(s, n=1):
    return int(hashlib.md5((s + str(n)).encode()).hexdigest()[:8], 16) / 0xFFFFFFFF

RING = {"essay": 1.55, "build": 2.35, "film": 2.6, "video": 3.15, "short": 3.15, "digest": 0.0}
SECTOR = {k: i * 2 * math.pi / len(CLUSTERS) for i, (k, _) in enumerate(CLUSTERS)}
for b in bodies:
    x = y = 0.0
    for k, n in b["weights"].items():
        x += n * math.cos(SECTOR[k]); y += n * math.sin(SECTOR[k])
    ang = math.atan2(y, x) + (h(b["id"]) - 0.5) * 0.34
    r = RING[b["kind"]] + (h(b["id"], 2) - 0.5) * 0.45 if b["kind"] != "digest" else 0
    pos_date = b["date"]
    if b.get("monthOnly"):   # builds dated only to the month: spread within that month
        d = datetime.date.fromisoformat(b["date"])
        pos_date = d.replace(day=3 + int(h(b["id"], 3) * 24))
    b["u"] = round(u_of(pos_date), 3)
    b["a"] = round(ang, 4)
    b["r"] = round(r, 3)
    b["cluster"] = max(b["weights"], key=b["weights"].get)
    if b["kind"] == "digest":
        b["u"] = round(u_of(D["publishedCountAsOf"]), 3) + 0.25

# Order: newest first (Tab order + list order)
bodies.sort(key=lambda b: (b["date"], b["kind"] == "build"), reverse=True)

nebula = {
    "count": D["publishedCount"], "asOf": D["publishedCountAsOf"],
    "uStart": round(u_of("2026-05-01"), 3), "uEnd": round(u_of(D["publishedCountAsOf"]), 3),
    "latest": len(D["latest"]),
}
ticks = []
for m in range(12):
    yr, mo = (2025, 12) if m == 0 else (2026, m)
    d = datetime.date(yr, mo, 1)
    ticks.append({"u": round(u_of(d), 3), "label": d.strftime("%b"), "year": yr if mo in (1, 12) else None})
ticks.append({"u": round(u_of(T1), 3), "label": "", "year": None})
axis = {"t0": T0.isoformat(), "t1": T1.isoformat(), "span": SPAN, "break": BREAK, "ticks": ticks,
        "min": -SPAN / 2, "max": round(u_of(T1), 3)}
DATA = {"bodies": bodies, "links": [{"a": a, "b": b, "why": w} for a, b, w in LINKS],
        "clusters": [{"id": k, "label": l, "angle": round(SECTOR[k], 4)} for k, l in CLUSTERS],
        "nebula": nebula, "axis": axis, "live": C["live"]["zerohumanStatus"]["snapshot"],
        "commit": C["live"]["githubCommits"]["snapshot"][0]}

# ================================================================ HTML helpers
KIND_LABEL = {"build": "Build", "film": "Short film", "video": "Video", "short": "Short", "essay": "Essay", "digest": "Automated"}
def glyph(kind, status=None):
    live = status == "LIVE"
    g = {
        "build": '<circle cx="8" cy="8" r="4.2" fill="currentColor"/>',
        "film": '<circle cx="8" cy="8" r="3.4" fill="currentColor"/><circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" stroke-width="1"/>',
        "video": '<circle cx="8" cy="8" r="4.6" fill="none" stroke="currentColor" stroke-width="1.4"/>',
        "short": '<circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.4"/>',
        "essay": '<rect x="4.2" y="4.2" width="7.6" height="7.6" fill="none" stroke="currentColor" stroke-width="1.4" transform="rotate(45 8 8)"/>',
        "digest": '<g fill="currentColor"><circle cx="4" cy="5" r="1"/><circle cx="8" cy="3.5" r="1"/><circle cx="11.5" cy="6" r="1"/><circle cx="5.5" cy="9.5" r="1"/><circle cx="10" cy="10" r="1"/><circle cx="7" cy="12.5" r="1"/><circle cx="12" cy="12.5" r="1"/></g>',
    }[kind]
    ring = '<circle cx="8" cy="8" r="7" fill="none" stroke="var(--live)" stroke-width="1.3"/>' if live and kind == "build" else ""
    return f'<svg class="glyph g-{kind}{" is-live" if live else ""}" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">{g}{ring}</svg>'

def ext(url, text, cls=""):
    return f'<a href="{e(url)}" rel="noopener"{f" class={chr(34)}{cls}{chr(34)}" if cls else ""}>{text}</a>'

def link_for(b):
    if b.get("local"):
        return f'<a href="{e(b["local"])}">Explore the system</a>'
    if b.get("url"):
        return ext(b["url"], ("Watch on YouTube" if b["kind"] in ("video", "short") else "Read on kenashe.ai") + ' <span aria-hidden="true">↗</span>')
    return '<span class="muted">No public write-up yet</span>'

clabel = dict(CLUSTERS)
def index_row(b):
    status = b.get("status")
    st = f'<span class="status s-{status.lower()}">{status}</span>' if status in ("LIVE", "SHIPPED") else ""
    kind = KIND_LABEL[b["kind"]] + (f' · {e(b["duration"])}' if b.get("duration") else "")
    extra = ""
    if b.get("authorship"):
        extra += f'<p class="authorship">{e(b["authorship"])}</p>'
    if b.get("dek"):
        extra += f'<p class="dek">{e(b["dek"])}</p>'
    if b.get("stack"):
        extra += '<ul class="chips" aria-label="Stack">' + "".join(f"<li>{e(s)}</li>" for s in b["stack"]) + "</ul>"
    if b.get("metric") or b.get("footer"):
        bits = ([b["metric"]] if b.get("metric") else []) + (b.get("footer") or [])
        extra += f'<p class="metric">{" · ".join(e(x) for x in bits)}</p>'
    thumb = ""
    if b["kind"] in ("video", "short", "film") and b.get("img"):
        thumb = f'<img class="row-thumb" src="{S}{e(b["img"])}" alt="" width="320" height="180" loading="lazy" decoding="async">'
    return f'''<li class="row k-{b["kind"]}" id="i-{b["id"]}"><details>
  <summary><span class="c-g">{glyph(b["kind"], status)}</span><span class="c-t">{e(b["title"])}</span><span class="c-k">{kind}</span><span class="c-d">{e(b["dateLabel"])}</span><span class="c-s">{e(clabel[b["cluster"]])}</span><span class="c-st">{st}</span><span class="c-m">{kind} · {e(b["dateLabel"])}</span></summary>
  <div class="row-body">{thumb}<div>{extra}
    <p class="row-links">{link_for(b)} <button type="button" class="locate" data-locate="{b["id"]}" hidden>Locate on the map</button></p></div>
  </div>
</details></li>'''

groups = [
    ("Builds &amp; experiments", [b for b in bodies if b["kind"] == "build"], "builds"),
    ("Film &amp; videos", [b for b in bodies if b["kind"] in ("film", "video", "short")], "videos"),
    ("Writing", [b for b in bodies if b["kind"] == "essay"], "writing-index"),
]
index_html = ""
for title, items, gid in groups:
    index_html += f'<section class="index-group" aria-labelledby="ig-{gid}"><h3 id="ig-{gid}"><span>{title}</span> <span class="count">{len(items)}</span></h3><div class="cat-head" aria-hidden="true"><span></span><span>Title</span><span>Kind</span><span>Date</span><span>Topic</span><span>Status</span></div><ol class="rows">' + "".join(index_row(b) for b in items) + "</ol></section>"

digest_rows = "".join(
    f'<li><a href="{e(p["url"])}" rel="noopener">{e(p["title"])}</a><span class="d-date">{fmt_date(p["date"])}</span></li>'
    for p in D["latest"])

# writing feature (3 most recent essays, plus the rest compact)
def essay_card(w, big=False):
    return f'''<article class="essay{' essay-big' if big else ''}">
  <img src="{S}{e(w["image"])}" alt="{e(w["imageAlt"])}" width="1200" height="675" loading="lazy" decoding="async">
  <p class="essay-meta"><span class="auth">{e(w["authorship"])}</span><span>{e(w["date"])}</span></p>
  <h3><a href="{e(w["url"])}" rel="noopener">{e(w["title"])}</a></h3>
  <p>{e(w["dek"])}</p>
</article>'''
W = C["writing"]
writing_html = essay_card(W[0], True) + "".join(essay_card(w) for w in W[1:4])
writing_more = "".join(f'<li><a href="{e(w["url"])}" rel="noopener">{e(w["title"])}</a><span>{e(w["authorship"])} · {e(w["date"])}</span></li>' for w in W[4:])

now_html = "".join(f'<li><time datetime="{n["date"]}">{fmt_date(n["date"])}</time><p>{e(n["text"])}</p></li>' for n in C["now"]["items"])
interests = "".join(f"<li>{e(i)}</li>" for i in C["now"]["interests"])

A = C["about"]
speaking = "".join(f'''<li><span class="yr">{s["year"]}</span><div><h4>{e(s["event"])} <span class="role">{e(s["role"])}</span></h4><p>{e(s["detail"])}</p><p class="links">{" · ".join(ext(l["url"], e(l["label"]) + ' <span aria-hidden="true">↗</span>') for l in s["links"])}</p></div></li>''' for s in A["speaking"])
creds = "".join(f'<li><strong>{e(c["name"])}</strong><span>{e(c["issuer"])}</span></li>' for c in A["credentials"] if "CPA" in c["name"] or c["name"].startswith("Project Management Professional"))
press = "".join(f'<li><span class="p-date">{e(p["date"])}</span><span class="p-outlet">{e(p["outlet"])}</span><span class="p-title">{e(p["title"])}</span></li>' for p in C["press"]["profiles"])
commentary = "".join(f'<li><span class="p-date">{e(p["date"])}</span><span class="p-outlet">{e(p["outlet"])}</span><span class="p-title">{e(p["title"])}</span></li>' for p in C["press"]["commentary"])
socials = "".join(f'<li><a href="{e(s["url"])}" rel="noopener"><span class="s-label">{e(s["label"])}</span><span class="s-handle">{e(s["handle"]) or "Feed"}</span></a></li>' for s in C["socials"])
W2 = C["work"]
includes = "".join(f"<li>{e(i)}</li>" for i in W2["includes"])
LD = C["luckyDomains"]
I = C["identity"]

latest_build = max((b for b in bodies if b["kind"] in ("build",)), key=lambda b: b["date"])
n_builds = sum(1 for b in bodies if b["kind"] in ("build", "film"))
n_vid = sum(1 for b in bodies if b["kind"] in ("video", "short", "film"))
n_ess = sum(1 for b in bodies if b["kind"] == "essay")
n_hand = sum(1 for b in bodies if b["kind"] != "digest")
n_live = sum(1 for b in bodies if b.get("status") == "LIVE")

body_buttons = ""   # rendered by JS (needs JS anyway)

film_stills = "".join(
    f'<figure><img src="{S}{p}" alt="Still {i+1} from Returning Your Things" width="1280" height="720" loading="lazy" decoding="async"></figure>'
    for i, p in enumerate(film["stills"][:3]))
credits = "".join(f"<div><dt>{e(a)}</dt><dd>{e(b)}</dd></div>" for a, b in film["credits"])

DATA_JSON = json.dumps(DATA, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
PAGE = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<title>Concept 05 · The Digital Universe · Ken Ashe</title>
<meta name="description" content="Design concept: Ken Ashe's builds, videos, film, essays and the automated Digest mapped as a navigable universe, positioned by real dates and real topics.">
<link rel="icon" href="{S}shared/img/favicon.svg" type="image/svg+xml">
<link rel="preload" href="fonts/syne.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="fonts/geist-mono.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{S}shared/concept-flag.css">
<link rel="stylesheet" href="assets/universe.css">
<script>document.documentElement.classList.add('js');</script>
</head>
<body>
<div class="concept-flag" role="note"><strong>Design concept</strong><span>Concept 05 · The Digital Universe. Not the live KenAshe.ai. Not indexed.</span><a href="{S}">All six concepts</a></div>
<a class="skip" href="#index">Skip the map: go to the full list</a>

<header class="hud" id="top">
  <a class="mark" href="./" aria-label="Ken Ashe, universe home"><span class="mark-name">Ken Ashe</span><span class="mark-role">{e(I["title"])}</span></a>
  <div class="hud-tools">
    <div class="jump" role="search">
      <label for="jump-input" class="vh">Jump to a body</label>
      <input id="jump-input" type="text" role="combobox" aria-expanded="false" aria-controls="jump-list" aria-autocomplete="list" autocomplete="off" placeholder="Jump to…" spellcheck="false">
      <ul id="jump-list" role="listbox" aria-label="Matching bodies" hidden></ul>
    </div>
    <button type="button" class="hud-btn" id="btn-list" aria-pressed="false"><span class="ico" aria-hidden="true">☰</span><span class="lbl">List view</span></button>
    <button type="button" class="hud-btn" id="btn-motion" aria-pressed="false" hidden><span class="ico" aria-hidden="true">❚❚</span><span class="lbl">Pause motion</span></button>
  </div>
  <nav class="hud-nav" aria-label="Sections">
    <a href="#index">Index</a><a href="#now">Now</a><a href="#film">Film</a><a href="#writing">Writing</a><a href="#digest">Digest</a><a href="#about">About</a><a href="#press">Press</a><a href="#work">Sponsor</a><a href="#contact">Contact</a>
  </nav>
</header>
<nav class="plates-nav" aria-label="Sections"><a href="#index">Index</a><a href="#now">Now</a><a href="#film">Film</a><a href="#writing">Writing</a><a href="#digest">Digest</a><a href="#about">About</a><a href="#press">Press</a><a href="#work">Sponsor</a><a href="#contact">Contact</a></nav>

<main id="main">
<section class="universe" id="universe" aria-labelledby="title">
  <div class="plate-head">
    <p class="plate-no">Plate I · The work, Dec 2025 to Nov 2026</p>
    <h1 id="title"><span class="h1-name">Ken Ashe</span> <span class="h1-tag">{e(I["tagline"])}</span></h1>
    <p class="plate-sub">{n_hand} handmade bodies placed by real publish date and real topic, around a core of {D["publishedCount"]:,} automated Digest posts.</p>
    <p class="plate-key">How to read it: rings mark months, and the axis widens toward now. The five lanes are topics. Dotted threads are documented links between works.</p>
  </div>

  <div class="stage" id="stage">
    <canvas id="sky" aria-hidden="true"></canvas>
    <div class="bodies" id="bodies" role="group" aria-label="Map of the work. Use Tab or the arrow keys to move between bodies, Enter to open one." aria-describedby="map-help"></div>
    <p class="vh" id="map-help">Left and right arrows move through time. Up and down arrows move to the nearest body in the neighbouring topic. Enter opens a card. Escape closes it.</p>
    <aside class="card" id="card" aria-labelledby="card-title" hidden>
      <div class="card-in" id="card-in"></div>
    </aside>
    <div class="stage-ui">
      <div class="legend" aria-label="Legend">
        <span>{glyph("build")}Build</span><span>{glyph("build","LIVE")}Live</span><span>{glyph("film")}Film</span><span>{glyph("video")}Video</span><span>{glyph("short")}Short</span><span>{glyph("essay")}Essay</span><span class="lg-auto">{glyph("digest")}Digest post · automated</span>
      </div>
      <div class="cam" role="group" aria-label="View controls">
        <button type="button" id="z-out" aria-label="Zoom out">−</button>
        <button type="button" id="z-in" aria-label="Zoom in">+</button>
        <button type="button" id="z-reset">Reset view</button>
      </div>
      <p class="hint" id="hint"><span class="hint-ptr">Drag to orbit · tap a body to open it</span><span class="hint-kbd">Tab or ←→ to travel · Enter opens</span></p>
    </div>
    <noscript><p class="noscript-note">The interactive map needs JavaScript. Everything on it is listed below.</p></noscript>
  </div>

  <dl class="readout" id="readout">
    <div><dt>Handmade</dt><dd>{n_builds - 1} builds · 1 film · {n_vid - 1} videos · {n_ess} essays</dd></div>
    <div><dt>Status</dt><dd>{n_live} builds marked LIVE</dd></div>
    <div><dt>Latest build</dt><dd>{e(latest_build["title"])}, {e(latest_build["dateLabel"])}</dd></div>
    <div class="ro-auto"><dt>Automated</dt><dd>{D["publishedCount"]:,} Digest posts as of {fmt_date(D["publishedCountAsOf"])}</dd></div>
    <div><dt>zerohuman.eth</dt><dd id="ro-zh" data-live="zerohuman">Snapshot · Nov 25, 2026 · healthy · block {int(DATA["live"]["head"]):,}</dd></div>
  </dl>
</section>

<section class="index" id="index" aria-labelledby="index-h" tabindex="-1">
  <header class="sec-head">
    <p class="plate-no">Plate II · Index of every body</p>
    <h2 id="index-h">Everything on the map, as a list</h2>
    <p class="sec-lede">The same {n_hand} works, newest first. Open any row for its notes. This list is the map's equal: readable without JavaScript, and the quickest path on a phone.</p>
  </header>
  <div class="index-grid">{index_html}
    <section class="index-group ig-auto" aria-labelledby="ig-digest"><h3 id="ig-digest"><span>The Digest</span> <span class="auto-tag">Automated</span></h3>
      <p class="dek">Machine-published. {D["publishedCount"]:,} posts as of {fmt_date(D["publishedCountAsOf"])}; it forms the dim core of the map, one particle per post. See the Digest section below.</p>
      <p class="row-links"><button type="button" class="locate" data-locate="digest" hidden>Locate on the map</button></p>
    </section>
  </div>
</section>

<section class="now" id="now" aria-labelledby="now-h">
  <header class="sec-head">
    <p class="plate-no">Plate III · Now</p>
    <h2 id="now-h">Current position</h2>
  </header>
  <div class="now-grid">
    <ol class="now-list">{now_html}</ol>
    <div class="interests">
      <h3>Pulling attention</h3>
      <ul>{interests}</ul>
      <p class="next"><strong>Next on the map.</strong> The real test for ZeroHuman is the first wallet Ken has never seen paying zerohuman.eth. New experiments are plotted here when they ship.</p>
    </div>
  </div>
</section>

<section class="film" id="film" aria-labelledby="film-h">
  <div class="film-in">
    <p class="plate-no">Plate IV · A short film</p>
    <h2 id="film-h">{e(film["title"])}</h2>
    <p class="film-log">{e(film["logline"])}</p>
    <div class="film-player" id="film-player">
      <img src="{S}shared/img/video/QhOYaj_bDZY.webp" alt="Title frame of Returning Your Things" width="1280" height="720" loading="lazy" decoding="async">
      <button type="button" class="play" data-yt="{film["youtubeId"]}" data-title="{e(film["title"])}" aria-label="Play {e(film["title"])} ({film["runtime"]}). Loads YouTube."><span aria-hidden="true">▶</span> Play the film · {film["runtime"]}</button>
      <noscript><a class="play" href="https://www.youtube.com/watch?v={film["youtubeId"]}" rel="noopener">Watch on YouTube ↗</a></noscript>
    </div>
    <div class="film-stills">{film_stills}</div>
    <div class="film-notes">
      <blockquote class="dnote"><p>{e(film["directorsNote"])}</p><footer>Director’s note, Ken Ashe</footer></blockquote>
      <dl class="credits">{credits}</dl>
      <p class="film-links">{ext(C["builds"][1]["url"], "The film’s page ↗")} {ext(film["behindTheScenes"], "Behind the scenes: 4 Tips for Making AI Videos That Feel Like Films ↗")}</p>
    </div>
  </div>
</section>

<section class="writing" id="writing" aria-labelledby="writing-h">
  <header class="sec-head">
    <p class="plate-no">Plate V · Personal writing</p>
    <h2 id="writing-h">Essays Ken directs, edits and stands behind</h2>
    <p class="sec-lede">Each essay says how it was made.</p>
  </header>
  <div class="essays">{writing_html}</div>
  <ul class="essay-more">{writing_more}</ul>
  <p class="more-link">{ext("https://kenashe.ai/writing/", "All writing on kenashe.ai ↗")} · {ext("https://kenashe.ai/writing/rss.xml", "Writing RSS ↗")}</p>
</section>

<section class="digest" id="digest" aria-labelledby="digest-h">
  <div class="digest-in">
    <p class="auto-stamp">Automated · machine-published · not personal writing</p>
    <h2 id="digest-h">The Digest</h2>
    <p class="digest-desc">{e(D["description"])}</p>
    <div class="digest-cols">
      <div class="digest-count">
        <p class="big-n">{D["publishedCount"]:,}</p>
        <p>posts published as of {fmt_date(D["publishedCountAsOf"])}, {e(D["cadence"])}.</p>
        <p class="commit" id="digest-commit" data-live="github">Latest pipeline commit · Snapshot · {fmt_date(DATA["commit"]["date"][:10])}: “{e(DATA["commit"]["message"])}”</p>
        <ul class="topics">{"".join(f"<li><strong>{e(t['name'])}</strong> {e(t['angle'])}</li>" for t in D["topics"])}</ul>
      </div>
      <div class="digest-latest">
        <h3>Latest {len(D["latest"])} automated posts</h3>
        <ol>{digest_rows}</ol>
        <p>{ext(D["url"], "Open the Digest ↗")}</p>
      </div>
    </div>
  </div>
</section>

<section class="about" id="about" aria-labelledby="about-h">
  <header class="sec-head">
    <p class="plate-no">Plate VI · The observer</p>
    <h2 id="about-h">About Ken</h2>
  </header>
  <div class="about-grid">
    <figure class="portrait"><img src="{S}shared/img/portrait/ken-black-polo-640.webp" alt="{e(A["portraits"][0]["alt"])}" width="640" height="800" loading="lazy" decoding="async"></figure>
    <div class="about-text">
      <p class="about-lede">{e(I["approach"])}</p>
      <p>{e(A["bio"])}</p>
      {"".join(f"<p>{e(p)}</p>" for p in A["background"])}
      <p class="muted">{e(A["veteran"])} · {e(I["location"])}</p>
      <ul class="bring">{"".join(f"<li><h3>{e(x['title'])}</h3><p>{e(x['body'])}</p></li>" for x in C["whatIBring"])}</ul>
    </div>
    <div class="about-side">
      <h3>Credentials</h3>
      <ul class="creds">{creds}</ul>
      <p class="muted">Member, Forbes Business Council (2026–present). {ext("https://kenashe.ai/about/", "Full background on kenashe.ai ↗")}</p>
      <h3>Speaking &amp; judging</h3>
      <ol class="speaking">{speaking}</ol>
    </div>
  </div>
</section>

<section class="press" id="press" aria-labelledby="press-h">
  <header class="sec-head">
    <p class="plate-no">Plate VII · Press</p>
    <h2 id="press-h">Press &amp; commentary</h2>
  </header>
  <div class="press-grid">
    <div><h3>Profiles &amp; interviews</h3><ol class="press-list">{press}</ol></div>
    <div><h3>Commentary</h3><ol class="press-list">{commentary}</ol>
      <p class="muted">Forbes Business Council Expert Panel responses: Ken is a contributor.</p>
      <p class="media">{ext(C["press"]["newsroomUrl"], "Newsroom ↗")} {ext("https://kenashe.ai/newsroom/#media-kit", "Media kit ↗")}</p>
      <h3>Available for comment</h3>
      <ul class="comment">{"".join(f"<li>{e(x)}</li>" for x in A["availableForComment"])}</ul>
    </div>
  </div>
</section>

<section class="work" id="work" aria-labelledby="work-h">
  <div class="work-in">
    <p class="plate-no">Plate VIII · Sponsorship</p>
    <h2 id="work-h">{e(W2["headline"])}</h2>
    <p class="work-sub">{e(W2["subhead"])}</p>
    <p>{e(W2["intro"])}</p>
    <ol class="includes">{includes}</ol>
    <p class="fine"><strong>What payment does not buy.</strong> {e(W2["doesNotBuy"])} {e(W2["notInDigest"])} No public prices.</p>
    <p>{ext(W2["url"], "How sponsored tests work ↗", "btn")} <a class="btn btn-ghost" href="mailto:{I["email"]}?subject=Sponsored%20test">{I["email"]}</a></p>
  </div>
  <div class="ld" aria-labelledby="ld-h">
    <p class="plate-no">Separate company</p>
    <h2 id="ld-h">{e(LD["name"])}</h2>
    <p>{e(LD["description"])} {e(LD["role"])}</p>
    <p>{ext(LD["url"], "luckydomains.io ↗")}</p>
    <p class="muted small">Ken's experiments on this map are personal builds, not Lucky Domains ventures. Future ventures appear here only when they are real.</p>
  </div>
</section>

<section class="contact" id="contact" aria-labelledby="contact-h">
  <p class="plate-no">Plate IX · Signal</p>
  <h2 id="contact-h"><a href="mailto:{I["email"]}">{I["email"]}</a></h2>
  <ul class="socials">{socials}</ul>
</section>
</main>

<footer class="foot">
  <p>{e(I["footerLine"])}</p>
  <p class="muted">Positions are computed from shared content (snapshot {C["_meta"]["snapshotDate"]}). The time axis widens toward the present. Builds dated only to the month are spread within that month. Digest particles are spread evenly from May 2026 to Nov 24, 2026 because per-post dates are not in this snapshot. {ext(I["liveUrl"], "The live kenashe.ai ↗")}</p>
</footer>

<script type="application/json" id="universe-data">{DATA_JSON}</script>
<script type="module" src="assets/universe.js"></script>
</body>
</html>
'''
OUT.write_text(PAGE)
print("wrote", OUT, len(PAGE), "bytes;", len(bodies), "bodies")
