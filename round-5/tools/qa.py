"""Automated checks for the Round 5 prototype.  python3 round-5/tools/qa.py [filter]
Serves the repository the way GitHub Pages does, then loads every page in headless Chromium (390, 820 and 1440 px)
and headless Firefox (390 and 1440 px). Results: round-5/review/qa.json"""
import sys, os, json, subprocess, time, glob
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PORT = 8508; BASE = f'http://127.0.0.1:{PORT}/'
filt = sys.argv[1] if len(sys.argv) > 1 else ''
pages = sorted(os.path.relpath(os.path.dirname(f), ROOT) + '/' for f in glob.glob(os.path.join(ROOT, 'round-5/site/**/index.html'), recursive=True))
pages += ['round-5/', 'round-5/demo/', 'round-5/demo/site/', 'round-5/demo/site/building/example-recipe-card-maker/', 'round-5/demo/site/building/', 'round-5/demo/site/videos/']
pages = [p for p in pages if not filt or (p == filt[1:] if filt.startswith('=') else filt in p)]
PROBE = r"""() => {
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0'; };
  const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * r + .7152 * g + .0722 * b; };
  const rgb = (s) => { const m = s.match(/[\d.]+/g); return m ? m.map(Number) : [0, 0, 0, 0]; };
  const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length < 4 || c[3] > .5) return c; } return [255, 255, 255]; };
  let min = 99; const small = [], low = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) { const t = w.currentNode.textContent.trim(); const el = w.currentNode.parentElement; if (!t || !vis(el) || el.closest('script,style,.plate')) continue;
    const s = getComputedStyle(el); const fs = parseFloat(s.fontSize); if (fs < min) min = fs; if (fs < 14) small.push([fs, t.slice(0, 40)]);
    if (el.closest('.player, .pic')) continue;
    const fg = rgb(s.color), bg = bgOf(el); const a = lum(fg), b = lum(bg); const cr = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    const big = fs >= 24 || (fs >= 18.66 && parseInt(s.fontWeight) >= 700); if (cr < (big ? 3 : 4.5)) low.push([Math.round(cr * 100) / 100, fs, t.slice(0, 40)]); }
  const taps = []; document.querySelectorAll('a[href], button, summary').forEach((el) => { if (!vis(el)) return; const r = el.getBoundingClientRect();
    const inline = getComputedStyle(el).display === 'inline' && el.closest('p, li, figcaption, blockquote, td, dd') && !el.closest('.actions, .follow, .foot, .crumb, .concept');
    if (!inline && (r.height < 43.5 || r.width < 43.5)) taps.push([el.textContent.trim().slice(0, 30) || el.getAttribute('aria-label'), Math.round(r.width), Math.round(r.height)]); });
  const imgs = [...document.images]; 
  return { min, small: small.slice(0, 5), low: low.slice(0, 6), taps: taps.slice(0, 8), h1: document.querySelectorAll('h1').length,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, height: document.documentElement.scrollHeight,
    broken: imgs.filter((i) => i.complete && !i.naturalWidth).map((i) => i.currentSrc.slice(-50)), noalt: imgs.filter((i) => !i.hasAttribute('alt')).length,
    responsive: imgs.filter((i) => i.srcset).length + '/' + imgs.length, lazy: imgs.filter((i) => i.loading === 'lazy').length,
    robots: document.querySelector('meta[name=robots]')?.content, canonical: !!document.querySelector('link[rel=canonical]'), text: document.body.innerText.length,
    links: [...new Set([...document.querySelectorAll('a[href]')].map((a) => a.href).filter((h) => h.startsWith(location.origin)).map((h) => h.split('#')[0]))] };
}"""
def scroll(pg):
    h = pg.evaluate('document.documentElement.scrollHeight')
    for y in range(0, h, 800): pg.evaluate(f'scrollTo(0,{y})'); pg.wait_for_timeout(40)
    pg.evaluate('scrollTo(0,0)'); pg.wait_for_timeout(250)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
