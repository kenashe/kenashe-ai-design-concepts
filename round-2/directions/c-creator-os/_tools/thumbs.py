"""Prototype stand-in for Astro's responsive image pipeline (astro:assets does this automatically).
Writes 480px-wide WebP copies of round-2/assets/{video,writing,build,frames}/*.webp into ./thumbs/.
Resizing only: no crops, filters or edits. Portraits of Ken are not touched.
Run from this folder:  python3 _tools/thumbs.py"""
from pathlib import Path
from PIL import Image
here = Path(__file__).resolve().parent.parent
assets = here.parent.parent / 'assets'
for sub in ['video', 'writing', 'build', 'frames']:
    out = here / 'thumbs' / sub
    out.mkdir(parents=True, exist_ok=True)
    for f in sorted((assets / sub).glob('*.webp')):
        im = Image.open(f)
        if im.width > 480:
            im = im.resize((480, round(im.height * 480 / im.width)), Image.LANCZOS)
        im.save(out / f.name, 'WEBP', quality=74, method=6)
print('ok')
