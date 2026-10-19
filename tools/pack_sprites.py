"""Empaqueta los cuadros sueltos de PixelLab en un atlas PNG + JSON para el juego.

Uso:  python tools/pack_sprites.py
Lee las definiciones de SHEETS, recorta cada cuadro a su bbox común por
animación y calcula el ancla (centro de los pies) para alinear las animaciones.
"""
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "juego" / "assets" / "sprites"

# nombre -> animaciones. Cada animación: carpeta de origen, cuadros, duración (ms) por cuadro, loop.
SHEETS = {
    "faby": {
        "src": ROOT / "assets" / "pilot",
        "anims": {
            # "faces": hacia dónde mira el dibujo original (1 = derecha, -1 = izquierda).
            # "active": índices (dentro de la animación) donde el golpe puede conectar.
            # "perFrame": cada cuadro se alinea por su torso y sus pies (la IA desplazó el dibujo).
            "idle":      {"dir": "faby_v3/stance_idle", "frames": [0, 1, 2, 1], "ms": [170] * 4, "loop": True},
            "walk":      {"dir": "faby_v3/walk2", "frames": [1, 2, 3, 4, 5, 6, 7, 8], "ms": [95] * 8, "loop": True, "perFrame": True},
            "run":       {"dir": "faby_v3/run", "frames": [3, 4, 5, 6, 7, 8], "ms": [75] * 6, "loop": True, "perFrame": True},
            "punch":     {"dir": "faby_v3/cross", "frames": [2, 3, 5], "ms": [50, 110, 70], "loop": False, "active": [1]},
            "cross":     {"dir": "faby_v3/cross", "frames": [1, 2, 3, 4, 5, 6], "ms": [50, 50, 70, 90, 70, 60], "loop": False, "active": [2, 3]},
            "guard":     {"dir": "faby_v3/stance_idle", "frames": [0], "ms": [100], "loop": True},
            "special":   {"dir": "faby_v3/special", "frames": [1, 2, 3, 4, 5, 6, 7, 8], "ms": [50, 50, 60, 60, 60, 60, 70, 80], "loop": False, "active": [2, 3, 4, 5], "perFrame": True},
            # Salto: la altura la pone el código.
            "jumpsquat": {"dir": "faby_v3/jump", "frames": [2], "ms": [100], "loop": True, "perFrame": True},
            "jumpUp":    {"dir": "faby_v3/jump", "frames": [3], "ms": [100], "loop": True, "perFrame": True},
            "jumpTop":   {"dir": "faby_v3/jump", "frames": [4], "ms": [100], "loop": True, "perFrame": True},
            "jumpFall":  {"dir": "faby_v3/jump", "frames": [3], "ms": [100], "loop": True, "perFrame": True},
            "land":      {"dir": "faby_v3/jump", "frames": [8], "ms": [100], "loop": True, "perFrame": True},
            "air":       {"dir": "faby_v3/airkick", "frames": [2, 3, 4], "ms": [50, 60, 100], "loop": False, "active": [1, 2], "perFrame": True},
            # Daño
            "hurt":      {"dir": "faby_v3/knockdown", "frames": [2, 3, 2], "ms": [60, 160, 100], "loop": False, "perFrame": True},
            "knockdown": {"dir": "faby_v3/knockdown", "frames": [3, 4, 5, 6, 7], "ms": [70, 70, 80, 90, 100], "loop": False, "perFrame": True},
            "down":      {"dir": "faby_v3/knockdown", "frames": [8], "ms": [100], "loop": True, "perFrame": True},
            "getup":     {"dir": "faby_v3/getup", "frames": [1, 2, 3, 4, 5, 6], "ms": [70, 70, 70, 70, 80, 90], "loop": False, "perFrame": True},
            # Agarre y lanzamientos
            "grabHold":  {"dir": "faby_v3/grab", "frames": [4], "ms": [100], "loop": True, "perFrame": True},
            "knee":      {"dir": "faby_v3/grab", "frames": [5, 6, 5], "ms": [60, 120, 60], "loop": False, "perFrame": True},
            "throw":     {"dir": "faby_v3/throw", "frames": [1, 2, 3, 4, 5, 6], "ms": [60, 70, 80, 90, 90, 100], "loop": False, "perFrame": True},
            "pickup":    {"dir": "faby_v3/pickup", "frames": [2, 3, 4, 3, 2], "ms": [50, 50, 90, 50, 50], "loop": False, "perFrame": True},
            "toss":      {"dir": "faby_v3/toss", "frames": [1, 2, 3, 4], "ms": [60, 70, 90, 100], "loop": False, "perFrame": True},
            # Tofu y celebración
            "whistle":   {"dir": "faby_v3/whistle", "frames": [1, 2, 3, 4, 3, 4], "ms": [70, 80, 160, 160, 160, 200], "loop": False},
            "pet":       {"dir": "faby_v3/pet", "frames": [1, 2, 3, 4, 5, 6, 5, 6, 5, 3, 2, 1], "ms": [70, 70, 80, 100, 160, 160, 160, 160, 160, 80, 70, 70], "loop": False, "perFrame": True},
            "victory":   {"dir": "faby_v3/victory", "frames": [1, 2, 3, 4, 5, 6, 5], "ms": [70, 70, 80, 90, 180, 220, 400], "loop": False},
            # Faby cargando a Tofu (montaje + animate_image)
            "carryIdle": {"dir": "tofu/carry_idle", "frames": [0, 1, 2, 1], "ms": [180] * 4, "loop": True},
            "carryWalk": {"dir": "tofu/carry_walk", "frames": [1, 2, 3, 4, 5, 6, 7, 8], "ms": [105] * 8, "loop": True, "perFrame": True},
            "carryKick": {"dir": "tofu/carry_kick", "frames": [2, 3, 4, 3], "ms": [60, 70, 130, 80], "loop": False, "active": [2], "perFrame": True},
            # Huyendo del Pug (pantalla de inicio)
            "panic":     {"dir": "faby_v3/panic", "frames": [2, 3, 4, 5, 6, 7, 8], "ms": [70] * 7, "loop": True, "perFrame": True},
            "front":     {"dir": "faby_v2/idle", "frames": [1, 2, 3, 4], "ms": [180] * 4, "loop": True, "faces": -1},
        },
    },
    "tofu": {
        "src": ROOT / "assets" / "pilot" / "tofu",
        "clean": True,
        "anims": {
            "idle":   {"dir": "idle",   "frames": [0, 1, 2, 1], "ms": [160] * 4, "loop": True},
            "walk":   {"dir": "walk",   "frames": [1, 6, 7, 8], "ms": [110] * 4, "loop": True, "perFrame": True},
            "run":    {"dir": "run2",   "frames": [1, 2, 3, 4, 5, 6, 7, 8], "ms": [60] * 8, "loop": True, "perFrame": True},
            "bark":   {"dir": "bark",   "frames": [1, 2, 3, 4], "ms": [70, 90, 90, 120], "loop": False},
            "growl":  {"dir": "growl2", "frames": [1, 2, 3, 4], "ms": [120] * 4, "loop": True},
            "bite":   {"dir": "bite",   "frames": [1, 2, 3, 4, 5, 6], "ms": [50, 50, 70, 90, 70, 60], "loop": False, "perFrame": True},
            "scared": {"dir": "scared", "frames": [2, 3, 4, 3], "ms": [90] * 4, "loop": True, "perFrame": True},
            "hurt":   {"dir": "hurt",   "frames": [1, 2, 3, 4], "ms": [70, 90, 90, 100], "loop": False, "perFrame": True},
            "sniff":  {"dir": "sniff",  "frames": [1, 2, 3, 4], "ms": [180] * 4, "loop": True},
            "hop":    {"dir": "hop",    "frames": [1, 2, 3, 4, 5, 6], "ms": [70] * 6, "loop": True, "perFrame": True},
            "happy":  {"dir": "happy",  "frames": [0, 1, 0, 1], "ms": [200] * 4, "loop": True},
            "sit":    {"dir": "pro_side", "frames": [12], "ms": [100], "loop": True},
            "panic":  {"dir": "panic", "frames": [5, 6, 7, 8], "ms": [65] * 4, "loop": True, "perFrame": True},
        },
    },
}


