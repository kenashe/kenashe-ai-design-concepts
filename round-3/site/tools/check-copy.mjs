// Fails if site/copy.js drifts from data/pages.json (the verbatim source of page copy).
import { readFileSync } from 'node:fs';
import { COPY } from '../copy.js';
const p = JSON.parse(readFileSync(new URL('../../data/pages.json', import.meta.url), 'utf8'));
const bad = [];
for (const k of ['name', 'site', 'tagline', 'subline', 'trustLine', 'footerLine', 'email']) if (COPY[k] !== p.identity[k]) bad.push(k);
const norm = (a) => JSON.stringify(a.map((s) => [s.id, s.label, s.handle, s.url]));
if (norm([...COPY.socials, COPY.rss]) !== norm(p.socials)) bad.push('socials');
for (const k of ['portrait', 'portraitAlt']) if (!p.about.portraits.some((x) => x.alt === COPY[k].alt && x.src === COPY[k].src2x)) bad.push(k);
if (bad.length) { console.error('copy.js differs from pages.json:', bad.join(', ')); process.exit(1); }
console.log('copy.js matches pages.json');
