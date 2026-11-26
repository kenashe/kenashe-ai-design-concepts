"""Responsive image sizes for the prototype: assets/r/<width>/<folder>/<name>.webp at 480 and 880 px.
Stand-in for Astro's image pipeline (astro:assets), which does this automatically in production.
  python3 round-4/tools/thumbs.py
"""
import os
from PIL import Image
R = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets')
n = 0
for folder in ('video', 'writing', 'build', 'page', 'portrait'):
    src = os.path.join(R, folder)
    if not os.path.isdir(src): continue
    for f in sorted(os.listdir(src)):
        if not f.lower().endswith(('.webp', '.jpg', '.jpeg', '.png')): continue
        for w in (480, 880):
            out = os.path.join(R, 'r', str(w), folder); os.makedirs(out, exist_ok=True)
            dst = os.path.join(out, os.path.splitext(f)[0] + '.webp')
            if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(os.path.join(src, f)): continue
            im = Image.open(os.path.join(src, f)).convert('RGB')
            if im.width > w: im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
            im.save(dst, 'WEBP', quality=74); n += 1
print('image sizes written:', n)