E = ROOT / "assets" / "pilot" / "enemies"
SHEETS["jogger"] = {
    "src": E,
    "anims": {
        "idle":      {"dir": "j_idle", "frames": [0, 1, 2, 1], "ms": [160] * 4, "loop": True},
        "walk":      {"dir": "j_walk", "frames": [1, 2, 3, 4, 5, 6, 7, 8], "ms": [100] * 8, "loop": True, "perFrame": True},
        "jab":       {"dir": "j_jab", "frames": [1, 2, 3, 4], "ms": [70, 60, 140, 90], "loop": False, "active": [2]},
        "hurt":      {"dir": "j_knock", "frames": [2, 3, 2], "ms": [60, 160, 100], "loop": False, "perFrame": True},
        "grabbed":   {"dir": "j_knock", "frames": [3], "ms": [100], "loop": True, "perFrame": True},
        "knockdown": {"dir": "j_knock", "frames": [3, 4, 5, 6, 7], "ms": [70, 70, 80, 90, 100], "loop": False, "perFrame": True},
        "down":      {"dir": "j_knock", "frames": [8], "ms": [100], "loop": True, "perFrame": True},
        "getup":     {"dir": "j_getup", "frames": [1, 2, 3, 4, 5, 6], "ms": [70, 70, 70, 70, 80, 90], "loop": False, "perFrame": True, "optional": True},
    },
}
SHEETS["skater"] = {
    "src": E,
    "anims": {
        "idle":      {"dir": "s_idle", "frames": [0, 1, 2, 1], "ms": [170] * 4, "loop": True},
        "walk":      {"dir": "s_walk", "frames": [1, 2, 3, 4, 5, 6, 7, 8], "ms": [100] * 8, "loop": True, "perFrame": True},
        "kick":      {"dir": "s_kick", "frames": [2, 3, 4, 3], "ms": [70, 70, 150, 80], "loop": False, "active": [2], "perFrame": True},
        "rideStart": {"dir": "s_ride", "frames": [2], "ms": [100], "loop": True, "perFrame": True},
        "ride":      {"dir": "s_ride", "frames": [3, 4], "ms": [120, 120], "loop": True, "perFrame": True},
        "hurt":      {"dir": "s_hurt", "frames": [1, 2, 3], "ms": [60, 160, 100], "loop": False},
        "grabbed":   {"dir": "s_hurt", "frames": [2], "ms": [100], "loop": True},
        "knockdown": {"dir": "s_knock", "frames": [3, 4, 5, 6, 7], "ms": [70, 70, 80, 90, 100], "loop": False, "perFrame": True},
        "down":      {"dir": "s_knock", "frames": [8], "ms": [100], "loop": True, "perFrame": True},
        "getup":     {"dir": "s_getup", "frames": [1, 2, 3, 4, 5, 6], "ms": [70, 70, 70, 70, 80, 90], "loop": False, "perFrame": True, "optional": True},
    },
}
SHEETS["dog"] = {
    "src": E,
    "clean": True,
    "anims": {
        "idle":   {"dir": "d_idle", "frames": [0, 1, 2, 3], "ms": [150] * 4, "loop": True},
        "run":    {"dir": "d_run", "frames": [1, 2, 3, 4, 5, 6, 7, 8], "ms": [60] * 8, "loop": True, "perFrame": True},
        "bark":   {"dir": "d_bark", "frames": [1, 2, 3, 4], "ms": [70, 90, 90, 120], "loop": False},
        "pounce": {"dir": "d_pounce", "frames": [1, 2, 3, 4, 5, 6], "ms": [60, 60, 80, 90, 80, 70], "loop": False, "perFrame": True},
        "happy":  {"dir": "d_happy", "frames": [1, 2, 3, 4], "ms": [120] * 4, "loop": True},
        "eat":    {"dir": "d_eat", "frames": [2, 3, 4, 3], "ms": [150] * 4, "loop": True},
    },
}

