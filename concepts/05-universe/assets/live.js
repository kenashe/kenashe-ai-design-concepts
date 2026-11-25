// Genuine activity only: each endpoint is fetched at most once per page view,
// with a timeout. Callers render the dated snapshot unless the fetch succeeded.
export const ZH_URL = 'https://zerohuman-production.up.railway.app/api/status';
export const GH_URL = 'https://api.github.com/repos/kenashe/kenashe/commits?per_page=10';
export const SNAPSHOT_LABEL = 'Snapshot · Nov 25, 2026';

const cache = new Map();
function once(url, ms = 6000) {
  if (!cache.has(url)) {
    cache.set(url, (async () => {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), ms);
      try {
        const r = await fetch(url, { signal: ctl.signal, headers: { Accept: 'application/json' } });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return { ok: true, data: await r.json(), at: new Date() };
      } catch (err) {
        return { ok: false, error: String(err) };
      } finally { clearTimeout(t); }
    })());
  }
  return cache.get(url);
}

export async function zeroHuman(snapshot) {
  const res = await once(ZH_URL);
  if (res.ok && res.data && res.data.head) {
    const d = res.data;
    return {
      live: true, at: res.at,
      healthy: !!d.healthy, paused: !!d.paused, mode: d.mode, head: Number(d.head),
      lastTickAt: d.lastTickAt, fulfilled: d.orders ? d.orders.fulfilled : null,
      name: d.identity && d.identity.name, services: (d.services || []).map(s => ({ id: s.id, priceWei: s.priceWei })),
    };
  }
  return { live: false, healthy: snapshot.healthy, mode: snapshot.mode, head: Number(snapshot.head),
    lastTickAt: snapshot.lastTickAt, fulfilled: snapshot.ordersFulfilled, name: 'zerohuman.eth', services: null };
}

export async function latestPipelineCommit(snapshot) {
  const res = await once(GH_URL);
  if (res.ok && Array.isArray(res.data) && res.data.length) {
    const list = res.data.map(c => ({ sha: c.sha.slice(0, 7), date: c.commit.author.date, message: c.commit.message.split('\n')[0] }));
    const pipe = list.find(c => c.message.startsWith('pipeline:')) || list[0];
    return { live: true, ...pipe };
  }
  return { live: false, ...snapshot };
}

export const fmtUTC = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }) + ' UTC';
};
export const fmtDay = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
export const num = (n) => Number(n).toLocaleString('en-US');
