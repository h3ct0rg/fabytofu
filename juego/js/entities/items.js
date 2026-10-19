import { COLORS } from '../config.js';

// Bolsita de croquetas para Morita (nivel 2): Faby la recoge pasando por encima.
// Las que junta se cuentan en stage.croquettes y deciden el final de Morita.
// Dibujo provisional por código (se reemplaza por arte de PixelLab en la etapa de objetos).

export class CroquetteBag {
  constructor(stage, x, y, dropped = false) {
    this.stage = stage;
    this.x = x;
    this.y = y;
    this.z = dropped ? 30 : 0;
    this.vz = dropped ? 220 : 0;
    this.t = 0;
    this.removed = false;
  }

  update(dt) {
    this.t += dt;
    if (this.z > 0 || this.vz > 0) {
      this.z = Math.max(0, this.z + this.vz * dt);
      this.vz -= 900 * dt;
      if (this.z === 0) this.vz = 0;
    }
    const p = this.stage.player;
    if (this.z === 0 && this.t > 0.3 && p.alive && p.grounded && Math.abs(p.x - this.x) < 34 && Math.abs(p.y - this.y) < 16) {
      this.stage.croquettes = (this.stage.croquettes ?? 0) + 1;
      p.score += 300;
      this.stage.fx.text(this.x, this.y - 120, '¡CROQUETAS PARA MORITA!', '#ffb3d9', 11);
      this.stage.sfx('pickup');
      this.removed = true;
    }
  }

  drawShadow(ctx, camX) {
    ctx.fillStyle = COLORS.shadow;
    ctx.beginPath();
    ctx.ellipse(Math.round(this.x - camX), Math.round(this.y), 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  draw(ctx, camX) {
    const bob = this.z === 0 ? Math.round(Math.sin(this.t * 4) * 2) : 0;
    drawBag(ctx, this.x - camX, this.y - this.z - 4 + bob, 1, this.stage.game.bgImages.o_bag);
  }
}

// Bolsita rosada con un hueso dibujado.
export function drawBag(ctx, x, y, k, img) {
  x = Math.round(x);
  y = Math.round(y);
  if (img) {
    ctx.imageSmoothingEnabled = false;
    const w = Math.round(img.width * k), h = Math.round(img.height * k);
    ctx.drawImage(img, x - Math.round(w / 2), y - h, w, h);
    return;
  }
  const w = Math.round(22 * k), h = Math.round(26 * k);
  ctx.fillStyle = '#140c1c';
  ctx.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h + 4);
  ctx.fillStyle = '#ff6fb5';
  ctx.fillRect(x - w / 2, y - h, w, h);
  ctx.fillStyle = '#ffd1e8';
  ctx.fillRect(x - w / 2, y - h, w, Math.max(2, Math.round(4 * k)));
  ctx.fillStyle = '#ffffff';
  const bw = Math.round(12 * k), bh = Math.max(2, Math.round(4 * k));
  ctx.fillRect(x - bw / 2, y - h / 2 - bh / 2, bw, bh);
  ctx.fillRect(x - bw / 2 - 1, y - h / 2 - bh, Math.max(2, Math.round(3 * k)), bh * 2);
  ctx.fillRect(x + bw / 2 - 2, y - h / 2 - bh, Math.max(2, Math.round(3 * k)), bh * 2);
}
