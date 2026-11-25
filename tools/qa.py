import http.server,socketserver,threading,os,sys,json
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
socketserver.TCPServer.allow_reuse_address=True
httpd=socketserver.ThreadingTCPServer(('127.0.0.1',8198),lambda *a,**k:H(*a,directory=ROOT,**k))
threading.Thread(target=httpd.serve_forever,daemon=True).start()
C=json.load(open(f'{ROOT}/review/concepts.json'))
pages=['']+[f"concepts/{c['slug']}/{p}" for c in C for p in ['']+c['interiors'] if not sys.argv[1:] or c['slug'] in sys.argv[1:]]
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'])
    for pg in pages:
        for vw,rm in [(390,'no-preference'),(1440,'reduce'),(768,'no-preference')]:
            ctx=b.new_context(viewport={'width':vw,'height':844},reduced_motion=rm)
            page=ctx.new_page(); errs=[]; bad=[]
            page.on('console',lambda m: errs.append(m.text[:140]) if m.type=='error' else None)
            page.on('pageerror',lambda e: errs.append('PAGEERR '+str(e)[:140]))
            page.on('response',lambda r: bad.append(f"{r.status} {r.url[-70:]}") if r.status>=400 else None)
            page.goto(f'http://127.0.0.1:8198/{pg}',wait_until='load'); page.wait_for_timeout(1500)
            sw=page.evaluate('document.documentElement.scrollWidth')
            h1=page.evaluate('document.querySelectorAll("h1").length')
            imgs=page.evaluate('[...document.images].filter(i=>!i.alt && i.getAttribute("alt")===null).length')
            flag = 'OK' if sw<=vw and not errs and not bad and h1==1 and imgs==0 else 'CHECK'
            if flag!='OK' or vw==390: print(flag,pg or 'review',vw,rm,'sw',sw,'h1',h1,'noalt',imgs,errs[:3],bad[:3])
            ctx.close()
    b.close()
httpd.shutdown()
