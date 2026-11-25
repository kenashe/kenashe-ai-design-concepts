// Click-to-load YouTube players. Tiny on purpose: the film page needs nothing else.
/** Click-to-load YouTube (youtube-nocookie.com), poster is the local thumbnail. */
export function wirePlayers(root = document) {
  root.addEventListener('click', (e) => {
    const a = e.target.closest('.vid-poster'); if (!a) return;
    const frame = a.closest('[data-embed]'); const src = frame?.dataset.embed;
    if (!src || !/^https:\/\/www\.youtube-nocookie\.com\/embed\//.test(src)) return;
    e.preventDefault();
    const f = document.createElement('iframe');
    f.src = `${src}?autoplay=1&rel=0&modestbranding=1`; f.title = frame.dataset.title || 'YouTube video';
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'; f.allowFullscreen = true; f.referrerPolicy = 'strict-origin-when-cross-origin';
    a.replaceWith(f); f.focus();
  });
}

