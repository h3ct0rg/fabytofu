import { Fighter } from './fighter.js';
import { Animator, drawSprite } from '../engine/sprite.js';
import { worldBox, boxesHit } from '../engine/collision.js';

// Enemigos humanos del parque. Comparten la IA de grupo (solo 2 atacan a la vez),
// el aviso "!" antes de golpear y el agarre/lanzamiento de Faby. Cada tipo cambia
// sus números, su ataque y, en el caso del skater, su embestida en patineta.

const TYPES = {
  jogger: {
    name: 'CORREDOR',
    hp: 40,
    speedX: 125,
    speedY: 80,
    windup: 0.4,
    range: 64,
    attack: { anim: 'jab', damage: 8, push: 110, hitstop: 0.08, box: { x: 14, w: 50, z: 82, h: 34 } },
    targetsTofu: false,
  },
  skater: {
    name: 'SKATER',
    hp: 46,
    speedX: 135,
    speedY: 85,
    windup: 0.45,
    range: 60,
    attack: { anim: 'kick', damage: 9, push: 130, hitstop: 0.08, box: { x: 12, w: 56, z: 30, h: 50 } },
    // La patada es baja: también alcanza a Tofu.
    targetsTofu: true,
    charge: { speed: 560, damage: 10, knockdown: true, hitstop: 0.08 },
  },
};

const TOFU_CHANCE = 0.3;
const CHARGE_CHANCE = 0.45;

export class Enemy extends Fighter {
  constructor(stage, sheet, type, x, y) {
    super(stage, x, y);
    this.type = type;
    this.cfg = TYPES[type];
    this.anim = new Animator(sheet, 'idle');
    this.getupTime = sheet.anims.getup ? sheet.anims.getup.ms.reduce((a, b) => a + b, 0) / 1000 : 0.35;
    this.maxHp = this.hp = this.cfg.hp;
    this.name = this.cfg.name;
    this.hurtbox = { x: -22, w: 44, z: 0, h: 140 };
    this.cooldown = 0.6 + Math.random() * 0.8;
    this.side = Math.random() < 0.5 ? -1 : 1;
    this.waitOffset = (Math.random() * 2 - 1) * 50;
    this.hasHit = false;
    this.target = stage.player;
  }

