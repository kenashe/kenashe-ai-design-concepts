"""Records the signature transition and checks the journeys. python3 round-5/tools/journey.py
Writes review/transition-desktop.mp4, review/transition-phone.mp4 and review/journey.json."""
import os, sys, json, subprocess, time, glob, shutil
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'round-5/review'); PORT = 8509; B = f'http://127.0.0.1:{PORT}/round-5/site/'
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
LOG = "addEventListener('pagereveal', (e) => { const vt = !!e.viewTransition; setTimeout(() => { const k = JSON.parse(sessionStorage.getItem('vt') || '[]'); k.push([location.pathname.split('/site')[1], vt, vt ? [...document.querySelectorAll('[style*=view-transition-name]')].filter((x) => x.style.viewTransitionName !== 'none').map((x) => x.style.viewTransitionName) : []]); sessionStorage.setItem('vt', JSON.stringify(k)); }, 30); });"
res = {}
def run(p, name, vp, mobile, record, reduced=False, engine='chromium'):
    b = getattr(p, engine).launch()
    kw = dict(viewport={'width': vp[0], 'height': vp[1]}, reduced_motion='reduce' if reduced else 'no-preference')
    if mobile and engine == 'chromium': kw.update(is_mobile=True, has_touch=True, device_scale_factor=2)
    if record: kw.update(record_video_dir='/tmp/rec-' + name, record_video_size={'width': vp[0], 'height': vp[1]})
    c = b.new_context(**kw); pg = c.new_page(); errs = []
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script(LOG)
    steps = []
    def here(label): steps.append([label, pg.evaluate("location.pathname.split('/site')[1]"), pg.evaluate("document.querySelector('h1').textContent.trim()")])
    def open_(sel, label, keyboard=False):
        el = pg.locator(sel).first; el.scroll_into_view_if_needed(); pg.wait_for_timeout(700 if record else 50)
        if keyboard: el.focus(); pg.keyboard.press('Enter')
        elif mobile and engine == 'chromium': el.tap()
        else: el.click()
        pg.wait_for_load_state('load'); pg.wait_for_timeout(1500 if record else 700); here(label)
    def back(label): pg.go_back(); pg.wait_for_load_state('load'); pg.wait_for_timeout(1500 if record else 700); here(label)
    pg.goto(B, wait_until='load'); pg.wait_for_timeout(1200 if record else 300); here('home')
    open_('[data-section=projects] a.card-link[href*="returning-your-things"]', 'home card with a picture -> project'); back('Back -> home')
    open_('[data-section=projects] a.card-link[href*="zerohuman"]', 'home text card -> project without a picture'); back('Back -> home')
    open_('[data-section=recent] a.row-link', 'home writing row -> essay', keyboard=True); back('Back -> home')
    open_('header nav a[href*="building"]', 'nav -> Projects'); open_('a.card-link[href*="ai-explainer-producer"]', 'Projects list -> project'); open_('a.next-link', 'Next project link'); back('Back'); back('Back -> Projects list')
    res[name] = {'steps': steps, 'reveals': json.loads(pg.evaluate("sessionStorage.getItem('vt') || '[]'")), 'errors': errs, 'browser': b.version}
    c.close(); b.close()
    if record:
        f = glob.glob(f'/tmp/rec-{name}/*.webm')[0]
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f, '-movflags', '+faststart', '-pix_fmt', 'yuv420p', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-crf', '26', os.path.join(OUT, f'transition-{name}.mp4')], check=True); shutil.rmtree(f'/tmp/rec-{name}')
try:
    with sync_playwright() as p:
        run(p, 'desktop', (1280, 800), False, True)
        run(p, 'phone', (390, 844), True, True)
        run(p, 'reduced-motion', (1280, 800), False, False, reduced=True)
        run(p, 'firefox', (1280, 800), False, False, engine='firefox')
finally:
    srv.terminate()
json.dump(res, open(os.path.join(OUT, 'journey.json'), 'w'), indent=1)
for k, v in res.items():
    print(k, v['browser'], 'errors:', len(v['errors']))
    for s in v['steps']: print('   ', s)
    print('    transitions:', [(r[0], r[1], r[2]) for r in v['reveals']])
