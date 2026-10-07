import { Fighter } from './fighter.js';
import { Animator, drawSprite } from '../engine/sprite.js';
import { worldBox, boxesHit } from '../engine/collision.js';

// Tofu: compañero controlado por IA. Juguetón, territorial y temperamental.
//  - Ánimo (corazones): baja cuando le pegan. Si llega a 0, Faby pierde una vida.
//  - Temperamento: sube con enemigos cerca o al recibir golpes. Lleno = furia: muerde
//    a todo lo que tenga cerca, pero no obedece y queda expuesto.

const WALK = 150;
const RUN = 330;
const CALL_RUN = 520;
const MAX_MOOD = 5;
const ALERT_RANGE = 170;     // distancia a la que un enemigo lo pone territorial
const FURY_TIME = 4.5;
const FURY_DEAF = 3;         // segundos de furia en que ignora el silbido
const CALL_COOLDOWN = 4;
const BITE = { damage: 4, push: 50, hitstop: 0.05, box: { x: 6, w: 34, z: 8, h: 40 } };
const CHARGE = { damage: 4, knockdown: true, hitstop: 0.06 };

export class Tofu extends Fighter {
  constructor(stage, sheet, x, y) {
    super(stage, x, y);
    this.anim = new Animator(sheet, 'idle');
    this.hurtbox = { x: -26, w: 52, z: 0, h: 55 };
    this.shadowW = 54;
    this.mood = MAX_MOOD;
    this.temper = 0;
    this.restTime = 0;
    this.callCooldown = 0;
    this.target = null;      // enemigo o mariposa
    this.alert = 0;          // muestra "!" sobre la cabeza
    this.petCooldown = 0;
    this.charged = new Set();
    this.setState('follow');
  }

  get carried() {
    return this.state === 'carried';
  }

  // Puede ser atacado por los enemigos (no mientras Faby lo carga).
  get targetable() {
    return !['carried', 'knockdown', 'down'].includes(this.state);
  }

  update(dt) {
    this.tick(dt);
    if (this.hitstop > 0) { this.hitstop -= dt; return; }
    if (this.callCooldown > 0) this.callCooldown -= dt;
    if (this.petCooldown > 0) this.petCooldown -= dt;
    if (this.alert > 0) this.alert -= dt;

    this.updateTemper(dt);
    this.think(dt);
    this.physics(dt);
    if (!this.carried) this.clampToCamera();
    this.updateAnim(dt);
  }

