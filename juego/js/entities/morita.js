import { COLORS } from '../config.js';
import { Animator, drawSprite } from '../engine/sprite.js';

// Morita (nivel 2): perrita hambrienta, no pelea. Las escenas la manejan con
// walkTo(), play() y feed(); después de comer usa su versión gordita y corre feliz.
export class Morita {
  constructor(stage, x, y) {
    this.stage = stage;
    this.x = x;
    this.y = y;
    this.z = 0;
    this.facing = 1;
    this.targetX = x;
    this.speed = 90;
    this.fed = false;
    this.mood = 'idle';
    this.anim = new Animator(stage.game.sheets.morita, 'idle');
    this.t = 0;
  }

  walkTo(x, speed = this.fed ? 260 : 90) {
    this.targetX = x;
    this.speed = speed;
  }

  // Pose fija mientras no camina: idle, howl, tremble, eat, happy.
  play(mood) {
    this.mood = mood;
    if (mood === 'howl') this.stage.sfx('howl');
    this.anim.play(mood, true);
  }

  feed() {
    this.fed = true;
    this.play('eat');
  }

  update(dt) {
    this.t += dt;
    // En brazos de alguien (Doña Billetes se la lleva).
    if (this.carrier) {
      const c = this.carrier;
      this.facing = c.facing;
      this.x = c.x + c.facing * 26;
      this.y = c.y + 2;
      this.z = 84;
      if (this.anim.done && this.mood === 'howl') this.play('tremble');
      this.anim.update(dt);
      return;
    }
    this.z = 0;
    const dx = this.targetX - this.x;
    const moving = Math.abs(dx) > 2;
    if (moving) {
      this.x += Math.sign(dx) * Math.min(Math.abs(dx), this.speed * dt);
      this.facing = Math.sign(dx);
      this.anim.play(this.fed ? 'run' : 'walk');
    } else if (this.anim.name === 'walk' || this.anim.name === 'run') {
      this.anim.play(this.fed && this.mood === 'idle' ? 'happy' : this.mood);
    }
    if (this.anim.done && this.mood === 'howl') this.play('idle');
    this.anim.update(dt);
  }

  drawShadow(ctx, camX) {
    if (this.carrier) return;
    ctx.fillStyle = COLORS.shadow;
    ctx.beginPath();
    ctx.ellipse(Math.round(this.x - camX), Math.round(this.y), this.fed ? 18 : 15, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  draw(ctx, camX) {
    // Corriendo feliz va dando saltitos (la animación casi no mueve las patas).
    const hop = this.anim.name === 'run' ? Math.abs(Math.sin(this.t * 14)) * 6 : 0;
    drawSprite(ctx, this.anim, this.x - camX, this.y - this.z - hop, this.facing);
  }
}