SHEETS["pug"] = {
    "src": ROOT / "assets" / "pilot" / "pug",
    "clean": True,
    "anims": {
        "idle": {"dir": "idle", "frames": [0, 1, 2, 3], "ms": [170] * 4, "loop": True},
        "run":  {"dir": "run", "frames": [1, 2, 3, 4, 5, 6, 7, 8], "ms": [55] * 8, "loop": True, "perFrame": True},
        "bark": {"dir": "bark", "frames": [1, 2, 3, 4, 3, 4], "ms": [80, 90, 120, 160, 120, 200], "loop": False},
        "bite": {"dir": "bite", "frames": [1, 2, 3, 4], "ms": [60, 70, 120, 90], "loop": False, "perFrame": True},
        "dirt": {"dir": "dirt", "frames": [2, 3, 4, 5, 6, 5, 4], "ms": [80, 90, 90, 90, 90, 90, 100], "loop": False, "perFrame": True},
        "hurt": {"dir": "ko", "frames": [1, 2, 1], "ms": [70, 160, 100], "loop": False},
        "ko":   {"dir": "ko", "frames": [1, 2, 3, 4, 5, 6], "ms": [90, 90, 100, 110, 120, 200], "loop": False, "perFrame": True},
        "tie":  {"dir": "tie", "frames": [1, 2, 3, 4, 3, 4], "ms": [90, 90, 160, 220, 160, 300], "loop": False, "perFrame": True},
    },
}


