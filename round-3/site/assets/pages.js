// Interior pages entry (item pages and About). Everything here is optional: the pages are complete without it.
//   boot()        wires the shell (search event, menu, click-to-load players) and honours ?demo=
//   search        the header Search control opens the shared overlay; without scripts it links to the Building index
//   liveStatus()  ZeroHuman only: asks the service's public status endpoint once per view. The block is
//                 prerendered as a dated snapshot and is relabelled "Live" only when the request succeeds.
import { boot } from './boot.js';
import { provideSearch } from './search.js';   // the global search overlay (discovery specialist's module)

const { graph, ctx } = await boot();
provideSearch(graph, ctx);

const zh = document.querySelector('[data-zh-status]');
if (zh) liveStatus(zh);

async function liveStatus(el) {
  const note = el.querySelector('[data-zh-note]'); const label = el.querySelector('[data-zh-label]'); const rows = el.querySelector('[data-zh-rows]');
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 6000);
  try {
    const r = await fetch(el.dataset.endpoint, { signal: ctl.signal, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!r.ok) throw new Error(String(r.status));
    const s = await r.json();
    if (!s || typeof s.healthy !== 'boolean') throw new Error('unexpected response');
    // The response is outside data: every value is checked and written as text, never as HTML.
    const num = (v) => (Number.isFinite(Number(v)) ? Number(v).toLocaleString('en-US') : null);
    const text = (v) => (typeof v === 'string' ? v.slice(0, 40) : null);
    const utc = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? null : `${d.toISOString().slice(11, 19)} UTC`; };
    const out = [
      ['Worker', s.paused === true ? 'Paused' : s.healthy ? 'Healthy' : 'Not healthy'],
      ['Open to', text(s.mode) === 'public' ? 'Any agent (public mode)' : text(s.mode) ? `${text(s.mode)} mode` : null],
      ['Name check', s.identity && s.identity.ok === true && text(s.identity.name) ? `${text(s.identity.name)}: name, menu and wallet agree` : null],
      ['Latest Ethereum block seen', num(s.head)],
      ['Last look at the chain', utc(s.lastTickAt)],
      ['Paid orders delivered', s.orders && num(s.orders.fulfilled) ? `${num(s.orders.fulfilled)}. This counts every paid order, including Ken’s own test buyer; the endpoint does not say who paid.` : null],
    ].filter(([, v]) => v);
    if (!out.length) throw new Error('nothing to show');
    rows.replaceChildren(...out.map(([k, v]) => { const d = document.createElement('div'); const dt = document.createElement('dt'); dt.textContent = k; const dd = document.createElement('dd'); dd.textContent = v; d.append(dt, dd); return d; }));
    label.textContent = `Live · read ${new Date().toISOString().slice(11, 16)} UTC`;
    el.dataset.state = 'live';
    note.textContent = 'Read once, just now, from the service’s public status endpoint. Reload the page to read it again.';
  } catch {
    el.dataset.state = 'snapshot';
    note.textContent = 'The service’s status endpoint could not be read just now, so this is the dated snapshot, not live data.';
  } finally { clearTimeout(timer); }
}
