import { COLORS } from '../config.js';
import { Animator, drawSprite } from '../engine/sprite.js';

// El dueño del Pug: solo aparece en la escena final. Imagen fija que "corre" rebotando.
export class Owner {
  constructor(stage, x, y) {
    this.stage = stage;
    this.img = stage.game.bgImages.owner;
    this.x = x;
    this.y = y;
    this.z = 0;
    this.facing = -1;
    this.targetX = x;
    this.t = 0;
  }

  update(dt) {
    this.t += dt;
    const dx = this.targetX - this.x;
    this.moving = Math.abs(dx) > 4;
    if (this.moving) {
      this.x += Math.sign(dx) * Math.min(Math.abs(dx), 300 * dt);
      this.facing = Math.sign(dx);
      // Pasos pesados: tiembla la cámara.
      if (Math.floor(this.t * 4) !== Math.floor((this.t - dt) * 4)) {
        this.stage.camera.shake(3, 0.1);
        this.stage.sfx('stomp');
      }
    }
  }

  drawShadow(ctx, camX) {
    ctx.fillStyle = COLORS.shadow;
    ctx.beginPath();
    ctx.ellipse(Math.round(this.x - camX), Math.round(this.y), 46, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  draw(ctx, camX) {
    if (!this.img) return;
    const bob = this.moving ? Math.abs(Math.sin(this.t * 10)) * 8 : Math.sin(this.t * 6) * 1.5;
    ctx.save();
    ctx.translate(Math.round(this.x - camX), Math.round(this.y - bob));
    if (this.facing < 0) ctx.scale(-1, 1);
    ctx.drawImage(this.img, -this.img.width / 2, -this.img.height + 4);
    ctx.restore();
    // Nivel 2: trae a Corli en brazos, con una curita en la cabeza.
    if (this.holding === 'pug' && this.stage.sheets.pug) {
      this.pugAnim ??= new Animator(this.stage.sheets.pug, 'idle');
      this.pugAnim.update(1 / 60);
      const face = this.vigilando ? -this.facing : this.facing;
      const px = Math.round(this.x - camX + this.facing * 22);
      const py = Math.round(this.y - bob - 96);
      drawSprite(ctx, this.pugAnim, px, py, face);
      ctx.fillStyle = '#140c1c';
      ctx.fillRect(px - 13, py - 54, 26, 8);
      ctx.fillStyle = '#ffd9b3';
      ctx.fillRect(px - 11, py - 52, 22, 4);
      ctx.fillStyle = '#e0a070';
      ctx.fillRect(px - 2, py - 52, 4, 4);
    }
  }
}