def feet_anchor(img):
    """Centro x de los píxeles opacos en las 8 filas inferiores, y la fila más baja."""
    w, h = img.size
    px = img.load()
    bottom = max(y for y in range(h) for x in range(w) if px[x, y][3] > 0)
    xs = [x for y in range(bottom - 7, bottom + 1) for x in range(w) if px[x, y][3] > 0]
    return (min(xs) + max(xs)) // 2, bottom


def keep_largest(img):
    """Borra los grupos de píxeles sueltos (efectos que la IA dibujó flotando: halos,
    destellos, mariposas) y deja solo la figura principal."""
    w, h = img.size
    px = img.load()
    seen = [[False] * w for _ in range(h)]
    best = []
    for y in range(h):
        for x in range(w):
            if seen[y][x] or px[x, y][3] == 0:
                continue
            comp, stack = [], [(x, y)]
            seen[y][x] = True
            while stack:
                cx, cy = stack.pop()
                comp.append((cx, cy))
                for nx in (cx - 1, cx, cx + 1):
                    for ny in (cy - 1, cy, cy + 1):
                        if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and px[nx, ny][3] > 0:
                            seen[ny][nx] = True
                            stack.append((nx, ny))
            if len(comp) > len(best):
                best = comp
    keep = set(best)
    out = img.copy()
    op = out.load()
    for y in range(h):
        for x in range(w):
            if (x, y) not in keep:
                op[x, y] = (0, 0, 0, 0)
    return out


def torso_cx(img):
    """Centro x de los píxeles opacos en la franja del torso (45%-70% del alto del sprite)."""
    x0, y0, x1, y1 = img.getbbox()
    px = img.load()
    h = y1 - y0
    xs = [x for y in range(y0 + int(h * 0.45), y0 + int(h * 0.7)) for x in range(x0, x1) if px[x, y][3] > 0]
    return sum(xs) / len(xs)


def frame_anchors(src, imgs, k=1):
    """Anclas por cuadro: y = pies de ese cuadro; x = sigue al torso, para que el cuerpo
    no salte de lado cuando la IA desplazó el dibujo dentro del lienzo."""
    base = Image.open(src / "f0.png").convert("RGBA")
    offset = (torso_cx(base) - feet_anchor(base)[0]) * k
    return [[round(torso_cx(im) - offset), feet_anchor(im)[1]] for im in imgs]


