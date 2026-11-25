"""QA screenshots for Direction B. Usage: python3 shot.py <path> <name> [--nojs] [--reduced] [--full] [--w 1440] [--wait 2500]"""
import sys, asyncio, argparse
from playwright.async_api import async_playwright

ap = argparse.ArgumentParser()
ap.add_argument('path'); ap.add_argument('name')
ap.add_argument('--nojs', action='store_true'); ap.add_argument('--reduced', action='store_true')
ap.add_argument('--full', action='store_true'); ap.add_argument('--w', type=int, default=1440)
ap.add_argument('--h', type=int, default=0); ap.add_argument('--wait', type=int, default=2500)
ap.add_argument('--eval', default=None); ap.add_argument('--port', type=int, default=8320)
a = ap.parse_args()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
        h = a.h or (900 if a.w >= 1000 else 844 if a.w < 500 else 1024)
        c = await b.new_context(viewport={'width': a.w, 'height': h}, device_scale_factor=1 if a.w > 500 else 2,
                                java_script_enabled=not a.nojs, reduced_motion='reduce' if a.reduced else 'no-preference')
        pg = await c.new_page()
        errs = []
        pg.on('console', lambda m: errs.append(f'console.{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: errs.append(f'pageerror: {e}'))
        pg.on('response', lambda r: errs.append(f'{r.status} {r.url}') if r.status >= 400 else None)
        await pg.goto(f'http://localhost:{a.port}/round-2/directions/b-living-universe/{a.path}', wait_until='networkidle')
        await pg.wait_for_timeout(a.wait)
        if a.eval:
            r = await pg.evaluate(a.eval); print('eval:', r)
            await pg.wait_for_timeout(1200)
        sw = await pg.evaluate('document.documentElement.scrollWidth')
        sh = await pg.evaluate('document.documentElement.scrollHeight')
        await pg.screenshot(path=f'/tmp/shots/{a.name}.png', full_page=a.full)
        print(f'{a.name}: scrollWidth={sw} (vw {a.w}) height={sh} ({sh / h:.1f} viewports)')
        for e in errs: print('  ', e)
        await b.close()
asyncio.run(main())
