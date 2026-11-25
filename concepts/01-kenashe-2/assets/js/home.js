// Homepage: latest receipt (live ZeroHuman status), GitHub activity, build
// index filters, video rails, click-to-load players.
import { getStatus, getCommits, fmtDate, ago, nf, nowUTC, reduced } from './site.js';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------------- latest receipt: ZeroHuman /api/status ---------------- */
const rc = $('[data-receipt]');
if (rc) {
  const badge = $('[data-live-badge]', rc), note = $('[data-live-note]', rc);
  const set = (k, v) => { const el = $(`[data-f="${k}"]`, rc); if (el) el.textContent = v; };
  getStatus().then(s => {
    if (typeof s?.healthy !== 'boolean') throw new Error('shape');
    set('healthy', s.healthy ? (s.paused ? 'healthy · paused' : 'healthy') : 'not healthy');
    set('mode', s.mode || '—');
    set('head', nf(s.head));
    set('tick', ago(s.lastTickAt));
    set('orders', String(s.orders?.fulfilled ?? '—'));
    badge.className = 'st'; badge.textContent = 'Live';
    note.textContent = `Live · read ${nowUTC()} from /api/status`;
  }).catch(() => {
    badge.className = 'st is-snap'; badge.textContent = 'Snapshot';
    note.textContent = 'Snapshot · Nov 25, 2026 (live check unavailable)';
  });
}

/* ---------------- GitHub commits: latest commit + latest Digest pipeline run ---------------- */
const ghLatest = $('[data-gh-latest]'), ghPipe = $('[data-gh-pipeline]');
if (ghLatest || ghPipe) {
  getCommits().then(list => {
    if (!Array.isArray(list) || !list.length) throw new Error('shape');
    const short = c => ({ sha: c.sha.slice(0, 7), msg: c.commit.message.split('\n')[0], date: c.commit.committer?.date || c.commit.author?.date });
    const latest = short(list[0]);
    const pipe = list.map(short).find(c => c.msg.startsWith('pipeline:'));
    $$('[data-gh-badge]').forEach(b => { b.textContent = 'Live'; b.classList.add('is-live'); });
    if (ghLatest) {
      $('[data-gh-msg]', ghLatest).textContent = latest.msg;
      $('[data-gh-meta]', ghLatest).textContent = `kenashe/kenashe · ${latest.sha} · ${ago(latest.date)}`;
    }
    if (ghPipe && pipe) {
      $('[data-gh-pmsg]', ghPipe).textContent = pipe.msg;
      $('[data-gh-pmeta]', ghPipe).textContent = `commit ${pipe.sha} · ${fmtDate(pipe.date, true)}`;
    } else if (ghPipe) {
      $$('[data-gh-badge]', ghPipe).forEach(b => { b.textContent = 'Snapshot'; b.classList.remove('is-live'); });
    }
  }).catch(() => {
    $$('[data-gh-badge]').forEach(b => { b.textContent = 'Snapshot · Nov 25, 2026'; });
  });
}

/* ---------------- build index: filters ---------------- */
const rowsList = $('[data-rows]');
if (rowsList) {
  const rows = $$('.brow', rowsList);
  const countEl = $('[data-count]'), empty = $('[data-empty]'), more = $('[data-more]');
  let fs = 'all', fk = null;
  const apply = () => {
    let n = 0;
    rows.forEach(r => {
      const ok = (fs === 'all' || r.dataset.status === fs) && (!fk || r.dataset.stack.split('|').includes(fk));
      r.classList.toggle('is-hidden', !ok); if (ok) n++;
    });
    const filtering = fs !== 'all' || fk;
    rowsList.classList.toggle('is-open', !!filtering || more.getAttribute('aria-expanded') === 'true');
    more.parentElement.hidden = !!filtering || more.getAttribute('aria-expanded') === 'true';
    countEl.textContent = `Showing ${n} of ${rows.length}${fk ? ` · ${fk}` : ''}`;
    empty.classList.toggle('is-on', n === 0);
  };
  const run = fn => (!reduced && document.startViewTransition) ? document.startViewTransition(fn) : fn();
  $$('[data-fs]').forEach(b => b.addEventListener('click', () => {
    fs = b.dataset.fs; $$('[data-fs]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); run(apply);
  }));
  $$('[data-fk]').forEach(b => b.addEventListener('click', () => {
    fk = fk === b.dataset.fk ? null : b.dataset.fk;
    $$('[data-fk]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.fk === fk))); run(apply);
  }));
  $('[data-reset]')?.addEventListener('click', () => { fs = 'all'; fk = null; $$('[data-fs]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.fs === 'all'))); $$('[data-fk]').forEach(x => x.setAttribute('aria-pressed', 'false')); run(apply); });
  more.addEventListener('click', () => {
    more.setAttribute('aria-expanded', 'true');
    const firstExtra = $('.brow.is-extra a, .brow.is-extra > div', rowsList);
    run(apply);
    firstExtra?.focus?.();
  });
  apply();
}

/* ---------------- rails ---------------- */
$$('[data-rail-ctl]').forEach(ctl => {
  const rail = document.getElementById(ctl.dataset.railCtl);
  const [prev, next] = $$('button', ctl);
  const upd = () => { prev.disabled = rail.scrollLeft < 8; next.disabled = rail.scrollLeft + rail.clientWidth > rail.scrollWidth - 8; };
  $$('button', ctl).forEach(b => b.addEventListener('click', () => rail.scrollBy({ left: +b.dataset.dir * rail.clientWidth * .8, behavior: reduced ? 'auto' : 'smooth' })));
  rail.addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); upd();
});

/* ---------------- players: nothing from YouTube loads until a click ---------------- */
const ytSrc = id => `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&modestbranding=1`;
const player = $('#player');
if (player) {
  const frame = $('[data-player-frame]', player), title = $('#player-t', player), out = $('[data-player-yt]', player);
  document.addEventListener('click', e => {
    const a = e.target.closest('a[data-yt]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    title.textContent = a.dataset.title || 'Video';
    out.href = a.href;
    frame.classList.toggle('is-short', a.hasAttribute('data-short'));
    frame.innerHTML = `<iframe src="${ytSrc(a.dataset.yt)}" title="${(a.dataset.title || 'YouTube video').replace(/"/g, '&quot;')}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    player.showModal();
  });
  $('[data-player-close]', player).addEventListener('click', () => player.close());
  player.addEventListener('click', e => { if (e.target === player) player.close(); });
  player.addEventListener('close', () => { frame.innerHTML = ''; });
}
const filmBtn = $('[data-film-play]');
if (filmBtn) {
  filmBtn.setAttribute('role', 'button');
  filmBtn.addEventListener('click', e => {
    if (e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    const stage = $('[data-film]');
    stage.classList.add('is-playing');
    stage.innerHTML = `<iframe src="${ytSrc(filmBtn.dataset.filmPlay)}" title="Returning Your Things, a short film by Ken Ashe" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    stage.querySelector('iframe').focus();
  });
}