# Morita (nivel 2): perrita más chica y flaquita que Tofu; "happy" y "run" son su versión gordita del final.
SHEETS["morita"] = {
    "src": ROOT / "assets" / "pilot" / "morita",
    "clean": True,
    "scale": 0.72,
    "anims": {
        "idle":    {"dir": "idle", "frames": [0, 2, 3, 2], "ms": [220] * 4, "loop": True, "dropWhite": True},
        "walk":    {"dir": "walk", "frames": [1, 2, 3, 4, 5, 6, 7, 8], "ms": [110] * 8, "loop": True, "perFrame": True},
        "howl":    {"dir": "howl", "frames": [1, 2, 3, 2, 3, 4], "ms": [120, 160, 400, 200, 400, 200], "loop": False},
        "tremble": {"dir": "tremble", "frames": [0, 1, 2, 3], "ms": [70] * 4, "loop": True},
        "eat":     {"dir": "eat2", "frames": [3, 4, 3, 4], "ms": [160, 200, 160, 200], "loop": True, "optional": True, "dropWhite": True},
        "happy":   {"dir": "happy", "frames": [0, 1, 2, 3], "ms": [120] * 4, "loop": True, "optional": True},
        "run":     {"dir": "run", "frames": [1, 2, 3, 4, 5, 6, 7, 8], "ms": [65] * 8, "loop": True, "perFrame": True, "optional": True, "dropRed": True},
    },
}

# Doña Billetes (jefa del nivel 2), 15 % más alta que Faby.
SHEETS["billetes"] = {
    "src": ROOT / "assets" / "pilot" / "billetes",
    "clean": True,
    "anims": {
        "idle":   {"dir": "idle", "frames": [0, 1, 2, 3], "ms": [170] * 4, "loop": True, "perFrame": True},
        "walk":   {"dir": "walk", "frames": [1, 2, 3, 4, 5, 6, 7, 8], "ms": [100] * 8, "loop": True, "perFrame": True},
        "scold":  {"dir": "scold", "frames": [1, 2, 3, 4, 3, 4], "ms": [120, 160, 160, 160, 160, 220], "loop": False, "perFrame": True},
        "jab":    {"dir": "jab", "frames": [1, 2, 3, 4], "ms": [80, 70, 150, 100], "loop": False, "active": [2], "perFrame": True},
        "slap":   {"dir": "slap", "frames": [1, 2, 3, 4, 5, 6], "ms": [90, 90, 70, 120, 100, 90], "loop": False, "active": [3, 4], "perFrame": True},
        "push":   {"dir": "push", "frames": [1, 2, 3, 4], "ms": [90, 90, 120, 200], "loop": False, "perFrame": True},
        "hold":   {"dir": "push", "frames": [4], "ms": [100], "loop": True, "perFrame": True},
        "throw":  {"dir": "throw", "frames": [1, 2, 3, 4], "ms": [90, 140, 70, 160], "loop": False, "active": [3], "perFrame": True},
        "phone":  {"dir": "phone", "frames": [1, 2, 3, 4, 3, 4], "ms": [120, 160, 160, 160, 160, 200], "loop": False, "perFrame": True},
        "charge": {"dir": "charge", "frames": [1, 2, 3, 4, 5, 6, 7, 8], "ms": [60] * 8, "loop": True, "perFrame": True},
        "hurt":   {"dir": "hurt", "frames": [1, 2, 3, 2], "ms": [70, 160, 120, 90], "loop": False, "perFrame": True},
        "guard":  {"dir": "tired", "frames": [2, 3, 4, 3], "ms": [120] * 4, "loop": True, "perFrame": True},
        "ko":     {"dir": "ko", "frames": [1, 2, 3, 4, 5, 6], "ms": [100, 110, 120, 140, 160, 200], "loop": False, "perFrame": True},
        "down":   {"dir": "ko", "frames": [5, 6], "ms": [500, 500], "loop": True, "perFrame": True},
    },
}

