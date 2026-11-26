// Page and layout copy that production keeps inside its .astro layouts and pages (header, footer, hero).
// Verbatim from round-3/data/pages.json (identity, socials). `node round-3/site/tools/check-copy.mjs`
// fails if any string here drifts from that file. Nothing here repeats per item: lists, counts, dates,
// statuses and the latest video always come from the graph.
export const COPY = {
  name: 'Ken Ashe',
  site: 'KenAshe.ai',
  tagline: 'I build things, test new technology, and show what actually happened.',
  subline: 'Right now, that’s mostly AI and crypto. Experiments, software, wins, failures, and weird detours.',
  trustLine: 'AI application builder · CPA · PMP · Building with AI in public',
  footerLine: 'Building with AI in public. No hype, no doom. Receipts only.',
  email: 'hello@kenashe.ai',
  // Follow links, in order: YouTube first, then X (pages.json -> socials).
  socials: [
    { id: 'youtube', label: 'YouTube', handle: '@KenAshe', url: 'https://www.youtube.com/@KenAshe' },
    { id: 'x', label: 'X', handle: '@kenashe', url: 'https://x.com/kenashe' },
    { id: 'tiktok', label: 'TikTok', handle: '@ken.ashe', url: 'https://www.tiktok.com/@ken.ashe' },
    { id: 'instagram', label: 'Instagram', handle: '@ken.ashe', url: 'https://www.instagram.com/ken.ashe/' },
    { id: 'linkedin', label: 'LinkedIn', handle: 'in/kenashe', url: 'https://www.linkedin.com/in/kenashe' },
    { id: 'github', label: 'GitHub', handle: 'kenashe', url: 'https://github.com/kenashe' },
    { id: 'facebook', label: 'Facebook', handle: 'kenasheai', url: 'https://www.facebook.com/kenasheai/' },
  ],
  rss: { id: 'rss', label: 'Writing RSS', handle: '', url: 'https://kenashe.ai/writing/rss.xml' },
  portrait: { src: 'assets/portrait/ken-black-polo-640.webp', src2x: 'assets/portrait/ken-black-polo-1280.webp', alt: 'Ken Ashe smiling, wearing a black polo, in a bright office.' },
  portraitAlt: { src: 'assets/portrait/ken-hoodie-640.webp', src2x: 'assets/portrait/ken-hoodie-1280.webp', alt: 'Ken Ashe in a navy hoodie, near a window.' },
};
