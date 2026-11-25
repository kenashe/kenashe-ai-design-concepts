import asyncio, sys, gzip
from playwright.async_api import async_playwright
URL = 'http://localhost:8320/round-2/directions/b-living-universe/' + (sys.argv[1] if len(sys.argv) > 1 else '')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
        for w, h, tier in [(1440, 900, ''), (1440, 900, '?tier=webgl'), (390, 844, '')]:
            c = await b.new_context(viewport={'width': w, 'height': h}); pg = await c.new_page(); rows = []
            async def on(r):
                try: body = await r.body(); rows.append((r.url.split('/round-2/')[-1], len(body), len(gzip.compress(body))))
                except Exception: pass
            pg.on('response', lambda r: asyncio.ensure_future(on(r)))
            await pg.goto(URL + tier, wait_until='networkidle'); await pg.wait_for_timeout(2500)
            raw = sum(r[1] for r in rows); gz = sum(r[2] for r in rows)
            print(f'{w}px {tier or "default"}: {len(rows)} requests, {raw/1024:.0f} KB raw, ~{gz/1024:.0f} KB gzipped')
            if w == 1440 and not tier:
                for r in sorted(rows, key=lambda r: -r[1]): print(f'   {r[1]/1024:7.1f} KB  {r[2]/1024:6.1f} gz  {r[0]}')
            await c.close()
        await b.close()
asyncio.run(main())
