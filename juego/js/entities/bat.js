import { Animator, drawSprite } from '../engine/sprite.js';

// Nivel 5: murciélagos de la mina. No atacan ni se pueden golpear: pasan volando en bandada
// y asustan a Tofu, que salta a los brazos de Faby (ver Faby.batScare).

export class Bat {
  constructor(stage, x, y, dir, delay = 0) {
    this.stage = stage;
    this.x = x;
    this.y = y;            // carril (suelo) sobre el que vuela
    this.z = 150 + Math.random() * 90;
    this.dir = dir;
    this.vx = dir * (300 + Math.random() * 80);
    this.delay = delay;
    this.t = Math.random() * 3;
    this.removed = false;
    this.anim = stage.sheets.bat ? new Animator(stage.sheets.bat, 'fly') : null;
  }

  update(dt) {
    if (this.delay > 0) { this.delay -= dt; return; }
    this.t += dt;
    this.x += this.vx * dt;
    this.z += Math.sin(this.t * 7) * 90 * dt;
    this.anim?.update(dt);
    // Pasa cerca de Tofu: ¡se asusta!
    const tofu = this.stage.tofu;
    if (!this.scared && tofu && Math.abs(tofu.x - this.x) < 160) {
      this.scared = true;
      this.stage.player.batScare?.(tofu);
    }
    const cam = this.stage.camera;
    if ((this.dir > 0 && this.x > cam.x + 1100) || (this.dir < 0 && this.x < cam.x - 140)) this.removed = true;
  }

  drawShadow(ctx, camX) {
    if (this.delay > 0) return;
    ctx.fillStyle = 'rgba(20, 12, 40, 0.25)';
    ctx.fillRect(Math.round(this.x - camX) - 10, Math.round(this.y) - 2, 20, 4);
  }

  draw(ctx, camX) {
    if (this.delay > 0) return;
    const x = this.x - camX;
    const y = this.y - this.z;
    if (this.anim) {
      // Aleteo: la IA casi no movió las alas, así que se aplasta y estira el dibujo.
      const k = 0.55 + Math.abs(Math.sin(this.t * 16)) * 0.45;
      ctx.save();
      ctx.translate(Math.round(x), Math.round(y));
      ctx.scale(1, k);
      drawSprite(ctx, this.anim, 0, 20, this.dir);
      ctx.restore();
      return;
    }
    // Respaldo dibujado por código
    const flap = Math.floor(this.t * 14) % 2;
    const X = Math.round(x), Y = Math.round(y);
    ctx.fillStyle = '#140c1c';
    ctx.fillRect(X - 6, Y - 5, 12, 10);
    ctx.fillRect(X - 22, Y - (flap ? 10 : -2), 16, 4);
    ctx.fillRect(X + 6, Y - (flap ? 10 : -2), 16, 4);
    ctx.fillStyle = '#4a2a4a';
    ctx.fillRect(X - 4, Y - 3, 8, 6);
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(X + this.dir * 2 - 1, Y - 2, 2, 2);
  }
}