# Nivel 2: vendedores de Doña Billetes y el chihuahua ladrón.
V = ROOT / "assets" / "pilot" / "vendors"
SHEETS["shake"] = {
    "src": V,
    "anims": {
        "idle":      {"dir": "sh_idle", "frames": [0, 1, 2, 1], "ms": [160] * 4, "loop": True},
        "walk":      {"dir": "sh_walk", "frames": [1, 2, 3, 4, 5, 6, 7, 8], "ms": [100] * 8, "loop": True, "perFrame": True},
        "throw":     {"dir": "sh_throw", "frames": [2, 3, 4, 4], "ms": [90, 120, 140, 140], "loop": False, "active": [2], "perFrame": True, "clean": True},
        "hurt":      {"dir": "sh_hurt", "frames": [3, 4, 3], "ms": [60, 160, 100], "loop": False, "perFrame": True},
        "grabbed":   {"dir": "sh_hurt", "frames": [4], "ms": [100], "loop": True, "perFrame": True},
        "knockdown": {"dir": "sh_knock", "frames": [3, 4, 5, 6, 7], "ms": [70, 70, 80, 90, 100], "loop": False, "perFrame": True},
        "down":      {"dir": "sh_knock", "frames": [8], "ms": [100], "loop": True, "perFrame": True},
    },
}
SHEETS["influ"] = {
    "src": V,
    "anims": {
        "idle":      {"dir": "in_idle", "frames": [1, 2, 3, 4], "ms": [170] * 4, "loop": True},
        "walk":      {"dir": "in_walk", "frames": [1, 2, 3, 4, 5, 6, 7, 8], "ms": [100] * 8, "loop": True, "perFrame": True},
        "flash":     {"dir": "in_flash", "frames": [1, 2, 3, 4], "ms": [120, 160, 200, 300], "loop": False, "perFrame": True},
        "swing":     {"dir": "in_swing", "frames": [1, 2, 3, 4], "ms": [80, 70, 130, 110], "loop": False, "active": [2, 3], "perFrame": True},
        "hurt":      {"dir": "in_hurt", "frames": [2, 3, 2], "ms": [60, 160, 100], "loop": False, "perFrame": True},
        "grabbed":   {"dir": "in_hurt", "frames": [3], "ms": [100], "loop": True, "perFrame": True},
        "knockdown": {"dir": "in_knock", "frames": [3, 4, 5, 6, 7], "ms": [70, 70, 80, 90, 100], "loop": False, "perFrame": True},
        "down":      {"dir": "in_knock", "frames": [8], "ms": [100], "loop": True, "perFrame": True},
    },
}
SHEETS["chihuahua"] = {
    "src": V,
    "clean": True,
    "anims": {
        "idle":   {"dir": "ch_idle", "frames": [0, 1, 2, 1], "ms": [150] * 4, "loop": True},
        "run":    {"dir": "ch_run", "frames": [1, 2, 3, 4, 5, 6, 7, 8], "ms": [50] * 8, "loop": True, "perFrame": True},
        "bark":   {"dir": "ch_bark", "frames": [1, 2, 3, 4], "ms": [60, 80, 80, 100], "loop": False},
        "pounce": {"dir": "ch_run", "frames": [3, 4, 5, 6], "ms": [60] * 4, "loop": False, "perFrame": True},
        "scared": {"dir": "ch_scared", "frames": [2, 3, 4, 3], "ms": [70] * 4, "loop": True},
        "eat":    {"dir": "ch_eat", "frames": [2, 3, 4, 3], "ms": [150] * 4, "loop": True},
        "happy":  {"dir": "ch_idle", "frames": [2, 3, 4, 3], "ms": [120] * 4, "loop": True},
    },
}
SHEETS["coach"] = {
    "src": V,
    "anims": {
        "idle":      {"dir": "co_idle", "frames": [0, 1, 2, 3], "ms": [190] * 4, "loop": True},
        "walk":      {"dir": "co_walk", "frames": [1, 2, 3, 4, 5, 6, 7, 8], "ms": [120] * 8, "loop": True, "perFrame": True},
        # Si existe co_swing2 (balanceo con la pesa) se usa esa; si no, el golpe de puño.
        "swing":     {"dir": "co_swing2" if (V / "co_swing2" / "f4.png").exists() else "co_swing", "frames": [1, 2, 3, 4], "ms": [110, 90, 160, 120], "loop": False, "active": [2], "perFrame": True, "clean": True},
        "hurt":      {"dir": "co_hurt", "frames": [3, 4, 3], "ms": [60, 160, 100], "loop": False, "perFrame": True},
        "grabbed":   {"dir": "co_hurt", "frames": [4], "ms": [100], "loop": True, "perFrame": True},
        "knockdown": {"dir": "co_knock", "frames": [3, 4, 5, 6, 7], "ms": [70, 70, 80, 90, 100], "loop": False, "perFrame": True, "clean": True},
        "down":      {"dir": "co_knock", "frames": [8], "ms": [100], "loop": True, "perFrame": True},
    },
}

