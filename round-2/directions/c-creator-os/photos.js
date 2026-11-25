// Direction C · local asset manifest (prototype helper, documented in REPORT.md).
//
// The shared graph only knows each essay's hero image and each video's thumbnail. Ken's essays
// also contain personal photographs, and some videos have extracted frames. Production would
// read these from the essay pages' <img> tags and the frames folder at build time (a small
// addition to derive.mjs). Until then they live here, keyed by graph id. No content facts,
// counts or dates are stored here: only file names and alt text describing what is in the file.

export const GALLERY = {
  'writing:ashe-family-coat-of-arms': [
    { src: 'writing/guinness-cockatrice-brand-label-t-f-ashe.webp', alt: 'An old Guinness Extra Stout label with a red cockatrice, bottled by T. F. Ashe & Nephew, Liverpool.' },
    { src: 'writing/guinness-cockatrice-label-pint.webp', alt: 'A pint of stout in a glass printed with the cockatrice label, on a wooden table outdoors.' },
  ],
  'writing:iphone-18-pro-att-activation-failure': [
    { src: 'writing/iphone-18-pro-att-611-call-failed.webp', alt: 'An iPhone screen showing SOS in the status bar and “Call failed 611”.' },
    { src: 'writing/iphone-18-pro-att-esim-profiles.webp', alt: 'iPhone SIM settings: a secondary line with no number switched off, and the primary line switched on.' },
  ],
  'writing:4-tips-for-making-ai-videos-that-feel-like-films': [
    { src: 'writing/film-hat-original.webp', alt: 'Film still, first version: a man in a snowy street reaches out as a straw hat falls in the foreground.' },
    { src: 'writing/film-hat-overcorrected.webp', alt: 'Film still, overcorrected version of the falling-hat shot.' },
    { src: 'writing/film-hat-final.webp', alt: 'Film still, final version of the falling-hat shot.' },
  ],
};

/** Video ids that have three extracted frames in round-2/assets/frames/<id>-1..3.webp */
export const FRAMES = ['3MOFBulJd_s', 'L8LzPXzMbQg', 'QhOYaj_bDZY', 'Sft8JZ_afb4', '_MAhfwQxdvA', 'dcK_1nMhy8w', 'r4rIS5pACGY', 'yZWsJjFnSH0'];
