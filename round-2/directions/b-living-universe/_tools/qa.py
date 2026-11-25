"""QA sweep for Direction B: console errors, failed requests, horizontal overflow, h1 count, JS-off, reduced motion."""
import asyncio, json, sys
from playwright.async_api import async_playwright

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8320
ROOT = f'http://localhost:{PORT}/round-2/directions/b-living-universe/'
PAGES = ['', '?demo=build,essay,video', 'universe/', 'building/autonomous-ai-blog/', 'building/returning-your-things/', 'publish/']
WIDTHS = [1440, 768, 390]

async def run():
    out = []
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
        for js in (True, False):
            for reduced in ((False, True) if js else (False,)):
                for w in WIDTHS:
                    c = await b.new_context(viewport={'width': w, 'height': 900 if w > 800 else 1024 if w > 500 else 844},
                                            java_script_enabled=js, reduced_motion='reduce' if reduced else 'no-preference')
                    for path in PAGES:
                        if not js and '?demo' in path: continue
                        pg = await c.new_page(); errs = []
                        pg.on('console', lambda m, e=errs: e.append(f'console.{m.type}: {m.text[:160]}') if m.type == 'error' else None)
                        pg.on('pageerror', lambda x, e=errs: e.append(f'pageerror: {x}'))
                        pg.on('response', lambda r, e=errs: e.append(f'{r.status} {r.url}') if r.status >= 400 else None)
                        pg.on('requestfailed', lambda r, e=errs: e.append(f'failed {r.url}') if 'youtube' not in r.url else None)
                        await pg.goto(ROOT + path, wait_until='networkidle'); await pg.wait_for_timeout(1200 if js else 100)
                        info = await pg.evaluate('''() => ({ sw: document.documentElement.scrollWidth, h1: document.querySelectorAll('h1').length,
                          h: document.documentElement.scrollHeight, live: document.querySelector('.stage')?.classList.contains('is-live') ?? null,
                          renderer: document.querySelector('.stage')?.dataset.renderer ?? null,
                          noalt: [...document.images].filter(i => !i.hasAttribute('alt')).length,
                          flag: document.body.firstElementChild?.className })''')
                        ok = info['sw'] <= w and info['h1'] == 1 and not errs and info['noalt'] == 0 and info['flag'] == 'concept-flag'
                        out.append(dict(path=path or '/', w=w, js=js, reduced=reduced, ok=ok, **info, errs=errs))
                        await pg.close()
                    await c.close()
        await b.close()
    bad = [o for o in out if not o['ok']]
    for o in out:
        print(f"{'OK ' if o['ok'] else 'BAD'} {o['path']:<34} w={o['w']:<5} js={o['js']!s:<5} rm={o['reduced']!s:<5} sw={o['sw']:<5} h={o['h']:<6} h1={o['h1']} live={o['live']} r={o['renderer']} {o['errs'][:3]}")
    print(f'{len(out) - len(bad)}/{len(out)} passed')

asyncio.run(run())