def pack(name, sheet):
    frames, meta = [], {}
    for anim, cfg in sheet["anims"].items():
        if cfg.get("optional") and not (sheet["src"] / cfg["dir"]).exists():
            continue
        imgs = [Image.open(sheet["src"] / cfg["dir"] / f"f{i}.png").convert("RGBA") for i in cfg["frames"]]
        if cfg.get("dropWhite"):
            # Quita destellos blancos pegados al dibujo (efecto que agregó la IA).
            for im in imgs:
                px = im.load()
                for y in range(im.height):
                    for x in range(im.width):
                        r, g, b, a = px[x, y]
                        if a and r > 225 and g > 225 and b > 200:
                            px[x, y] = (0, 0, 0, 0)
        if cfg.get("dropRed"):
            # Quita corazoncitos rojos pegados a la cabeza (el moño rosado no se toca).
            for im in imgs:
                px = im.load()
                for y in range(im.height):
                    for x in range(im.width):
                        r, g, b, a = px[x, y]
                        if a and r > 150 and g < 90 and b < 90:
                            px[x, y] = (0, 0, 0, 0)
                # Su contorno oscuro queda flotando: se borra el contorno que no toca pelo ni ropa.
                dark = lambda c: c[3] and sum(c[:3]) < 200
                changed = True
                while changed:
                    changed = False
                    for y in range(im.height):
                        for x in range(im.width):
                            if not dark(px[x, y]):
                                continue
                            near = [px[nx, ny] for nx in (x - 1, x, x + 1) for ny in (y - 1, y, y + 1)
                                    if 0 <= nx < im.width and 0 <= ny < im.height]
                            if not any(c[3] and not dark(c) for c in near):
                                px[x, y] = (0, 0, 0, 0)
                                changed = True
        if cfg.get("clean") or sheet.get("clean"):
            imgs = [keep_largest(im) for im in imgs]
        if sheet.get("scale"):
            # Personajes más chicos que su lienzo de generación (Morita es 2/3 de Tofu).
            k = sheet["scale"]
            imgs = [im.resize((round(im.width * k), round(im.height * k)), Image.NEAREST) for im in imgs]
        ax, ay = feet_anchor(imgs[0])
        anchors = frame_anchors(sheet["src"] / cfg["dir"], imgs, sheet.get("scale", 1)) if cfg.get("perFrame") else None
        start = len(frames)
        frames.extend(imgs)
        meta[anim] = {
            "frames": list(range(start, len(frames))),
            "ms": cfg["ms"],
            "loop": cfg["loop"],
            "anchor": [ax, ay],
            "faces": cfg.get("faces", 1),
            "active": cfg.get("active", []),
            **({"anchors": anchors} if anchors else {}),
        }

    fw = max(f.width for f in frames)
    fh = max(f.height for f in frames)
    cols = 8
    rows = (len(frames) + cols - 1) // cols
    atlas = Image.new("RGBA", (fw * cols, fh * rows), (0, 0, 0, 0))
    rects = []
    for i, f in enumerate(frames):
        x, y = (i % cols) * fw, (i // cols) * fh
        atlas.alpha_composite(f, (x, y))
        rects.append([x, y, f.width, f.height])

    OUT.mkdir(parents=True, exist_ok=True)
    atlas.save(OUT / f"{name}.png", optimize=True)
    (OUT / f"{name}.json").write_text(json.dumps({"image": f"{name}.png", "rects": rects, "anims": meta}, indent=1))
    print(f"{name}: {len(frames)} cuadros -> {OUT / (name + '.png')}")


if __name__ == "__main__":
    for n, s in SHEETS.items():
        pack(n, s)
