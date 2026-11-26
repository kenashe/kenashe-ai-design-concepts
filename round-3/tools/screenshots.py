"""Capture Round 3 review screenshots.

python3 round-3/tools/screenshots.py [substring]

Reads round-3/site/meta.json (pages list) and writes round-3/review/screens/:
  <page>-desktop.webp / -desktop-full.webp / -mobile.webp / -mobile-full.webp   (Chromium)
  <page>-firefox.webp                                                          (Firefox, 1440x900)
Extra entries in meta.json "extraShots": [{"name","path","label"}] are captured as viewport shots (tiers, demo, stress).
"""
import http.server, io, json, os, re, socketserver, sys, threading
from PIL import Image, ImageStat
from playwright.sync_api import sync_playwright

R2 = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(R2)
OUT = os.path.join(R2, 'review', 'screens')
PORT = 8491
ARGS = ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']


def serve():
    class H(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    socketserver.TCPServer.allow_reuse_address = True
    h = socketserver.ThreadingTCPServer(('127.0.0.1', PORT), lambda *a, **k: H(*a, directory=ROOT, **k))
    threading.Thread(target=h.serve_forever, daemon=True).start()
    return h


def to_img(png):
    return Image.open(io.BytesIO(png)).convert('RGB')


def save(im, path, max_w=None, max_h=None):
    if max_w and im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
    if max_h and im.height > max_h:
        im = im.crop((0, 0, im.width, max_h))
    im.save(path, 'WEBP', quality=80)


def flat_runs(im):
    g = im.convert('L'); step = max(1, im.height // 40); flat = 0
    for y in range(0, im.height - step, step):
        if ImageStat.Stat(g.crop((0, y, g.width, y + step))).stddev[0] < 1.5: flat += 1
    return flat / 40


SCROLL = """async (step) => { const H = () => document.documentElement.scrollHeight;
  for (let y = 0; y < H(); y += step) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 140)); }
  window.scrollTo(0, 0); }"""


def full(page, vw, vh, step):
    page.evaluate(SCROLL, step); page.wait_for_timeout(900)
    im = to_img(page.screenshot(full_page=True))
    if flat_runs(im) > 0.25:  # reveal-on-scroll content missed: stitch viewport captures instead
        H = min(page.evaluate('document.documentElement.scrollHeight'), 16000)
        canvas = Image.new('RGB', (im.width, H), 'black'); y = 0
        while y < H:
            page.evaluate(f'window.scrollTo(0,{y})'); page.wait_for_timeout(450)
            a = page.evaluate('scrollY'); shot = to_img(page.screenshot())
            canvas.paste(shot.resize((im.width, round(shot.height * im.width / shot.width))), (0, round(a * im.width / vw)))
            y += vh
        im = canvas
    return im


def main(filt):
    os.makedirs(OUT, exist_ok=True)
    h = serve()
    meta = json.load(open(os.path.join(R2, 'site', 'meta.json')))
    base = f'http://127.0.0.1:{PORT}/round-3/'
    key = lambda path: re.sub(r'(/?index\.html)$', '', path).strip('/').replace('/', '_') or 'home'
    targets = [(key(pg['path'].replace('site/', '', 1) if pg['path'].startswith('site/') else pg['path']), base + re.sub(r'index\.html$', '', pg['path']), True) for pg in meta['pages']]
    targets += [(x['name'], base + x['path'], False) for x in meta.get('extraShots', [])]
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS)
        try: ff = p.firefox.launch()
        except Exception: ff = None
        for name, url, fullpage in targets:
            if filt and filt not in name: continue
            for kind, vp, scale, step in [('desktop', (1440, 900), 1, 800), ('mobile', (390, 844), 2, 700)]:
                ctx = b.new_context(viewport={'width': vp[0], 'height': vp[1]}, device_scale_factor=scale, is_mobile=kind == 'mobile', has_touch=kind == 'mobile')
                pg = ctx.new_page(); pg.goto(url, wait_until='load'); pg.wait_for_timeout(3500)
                save(to_img(pg.screenshot()), f'{OUT}/{name}-{kind}.webp', 1440 if kind == 'desktop' else 780)
                if fullpage: save(full(pg, vp[0], vp[1], step), f'{OUT}/{name}-{kind}-full.webp', 900 if kind == 'desktop' else 390, 12000)
                ctx.close()
            if ff:
                ctx = ff.new_context(viewport={'width': 1440, 'height': 900}); pg = ctx.new_page(); pg.goto(url, wait_until='load'); pg.wait_for_timeout(3500)
                save(to_img(pg.screenshot()), f'{OUT}/{name}-firefox.webp', 1440); ctx.close()
            print('shot', name, flush=True)
        b.close()
        if ff: ff.close()
    h.shutdown()


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '')
