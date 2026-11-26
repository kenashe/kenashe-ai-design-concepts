// Browser side of the prerender contract (see tools/prerender.mjs).
// Re-renders every [data-region] on the page with the direction's own region functions.
// Used by the publishing demo; normal page views never need it because the HTML is prerendered.
export function pageContext(base, root = 'site') {
  const item = document.querySelector('meta[name="r3:item"]')?.content ?? null;
  const sourcesFile = document.querySelector('meta[name="r3:sources"]')?.content ?? 'data/sources.json';
  return { base, root, page: location.pathname, item, sourcesFile, browser: true };
}

export function rerender(regions, graph, ctx, { highlight = [] } = {}) {
  const changed = [];
  document.querySelectorAll('[data-region]').forEach((el) => {
    const name = el.dataset.region; const fn = regions[name];
    if (!fn) return;
    const html = `<!--@${name}-->${fn(graph, ctx)}<!--/@${name}-->`;
    if (el.innerHTML !== html) { el.innerHTML = html; changed.push(el); }
  });
  // Mark new demo items so the visitor can see what moved.
  for (const id of highlight) document.querySelectorAll(`[data-id="${CSS.escape(id)}"]`).forEach((n) => n.setAttribute('data-new', ''));
  return changed;
}
