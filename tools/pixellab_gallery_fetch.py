"""Recupera los cuadros de una imagen de la galería de PixelLab cuando ya no hay job_id.

Usa `pixelart_workbench inspect`, que devuelve una hoja con todos los cuadros a 1x
sobre fondo oscuro, la recorta y quita el fondo.
Uso: python tools/pixellab_gallery_fetch.py GALLERY_ID ANCHO ALTO carpeta_destino
"""
import base64
import io
import sys
from collections import deque
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from pixellab_call import call  # noqa: E402


def main():
    gid, w, h, dest = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), Path(sys.argv[4])
    res = call("pixelart_workbench", {"argv": ["inspect", f"gallery:{gid}"], "mode": "low"})
    txt = "\n".join(c.get("text", "") for c in res["content"] if c["type"] == "text")
    n = int(txt.split(" frame(s)")[0].split(",")[-1].strip())
    img = next(c for c in res["content"] if c["type"] == "image")
    sheet = Image.open(io.BytesIO(base64.b64decode(img["data"]))).convert("RGBA")
    cols = max(1, sheet.width // w)
    rows = (n + cols - 1) // cols
    label = (sheet.height - rows * h) // rows
    dest.mkdir(parents=True, exist_ok=True)
    for i in range(n):
        c, r = i % cols, i // cols
        cell = sheet.crop((c * w, r * (h + label) + label, c * w + w, r * (h + label) + label + h))
        px = cell.load()
        bg = px[0, 0]
        # Quita el fondo conectado a los bordes (color casi idéntico al de la esquina).
        q = deque([(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)])
        seen = set()
        while q:
            x, y = q.popleft()
            if (x, y) in seen or not (0 <= x < w and 0 <= y < h):
                continue
            seen.add((x, y))
            p = px[x, y]
            if sum(abs(p[k] - bg[k]) for k in range(3)) > 12:
                continue
            px[x, y] = (0, 0, 0, 0)
            q.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])
        cell.save(dest / f"f{i}.png")
    print(f"{n} cuadros -> {dest}")


if __name__ == "__main__":
    main()
