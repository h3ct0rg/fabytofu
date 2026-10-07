import { COLORS } from '../config.js';
import { boxesHit } from '../engine/collision.js';

// Objetos del parque que Faby puede recoger y lanzar (dibujados por código hasta la fase 5):
//  - bottle: botella de agua, derriba al enemigo que golpea.
//  - ball:   pelota, distrae a los perros (la persiguen y se van).
//  - treat:  premio, el perro se lo come, se calma y se va.
const THROW_SPEED = 620;
const THROW_RANGE = 650;
const LOB_RANGE = 300;      // pelota y premio se lanzan "por arriba" y caen al suelo
const HIT = { damage: 14, knockdown: true, strong: true, hitstop: 0.08 };

export class Prop {
  constructor(stage, x, y, type = 'bottle') {
    this.stage = stage;
    this.type = type;
    this.x = x;
    this.y = y;
    this.z = 0;
    this.vz = 0;
    this.state = 'ground';  // ground | reserved | held | flying
    this.vx = 0;
    this.traveled = 0;
    this.spin = 0;
    this.removed = false;
    this.owner = null;
    this.claimed = false;   // un perro ya va por él
  }

  get lob() {
    return this.type !== 'bottle';
  }

  canPickUp(f) {
    return this.state === 'ground' && !this.claimed && Math.abs(this.x - f.x) < 48 && Math.abs(this.y - f.y) < 18;
  }

  throwFrom(f) {
    this.state = 'flying';
    this.owner = f;
    this.x = f.x + f.facing * 30;
    this.y = f.y;
    this.z = 95;
    this.traveled = 0;
    if (this.lob) {
      this.vx = f.facing * 360;
      this.vz = 380;
    } else {
      this.vx = f.facing * THROW_SPEED;
    }
  }

  update(dt) {
    if (this.state === 'held') {
      const f = this.owner;
      this.x = f.x + f.facing * 14;
      this.y = f.y;
      this.z = f.z + 92;
      return;
    }
    if (this.state !== 'flying') return;
    this.x += this.vx * dt;
    this.traveled += Math.abs(this.vx * dt);
    this.spin += dt * 20;
    if (this.lob) return this.updateLob(dt);

    const box = { x0: this.x - 10, x1: this.x + 10, z0: this.z - 10, z1: this.z + 10, y: this.y };
    for (const e of this.stage.enemies) {
      if (boxesHit(box, e.hurtWorld()) && e.takeHit(HIT, this)) {
        this.stage.fx.spark(this.x, this.y - this.z, true);
        this.stage.fx.text(this.x, this.y - 170, '¡PLAF!', '#7df9ff', 18);
        this.stage.sfx('hitStrong');
        this.stage.camera.shake(4, 0.12);
        this.stage.lastEnemyHit = e;
        if (this.owner) this.owner.score += 400;
        this.removed = true;
        return;
      }
    }
    const cam = this.stage.camera;
    if (this.traveled > THROW_RANGE || this.x < cam.x - 60 || this.x > cam.x + 1020) this.removed = true;
  }

  // Pelota y premio: vuelan en arco, rebotan y quedan en el suelo. El perro más cercano va por ellos.
  updateLob(dt) {
    this.z += this.vz * dt;
    this.vz -= 1400 * dt;
    const cam = this.stage.camera;
    this.x = Math.max(cam.left + 20, Math.min(cam.right - 20, this.x));
    if (this.z <= 0) {
      this.z = 0;
      if (this.type === 'ball' && Math.abs(this.vz) > 200) {
        this.vz = -this.vz * 0.4;
        this.vx *= 0.6;
        return;
      }
      this.vx = 0;
      this.vz = 0;
      this.state = 'ground';
      const dog = this.stage.enemies
        .filter((e) => e.isDog && e.distract && e.alive && !e.lure)
        .sort((a, b) => Math.abs(a.x - this.x) - Math.abs(b.x - this.x))[0];
      if (dog && Math.abs(dog.x - this.x) < 500) dog.distract(this);
    }
  }

  drawShadow(ctx, camX) {
    if (this.state === 'held') return;
    ctx.fillStyle = COLORS.shadow;
    ctx.beginPath();
    ctx.ellipse(Math.round(this.x - camX), Math.round(this.y), 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  draw(ctx, camX) {
    const x = Math.round(this.x - camX);
    const y = Math.round(this.y - this.z);
    const img = this.stage.game.bgImages?.[this.type];
    if (img) {
      // Sprite de PixelLab: gira al volar; la botella en el suelo queda acostada.
      ctx.save();
      ctx.translate(x, y - img.height / 2);
      if (this.state === 'flying') ctx.rotate(this.spin);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.translate(x, y);
    if (this.type === 'ball') {
      // Pelota de tenis amarilla
      ctx.rotate(this.spin);
      ctx.fillStyle = '#140c1c';
      ctx.fillRect(-7, -9, 14, 16);
      ctx.fillRect(-9, -7, 18, 12);
      ctx.fillStyle = '#d8f03a';
      ctx.fillRect(-5, -7, 10, 12);
      ctx.fillRect(-7, -5, 14, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-5, -2, 10, 2);
    } else if (this.type === 'treat') {
      // Galleta con forma de hueso
      if (this.state === 'flying') ctx.rotate(this.spin);
      ctx.fillStyle = '#140c1c';
      ctx.fillRect(-12, -6, 24, 10);
      ctx.fillStyle = '#c98a4b';
      ctx.fillRect(-8, -3, 16, 4);
      ctx.fillRect(-11, -5, 6, 8);
      ctx.fillRect(5, -5, 6, 8);
    } else {
      if (this.state === 'ground' || this.state === 'reserved') ctx.rotate(Math.PI / 2);
      if (this.state === 'flying') ctx.rotate(this.spin);
      // Botella de agua: cuerpo celeste translúcido, etiqueta y tapa azul.
      ctx.fillStyle = '#140c1c';
      ctx.fillRect(-6, -14, 12, 26);
      ctx.fillStyle = '#bfe8ff';
      ctx.fillRect(-4, -12, 8, 22);
      ctx.fillStyle = '#3fa7d6';
      ctx.fillRect(-4, -2, 8, 6);
      ctx.fillRect(-3, -17, 6, 4);
    }
    ctx.restore();
  }
}
