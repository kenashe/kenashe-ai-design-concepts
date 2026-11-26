// Below-the-fold images load as they approach the viewport (keeps the homepage under budget).
// The HTML also carries a <noscript> copy of every deferred image, so nothing is lost with JS off.
let io;
export function lazyImages(root = document) {
  const imgs = root.querySelectorAll('img[data-src]');
  const load = (i) => { i.src = i.dataset.src; i.removeAttribute('data-src'); };
  if (!('IntersectionObserver' in window)) { imgs.forEach(load); return; }
  io ??= new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { load(e.target); io.unobserve(e.target); } }), { rootMargin: '350px 200px' });
  imgs.forEach((i) => io.observe(i));
}
lazyImages();
