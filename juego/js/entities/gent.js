import { Animator, drawSprite } from '../engine/sprite.js';

// Nivel 5: el señor elegante de la chistera que espera en el fondo de la mina.
// Ofrece un contrato a Faby... y en realidad es el Diablo.

export class Gent {
  constructor(stage, x, y) {
    this.stage = stage;
    this.x = x;
    this.y = y;
    this.z = 0;
    this.facing = -1;
    this.t = 0;
    this.targetX = null;
    this.alpha = 1;
    this.anim = stage.sheets.gent ? new Animator(stage.sheets.gent, 'idle') : null;
  }

  play(name) {
    if (this.anim?.sheet.anims[name]) this.anim.play(name, true);
  }

  update(dt) {
    this.t += dt;
    if (this.targetX !== null) {
      const dx = this.targetX - this.x;
      if (Math.abs(dx) > 3) {
        this.x += Math.sign(dx) * Math.min(Math.abs(dx), 260 * dt);
        this.facing = Math.sign(dx);
      } else this.targetX = null;
    }
    this.anim?.update(dt);
  }

  drawShadow(ctx, camX) {
    ctx.fillStyle = `rgba(20, 12, 40, ${0.35 * this.alpha})`;
    ctx.beginPath();
    ctx.ellipse(Math.round(this.x - camX), Math.round(this.y), 30, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  draw(ctx, camX) {
    const x = this.x - camX;
    const bob = this.targetX !== null ? Math.round(Math.abs(Math.sin(this.t * 12)) * 4) : 0;
    ctx.globalAlpha = this.alpha;
    if (this.anim) drawSprite(ctx, this.anim, x, this.y - bob, this.facing);
    else {
      // Respaldo dibujado por código: levita, chistera y frac.
      const X = Math.round(x), Y = Math.round(this.y - bob);
      ctx.fillStyle = '#140c1c';
      ctx.fillRect(X - 18, Y - 120, 36, 120);
      ctx.fillRect(X - 16, Y - 160, 32, 40);
      ctx.fillStyle = '#e8d8c8';
      ctx.fillRect(X - 10, Y - 140, 20, 20);
      ctx.fillStyle = '#b02030';
      ctx.fillRect(X - 16, Y - 150, 32, 5);
    }
    ctx.globalAlpha = 1;
  }
}
