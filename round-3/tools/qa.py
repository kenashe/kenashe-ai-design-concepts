"""Round 3 QA. Every index.html under round-3/ (review page, site/, stress/).

python3 round-3/tools/qa.py [substring]      -> prints a table, writes round-3/review/qa.json

Per page, in Chromium: robots noindex, concept notice, one h1, no canonical to kenashe.ai, console
errors, failed requests, broken internal links, horizontal overflow at 1440/768/390, smallest text
size, small tap targets on mobile, weight (gzip-equivalent), keyboard focus visibility, reduced
motion (page must be visually still), JavaScript disabled, all outside hosts blocked.
In Firefox: console errors, overflow, h1 visible at 1440 and 390.
"""
import http.server, io, json, os, socketserver, sys, threading, zlib
from urllib.parse import urljoin, urlparse
from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright

R3 = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(R3)
PORT = 8493
B = f'http://127.0.0.1:{PORT}/'
OPTIONAL_HOSTS = {'zerohuman-production.up.railway.app'}


def serve():
    class H(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
        def handle(self):
            try: super().handle()
            except (BrokenPipeError, ConnectionResetError): pass
    socketserver.TCPServer.allow_reuse_address = True
    class S(socketserver.ThreadingTCPServer):
        def handle_error(self, *a): pass
    h = S(('127.0.0.1', PORT), lambda *a, **k: H(*a, directory=ROOT, **k))
    threading.Thread(target=h.serve_forever, daemon=True).start()
    return h


def pages(filt):
    out = []
    for dp, dn, fn in os.walk(R3):
        dn[:] = [d for d in dn if not d.startswith(('_', '.')) and d not in ('tools', 'source', 'data', 'assets', 'lib', 'production-plan', 'review', 'node_modules')]
        if 'index.html' in fn: out.append(os.path.relpath(os.path.join(dp, 'index.html'), ROOT).replace('index.html', ''))
    return sorted(p for p in out if not filt or (p == filt[1:] if filt.startswith('=') else filt in p))


TEXT = """() => { const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) { const t = n.nodeValue.trim(); if (t.length < 2) continue; const el = n.parentElement; if (!el || el.closest('.concept-flag,script,style,noscript,svg title,svg desc')) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue; const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
    let px = parseFloat(cs.fontSize); if (el.closest('svg') && !el.closest('foreignObject')) { const svg = el.closest('svg'); const vb = svg.viewBox && svg.viewBox.baseVal; if (vb && vb.width) px = px * svg.getBoundingClientRect().width / vb.width; }
    out.push([Math.round(px * 10) / 10, t.slice(0, 40)]); }
  out.sort((a, b) => a[0] - b[0]); return { min: out[0] ? out[0][0] : null, under14: out.filter(x => x[0] < 13.95).length, samples: out.filter(x => x[0] < 13.95).slice(0, 5) }; }"""
TAPS = """() => [...document.querySelectorAll('a[href],button,[role=button],input,select,summary')].filter(e => { if (e.closest('.concept-flag') || e.closest('svg')) return false; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
  if (r.width < 1 || r.height < 1 || cs.visibility === 'hidden') return false; if (e.tagName === 'A' && cs.display === 'inline' && e.closest('p,li,dd,figcaption,blockquote')) return false; return r.width < 43.5 || r.height < 43.5; }).map(e => (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 30) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height)).slice(0, 8)"""
SCROLL = "async()=>{for(let y=0;y<document.documentElement.scrollHeight;y+=800){scrollTo(0,y);await new Promise(r=>setTimeout(r,60))} scrollTo(0,0)}"


def main(filt):
    h = serve(); report = {}
    with sync_playwright() as p:
        cr = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
        try: ff = p.firefox.launch()
        except Exception: ff = None
        for path in pages(filt):
            r = dict(errors=[], failed=[], hosts=set(), overflow={}, broken=[], bytes_raw=0, bytes_gz=0, requests=0)
            for w in (1440, 768, 390):
                ctx = cr.new_context(viewport={'width': w, 'height': 900 if w > 390 else 844}, is_mobile=w == 390, has_touch=w == 390)
                pg = ctx.new_page()
                if w == 1440:
                    pg.on('console', lambda m: r['errors'].append(m.text[:160]) if m.type == 'error' else None)
                    pg.on('pageerror', lambda e: r['errors'].append('PAGEERR ' + str(e)[:160]))
                    def resp(x):
                        if x.status >= 400: r['failed'].append(f'{x.status} {x.url.replace(B, "")}')
                        if x.url.startswith(B):
                            try:
                                body = x.body(); r['requests'] += 1; r['bytes_raw'] += len(body)
                                ct = x.headers.get('content-type', '')
                                r['bytes_gz'] += len(zlib.compress(body, 6)) if any(t in ct for t in ('text', 'javascript', 'json', 'svg', 'xml')) else len(body)
                            except Exception: pass
                    pg.on('response', resp)
                    pg.on('request', lambda q: r['hosts'].add(urlparse(q.url).netloc) if not q.url.startswith((B, 'data:', 'blob:')) else None)
                pg.goto(B + path, wait_until='load'); pg.wait_for_timeout(2200)
                if w == 1440:
                    r['weight_kb'] = round(r['bytes_gz'] / 1024); r['weight_raw_kb'] = round(r['bytes_raw'] / 1024); r['requests_initial'] = r['requests']
                pg.evaluate(SCROLL); pg.wait_for_timeout(500)
                r['overflow'][w] = pg.evaluate('document.documentElement.scrollWidth') - w
                if w == 1440:
                    r['robots'] = pg.evaluate("document.querySelector('meta[name=robots]')?.content")
                    r['flag'] = pg.evaluate("!!document.querySelector('.concept-flag')")
                    r['h1'] = pg.evaluate("document.querySelectorAll('h1').length")
                    r['canonical'] = pg.evaluate("document.querySelector('link[rel=canonical]')?.href || null")
                    r['title'] = pg.title(); r['height'] = pg.evaluate('document.documentElement.scrollHeight')
                    r['text'] = pg.evaluate(TEXT)
                    r['img_no_alt'] = pg.evaluate("[...document.images].filter(i=>!i.hasAttribute('alt')).length")
                    refs = pg.evaluate("[...document.querySelectorAll('a[href],[src],link[href]')].map(e=>e.getAttribute('href')||e.getAttribute('src'))")
                    for u in refs:
                        if not u or u.startswith(('#', 'mailto:', 'tel:', 'javascript:', 'data:', 'blob:')): continue
                        full = urljoin(B + path, u)
                        if full.startswith(B):
                            fp = os.path.join(ROOT, urlparse(full).path.lstrip('/'))
                            if fp.endswith('/'): fp += 'index.html'
                            if not os.path.exists(fp): r['broken'].append(u)
                    # keyboard: first 40 tab stops must be visible and show a focus indicator
                    bad = []; stops = 0
                    for _ in range(40):
                        pg.keyboard.press('Tab')
                        info = pg.evaluate("(() => { const e = document.activeElement; if (!e || e === document.body) return null; const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return { name: (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 30), vis: r.width > 0 && r.height > 0, ring: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 || cs.boxShadow !== 'none' }; })()")
                        if not info: continue
                        stops += 1
                        if not info['vis'] or not info['ring']: bad.append(info['name'])
                    r['kbd_stops'] = stops; r['kbd_bad'] = bad[:6]
                if w == 390:
                    r['height_mobile'] = pg.evaluate('document.documentElement.scrollHeight')
                    r['text_mobile'] = pg.evaluate(TEXT); r['small_taps'] = pg.evaluate(TAPS)
                ctx.close()
            # reduced motion: two frames one second apart must match
            ctx = cr.new_context(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce'); pg = ctx.new_page()
            pg.goto(B + path, wait_until='load'); pg.wait_for_timeout(2500)
            a = Image.open(io.BytesIO(pg.screenshot())).convert('RGB'); pg.wait_for_timeout(1200); b2 = Image.open(io.BytesIO(pg.screenshot())).convert('RGB')
            diff = ImageChops.difference(a, b2).convert('L'); r['reduced_motion_changed_px'] = sum(1 for v in diff.getdata() if v > 12)
            r['reduced_motion_infinite_anims'] = pg.evaluate("document.getAnimations().filter(a=>a.playState==='running'&&a.effect?.getTiming().iterations===Infinity).length")
            ctx.close()
            # JavaScript off
            ctx = cr.new_context(java_script_enabled=False, viewport={'width': 1440, 'height': 900}); pg = ctx.new_page()
            pg.goto(B + path, wait_until='load')
            r['nojs_text'] = pg.evaluate('document.body.innerText.length'); r['nojs_links'] = pg.evaluate("document.querySelectorAll('a[href]').length")
            r['nojs_h1_visible'] = pg.evaluate("(()=>{const h=document.querySelector('h1');if(!h)return false;const b=h.getBoundingClientRect();return b.width>0&&b.height>0})()")
            ctx.close()
            # every outside host blocked
            ctx = cr.new_context(viewport={'width': 1440, 'height': 900}); pg = ctx.new_page(); perr = []
            pg.on('pageerror', lambda e: perr.append(str(e)[:140]))
            pg.route('**/*', lambda route: route.continue_() if route.request.url.startswith((B, 'data:', 'blob:')) else route.abort())
            pg.goto(B + path, wait_until='load'); pg.wait_for_timeout(2500)
            r['offline_page_errors'] = perr[:3]; r['offline_text'] = pg.evaluate('document.body.innerText.length')
            ctx.close()
            # Firefox
            if ff:
                r['firefox'] = {}
                for w in (1440, 390):
                    ctx = ff.new_context(viewport={'width': w, 'height': 900 if w > 390 else 844}); pg = ctx.new_page(); errs = []
                    pg.on('console', lambda m: errs.append(m.text[:140]) if m.type == 'error' and 'zerohuman-production' not in m.text else None); pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:140]))
                    pg.goto(B + path, wait_until='load'); pg.wait_for_timeout(2500); pg.evaluate(SCROLL); pg.wait_for_timeout(400)
                    r['firefox'][w] = dict(errors=errs[:4], overflow=pg.evaluate('document.documentElement.scrollWidth') - w,
                                           h1=pg.evaluate("(()=>{const h=document.querySelector('h1');if(!h)return false;const b=h.getBoundingClientRect();return b.width>0&&b.height>0})()"),
                                           canvas=pg.evaluate("document.querySelectorAll('canvas').length"))
                    ctx.close()
            r['hosts'] = sorted(r['hosts']); r['broken'] = sorted(set(r['broken']))
            r['unexpected_hosts'] = [x for x in r['hosts'] if x not in OPTIONAL_HOSTS and 'youtube' not in x and 'ytimg' not in x]
            ffbad = ff and any(v['errors'] or v['overflow'] > 0 or not v['h1'] for v in r['firefox'].values())
            r['ok'] = bool(r['robots'] and 'noindex' in r['robots'] and r['flag'] and r['h1'] == 1 and not (r['canonical'] or '').startswith('https://kenashe.ai') and not r['errors'] and not r['failed'] and not r['broken']
                           and max(r['overflow'].values()) <= 0 and not r['unexpected_hosts'] and r['text']['under14'] == 0 and r['text_mobile']['under14'] == 0 and not r['kbd_bad']
                           and r['reduced_motion_changed_px'] < 400 and r['nojs_h1_visible'] and not r['offline_page_errors'] and not ffbad and r['img_no_alt'] == 0)
            report[path] = r
            print(('OK    ' if r['ok'] else 'CHECK ') + path.replace('round-3/', '') + f" | {r['weight_kb']}KB gz/{r['requests_initial']}req | H {r['height']}/{r['height_mobile']} | minText {r['text']['min']}/{r['text_mobile']['min']} (<14: {r['text']['under14']}/{r['text_mobile']['under14']} {r['text']['samples'][:2]}) | taps<44: {len(r['small_taps'])} {r['small_taps'][:3]} | kbd {r['kbd_stops']} bad {r['kbd_bad'][:3]} | RM px {r['reduced_motion_changed_px']} | nojs {r['nojs_text']} | overflow {r['overflow']} | err {r['errors'][:2]} fail {r['failed'][:2]} broken {r['broken'][:2]} | ff {r.get('firefox')} | hosts {r['hosts']} | offline {r['offline_page_errors']}", flush=True)
        cr.close()
        if ff: ff.close()
    h.shutdown()
    os.makedirs(os.path.join(R3, 'review'), exist_ok=True)
    old = {}
    fp = os.path.join(R3, 'review', 'qa.json')
    if filt and os.path.exists(fp): old = json.load(open(fp))
    old.update(report); json.dump(old, open(fp, 'w'), indent=1, default=list)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '')