out = {}; checked = {}
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); f = p.firefox.launch()
        for path in pages:
            r = {'widths': {}}; errs = []; failed = []; weight = [0, 0]
            for w, h, mobile in ((1440, 900, False), (820, 1180, True), (390, 844, True), (320, 640, True)):
                c = b.new_context(viewport={'width': w, 'height': h}, is_mobile=mobile, has_touch=mobile); pg = c.new_page()
                pg.on('console', lambda m: errs.append(m.text[:160]) if m.type == 'error' else None); pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
                pg.on('requestfailed', lambda q: failed.append(q.url[-70:]))
                if w == 1440:
                    def on(resp):
                        try: weight[0] += len(resp.body()); weight[1] += 1
                        except Exception: pass
                    pg.on('response', on)
                    pg.on('request', lambda q: r.setdefault('hosts', set()).add(q.url.split('/')[2]))
                pg.goto(BASE + path, wait_until='networkidle')
                if w == 1440:
                    kb = pg.evaluate("(() => { const e = [...performance.getEntriesByType('navigation'), ...performance.getEntriesByType('resource')]; return [e.reduce((a, x) => a + (x.encodedBodySize || 0), 0), e.length]; })()")
                    r['initial_kb'] = round(kb[0] / 1024); r['requests'] = kb[1]
                scroll(pg); d = pg.evaluate(PROBE); links = d.pop('links'); r['widths'][w] = d
                if w == 1440:
                    for l in links:
                        if l not in checked: checked[l] = pg.request.get(l).status
                    r['dead_links'] = [l for l in links if checked[l] >= 400]
                    # keyboard: every tab stop shows a visible focus ring
                    bad = []; n = 0
                    for _ in range(45):
                        pg.keyboard.press('Tab'); n += 1
                        v = pg.evaluate("(() => { const e = document.activeElement; if (!e || e === document.body) return null; const s = getComputedStyle(e); return [e.tagName, (e.textContent || '').trim().slice(0, 24), s.outlineStyle, parseFloat(s.outlineWidth)]; })()")
                        if v is None: break
                        if v[2] == 'none' or v[3] < 2: bad.append(v)
                    r['tab_stops'] = n; r['focus_not_visible'] = bad[:5]
                c.close()
            # no JavaScript
            c = b.new_context(viewport={'width': 1440, 'height': 900}, java_script_enabled=False); pg = c.new_page(); pg.goto(BASE + path, wait_until='load')
            r['nojs'] = {'text': len(pg.inner_text('body')), 'nav': pg.locator('header nav a').count(), 'links': pg.locator('main a[href]').count(), 'h1': pg.locator('h1').count()}; c.close()
            # every outside host blocked (YouTube, anything else)
            c = b.new_context(viewport={'width': 1440, 'height': 900}); pg = c.new_page(); oe = []
            pg.on('pageerror', lambda e: oe.append(str(e)[:120])); pg.route('**/*', lambda rt: rt.continue_() if '127.0.0.1' in rt.request.url else rt.abort())
            pg.goto(BASE + path, wait_until='load'); scroll(pg)
            r['hosts_blocked'] = {'errors': oe, 'broken_images': pg.evaluate("[...document.images].filter(i => i.complete && !i.naturalWidth).length"), 'text': len(pg.inner_text('body'))}; c.close()
            # reduced motion
            c = b.new_context(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce'); pg = c.new_page(); pg.goto(BASE + path, wait_until='load')
            r['reduced_motion_longest_transition_s'] = pg.evaluate("Math.max(0, ...[...document.querySelectorAll('*')].map(e => Math.max(...getComputedStyle(e).transitionDuration.split(',').map(parseFloat))))"); c.close()
            # Firefox
            ff = {}
            for w, h in ((1440, 900), (390, 844)):
                pg = f.new_page(viewport={'width': w, 'height': h}); fe = []
                pg.on('console', lambda m: fe.append(m.text[:140]) if m.type == 'error' else None); pg.on('pageerror', lambda e: fe.append(str(e)[:140]))
                pg.goto(BASE + path, wait_until='networkidle'); scroll(pg)
                ff[w] = {'errors': fe, 'overflow': pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth'), 'h1': pg.locator('h1').count(),
                         'broken_images': pg.evaluate("[...document.images].filter(i => i.complete && !i.naturalWidth).length")}; pg.close()
            r['firefox'] = ff
            r['hosts'] = sorted(x for x in r.get('hosts', set()) if not x.startswith('127.0.0.1'))
            r['errors'] = sorted(set(errs)); r['failed'] = sorted(set(failed))
            W = r['widths']
            problems = []
            if r['errors']: problems.append('console errors')
            if r['failed']: problems.append('failed requests')
            if r['dead_links']: problems.append('dead links')
            if r['hosts']: problems.append('outside hosts on load')
            if r['focus_not_visible']: problems.append('focus not visible')
            for w, d in W.items():
                if d['overflow'] > 0: problems.append(f'overflow at {w}')
                if d['min'] < 14: problems.append(f'text under 14px at {w}')
                if d['low']: problems.append(f'low contrast at {w}')
                if d['broken']: problems.append(f'broken images at {w}')
                if d['h1'] != 1: problems.append(f'h1 count at {w}')
                if d['noalt']: problems.append('image without alt')
                if w <= 390 and d['taps']: problems.append(f'small tap targets at {w}')
                if d['robots'] != 'noindex, nofollow, noarchive' or d['canonical']: problems.append('indexing controls')
            if r['nojs']['h1'] != 1 or r['nojs']['text'] < 0.9 * W[1440]['text']: problems.append('content missing without JavaScript')
            if r['hosts_blocked']['errors'] or r['hosts_blocked']['broken_images']: problems.append('breaks when outside hosts are blocked')
            if r['reduced_motion_longest_transition_s'] > 0: problems.append('motion with reduced-motion set')
            for w, d in ff.items():
                if d['errors'] or d['overflow'] > 0 or d['h1'] != 1 or d['broken_images']: problems.append(f'firefox at {w}')
            r['problems'] = problems; r['ok'] = not problems; out[path] = r
            print('OK   ' if r['ok'] else 'CHECK', path, f"{r['initial_kb']}KB/{r['requests']}req", f"H {W[1440]['height']}/{W[390]['height']}", f"min {W[1440]['min']}/{W[390]['min']}", '; '.join(problems),
                  [W[k][x] for k in W for x in ('small', 'low', 'taps', 'broken') if W[k][x]][:3] if problems else '', r['errors'][:2], r['dead_links'][:2], r['focus_not_visible'][:2], flush=True)
        b.close(); f.close()
finally:
    srv.terminate()
prev = {}
qp = os.path.join(ROOT, 'round-5/review/qa.json')
if filt and os.path.exists(qp): prev = json.load(open(qp))
prev.update(out); json.dump(prev, open(qp, 'w'), indent=1)
print(sum(r['ok'] for r in prev.values()), 'of', len(prev), 'pages pass')
