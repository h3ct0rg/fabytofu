// Reproductor de animaciones por cuadros y dibujo de sprites con espejo y destello blanco.

export class Animator {
  constructor(sheet, anim = 'idle') {
    this.sheet = sheet;
    this.play(anim, true);
  }

  play(name, restart = false) {
    if (!restart && this.name === name) return;
    if (!this.sheet.anims[name]) throw new Error(`Animación desconocida: ${name}`);
    this.name = name;
    this.anim = this.sheet.anims[name];
    this.index = 0;
    this.time = 0;
    this.done = false;
  }

  update(dt) {
    if (this.done) return;
    this.time += dt * 1000;
    while (this.time >= this.anim.ms[this.index]) {
      this.time -= this.anim.ms[this.index];
      if (this.index < this.anim.frames.length - 1) {
        this.index++;
      } else if (this.anim.loop) {
        this.index = 0;
      } else {
        this.done = true;
        this.time = 0;
        break;
      }
    }
  }

  get frame() {
    return this.anim.frames[this.index];
  }
}

// Versión blanca del atlas para el destello de impacto, generada una sola vez por hoja.
const whiteCache = new WeakMap();
function whiteAtlas(image) {
  let c = whiteCache.get(image);
  if (!c) {
    c = document.createElement('canvas');
    c.width = image.width;
    c.height = image.height;
    const g = c.getContext('2d');
    g.drawImage(image, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, c.width, c.height);
    whiteCache.set(image, c);
  }
  return c;
}

// Dibuja el cuadro actual con los pies (ancla) en (x, y). facing: 1 = derecha, -1 = izquierda.
// rotation (radianes) gira alrededor de los pies; se usa para caídas provisionales.
export function drawSprite(ctx, animator, x, y, facing, { flash = false, alpha = 1, rotation = 0 } = {}) {
  const { sheet, anim } = animator;
  const [sx, sy, sw, sh] = sheet.rects[animator.frame];
  const [ax, ay] = anim.anchors ? anim.anchors[animator.index] : anim.anchor;
  const img = flash ? whiteAtlas(sheet.image) : sheet.image;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(Math.round(x), Math.round(y));
  // Se voltea cuando la dirección pedida no coincide con hacia dónde mira el dibujo original.
  if (facing !== (anim.faces ?? 1)) ctx.scale(-1, 1);
  if (rotation) ctx.rotate(rotation);
  ctx.drawImage(img, sx, sy, sw, sh, -ax, -ay, sw, sh);
  ctx.restore();
}

// Variante de color de una hoja: rota el tono de los píxeles cuyo tono (0-360) cae en
// [from, to] y tienen saturación suficiente (la ropa), sin tocar piel ni contorno.
export function recolorSheet(sheet, from, to, shift) {
  const c = document.createElement('canvas');
  c.width = sheet.image.width;
  c.height = sheet.image.height;
  const g = c.getContext('2d');
  g.drawImage(sheet.image, 0, 0);
  const img = g.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255;
    const max = Math.max(r, gg, b), min = Math.min(r, gg, b);
    const l = (max + min) / 2;
    const delta = max - min;
    if (delta < 0.15) continue;
    const sat = delta / (1 - Math.abs(2 * l - 1));
    if (sat < 0.35) continue;
    let h;
    if (max === r) h = 60 * (((gg - b) / delta) % 6);
    else if (max === gg) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - gg) / delta + 4);
    if (h < 0) h += 360;
    if (h < from || h > to) continue;
    h = (h + shift) % 360;
    // HSL -> RGB
    const C = (1 - Math.abs(2 * l - 1)) * sat;
    const X = C * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - C / 2;
    const [r1, g1, b1] = h < 60 ? [C, X, 0] : h < 120 ? [X, C, 0] : h < 180 ? [0, C, X] : h < 240 ? [0, X, C] : h < 300 ? [X, 0, C] : [C, 0, X];
    d[i] = Math.round((r1 + m) * 255);
    d[i + 1] = Math.round((g1 + m) * 255);
    d[i + 2] = Math.round((b1 + m) * 255);
  }
  g.putImageData(img, 0, 0);
  return { ...sheet, image: c };
}
