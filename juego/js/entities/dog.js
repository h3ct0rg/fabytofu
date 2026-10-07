import { Fighter } from './fighter.js';
import { Animator, drawSprite } from '../engine/sprite.js';

// Perro ladrador: provoca a Tofu y salta sobre Faby. A los perros no se les pega:
// se los distrae lanzándoles la pelota (la persigue y se va) o un premio (se lo come,
// se calma y se va contento). Cuenta como "enemigo" para despejar la zona.

const RUN = 260;
const PROVOKE_DIST = 150;     // distancia a la que se planta a ladrarle a Tofu
const POUNCE = { damage: 5, push: 140, hitstop: 0.06 };

export class Dog extends Fighter {
  constructor(stage, sheet, x, y) {
    super(stage, x, y);
    this.isDog = true;
    this.anim = new Animator(sheet, 'idle');
    this.name = 'PERRO LADRADOR';
    this.maxHp = this.hp = 1;
    this.hurtbox = { x: -26, w: 52, z: 0, h: 55 };
    this.shadowW = 56;
    this.cooldown = 1.5;
    this.noTime = 0;
    this.lure = null;         // pelota o premio que lo distrae
    this.setState('approach');
  }

  get alive() {
    return this.state !== 'leaving' && !this.removed;
  }

  // Ningún golpe le hace daño: Faby no le pega a los perros.
  takeHit(hit, from) {
    if (from === this.stage.player && this.noTime <= 0) {
      this.noTime = 1;
      this.stage.fx.text(this.x, this.y - 90, '¡A LOS PERRITOS NO!', '#7df9ff', 10);
    }
    return false;
  }

  canBeGrabbed() {
    return false;
  }

  // Llamado por un objeto que cayó cerca: pelota o premio.
  distract(prop) {
    if (this.lure || this.state === 'leaving') return;
    this.lure = prop;
    prop.claimed = true;
    this.setState(prop.type === 'ball' ? 'chase' : 'goEat');
    this.stage.fx.text(this.x, this.y - 85, prop.type === 'ball' ? '¡!' : '¡ÑAM!', '#ffd23f', 12);
  }

  update(dt) {
    this.tick(dt);
    if (this.noTime > 0) this.noTime -= dt;
    if (this.hitstop > 0) { this.hitstop -= dt; return; }
    if (this.cooldown > 0) this.cooldown -= dt;
    this.think(dt);
    this.physics(dt);
    // Mientras pelea no sale de la pantalla (sí puede irse cuando ya lo distrajeron).
    const cam = this.stage.camera;
    if (this.state !== 'leaving') {
      if (!this.inArena && this.x > cam.left + 30 && this.x < cam.right - 30) this.inArena = true;
      if (this.inArena) this.x = Math.max(cam.left + 30, Math.min(cam.right - 30, this.x));
    }
    this.anim.update(dt);
  }

