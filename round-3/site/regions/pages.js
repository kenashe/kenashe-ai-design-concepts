// Interior-pages specialist's regions (item pages, about, publishing demo).
// Split by page family in ./pages/. Everything here is composed from the lead's components (../components.js)
// plus the page components documented at the end of STYLEGUIDE.md ("Page components").
import { item } from './pages/item.js';
import { builds } from './pages/builds.js';
import { about } from './pages/about.js';
import { publish } from './pages/publish.js';

export const pages = { ...item, ...builds, ...about, ...publish };
