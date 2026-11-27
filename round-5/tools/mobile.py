"""Phone opening, Round 4 against Round 5, at 390 and 320 px. python3 round-5/tools/mobile.py
Writes review/mobile.json and review/screens/mobile-compare-{390,320}.webp"""
import os, sys, json, subprocess, time
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'round-5/review'); PORT = 8511
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
M = """() => { const t = (s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : null; }; const b = (s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().bottom + scrollY) : null; };
  const n = b('.concept'); const px = (s) => parseFloat(getComputedStyle(document.querySelector(s)).fontSize);
  return { notice: n, header: b('.top') - n, face_top: t('.hero-photo img') - n, face_bottom: b('.hero-photo img') - n, buttons_end: b('.hero .actions') - n, intro_end: b('.hero') - n, featured_picture: t('[data-section=featured] .pic') - n, featured_title: t('[data-section=featured] h2') - n,
    intro_text_px: px('.hero .lede'), statement_px: px('.headline span'), aside_px: px('.headline-aside'), button_height: Math.round(document.querySelector('.hero .btn').getBoundingClientRect().height), nav_link_height: Math.round(document.querySelector('.top nav a').getBoundingClientRect().height), overflow: document.documentElement.scrollWidth - innerWidth }; }"""
res = {}
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        for w, h in ((390, 844), (320, 568)):
            shots = []
            for rnd in ('round-4', 'round-5'):
                pg = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, is_mobile=True, has_touch=True).new_page()
                pg.goto(f'http://127.0.0.1:{PORT}/{rnd}/site/', wait_until='networkidle'); pg.wait_for_timeout(500)
                res[f'{rnd} at {w}'] = pg.evaluate(M); f = f'/tmp/m-{rnd}-{w}.png'; pg.screenshot(path=f); shots.append(Image.open(f).convert('RGB'))
            c = Image.new('RGB', (shots[0].width * 2 + 60, shots[0].height + 70), '#F5F7F6'); d = ImageDraw.Draw(c)
            for i, (im, label) in enumerate(zip(shots, ('Round 4', 'Round 5'))): c.paste(im, (i * (im.width + 60), 70)); d.text((i * (im.width + 60) + 8, 22), f'{label} · {w} px wide · first screen', fill='#11191D')
            c.save(os.path.join(OUT, f'screens/mobile-compare-{w}.webp'), 'WEBP', quality=82)
        b.close()
finally:
    srv.terminate()
json.dump(res, open(os.path.join(OUT, 'mobile.json'), 'w'), indent=1)
for k, v in res.items(): print(k, v)
