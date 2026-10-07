"""Genera la imagen para compartir el juego (vista previa en WhatsApp, redes, etc.).

Uso: python tools/make_share_card.py  ->  juego/og-image.jpg (1200x630)
Arma la escena con las mismas capas del juego: cielo, Tunari, ciudad, árboles, suelo,
y la persecución de Corli detrás de Faby y Tofu, con el logo encima.
"""
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
BG = ROOT / "juego" / "assets" / "bg"
SPR = ROOT / "juego" / "assets" / "sprites"
FONT = ROOT / "tools" / "fonts" / "PressStart2P-Regular.ttf"
W, H = 1200, 630


def layer(name):
    return Image.open(BG / f"{name}.png").convert("RGBA")


def tile(card, img, y, offset=0, gap=0):
    """Repite una capa a lo ancho, alternando en espejo como en el juego."""
    x = -offset
    flip = False
    while x < W:
        card.alpha_composite(img.transpose(Image.FLIP_LEFT_RIGHT) if flip else img, (x, y))
        x += img.width + gap
        flip = not flip


def frame(sheet, anim, i=0, flip=False):
    d = json.loads((SPR / f"{sheet}.json").read_text())
    atlas = Image.open(SPR / f"{sheet}.png").convert("RGBA")
    a = d["anims"][anim]
    x, y, w, h = d["rects"][a["frames"][i]]
    ax, ay = a["anchors"][i] if a.get("anchors") else a["anchor"]
    im = atlas.crop((x, y, x + w, y + h))
    if flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
        ax = w - ax
    return im, ax, ay


def text(draw, xy, s, size, fill, anchor="mm", shadow=4):
    f = ImageFont.truetype(str(FONT), size)
    x, y = xy
    draw.text((x + shadow, y + shadow), s, font=f, fill=(27, 16, 48), anchor=anchor)
    draw.text((x, y), s, font=f, fill=fill, anchor=anchor)


def main():
    card = Image.new("RGBA", (W, H))
    # Cielo
    top, mid, bot = (31, 111, 224), (95, 180, 255), (255, 226, 176)
    px = card.load()
    for y in range(H):
        t = y / 330
        if t < 0.55:
            k = t / 0.55
            c = tuple(int(top[i] + (mid[i] - top[i]) * k) for i in range(3))
        else:
            k = min(1, (t - 0.55) / 0.45)
            c = tuple(int(mid[i] + (bot[i] - mid[i]) * k) for i in range(3))
        for x in range(W):
            px[x, y] = (*c, 255)

    # Capas del parque
    tile(card, layer("tunari"), 140, 200)
    tile(card, layer("city"), 210, 90)
    tile(card, layer("treeline"), 150, 40, gap=260)
    draw = ImageDraw.Draw(card)
    floor = 430
    draw.rectangle((0, floor - 30, W, floor + 10), fill=(79, 179, 64))
    draw.rectangle((0, floor + 10, W, floor + 92), fill=(217, 212, 199))
    for x in range(0, W, 64):
        draw.rectangle((x, floor + 10, x + 1, floor + 92), fill=(184, 178, 163))
    draw.rectangle((0, floor + 92, W, floor + 104), fill=(79, 179, 64))
    draw.rectangle((0, floor + 104, W, H - 16), fill=(162, 68, 60))
    for x in range(0, W, 80):
        draw.rectangle((x, floor + 136, x + 44, floor + 139), fill=(242, 237, 228))
    draw.rectangle((0, H - 16, W, H), fill=(196, 85, 58))
    for name, x in [("lamp", 120), ("glorieta", 330), ("lamp", 1080)]:
        im = layer(name)
        card.alpha_composite(im, (x - im.width // 2, floor + 14 - im.height))

    # Persecución: Faby y Tofu huyen (hacia la izquierda), Corli detrás
    ground = floor + 150
    for sheet, anim, x in [("faby", "panic", 360), ("tofu", "panic", 520), ("pug", "run", 760)]:
        im, ax, ay = frame(sheet, anim, 1, flip=True)
        shadow = Image.new("RGBA", (70, 14))
        ImageDraw.Draw(shadow).ellipse((0, 0, 69, 13), fill=(10, 12, 30, 90))
        card.alpha_composite(shadow, (x - 35, ground - 7))
        card.alpha_composite(im, (x - ax, ground - ay))
    draw = ImageDraw.Draw(card)
    text(draw, (365, ground - 162), "¡AAAH!", 18, (255, 255, 255), shadow=2)
    text(draw, (525, ground - 86), "¡CAIN!", 12, (255, 255, 255), shadow=2)
    text(draw, (790, ground - 110), "¡GRRR! ¡GUAU!", 14, (255, 210, 63), shadow=2)

    # Logo
    veil = Image.new("RGBA", (W, 170), (15, 8, 30, 120))
    card.alpha_composite(veil, (0, 22))
    text(draw, (W // 2, 92), "FABY & TOFU", 64, (255, 47, 168), shadow=6)
    text(draw, (W // 2, 160), "UN PASEO NORMAL POR EL PARQUE", 20, (125, 249, 255), shadow=3)

    out = ROOT / "juego" / "og-image.jpg"
    card.convert("RGB").save(out, quality=90, optimize=True)
    print(out, out.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
