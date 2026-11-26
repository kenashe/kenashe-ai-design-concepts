"""Small image derivatives (480 px WebP) for lists and cards: assets/thumb/<folder>/<name>.webp
Prototype stand-in for Astro's image pipeline (astro:assets), which does this automatically in production.
python3 round-3/tools/thumbs.py
"""
import os
from PIL import Image
R = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets')
n = 0
for folder in ('video', 'writing', 'build', 'digest', 'frames'):
    src = os.path.join(R, folder); out = os.path.join(R, 'thumb', folder); os.makedirs(out, exist_ok=True)
    for f in sorted(os.listdir(src)):
        if not f.lower().endswith(('.webp', '.jpg', '.jpeg', '.png')): continue
        dst = os.path.join(out, os.path.splitext(f)[0] + '.webp')
        if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(os.path.join(src, f)): continue
        im = Image.open(os.path.join(src, f)).convert('RGB')
        if im.width > 480: im = im.resize((480, round(im.height * 480 / im.width)), Image.LANCZOS)
        im.save(dst, 'WEBP', quality=72); n += 1
print('thumbnails written:', n)
