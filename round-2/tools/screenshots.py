"""Capture Round 2 review screenshots.

python3 round-2/tools/screenshots.py [letter ...]

Reads round-2/directions/*/meta.json (pages list) and writes round-2/review/screens/:
  <dir>--<page>-desktop.webp       1440x900 viewport
  <dir>--<page>-desktop-full.webp  full page, 900 px wide (max 12,000 px tall)
  <dir>--<page>-mobile.webp        390x844 @2x
  <dir>--<page>-mobile-full.webp   full page, 390 px wide
plus <dir>--demo-desktop.webp / -mobile.webp : homepage with ?demo=build,essay,video
"""
import http.server, io, json, os, re, socketserver, sys, threading
from PIL import Image, ImageStat
from playwright.sync_api import sync_playwright

R2 = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(R2)
OUT = os.path.join(R2, 'review', 'screens')
PORT = 8291
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


def main(letters):
    os.makedirs(OUT, exist_ok=True)
    h = serve()
    dirs = sorted(d for d in os.listdir(os.path.join(R2, 'directions')) if os.path.exists(os.path.join(R2, 'directions', d, 'meta.json')))
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS)
        for d in dirs:
            meta = json.load(open(os.path.join(R2, 'directions', d, 'meta.json')))
            if letters and meta.get('letter', '').lower() not in letters: continue
            base = f'http://127.0.0.1:{PORT}/round-2/directions/{d}/'
            targets = [(re.sub(r'(/?index\.html)$', '', pg['path']).strip('/').replace('/', '_') or 'home', base + re.sub(r'index\.html$', '', pg['path'])) for pg in meta['pages'] if '?' not in pg['path']]
            targets.append(('demo', base + '?demo=build,essay,video'))
            for name, url in targets:
                for kind, vp, scale, step in [('desktop', (1440, 900), 1, 800), ('mobile', (390, 844), 2, 700)]:
                    ctx = b.new_context(viewport={'width': vp[0], 'height': vp[1]}, device_scale_factor=scale, is_mobile=kind == 'mobile', has_touch=kind == 'mobile')
                    pg = ctx.new_page(); pg.goto(url, wait_until='load'); pg.wait_for_timeout(3000)
                    save(to_img(pg.screenshot()), f'{OUT}/{d}--{name}-{kind}.webp', 1440 if kind == 'desktop' else 780)
                    if name != 'demo':
                        save(full(pg, vp[0], vp[1], step), f'{OUT}/{d}--{name}-{kind}-full.webp', 900 if kind == 'desktop' else 390, 12000)
                    ctx.close()
                print('shot', d, name, flush=True)
        b.close()
    h.shutdown()


if __name__ == '__main__':
    main([a.lower() for a in sys.argv[1:]])