  update(dt) {
    this.tick(dt);
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      return;
    }
    if (this.updateDamageStates(dt)) {
      this.stage.releaseToken(this);
    } else {
      this.think(dt);
    }
    this.physics(dt);
    this.checkThrownCollisions();
    this.keepOnScreen();
    this.updateAnim(dt);
  }

  pickTarget() {
    const t = this.stage.tofu;
    const tofuOk = this.cfg.targetsTofu && t && t.targetable && Math.abs(t.x - this.x) < 300;
    this.target = tofuOk && Math.random() < TOFU_CHANCE ? t : this.stage.player;
  }

  think(dt) {
    if (!this.target || (this.target !== this.stage.player && !this.target.targetable)) this.target = this.stage.player;
    const p = this.target;
    const cfg = this.cfg;
    if (this.cooldown > 0) this.cooldown -= dt;

    switch (this.state) {
      case 'idle':
      case 'walk': {
        if (!p.alive) { this.vx = 0; this.setStateIfChanged('idle'); return; }
        // Skater: si está lejos y en la misma línea, embiste en patineta.
        if (cfg.charge && this.cooldown <= 0 && Math.abs(p.x - this.x) > 260 && Math.abs(p.y - this.y) < 40 && Math.random() < CHARGE_CHANCE * dt * 3) {
          this.facing = p.x < this.x ? -1 : 1;
          this.vx = 0;
          return this.setState('chargeWindup');
        }
        // Se ubica al lado del objetivo donde ya está, para no cruzarlo.
        this.side = this.x < p.x ? -1 : 1;
        const token = this.cooldown <= 0 && this.stage.requestToken(this);
        const dist = token ? (p === this.stage.player ? cfg.range : 48) : 190 + Math.abs(this.waitOffset);
        const gx = p.x + this.side * dist;
        const gy = p.y + (token ? 0 : this.waitOffset);
        const dx = gx - this.x;
        const dy = gy - this.y;
        this.facing = p.x < this.x ? -1 : 1;
        const moving = Math.abs(dx) > 6 || Math.abs(dy) > 4;
        this.vx = moving && Math.abs(dx) > 6 ? Math.sign(dx) * cfg.speedX : 0;
        if (Math.abs(dy) > 4) this.y += Math.sign(dy) * cfg.speedY * dt;
        this.setStateIfChanged(moving ? 'walk' : 'idle');
        if (token && Math.abs(dx) < 14 && Math.abs(p.y - this.y) < 8 && p.grounded) {
          this.vx = 0;
          this.stage.sfx('alert');
          this.setState('windup');
        }
        break;
      }

      case 'windup':
        this.vx = 0;
        if (this.stateTime > cfg.windup) {
          this.setState('strike');
          this.anim.play(cfg.attack.anim, true);
          this.stage.sfx('swing');
          this.hasHit = false;
        }
        break;

      case 'strike': {
        this.vx = this.facing * 40;
        if (!this.hasHit && this.anim.anim.active?.includes(this.anim.index)) {
          const hb = worldBox(this, cfg.attack.box);
          for (const t of [this.stage.player, this.stage.tofu]) {
            if (!t || this.hasHit || (t === this.stage.tofu && !cfg.targetsTofu)) continue;
            if (boxesHit(hb, t.hurtWorld()) && t.takeHit(cfg.attack, this)) {
              this.hasHit = true;
              this.hitstop = cfg.attack.hitstop;
              this.stage.fx.spark((hb.x0 + hb.x1) / 2, t.y - cfg.attack.box.z - cfg.attack.box.h / 2, false);
            }
          }
        }
        if (this.anim.done) this.setState('recover');
        break;
      }

      case 'recover':
        this.vx = 0;
        if (this.stateTime > 0.45) this.finishAttack();
        break;

      case 'chargeWindup':
        this.vx = 0;
        if (this.stateTime > 0.6) {
          this.setState('charge');
          this.chargeHits = new Set();
          this.stage.fx.text(this.x, this.y - 170, '¡ZOOM!', '#7df9ff', 14);
          this.stage.sfx('zoom');
        }
        break;

      case 'charge': {
        // Cruza la pantalla en su carril y atropella a lo que encuentre.
        this.vx = this.facing * cfg.charge.speed;
        for (const t of [this.stage.player, this.stage.tofu]) {
          if (!t || this.chargeHits.has(t) || !t.hurtWorld) continue;
          if (Math.abs(t.x - this.x) < 40 && Math.abs(t.y - this.y) < 16 && t.takeHit(cfg.charge, this)) {
            this.chargeHits.add(t);
            this.stage.fx.spark(t.x, t.y - 60, true);
          }
        }
        const cam = this.stage.camera;
        const out = this.facing > 0 ? this.x >= cam.right - 40 : this.x <= cam.left + 40;
        if (out || this.stateTime > 2.5) {
          this.facing = -this.facing;
          this.vx = 0;
          this.finishAttack(1.5);
        }
        break;
      }
    }
  }

  // Entran caminando desde fuera; desde que pisan la pantalla, quedan dentro de ella.
  keepOnScreen() {
    const cam = this.stage.camera;
    const left = cam.left + 30;
    const right = cam.right - 30;
    if (!this.inArena) {
      if (this.x > left && this.x < right) this.inArena = true;
      return;
    }
    if (this.x < left || this.x > right) {
      this.x = Math.max(left, Math.min(right, this.x));
      if (this.state === 'knockdown') this.vx *= -0.3;
    }
  }

  finishAttack(extra = 0) {
    this.stage.releaseToken(this);
    this.cooldown = 1 + Math.random() * 1.2 + extra;
    this.waitOffset = (Math.random() * 2 - 1) * 50;
    this.pickTarget();
    this.setState('idle');
  }

  setStateIfChanged(s) {
    if (this.state !== s) this.setState(s);
  }

  setState(s) {
    super.setState(s);
    const once = { hurt: 'hurt', knockdown: 'knockdown', getup: 'getup' };
    if (once[s] && this.anim.sheet.anims[once[s]]) this.anim.play(once[s], true);
  }

  updateAnim(dt) {
    const map = {
      idle: 'idle', walk: 'walk', windup: 'idle', recover: 'idle', grabbed: 'grabbed',
      down: 'down', dead: 'down', chargeWindup: 'rideStart', charge: 'ride',
    };
    const a = map[this.state];
    if (a && this.anim.sheet.anims[a]) this.anim.play(a);
    this.anim.update(dt);
  }

  // ---- Agarre y lanzamiento (los controla Faby) ----
  canBeGrabbed() {
    return this.grounded && ['idle', 'walk', 'hurt', 'recover'].includes(this.state);
  }

  setGrabbed() {
    this.stage.releaseToken(this);
    this.vx = 0;
    this.setState('grabbed');
  }

  grabHit(hit, from) {
    this.hp = Math.max(0, this.hp - hit.damage);
    this.flash = 0.1;
    this.hitstop = hit.hitstop;
    this.stage.lastEnemyHit = this;
    if (this.hp <= 0) {
      this.thrown = false;
      this.setState('knockdown');
      this.vz = 380;
      this.vx = from.facing * 200;
      this.z = 1;
    }
  }

  breakFree(from) {
    if (this.state !== 'grabbed') return;
    this.setState('hurt');
    this.vx = from.facing * 160;
  }

  thrownBy(from, dir, damage) {
    this.hp = Math.max(0, this.hp - damage);
    this.thrown = true;
    this.thrownHits = new Set([this]);
    this.setState('knockdown');
    this.facing = -dir;
    this.x = from.x + dir * 30;
    this.z = 60;
    this.vz = 520;
    this.vx = dir * 340;
    this.stage.lastEnemyHit = this;
  }

  onLand() {
    if (this.thrown) {
      this.thrown = false;
      this.stage.camera.shake(7, 0.2);
      this.stage.fx.text(this.x, this.y - 60, '¡CRASH!', '#ffd23f', 18);
      this.stage.sfx('hitStrong');
    }
    this.landFromKnockdown();
  }

  // Un enemigo lanzado derriba a los que encuentra en su camino.
  checkThrownCollisions() {
    if (!this.thrown) return;
    const cam = this.stage.camera;
    if (this.x < cam.left + 30 || this.x > cam.right - 30) {
      this.x = Math.max(cam.left + 30, Math.min(cam.right - 30, this.x));
      this.vx = -this.vx * 0.4;
    }
    for (const e of this.stage.enemies) {
      if (this.thrownHits.has(e) || e.isDog) continue;
      if (Math.abs(e.x - this.x) < 50 && Math.abs(e.y - this.y) < 20 && e.takeHit({ damage: 10, knockdown: true, hitstop: 0.06 }, this)) {
        this.thrownHits.add(e);
        this.stage.fx.spark(e.x, e.y - 80, true);
      }
    }
  }

  draw(ctx, camX) {
    if (this.blinkHidden) return;
    const x = this.x - camX;
    const y = this.y - this.z;
    drawSprite(ctx, this.anim, x, y, this.facing, { flash: this.flash > 0 });
    if (this.state === 'windup' || this.state === 'chargeWindup') {
      // Aviso claro del ataque: "!" sobre la cabeza.
      ctx.fillStyle = this.state === 'chargeWindup' ? '#7df9ff' : '#ffd23f';
      ctx.fillRect(Math.round(x) - 3, Math.round(y) - 182, 6, 18);
      ctx.fillRect(Math.round(x) - 3, Math.round(y) - 160, 6, 6);
    }
  }
}