  think(dt) {
    const p = this.stage.player;
    const tofu = this.stage.tofu;
    switch (this.state) {
      case 'approach':
      case 'bark': {
        // Se planta frente a Tofu (o Faby si Tofu está en brazos) y ladra.
        const t = tofu && !tofu.carried ? tofu : p;
        const side = this.x < t.x ? -1 : 1;
        const gx = t.x + side * PROVOKE_DIST;
        const dx = gx - this.x;
        const dy = t.y - this.y;
        this.facing = t.x < this.x ? -1 : 1;
        if (Math.abs(dx) > 20 || Math.abs(dy) > 8) {
          this.vx = Math.abs(dx) > 20 ? Math.sign(dx) * RUN : 0;
          if (Math.abs(dy) > 8) this.y += Math.sign(dy) * RUN * 0.5 * dt;
          if (this.state !== 'approach') this.setState('approach');
          this.anim.play('run');
        } else {
          this.vx = 0;
          if (this.state !== 'bark') this.setState('bark');
          if (this.anim.name !== 'bark' || this.anim.done) this.anim.play('bark', true);
          if (tofu && !tofu.carried) tofu.temper = Math.min(100, tofu.temper + 10 * dt);
          if (Math.floor(this.stateTime / 0.7) !== Math.floor((this.stateTime - dt) / 0.7)) {
            this.stage.fx.text(this.x + this.facing * 30, this.y - 75, '¡GUAU!', '#ffffff', 10);
            this.stage.sfx('dogBark');
          }
          // De vez en cuando se lanza sobre Faby.
          if (this.cooldown <= 0 && Math.abs(p.y - this.y) < 30 && Math.abs(p.x - this.x) < 260) {
            this.facing = p.x < this.x ? -1 : 1;
            this.setState('pounceWindup');
          }
        }
        break;
      }

      case 'pounceWindup':
        this.vx = 0;
        this.anim.play('idle');
        if (this.stateTime > 0.45) {
          this.setState('pounce');
          this.stage.sfx('dogBark');
          this.anim.play('pounce', true);
          this.vx = this.facing * 420;
          this.vz = 380;
          this.z = 1;
          this.hit = false;
        }
        break;

      case 'pounce':
        if (!this.hit && Math.abs(p.x - this.x) < 46 && Math.abs(p.y - this.y) < 18 && p.takeHit(POUNCE, this)) {
          this.hit = true;
          this.vx *= -0.3;
        }
        break;

      case 'chase':
      case 'goEat': {
        const l = this.lure;
        if (!l || l.removed) { this.lure = null; this.setState('approach'); break; }
        if (l.state === 'flying') { this.vx = 0; this.anim.play('idle'); break; }
        const dx = l.x - this.x;
        const dy = l.y - this.y;
        this.facing = Math.sign(dx) || this.facing;
        if (Math.abs(dx) > 14 || Math.abs(dy) > 8) {
          this.vx = Math.abs(dx) > 14 ? Math.sign(dx) * RUN * 1.3 : 0;
          if (Math.abs(dy) > 8) this.y += Math.sign(dy) * RUN * 0.7 * dt;
          this.anim.play('run');
        } else if (this.state === 'chase') {
          // Atrapó la pelota: se la lleva corriendo, feliz.
          l.removed = true;
          this.stage.fx.text(this.x, this.y - 85, '♥', '#ff2fa8', 16);
          this.stage.sfx('heart');
          this.leave();
        } else {
          this.vx = 0;
          this.setState('eat');
        }
        break;
      }

      case 'eat':
        this.vx = 0;
        this.anim.play('eat');
        if (this.stateTime > 1.8) {
          if (this.lure) this.lure.removed = true;
          this.setState('calm');
          this.stage.fx.text(this.x, this.y - 85, '♥', '#ff2fa8', 16);
        }
        break;

      case 'calm':
        this.vx = 0;
        this.anim.play('happy');
        if (this.stateTime > 1.5) this.leave();
        break;

      case 'leaving': {
        this.anim.play('run');
        const cam = this.stage.camera;
        if (this.x < cam.left - 80 || this.x > cam.right + 80) this.removed = true;
        break;
      }
    }
    if (this.state === 'pounce' && this.grounded && this.stateTime > 0.15) {
      this.vx = 0;
      this.cooldown = 3 + Math.random() * 2;
      this.setState('bark');
    }
  }

  leave() {
    this.lure = null;
    const cam = this.stage.camera;
    this.facing = this.x - cam.left < cam.right - this.x ? -1 : 1;
    this.vx = this.facing * RUN * 1.4;
    this.setState('leaving');
    this.stage.player.score += 500;
  }

  onLand() {}

  draw(ctx, camX) {
    drawSprite(ctx, this.anim, this.x - camX, this.y - this.z, this.facing);
    if (this.state === 'pounceWindup') {
      const x = Math.round(this.x - camX);
      const y = Math.round(this.y - this.z);
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(x - 3, y - 92, 6, 14);
      ctx.fillRect(x - 3, y - 74, 6, 5);
    }
  }
}
