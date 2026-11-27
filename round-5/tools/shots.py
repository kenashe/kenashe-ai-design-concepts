"""Screenshots of the Round 5 prototype. python3 round-5/tools/shots.py [filter]
Serves the repository root the way GitHub Pages does and captures each page in Chromium (desktop, tablet, phone) and Firefox (desktop)."""
import sys, os, json, subprocess, time, re
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'round-5/review/screens'); os.makedirs(OUT, exist_ok=True)
PORT = 8507
PAGES = [('home', 'site/'), ('projects', 'site/building/'), ('videos', 'site/videos/'), ('writing', 'site/writing/'), ('about', 'site/about/'),
         ('project-agent-economy', 'site/building/ai-agent-economy/'), ('project-zerohuman', 'site/building/zerohuman/'), ('project-film', 'site/building/returning-your-things/'), ('project-blog', 'site/building/autonomous-ai-blog/'),
         ('essay-ai-editor', 'site/writing/ai-editor-trusted-least/'), ('essay-4-tips', 'site/writing/4-tips-for-making-ai-videos-that-feel-like-films/')]
filt = sys.argv[1] if len(sys.argv) > 1 else ''
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        for kind, vp, scale, mobile in (('desktop', (1440, 900), 1, False), ('tablet', (820, 1180), 1, True), ('mobile', (390, 844), 2, True)):
            c = b.new_context(viewport={'width': vp[0], 'height': vp[1]}, device_scale_factor=scale, is_mobile=mobile, has_touch=mobile)
            pg = c.new_page()
            for name, path in PAGES:
                if filt and filt not in name: continue
                pg.goto(f'http://127.0.0.1:{PORT}/round-5/{path}', wait_until='networkidle')
                h = pg.evaluate('document.documentElement.scrollHeight')
                for y in range(0, h, 700): pg.evaluate(f'scrollTo(0,{y})'); pg.wait_for_timeout(60)
                pg.evaluate('scrollTo(0,0)'); pg.wait_for_timeout(350)
                pg.screenshot(path=f'{OUT}/{name}-{kind}.png')
                if kind != 'tablet': pg.screenshot(path=f'{OUT}/{name}-{kind}-full.png', full_page=True)
                print('shot', name, kind)
            c.close()
        b.close()
        if not filt or filt == 'firefox':
            f = p.firefox.launch(); pg = f.new_page(viewport={'width': 1440, 'height': 900})
            for name, path in PAGES[:6]:
                pg.goto(f'http://127.0.0.1:{PORT}/round-5/{path}', wait_until='networkidle'); pg.wait_for_timeout(400)
                pg.screenshot(path=f'{OUT}/{name}-firefox.png'); print('shot', name, 'firefox')
            f.close()
finally:
    srv.terminate()
# WebP copies for the review page
from PIL import Image
for f in os.listdir(OUT):
    if f.endswith('.png'):
        im = Image.open(os.path.join(OUT, f)).convert('RGB')
        full = f.endswith('-full.png')
        if full and im.width == 780: im = im.resize((585, round(im.height * 585 / 780)), Image.LANCZOS)
        if im.height > 12000: im = im.crop((0, 0, im.width, 12000))
        im.save(os.path.join(OUT, f[:-4] + '.webp'), 'WEBP', quality=62 if full else 80); os.remove(os.path.join(OUT, f))
