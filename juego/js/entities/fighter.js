import { GRAVITY, FLOOR_TOP, FLOOR_BOTTOM, COLORS } from '../config.js';
import { worldBox } from '../engine/collision.js';

// Base común para Faby y los enemigos: física con salto (z), golpes recibidos, caídas y sombra.
export class Fighter {
  constructor(stage, x, y) {
    this.stage = stage;
    this.x = x;
    this.y = y;          // profundidad (posición de los pies en pantalla)
    this.z = 0;          // altura sobre el suelo
    this.vx = 0;
    this.vz = 0;
    this.facing = 1;
    this.maxHp = 100;
    this.hp = 100;
    this.state = 'idle';
    this.stateTime = 0;
    this.hitstop = 0;    // congelado breve al conectar o recibir un golpe
    this.flash = 0;      // destello blanco tras recibir daño
    this.invuln = 0;
    this.removed = false;
    this.hurtbox = { x: -22, w: 44, z: 0, h: 140 };
    this.shadowW = 60;
    this.getupTime = 0.35;  // duración de la animación de levantarse
  }

  setState(s) {
    this.state = s;
    this.stateTime = 0;
  }

  get grounded() {
    return this.z <= 0;
  }

  get alive() {
    return this.state !== 'dead';
  }

  // Devuelve true si el golpe conectó.
  takeHit(hit, from) {
    if (this.invuln > 0 || ['dead', 'down', 'knockdown', 'getup'].includes(this.state)) return false;
    this.hp = Math.max(0, this.hp - hit.damage);
    this.flash = 0.1;
    this.hitstop = hit.hitstop ?? 0.07;
    this.facing = from.x < this.x ? -1 : 1;
    const dir = -this.facing;
    if (hit.knockdown || this.hp <= 0 || !this.grounded) {
      this.setState('knockdown');
      this.vz = 420;
      this.vx = dir * 260;
      this.z = Math.max(this.z, 1);
    } else {
      this.setState('hurt');
      this.hurtTime = hit.stun ?? 0.32;   // un ladrido sónico aturde más tiempo
      this.vx = dir * (hit.push ?? 90);
    }
    return true;
  }

  // Física compartida: gravedad, rozamiento y límites de la franja del suelo.
  physics(dt) {
    this.x += this.vx * dt;
    if (!this.grounded || this.vz > 0) {
      this.z += this.vz * dt;
      this.vz -= GRAVITY * dt;
      if (this.z <= 0) {
        this.z = 0;
        this.vz = 0;
        this.onLand();
      }
    }
    this.y = Math.max(FLOOR_TOP, Math.min(FLOOR_BOTTOM, this.y));
  }

  onLand() {}

  // Estados de daño comunes. Devuelve true si el estado fue manejado aquí.
  updateDamageStates(dt) {
    switch (this.state) {
      case 'hurt':
        this.vx *= 0.85;
        if (this.stateTime > (this.hurtTime ?? 0.32)) this.setState('idle');
        return true;
      case 'knockdown':
        return true; // termina en onLand()
      case 'down':
        this.vx *= 0.8;
        if (this.stateTime > 0.7) {
          if (this.hp <= 0) this.setState('dead');
          else this.setState('getup');
        }
        return true;
      case 'grabbed':
        return true; // quien agarra controla la posición
      case 'getup':
        if (this.stateTime > this.getupTime) {
          this.setState('idle');
          this.invuln = 0.6;
        }
        return true;
      case 'dead':
        this.vx = 0;
        if (this.stateTime > 0.9) this.removed = true;
        return true;
    }
    return false;
  }

  landFromKnockdown() {
    if (this.state === 'knockdown') {
      this.stage.sfx?.('fall');
      this.setState('down');
      this.vx *= 0.4;
      this.stage.fx.dust(this.x, this.y, 6);
      this.stage.camera.shake(3, 0.12);
    }
  }

  tick(dt) {
    this.stateTime += dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.invuln > 0) this.invuln -= dt;
  }

  hurtWorld() {
    return worldBox(this, this.hurtbox);
  }

  drawShadow(ctx, camX) {
    const k = Math.max(0.4, 1 - this.z / 300);
    ctx.fillStyle = COLORS.shadow;
    ctx.beginPath();
    ctx.ellipse(Math.round(this.x - camX), Math.round(this.y), (this.shadowW / 2) * k, 8 * k, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Parpadeo durante la invulnerabilidad y al morir.
  get blinkHidden() {
    if (this.state === 'dead') return Math.floor(this.stateTime * 16) % 2 === 0;
    if (this.invuln > 0) return Math.floor(this.invuln * 20) % 2 === 0;
    return false;
  }
}
