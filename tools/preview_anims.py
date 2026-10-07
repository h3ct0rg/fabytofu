"""Hoja de vista previa de animaciones: python tools/preview_anims.py carpeta anim1 anim2 ... -> carpeta/preview_<anims>.png"""
import sys
from pathlib import Path
from PIL import Image

root = Path(sys.argv[1])
names = sys.argv[2:]
rows = []
for n in names:
    frames = sorted((root / n).glob("f*.png"), key=lambda p: int(p.stem[1:]))
    rows.append([Image.open(f).convert("RGBA") for f in frames])
s = 2
cw = max(f.width for r in rows for f in r) * s + 6
ch = max(f.height for r in rows for f in r) * s + 6
cols = max(len(r) for r in rows)
sheet = Image.new("RGBA", (cw * cols, ch * len(rows)), (40, 48, 90, 255))
for y, r in enumerate(rows):
    for x, f in enumerate(r):
        sheet.alpha_composite(f.resize((f.width * s, f.height * s), Image.NEAREST), (x * cw, y * ch))
out = root / f"preview_{'_'.join(names)}.png"
sheet.save(out)
print(out)
