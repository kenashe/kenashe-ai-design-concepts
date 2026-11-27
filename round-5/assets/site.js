// Round 5 prototype. The site works without this file: every video picture is an ordinary link to YouTube.
// With it, a video loads its player only when someone chooses to watch.
(() => {
  // The picture transition is plain CSS. This only tidies it: during a move between pages, the one picture
  // (or mint mark) that is travelling keeps its name, so nothing else on the page animates. Without this file it still works.
  const only = (url) => {
    let path = null; try { path = new URL(url).pathname; } catch { /* no known page */ }
    document.querySelectorAll('[style*="view-transition-name"], [data-vt]').forEach((el) => {
      el.dataset.vt ||= el.style.viewTransitionName;
      const a = el.closest('a[href]');
      const keep = el.closest('.detail-head') || (a && path && new URL(a.href).pathname === path);
      el.style.viewTransitionName = keep ? el.dataset.vt : 'none';
    });
  };
  addEventListener('pageswap', (ev) => { if (ev.viewTransition) only(ev.activation?.entry?.url); });
  addEventListener('pagereveal', (ev) => { if (ev.viewTransition) only(globalThis.navigation?.activation?.from?.url); });

  const frame = (id, title) => {
    const f = document.createElement('iframe');
    f.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
    f.title = title || 'Video player'; f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share';
    f.allowFullscreen = true; f.referrerPolicy = 'strict-origin-when-cross-origin';
    return f;
  };
  const fallback = (id) => {
    const p = document.createElement('p'); p.className = 'player-note';
    p.innerHTML = `Not playing? <a href="https://www.youtube.com/watch?v=${id}" rel="noopener">Watch on YouTube <span aria-hidden="true">↗</span></a>`;
    return p;
  };
  let dialog;
  const theater = (id, title, opener) => {
    if (!dialog) {
      dialog = document.createElement('dialog'); dialog.className = 'theater';
      dialog.innerHTML = '<div class="theater-in"><button type="button" class="theater-close">Close</button><div class="theater-frame"></div><div class="theater-foot"></div></div>';
      document.body.append(dialog);
      dialog.querySelector('button').addEventListener('click', () => dialog.close());
      dialog.addEventListener('click', (ev) => { if (ev.target === dialog) dialog.close(); });
      dialog.addEventListener('close', () => { dialog.querySelector('.theater-frame').replaceChildren(); dialog.opener?.focus(); });
    }
    dialog.opener = opener; dialog.setAttribute('aria-label', title || 'Video');
    dialog.querySelector('.theater-frame').replaceChildren(frame(id, title));
    dialog.querySelector('.theater-foot').replaceChildren(fallback(id));
    dialog.showModal();
  };
  document.addEventListener('click', (ev) => {
    const a = ev.target.closest?.('a[data-yt]');
    if (!a || ev.defaultPrevented || ev.button || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    const id = a.dataset.yt, title = a.dataset.title;
    const playing = a.closest('.feature, .detail-head')?.querySelector('.player.live iframe');
    if (playing) { ev.preventDefault(); playing.scrollIntoView({ block: 'center' }); playing.focus(); return; }
    const near = a.classList.contains('player') ? a : a.closest('.feature, .detail-head')?.querySelector(`.player[data-yt="${id}"]`);
    if (near && near.getBoundingClientRect().width >= 520) {
      ev.preventDefault();
      const live = document.createElement('div'); live.className = 'player live'; live.append(frame(id, title));
      near.replaceWith(live); live.after(fallback(id)); live.querySelector('iframe').focus();
    } else if (typeof HTMLDialogElement === 'function') {
      ev.preventDefault(); theater(id, title, a);
    }
  });
})();
