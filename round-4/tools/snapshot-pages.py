"""Prototype-only step: copy the BODY of each existing page from the live site, so the Round 4
prototype shows Ken's real words without anyone retyping them.

  python3 round-4/tools/snapshot-pages.py

In production this step does not exist: each page keeps its own body exactly where it is today
(src/pages/building/*.astro, src/pages/writing/*). Only the frame around the body changes.
Read-only: plain GET requests to public pages on kenashe.ai. Output: content/pages.json + assets/page/.
"""
import json, os, re, io, sys, urllib.request
from bs4 import BeautifulSoup, NavigableString, Comment
from PIL import Image
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIVE = 'https://kenashe.ai'
src = json.load(open(os.path.join(R, 'data/sources.json')))
routes = [b['link'].split('#')[0] for b in src['builds'] if b['hasPage']] + [w['link'] for w in src['writing']] + ['/about/']
KEEP = {'p','h2','h3','h4','ul','ol','li','a','strong','em','b','i','code','pre','blockquote','table','thead','tbody','tr','th','td','figure','figcaption','img','div','section','span','dl','dt','dd','br','hr','time','small','sup','sub','video','source'}
BOX = {'exchange','receipts','receipt','update','node','arch-node','layer','takes','tier'}
os.makedirs(os.path.join(R, 'assets/page'), exist_ok=True)
def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'design-prototype-snapshot'}), timeout=30).read()
def image(url, name):
    out = os.path.join(R, 'assets/page', name + '.webp')
    im = Image.open(io.BytesIO(get(url))).convert('RGB')
    if im.width > 1280: im = im.resize((1280, round(im.height * 1280 / im.width)), Image.LANCZOS)
    im.save(out, 'WEBP', quality=78)
    return 'page/' + name + '.webp', im.width, im.height
def ahash(im):
    g = im.convert('L').resize((12, 12), Image.LANCZOS); px = list(g.getdata()); m = sum(px) / len(px)
    return [v > m for v in px]
def same_as_lead(path, slug):
    # The page's lead picture is already shown at the top from the item's own record, so it is not repeated in the body.
    lead = os.path.join(R, 'assets/writing', slug.split('--')[-1] + '.webp')
    if not os.path.exists(lead): return False
    a, b = ahash(Image.open(lead)), ahash(Image.open(os.path.join(R, 'assets', path)))
    return sum(x != y for x, y in zip(a, b)) <= 14
def clean(node, slug, n):
    for c in node.find_all(string=lambda s: isinstance(s, Comment)): c.extract()
    for e in node.find_all(['script','style','svg','button','noscript','form','input','template']): e.decompose()
    for e in node.find_all('iframe'):
        m = re.search(r'(?:embed/|v=)([A-Za-z0-9_-]{11})', e.get('src','') + e.get('data-src',''))
        d = BeautifulSoup('', 'html.parser').new_tag('div')
        if m: d['data-video'] = m.group(1); d['data-title'] = e.get('title','')
        (e.find_parent('figure') or e).replace_with(d)
    for e in node.find_all('picture'):
        im = e.find('img'); e.replace_with(im) if im else e.decompose()
    for e in list(node.find_all(True)):
        if e.decomposed or e.parent is None: continue
        if e.name not in KEEP: e.unwrap(); continue
        cls = set(e.get('class') or [])
        keep = {}
        if e.name == 'div' and e.get('data-video'): keep = {'data-video': e['data-video'], 'data-title': e.get('data-title','')}
        if e.name == 'a' and e.get('href'): keep['href'] = e['href']
        if e.name == 'img':
            s = e.get('src','')
            try:
                n[0] += 1
                p, w, h = image(s if s.startswith('http') else LIVE + s, f'{slug}-{n[0]}')
                if same_as_lead(p, slug):
                    print('  lead picture not repeated:', p); (e.find_parent('figure') or e).decompose(); continue
                keep = {'src': '{{assets}}/' + p, 'alt': e.get('alt',''), 'width': str(w), 'height': str(h), 'loading': 'lazy', 'decoding': 'async'}
            except Exception as x:
                print('  image skipped', s[:80], x); e.decompose(); continue
        if e.name == 'video':
            s = e.get('src') or (e.find('source') or {}).get('src','')
            a = BeautifulSoup('', 'html.parser').new_tag('a', href=s); a.string = 'Play this clip'
            p = BeautifulSoup('', 'html.parser').new_tag('p'); p.append(a); e.replace_with(p); continue
        if e.name in ('div','section') and cls & BOX: keep['class'] = 'box'
        if e.name in ('th','td') and e.get('colspan'): keep['colspan'] = e['colspan']
        if e.name == 'ol' and e.get('start'): keep['start'] = e['start']
        e.attrs = keep
    html = node.decode_contents()
    html = re.sub(r'<(div|section|span)>\s*</\1>', '', html)
    return re.sub(r'\n\s*\n+', '\n', html).strip()
out = {}
for r in routes:
    slug = r.strip('/').replace('/', '--')
    s = BeautifulSoup(get(LIVE + r), 'html.parser'); art = s.find('main').find('article') or s.find('main')
    n = [0]
    rec = {'route': r, 'title': s.title.get_text(strip=True) if s.title else '', 'h1': art.find('h1').get_text(' ', strip=True),
           'summary': (art.select_one('header .summary') or art.select_one('header .logline') or BeautifulSoup('<i></i>','html.parser')).get_text(' ', strip=True),
           'meta': (art.select_one('header .meta') or art.select_one('header .details') or BeautifulSoup('<i></i>','html.parser')).get_text(' ', strip=True),
           'description': (s.find('meta', attrs={'name':'description'}) or {}).get('content',''),
           'links': [{'label': a.get_text(' ', strip=True), 'href': a['href']} for a in art.select('nav.build-links a')]}
    lead = art.select_one('figure.essay-figure')
    parts = []
    if r == '/about/':
        for sec in art.find_all(['div','section','p'], recursive=False):
            if 'sections' in (sec.get('class') or []): continue
            parts.append(f'<section>{clean(sec, slug, n)}</section>' if sec.name != 'p' else f'<p>{clean(sec, slug, n)}</p>')
    else:
        pr = art.select('.prose') or [x for x in art.find_all('section', recursive=False)]
        if lead and not lead.find_parent(class_='prose'): lead.extract()
        for p in pr: parts.append(clean(p, slug, n))
    rec['body'] = '\n'.join(parts)
    out[r] = rec; print(r, len(rec['body']), 'images', n[0], '| links', len(rec['links']))
json.dump({'_note': 'Bodies copied read-only from the live site for the prototype. Production keeps bodies in its own page files.', 'snapshotOf': LIVE, 'pages': out}, open(os.path.join(R, 'content/pages.json'), 'w'), indent=1, ensure_ascii=False)