  nearestEnemy(range) {
    let best = null;
    let bd = range;
    for (const e of this.stage.enemies) {
      if (!e.alive || ['down', 'knockdown', 'dead'].includes(e.state)) continue;
      const d = Math.hypot(e.x - this.x, (e.y - this.y) * 2);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  updateTemper(dt) {
    if (this.state === 'furious') return;
    const near = this.stage.enemies.filter((e) => e.alive && Math.abs(e.x - this.x) < ALERT_RANGE && Math.abs(e.y - this.y) < 60).length;
    if (this.carried) this.temper -= 18 * dt;
    else if (near) this.temper += Math.min(near, 2) * 9 * dt;
    else this.temper -= 6 * dt;
    this.temper = Math.max(0, Math.min(100, this.temper));
    if (this.temper >= 100 && !['carried', 'called', 'hurt', 'scared'].includes(this.state)) {
      this.setState('furious');
      this.stage.sfx('growl');
      this.stage.fx.text(this.x, this.y - 90, '¡GRRR!', '#ff4040', 14);
    }
  }

  think(dt) {
    const p = this.stage.player;
    switch (this.state) {
      case 'follow': {
        // Camina detrás de Faby, un poco más cerca de la cámara.
        const gx = p.x - p.facing * 75;
        const gy = Math.min(p.y + 14, 525);
        this.moveTo(gx, gy, dt, 40);
        const enemy = this.nearestEnemy(ALERT_RANGE);
        if (enemy) {
          this.target = enemy;
          this.setState('territorial');
        } else if (this.stage.butterfly && !this.stage.butterfly.gone && this.stateTime > 1) {
          this.target = this.stage.butterfly;
          this.alert = 0.8;
          this.setState('notice');
        } else if (Math.abs(this.vx) < 1) {
          this.restTime += dt;
          if (this.restTime > 4) this.setState(Math.random() < 0.5 ? 'sniff' : 'sit');
        } else {
          this.restTime = 0;
        }
        break;
      }
      case 'sniff':
      case 'sit':
        this.vx = 0;
        if (this.stateTime > 2.5 || Math.abs(p.x - this.x) > 160 || this.nearestEnemy(ALERT_RANGE)) {
          this.restTime = 0;
          this.setState('follow');
        }
        break;

      case 'notice': // "!" antes de salir corriendo tras la mariposa
        this.vx = 0;
        if (this.stateTime > 0.8) this.setState('playful');
        break;

      case 'playful': {
        const b = this.target;
        if (!b || b.gone || this.stateTime > 7) { this.setState('follow'); break; }
        this.moveTo(b.x, b.groundY, dt, 20, RUN);
        this.hopping = Math.abs(b.x - this.x) < 50;
        break;
      }

      case 'territorial': {
        const e = this.target;
        if (!e || !e.alive || Math.abs(e.x - this.x) > ALERT_RANGE + 40 || ['down', 'dead'].includes(e.state)) {
          this.setState('follow');
          break;
        }
        // Juguetón ante todo: una mariposa le gana incluso a una pelea.
        const b = this.stage.butterfly;
        if (b && !b.gone && this.stateTime > 1) {
          this.target = b;
          this.alert = 0.8;
          this.setState('notice');
          break;
        }
        // Se queda junto a Faby, mirando y ladrando al enemigo.
        const gx = p.x - Math.sign(e.x - p.x || 1) * 50;
        this.moveTo(gx, p.y + 14, dt, 30);
        this.facing = e.x < this.x ? -1 : 1;
        if (Math.floor(this.stateTime / 0.8) !== Math.floor((this.stateTime - dt) / 0.8)) this.barkAt();
        break;
      }

      case 'furious': {
        const e = this.nearestEnemy(400);
        if (!e || this.stateTime > FURY_TIME) {
          this.temper = 30;
          this.setState('follow');
          break;
        }
        this.target = e;
        this.facing = e.x < this.x ? -1 : 1;
        const dx = e.x - this.x - this.facing * 34;
        if (Math.abs(dx) > 8 || Math.abs(e.y - this.y) > 6) {
          this.moveTo(e.x - this.facing * 34, e.y, dt, 6, RUN);
          this.biting = false;
        } else {
          this.vx = 0;
          if (!this.biting) { this.biting = true; this.anim.play('bite', true); this.bitHit = false; }
          if (this.anim.name === 'bite' && this.anim.index >= 2 && !this.bitHit) {
            this.bitHit = true;
            const hb = worldBox(this, BITE.box);
            if (boxesHit(hb, e.hurtWorld()) && e.takeHit(BITE, this)) {
              this.stage.sfx('hit');
              this.stage.fx.spark((hb.x0 + hb.x1) / 2, e.y - 40, false);
              this.stage.lastEnemyHit = e;
              p.score += 50;
            }
          }
          if (this.anim.done) this.biting = false;
        }
        break;
      }

      case 'called': {
        // Corre hacia Faby y derriba a quien se cruce.
        const dx = p.x - this.x;
        this.facing = Math.sign(dx) || this.facing;
        this.vx = this.facing * CALL_RUN;
        this.y += Math.sign(p.y + 14 - this.y) * Math.min(Math.abs(p.y + 14 - this.y), 200 * dt);
        for (const e of this.stage.enemies) {
          if (this.charged.has(e) || !e.alive) continue;
          if (Math.abs(e.x - this.x) < 34 && Math.abs(e.y - this.y) < 18 && e.takeHit(CHARGE, this)) {
            this.charged.add(e);
            this.stage.sfx('hitStrong');
            this.stage.fx.spark(e.x, e.y - 40, true);
            this.stage.fx.text(e.x, e.y - 150, '¡GUAU!', '#ffd23f', 14);
          }
        }
        if (Math.abs(dx) < 45 || this.stateTime > 2.5) {
          this.vx = 0;
          this.setState('follow');
        }
        break;
      }

      case 'hurt':
        this.vx *= 0.85;
        if (this.stateTime > 0.35) this.setState('scared');
        break;

      case 'scared': {
        // Se esconde detrás de las piernas de Faby y tiembla.
        const gx = p.x - p.facing * 26;
        this.moveTo(gx, p.y - 4, dt, 10, RUN);
        if (this.stateTime > 1.6) this.setState('follow');
        break;
      }

      case 'petted':
        this.vx = 0;
        if (p.state !== 'pet') this.setState('follow');
        break;

      case 'carried':
        this.x = p.x;
        this.y = p.y + 1;
        this.vx = 0;
        break;

      case 'knockdown':
      case 'down':
        this.vx *= 0.9;
        if (this.state === 'down' && this.stateTime > 0.6) this.setState('scared');
        break;
    }
  }

  moveTo(gx, gy, dt, tolerance, speed) {
    const dx = gx - this.x;
    const dy = gy - this.y;
    const dist = Math.abs(dx);
    const sp = speed ?? (dist > 220 ? RUN : WALK);
    if (dist > tolerance) {
      this.vx = Math.sign(dx) * sp;
      this.facing = Math.sign(dx);
    } else {
      this.vx = 0;
    }
    if (Math.abs(dy) > 3) this.y += Math.sign(dy) * Math.min(Math.abs(dy), sp * 0.6 * dt);
  }

  // Ladrido territorial: los enemigos cercanos dudan antes de atacar.
  barkAt() {
    this.anim.play('bark', true);
    this.stage.sfx('bark');
    this.barkTime = 0.4;
    for (const e of this.stage.enemies) {
      if (Math.abs(e.x - this.x) < 140 && Math.abs(e.y - this.y) < 40 && e.cooldown !== undefined) e.cooldown += 0.35;
    }
    this.stage.fx.text(this.x + this.facing * 30, this.y - 75, '¡GUAU!', '#ffffff', 10);
  }

  // ---- Órdenes de Faby ----
  whistle() {
    if (this.state === 'furious' && this.stateTime < FURY_DEAF) {
      this.stage.fx.text(this.x, this.y - 90, '¡GRR!', '#ff4040', 12);
      return;
    }
    if (this.carried || this.callCooldown > 0) return;
    this.callCooldown = CALL_COOLDOWN;
    this.temper = Math.max(0, this.temper - 25);
    this.charged.clear();
    this.stage.sfx('bark');
    this.setState('called');
  }

  canBeHandled(p) {
    return !['furious', 'called', 'knockdown', 'down', 'carried'].includes(this.state) &&
      Math.abs(this.x - p.x) < 80 && Math.abs(this.y - p.y) < 28;
  }

  startPetting() {
    this.setState('petted');
    this.temper = Math.max(0, this.temper - 50);
    if (this.petCooldown <= 0 && this.mood < MAX_MOOD) {
      this.mood++;
      this.petCooldown = 6;
      this.stage.fx.text(this.x, this.y - 85, '♥', '#ff2fa8', 16);
      this.stage.sfx('heart');
    }
  }

  pickUp() {
    this.setState('carried');
    this.z = 0;
  }

  putDown(p) {
    this.x = p.x + p.facing * 40;
    this.y = p.y + 6;
    this.setState('follow');
  }

  takeHit(hit, from) {
    if (!this.targetable || this.invuln > 0) return false;
    this.flash = 0.12;
    this.hitstop = 0.06;
    this.mood = Math.max(0, this.mood - 1);
    this.temper = Math.min(100, this.temper + 25);
    this.invuln = 1;
    this.vx = (from.x < this.x ? 1 : -1) * 160;
    this.stage.fx.text(this.x, this.y - 80, '¡CAÍN!', '#7df9ff', 10);
    this.stage.sfx('hurt');
    this.setState('hurt');
    if (this.mood <= 0) this.stage.onTofuFrightened?.();
    return true;
  }

  // Tofu reaparece con todo el ánimo cuando Faby pierde una vida.
  restore() {
    this.mood = MAX_MOOD;
    this.temper = 0;
    this.setState('follow');
  }

  clampToCamera() {
    const cam = this.stage.camera;
    this.x = Math.max(cam.left + 20, Math.min(cam.right - 20, this.x));
  }

  updateAnim(dt) {
    let a;
    const moving = Math.abs(this.vx) > 1;
    const fast = Math.abs(this.vx) > WALK + 10;
    switch (this.state) {
      case 'follow': a = moving ? (fast ? 'run' : 'walk') : 'idle'; break;
      case 'sniff': a = 'sniff'; break;
      case 'sit': a = 'sit'; break;
      case 'notice': a = 'idle'; break;
      case 'playful': a = this.hopping ? 'hop' : 'run'; break;
      case 'territorial':
        if (this.anim.name === 'bark' && !this.anim.done) a = 'bark';
        else a = moving ? 'walk' : 'growl';
        break;
      case 'furious': a = this.biting ? 'bite' : 'run'; break;
      case 'called': a = 'run'; break;
      case 'hurt': a = 'hurt'; break;
      case 'scared': a = moving ? 'run' : 'scared'; break;
      case 'petted': a = 'happy'; break;
      default: a = 'idle';
    }
    this.anim.play(a);
    this.anim.update(dt);
  }

  draw(ctx, camX) {
    if (this.carried || this.blinkHidden) return;
    const x = this.x - camX;
    const y = this.y - this.z;
    drawSprite(ctx, this.anim, x, y, this.facing, { flash: this.flash > 0 });
    if (this.alert > 0) {
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(Math.round(x) - 3, Math.round(y) - 92, 6, 14);
      ctx.fillRect(Math.round(x) - 3, Math.round(y) - 74, 6, 5);
    }
    if (this.state === 'furious' || this.temper > 75) {
      // Símbolo de enojo que palpita sobre la cabeza.
      const k = 1 + Math.sin(this.stateTime * 12) * 0.15;
      ctx.save();
      ctx.translate(Math.round(x + this.facing * 18), Math.round(y) - 78);
      ctx.scale(k, k);
      ctx.fillStyle = '#ff3040';
      for (const [dx, dy] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) ctx.fillRect(dx - 3 + (dx > 0 ? -2 : 2), dy - 3 + (dy > 0 ? -2 : 2), 4, 4);
      ctx.restore();
    }
  }
}
