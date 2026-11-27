"""Video player checks. python3 round-5/tools/player.py  -> review/player.json
YouTube itself is replaced by a stand-in page, so the open / close / focus behaviour can be checked in both browsers.
A last step tries the real YouTube player in Chromium and records what YouTube answered."""
import os, sys, json, subprocess, time
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PORT = 8510; B = f'http://127.0.0.1:{PORT}/round-5/site/'
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
out = {}
def stub(rt):
    if 'youtube-nocookie.com/embed/' in rt.request.url: rt.fulfill(status=200, content_type='text/html', body='<body style="margin:0;background:#000;color:#fff">stand-in player</body>')
    elif '127.0.0.1' in rt.request.url: rt.continue_()
    else: rt.abort()
try:
    with sync_playwright() as p:
        for eng in ('chromium', 'firefox'):
            b = getattr(p, eng).launch(); r = {'browser': b.version}
            c = b.new_context(viewport={'width': 1280, 'height': 800}); pg = c.new_page(); outside = []; errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.route('**/*', lambda rt: (outside.append(rt.request.url) if '127.0.0.1' not in rt.request.url else None, stub(rt))[1])
            pg.goto(B + 'videos/'); r['outside requests before pressing play'] = len(outside)
            pg.locator('.feature .player').focus(); pg.keyboard.press('Enter'); pg.wait_for_timeout(400)
            r['large picture: plays in place'] = pg.evaluate("!!document.querySelector('.feature .player.live iframe')")
            r['only then is YouTube contacted'] = [u.split('?')[0] for u in outside]
            r['fallback link under the player'] = pg.evaluate("document.querySelector('.feature .player-note a')?.href")
            card = pg.locator('[data-section=videos] .vcard .player').first; card.scroll_into_view_if_needed(); card.focus(); pg.keyboard.press('Enter'); pg.wait_for_timeout(400)
            r['small picture: opens the viewer'] = pg.evaluate("document.querySelector('dialog.theater')?.open === true")
            r['focus moves into the viewer'] = pg.evaluate("!!document.activeElement.closest('dialog.theater')")
            r['viewer has a fallback link'] = pg.evaluate("document.querySelector('dialog.theater .player-note a')?.href")
            pg.keyboard.press('Escape'); pg.wait_for_timeout(250)
            r['Escape closes it'] = pg.evaluate("document.querySelector('dialog.theater').open === false")
            r['the player is removed on close (sound stops)'] = pg.evaluate("!document.querySelector('dialog.theater iframe')")
            r['focus returns to the video that was opened'] = pg.evaluate("document.activeElement.classList.contains('player')")
            card.click(); pg.wait_for_timeout(300); pg.locator('.theater-close').click(); pg.wait_for_timeout(250)
            r['Close button closes it'] = pg.evaluate("document.querySelector('dialog.theater').open === false")
            m = b.new_context(viewport={'width': 390, 'height': 844}, **({'is_mobile': True, 'has_touch': True} if eng == 'chromium' else {})).new_page(); m.route('**/*', stub)
            m.goto(B); (m.locator('.feature .player').tap() if eng == 'chromium' else m.locator('.feature .player').click()); m.wait_for_timeout(400)
            r['phone width: opens the viewer'] = m.evaluate("document.querySelector('dialog.theater')?.open === true")
            r['phone width: Close button height (px)'] = m.evaluate("document.querySelector('.theater-close').getBoundingClientRect().height")
            n = b.new_context(java_script_enabled=False).new_page(); n.goto(B + 'videos/')
            r['JavaScript off: the picture is a plain link to'] = n.locator('.feature .player').get_attribute('href')
            k = b.new_context(viewport={'width': 1280, 'height': 800}).new_page(); k.route('**/*', lambda rt: rt.continue_() if '127.0.0.1' in rt.request.url else rt.abort())
            k.goto(B + 'videos/'); k.click('.feature .player'); k.wait_for_timeout(500)
            r['YouTube unreachable: fallback link still shown'] = k.evaluate("document.querySelector('.feature .player-note a')?.textContent.trim()")
            r['page errors'] = errs; out[eng] = r; b.close()
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 800}); pg.goto(B + 'videos/'); pg.click('.feature .player'); pg.wait_for_timeout(9000)
        fr = pg.frame_locator('.player.live iframe')
        try: text = fr.locator('body').inner_text(timeout=4000).replace('\n', ' | ')[:160]
        except Exception as e: text = 'no answer: ' + str(e)[:80]
        try: v = fr.locator('video').first.evaluate("v => ({ currentTime: v.currentTime, paused: v.paused })", timeout=3000)
        except Exception: v = None
        out['real YouTube, Chromium'] = {'what the player showed': text, 'video element': v}; b.close()
finally:
    srv.terminate()
json.dump(out, open(os.path.join(ROOT, 'round-5/review/player.json'), 'w'), indent=1)
print(json.dumps(out, indent=1))
