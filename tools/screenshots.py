"""Capture review screenshots for every concept.

Usage: python3 tools/screenshots.py [slug ...]
Serves the repo on a local port, then writes to review/screens/:
  <slug>-desktop.webp        1440x900 viewport
  <slug>-desktop-full.webp   full page (downscaled)
  <slug>-mobile.webp         390x844 viewport @2x
  <slug>-mobile-full.webp    full page (downscaled)
  <slug>-interior-desktop.webp / -interior-mobile.webp
"""
import http.server, io, json, os, socketserver, sys, threading
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'review', 'screens')
CONCEPTS = json.load(open(os.path.join(ROOT, 'review', 'concepts.json')))
PORT = 8199


def serve():
    os.chdir(ROOT)
    class H(http.server.SimpleHTTPRequestHandler):
        def log_message(self,*a): pass
    handler = lambda *a, **k: H(*a, directory=ROOT, **k)
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.ThreadingTCPServer(('127.0.0.1', PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def save(png, path, max_w=None, max_h=None):
    im = Image.open(io.BytesIO(png)).convert('RGB')
    if max_w and im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
    if max_h and im.height > max_h:
        im = im.crop((0, 0, im.width, max_h))
    im.save(path, 'WEBP', quality=80)


def shoot(page, url, wait=2500):
    page.goto(url, wait_until='load')
    page.wait_for_timeout(wait)


def main(slugs):
    os.makedirs(OUT, exist_ok=True)
    httpd = serve()
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
        for c in CONCEPTS:
            if slugs and c['slug'] not in slugs:
                continue
            base = f"http://127.0.0.1:{PORT}/concepts/{c['slug']}/"
            targets = [('', base)] + [(f"-interior{'' if i == 0 else i+1}", base + path) for i, path in enumerate(c.get('interiors', []))]
            for suffix, url in targets:
                d = b.new_page(viewport={'width': 1440, 'height': 900})
                shoot(d, url)
                save(d.screenshot(), f"{OUT}/{c['slug']}{suffix}-desktop.webp", 1440)
                # full page: scroll through first so lazy content and reveals render
                d.evaluate("""async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } window.scrollTo(0, 0); }""")
                d.wait_for_timeout(800)
                save(d.screenshot(full_page=True), f"{OUT}/{c['slug']}{suffix}-desktop-full.webp", 900, 9000)
                d.close()
                m = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
                shoot(m, url)
                save(m.screenshot(), f"{OUT}/{c['slug']}{suffix}-mobile.webp", 780)
                m.evaluate("""async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } window.scrollTo(0, 0); }""")
                m.wait_for_timeout(800)
                save(m.screenshot(full_page=True), f"{OUT}/{c['slug']}{suffix}-mobile-full.webp", 390, 9000)
                m.close()
                print('shot', c['slug'], suffix or 'home', flush=True)
        b.close()
    httpd.shutdown()


if __name__ == '__main__':
    main(sys.argv[1:])
