"""Round 2 QA: every HTML page under round-2/ (directions + review page).

python3 round-2/tools/qa.py  -> prints a table, writes round-2/review/qa.json

Checks per page: robots noindex, concept notice, h1 count, console errors, failed requests,
horizontal overflow at 390/768/1440, outside hosts contacted, broken internal links/assets,
and the same page with JavaScript disabled (text length + links still present).
"""
import http.server, json, os, socketserver, threading
from urllib.parse import urljoin, urlparse
from playwright.sync_api import sync_playwright

R2 = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(R2)
PORT = 8292
B = f'http://127.0.0.1:{PORT}/'
ALLOWED = {'zerohuman-production.up.railway.app', 'api.github.com'}


def serve():
    class H(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    socketserver.TCPServer.allow_reuse_address = True
    h = socketserver.ThreadingTCPServer(('127.0.0.1', PORT), lambda *a, **k: H(*a, directory=ROOT, **k))
    threading.Thread(target=h.serve_forever, daemon=True).start()
    return h


def pages():
    out = []
    for dp, dn, fn in os.walk(R2):
        dn[:] = [d for d in dn if not d.startswith(('_', '.')) and d not in ('tools', 'source', 'data', 'node_modules')]
        for f in fn:
            if f == 'index.html':
                out.append(os.path.relpath(os.path.join(dp, f), ROOT).replace('index.html', ''))
    return sorted(out)


def main():
    h = serve(); report = {}
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
        for path in pages():
            r = dict(errors=[], failed=[], hosts=set(), overflow={}, broken=[])
            for w in (1440, 768, 390):
                ctx = b.new_context(viewport={'width': w, 'height': 900}, is_mobile=w == 390, has_touch=w == 390)
                pg = ctx.new_page()
                if w == 1440:
                    pg.on('console', lambda m: r['errors'].append(m.text[:140]) if m.type == 'error' else None)
                    pg.on('pageerror', lambda e: r['errors'].append('PAGEERR ' + str(e)[:140]))
                    pg.on('response', lambda x: r['failed'].append(f'{x.status} {x.url[len(B):] if x.url.startswith(B) else x.url}') if x.status >= 400 else None)
                    pg.on('request', lambda q: r['hosts'].add(urlparse(q.url).netloc) if not q.url.startswith((B, 'data:', 'blob:')) else None)
                pg.goto(B + path, wait_until='load'); pg.wait_for_timeout(1800)
                pg.evaluate("async()=>{for(let y=0;y<document.documentElement.scrollHeight;y+=800){scrollTo(0,y);await new Promise(r=>setTimeout(r,50))}}")
                pg.wait_for_timeout(500)
                r['overflow'][w] = pg.evaluate('document.documentElement.scrollWidth') - w
                if w == 1440:
                    r['robots'] = pg.evaluate("document.querySelector('meta[name=robots]')?.content")
                    r['flag'] = pg.evaluate("!!document.querySelector('body > .concept-flag, .concept-flag')")
                    r['h1'] = pg.evaluate("document.querySelectorAll('h1').length")
                    r['height'] = pg.evaluate('document.documentElement.scrollHeight')
                    refs = pg.evaluate("[...document.querySelectorAll('a[href],[src],link[href]')].map(e=>e.getAttribute('href')||e.getAttribute('src'))")
                    for u in refs:
                        if not u or u.startswith(('#', 'mailto:', 'tel:', 'javascript:', 'data:')): continue
                        full = urljoin(B + path, u)
                        if full.startswith(B):
                            fp = os.path.join(ROOT, urlparse(full).path.lstrip('/'))
                            if fp.endswith('/'): fp += 'index.html'
                            if not os.path.exists(fp): r['broken'].append(u)
                if w == 390:
                    r['height_mobile'] = pg.evaluate('document.documentElement.scrollHeight')
                ctx.close()
            ctx = b.new_context(java_script_enabled=False, viewport={'width': 1440, 'height': 900}); pg = ctx.new_page()
            pg.goto(B + path, wait_until='load')
            r['nojs_text'] = pg.evaluate('document.body.innerText.length')
            r['nojs_links'] = pg.evaluate("document.querySelectorAll('main a[href], a[href]').length")
            ctx.close()
            r['hosts'] = sorted(r['hosts']); r['broken'] = sorted(set(r['broken']))
            r['unexpected_hosts'] = [x for x in r['hosts'] if x not in ALLOWED and 'youtube' not in x and 'ytimg' not in x]
            report[path] = r
            ok = r['robots'] and 'noindex' in r['robots'] and r['flag'] and r['h1'] == 1 and not r['errors'] and not r['failed'] and not r['broken'] and max(r['overflow'].values()) <= 0 and not r['unexpected_hosts']
            print(('OK   ' if ok else 'CHECK') + f" {path}  h1={r['h1']} H={r['height']}/{r['height_mobile']} overflow={r['overflow']} nojs={r['nojs_text']}ch err={r['errors'][:2]} fail={r['failed'][:3]} broken={r['broken'][:3]} hosts={r['hosts']}", flush=True)
        b.close()
    h.shutdown()
    os.makedirs(os.path.join(R2, 'review'), exist_ok=True)
    json.dump(report, open(os.path.join(R2, 'review', 'qa.json'), 'w'), indent=1, default=list)


if __name__ == '__main__':
    main()
