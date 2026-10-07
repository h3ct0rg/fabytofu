import { Fighter } from './fighter.js';
import { Animator, drawSprite } from '../engine/sprite.js';
import { worldBox, boxesHit } from '../engine/collision.js';
import { drawDizzy } from './pugBoss.js';

const SPEED_X = 230;
const SPEED_Y = 140;
const RUN_X = 420;
const JUMP_V = 640;
const COMBO_WINDOW = 0.45;   // segundos para encadenar el siguiente golpe
const DOUBLE_TAP = 0.25;     // ventana del doble toque para correr
const SPECIAL_COST = 6;      // vida que gasta el especial si conecta (mínimo queda 1)
const GRAB_TIME = 1.6;       // segundos antes de que el enemigo se suelte

// Golpes del combo de tierra: jab, jab, cruzado (derriba).
const COMBO = [
  { damage: 6, push: 70, hitstop: 0.06, box: { x: 18, w: 46, z: 78, h: 40 } },
  { damage: 7, push: 80, hitstop: 0.07, box: { x: 18, w: 46, z: 78, h: 40 } },
  { damage: 12, push: 0, hitstop: 0.11, knockdown: true, strong: true, box: { x: 18, w: 54, z: 72, h: 48 } },
];
const AIR_ATTACK = { damage: 10, hitstop: 0.09, knockdown: true, strong: true, box: { x: 10, w: 64, z: 45, h: 70 } };
const RUN_ATTACK = { damage: 11, hitstop: 0.1, knockdown: true, strong: true, box: { x: 14, w: 60, z: 70, h: 50 } };
const SPECIAL = { damage: 12, hitstop: 0.08, knockdown: true, strong: true, box: { x: -80, w: 160, z: 30, h: 90 } };
const KNEE = { damage: 6, hitstop: 0.08 };
const CARRY_KICK = { damage: 7, push: 110, hitstop: 0.07, box: { x: 12, w: 58, z: 30, h: 50 } };
const CARRY_SPEED = 170;

// Estamina (solo en la pelea del jefe): cada ataque gasta; se recarga casi al instante
// si Faby deja de atacar un momento. Si se vacía, queda agotada hasta recuperar la mitad.
const STAMINA_COST = { punch: 18, cross: 28, air: 24, run: 26, special: 40, kick: 20 };
const STAMINA_DELAY = 0.35;
const STAMINA_REGEN = 150;   // por segundo
const EXHAUST_UNTIL = 50;
const THROW_DAMAGE = 14;

// Animaciones por estado cuando el estado no elige la suya.
const ANIM_FOR = {
  idle: 'idle', walk: 'walk', run: 'run', jumpsquat: 'jumpsquat', land: 'land',
  hurt: 'hurt', knockdown: 'knockdown', down: 'down', getup: 'getup', dead: 'down',
  grab: 'grabHold', pickup: 'pickup', whistle: 'whistle', victory: 'victory', pet: 'pet',
  carry: 'carryIdle', carryWalk: 'carryWalk',
};

export class Faby extends Fighter {
  constructor(stage, sheet, x, y) {
    super(stage, x, y);
    this.anim = new Animator(sheet, 'idle');
    this.getupTime = sheet.anims.getup.ms.reduce((a, b) => a + b, 0) / 1000;
    this.hurtbox = { x: -20, w: 40, z: 0, h: 145 };
    this.shadowW = 64;
    this.combo = 0;          // índice del próximo golpe del combo
    this.comboTimer = 0;
    this.queued = false;     // golpe pedido durante el golpe anterior
    this.hitTargets = new Set();
    this.lastHitConnected = false;
    this.score = 0;
    this.comboCount = 0;     // golpes seguidos que conectaron (para el HUD)
    this.comboShow = 0;
    this.tap = { dir: 0, time: 0 }; // último toque horizontal (para el doble toque)
    this.held = null;        // objeto en la mano
    this.grabbed = null;     // enemigo agarrado
    this.knees = 0;
    this.stamina = 100;
    this.exhausted = false;
    this.sinceAttack = 9;
    this.tiredMsg = 0;
  }

  get staminaOn() {
    const b = this.stage.boss;
    return !!b && this.stage.enemies.includes(b);
  }

  // Gasta estamina; devuelve false si Faby está agotada y no puede atacar.
  spend(kind) {
    if (!this.staminaOn) return true;
    if (this.exhausted) {
      if (this.tiredMsg <= 0) {
        this.stage.fx.text(this.x, this.y - 175, '¡UF! SIN AIRE', '#ff3040', 10);
        this.tiredMsg = 0.8;
      }
      return false;
    }
    this.stamina = Math.max(0, this.stamina - STAMINA_COST[kind]);
    this.sinceAttack = 0;
    if (this.stamina <= 0) this.exhausted = true;
    return true;
  }

  updateStamina(dt) {
    this.sinceAttack += dt;
    if (this.tiredMsg > 0) this.tiredMsg -= dt;
    if (this.sinceAttack > STAMINA_DELAY) this.stamina = Math.min(100, this.stamina + STAMINA_REGEN * dt);
    if (this.exhausted && this.stamina >= EXHAUST_UNTIL) this.exhausted = false;
  }

  update(dt, input) {
    this.tick(dt);
    if (this.comboShow > 0) this.comboShow -= dt;
    if (this.tap.time > 0) this.tap.time -= dt;
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      return;
    }
    if (this.comboTimer > 0) this.comboTimer -= dt;
    else this.combo = 0;
    this.updateStamina(dt);

    if (!['grab', 'knee', 'throw'].includes(this.state)) this.releaseGrab();
    if (!this.updateDamageStates(dt)) this.updateControl(dt, input);
    this.physics(dt);
    this.clampToCamera();
    this.updateAnim(dt);
  }

  updateControl(dt, input) {
    const mv = input.moveVector();
    const special = input.chord('attack', 'jump');

    switch (this.state) {
      case 'idle':
      case 'walk':
      case 'run': {
        if (special && !this.held && this.spend('special')) return this.startSpecial();
        if (input.buffered('jump')) {
          // Agachada breve antes de despegar (se siente más físico).
          this.jumpVx = this.state === 'run' ? this.facing * RUN_X * 0.85 : mv.x * SPEED_X;
          if (mv.x) this.facing = Math.sign(mv.x);
          this.vx = 0;
          return this.setState('jumpsquat');
        }
        if (input.buffered('attack')) {
          if (this.held) return this.startToss();
          const prop = this.stage.props.find((p) => p.canPickUp(this));
          if (prop) return this.startPickup(prop);
          if (this.state === 'run') return this.spend('run') && this.startRunAttack();
          if (!this.spend(COMBO[this.combo].strong ? 'cross' : 'punch')) return;
          return this.startAttack();
        }
        if (input.buffered('call')) return this.startWhistle();
        if (input.buffered('grab')) {
          const tofu = this.stage.tofu;
          if (tofu && !this.held && tofu.canBeHandled(this)) {
            // Sin enemigos cerca lo acaricia; en plena pelea lo toma en brazos.
            if (this.stage.enemies.some((e) => e.alive)) return this.startCarry(tofu);
            this.facing = tofu.x < this.x ? -1 : 1;
            tofu.facing = -this.facing;
            tofu.startPetting();
            return this.setState('pet');
          }
        }

        // Doble toque hacia un lado = correr.
        if (input.pressed.left || input.pressed.right) {
          const dir = input.pressed.right ? 1 : -1;
          if (this.tap.dir === dir && this.tap.time > 0 && !this.held) this.setState('run');
          this.tap = { dir, time: DOUBLE_TAP };
        }
        if (this.state === 'run') {
          if (mv.x !== this.facing) {
            this.setState(mv.x ? 'walk' : 'idle');
          } else {
            this.vx = this.facing * RUN_X;
            this.y += mv.y * SPEED_Y * 0.7 * dt;
            if (Math.floor(this.stateTime * 8) !== Math.floor((this.stateTime - dt) * 8)) this.stage.fx.dust(this.x - this.facing * 20, this.y, 1);
            return;
          }
        }
        this.vx = mv.x * SPEED_X;
        this.y += mv.y * SPEED_Y * dt;
        if (mv.x) this.facing = Math.sign(mv.x);
        this.setStateIfChanged(mv.x || mv.y ? 'walk' : 'idle');
        if (mv.x) this.tryGrab();
        break;
      }

      case 'attack': {
        this.vx *= 0.7;
        // J+K durante el inicio del golpe cancela en el especial.
        if (special && this.stateTime < 0.1 && this.spend('special')) return this.startSpecial();
        if (input.buffered('attack')) this.queued = true;
        this.checkHits(this.currentHit);
        if (this.anim.done) {
          if (!this.lastHitConnected) this.combo = 0; // golpe al aire: el combo vuelve a empezar
          if (this.queued && this.lastHitConnected && this.combo > 0 && this.spend(COMBO[this.combo].strong ? 'cross' : 'punch')) this.startAttack();
          else this.setState('idle');
        }
        break;
      }

      case 'runattack':
        this.vx *= 0.9;
        this.checkHits(RUN_ATTACK);
        if (this.anim.done) this.setState('idle');
        break;

      case 'special':
        this.vx = 0;
        this.checkHits(SPECIAL);
        if (this.anim.done) this.setState('idle');
        break;

      case 'jumpsquat':
        if (special && !this.held && this.spend('special')) return this.startSpecial();
        if (input.buffered('attack')) this.queuedAir = true;
        if (this.stateTime >= 0.06) {
          this.setState('jump');
          this.stage.sfx('jump');
          this.vz = JUMP_V;
          this.vx = this.jumpVx;
          this.stage.fx.dust(this.x, this.y, 3);
        }
        break;

      case 'jump':
        if ((input.buffered('attack') || (this.queuedAir && this.vz < JUMP_V * 0.6)) && this.spend('air')) {
          this.queuedAir = false;
          this.setState('air');
          this.anim.play('air', true);
          this.currentHit = AIR_ATTACK;
          this.hitTargets.clear();
        }
        break;

      case 'air':
        this.checkHits(AIR_ATTACK);
        break;

      case 'land':
        this.vx = 0;
        if (this.stateTime >= 0.09) this.setState('idle');
        break;

      case 'grab':
        this.updateGrab(dt, input, mv);
        break;

      case 'knee':
        this.vx = 0;
        this.holdGrabbed();
        if (this.anim.index >= 1 && !this.kneeDone) {
          this.kneeDone = true;
          this.grabbed.grabHit(KNEE, this);
          this.stage.sfx('hit');
          this.stage.fx.spark(this.x + this.facing * 40, this.y - 70, false);
          this.score += 150;
        }
        if (this.anim.done) this.setState('grab');
        break;

      case 'throw':
        this.vx = 0;
        if (this.grabbed && this.anim.index >= 3) {
          // El enemigo sale volando por encima del hombro, hacia atrás.
          this.stage.sfx('throw');
          this.grabbed.thrownBy(this, -this.facing, THROW_DAMAGE);
          this.score += 500;
          this.grabbed = null;
        } else if (this.grabbed) {
          this.holdGrabbed();
        }
        if (this.anim.done) {
          this.facing = -this.facing;
          this.setState('idle');
        }
        break;

      case 'pickup':
        this.vx = 0;
        if (this.anim.done) {
          this.stage.sfx('pickup');
          this.held = this.pickTarget;
          this.held.state = 'held';
          this.held.owner = this;
          this.setState('idle');
        }
        break;

      case 'toss':
        this.vx = 0;
        if (this.held && this.anim.index >= 2) {
          this.stage.sfx('throw');
          this.held.throwFrom(this);
          this.held = null;
        }
        if (this.anim.done) this.setState('idle');
        break;

      case 'whistle':
        this.vx = 0;
        if (this.anim.done) this.setState('idle');
        break;

      case 'carry':
      case 'carryWalk': {
        if (input.buffered('grab')) return this.stopCarry();
        if (input.buffered('attack') && this.spend('kick')) {
          this.hitTargets.clear();
          this.currentHit = CARRY_KICK;
          this.stage.sfx('swing');
          return this.setState('carryKick');
        }
        this.vx = mv.x * CARRY_SPEED;
        this.y += mv.y * SPEED_Y * 0.8 * dt;
        if (mv.x) this.facing = Math.sign(mv.x);
        this.setStateIfChanged(mv.x || mv.y ? 'carryWalk' : 'carry');
        break;
      }

      case 'carryKick':
        this.vx = 0;
        this.checkHits(CARRY_KICK);
        if (this.anim.done) this.setState('carry');
        break;

      case 'pet':
        this.vx = 0;
        if (this.anim.done || mv.x || mv.y) this.setState('idle');
        break;

      case 'victory':
        this.vx = 0;
        if (this.stateTime > 1.2 && (mv.x || mv.y || input.pressed.attack)) this.setState('idle');
        break;
    }
  }

  setStateIfChanged(s) {
    if (this.state !== s) this.setState(s);
  }

  setState(s) {
    super.setState(s);
    // Las animaciones de una sola vez arrancan desde el primer cuadro.
    const once = { carryKick: 'carryKick', special: 'special', runattack: 'cross', pickup: 'pickup', toss: 'toss', whistle: 'whistle', knee: 'knee', throw: 'throw', victory: 'victory', pet: 'pet', hurt: 'hurt', knockdown: 'knockdown', getup: 'getup' };
    if (once[s] && this.anim.sheet.anims[once[s]]) this.anim.play(once[s], true);
  }

  startAttack() {
    const step = COMBO[this.combo];
    this.currentHit = step;
    this.hitTargets.clear();
    this.lastHitConnected = false;
    this.queued = false;
    this.setState('attack');
    this.stage.sfx('swing');
    this.anim.play(step.strong ? 'cross' : 'punch', true);
    // El cruzado final avanza un poco hacia el enemigo.
    this.vx = step.strong ? this.facing * 160 : this.facing * 40;
    this.combo = (this.combo + 1) % COMBO.length;
    this.comboTimer = COMBO_WINDOW + 0.3;
  }

  startRunAttack() {
    this.hitTargets.clear();
    this.currentHit = RUN_ATTACK;
    this.setState('runattack');
    this.vx = this.facing * RUN_X * 0.8;
  }

  startSpecial() {
    this.hitTargets.clear();
    this.currentHit = SPECIAL;
    this.specialPaid = false;
    this.setState('special');
    this.stage.sfx('special');
    this.invuln = 0.45;
    this.stage.fx.text(this.x, this.y - 175, '¡TORNADO!', '#ff2fa8', 14);
  }

  startPickup(prop) {
    this.pickTarget = prop;
    prop.state = 'reserved';
    this.setState('pickup');
  }

  startToss() {
    this.setState('toss');
  }

  startCarry(tofu) {
    tofu.pickUp();
    this.carrying = tofu;
    this.vx = 0;
    this.setState('carry');
  }

  stopCarry() {
    const tofu = this.carrying;
    this.carrying = null;
    if (tofu) tofu.putDown(this);
    this.setState('idle');
  }

  startWhistle() {
    this.setState('whistle');
    this.stage.sfx('whistle');
    this.stage.fx.text(this.x, this.y - 175, '¡TOFU, VEN!', '#7df9ff', 12);
    this.stage.tofu?.whistle();
  }

  // Agarre automático al caminar contra un enemigo que no está atacando.
  tryGrab() {
    if (this.held) return;
    for (const e of this.stage.enemies) {
      const dx = (e.x - this.x) * this.facing;
      if (dx > 20 && dx < 52 && Math.abs(e.y - this.y) < 10 && e.canBeGrabbed()) {
        this.grabbed = e;
        this.knees = 0;
        e.setGrabbed(this);
        this.setState('grab');
        return;
      }
    }
  }

  holdGrabbed() {
    const e = this.grabbed;
    if (!e) return;
    e.x = this.x + this.facing * 44;
    e.y = this.y;
    e.facing = -this.facing;
  }

  updateGrab(dt, input, mv) {
    this.vx = 0;
    const e = this.grabbed;
    if (!e || e.state !== 'grabbed') {
      this.grabbed = null;
      return this.setState('idle');
    }
    this.holdGrabbed();
    // Atrás + golpe, salto, o el tercer golpe = lanzamiento.
    if (input.buffered('jump') || (input.pressed.attack && (mv.x === -this.facing || this.knees >= 2))) {
      input.buffered('attack');
      return this.setState('throw');
    }
    if (input.buffered('attack')) {
      this.knees++;
      this.kneeDone = false;
      return this.setState('knee');
    }
    if (this.stateTime > GRAB_TIME) {
      e.breakFree(this);
      this.grabbed = null;
      this.setState('idle');
    }
  }

  releaseGrab() {
    if (this.grabbed) {
      this.grabbed.breakFree(this);
      this.grabbed = null;
    }
  }

  // El golpe solo está activo en los cuadros marcados como "active" de cada animación.
  checkHits(hit) {
    const active = this.anim.anim.active?.includes(this.anim.index);
    if (!active || !hit) return;
    const hb = worldBox(this, hit.box);
    for (const b of this.stage.breakables ?? []) {
      if (!this.hitTargets.has(b) && boxesHit(hb, b.hurtWorld()) && b.takeHit(hit, this)) {
        this.hitTargets.add(b);
        this.stage.sfx(b.broken ? 'break' : 'hit');
        this.stage.fx.spark(b.x, b.y - 40, false);
      }
    }
    for (const e of this.stage.enemies) {
      if (this.hitTargets.has(e)) continue;
      if (!boxesHit(hb, e.hurtWorld())) continue;
      if (e.takeHit(hit, this)) {
        this.hitTargets.add(e);
        this.lastHitConnected = true;
        this.hitstop = hit.hitstop;
        this.comboCount++;
        this.comboShow = 1.2;
        this.score += hit.strong ? 300 : 100;
        this.stage.sfx(hit.strong ? 'hitStrong' : 'hit');
        if (hit === SPECIAL && !this.specialPaid) {
          this.specialPaid = true;
          this.hp = Math.max(1, this.hp - SPECIAL_COST);
        }
        const ew = e.hurtWorld();
        const fxX = (Math.max(hb.x0, ew.x0) + Math.min(hb.x1, ew.x1)) / 2;
        this.stage.fx.spark(fxX, e.y - (hit.box.z + hit.box.h / 2) - e.z, hit.strong);
        if (hit.strong) {
          this.stage.camera.shake(5, 0.15);
          this.stage.fx.text(fxX, e.y - 160, '¡POW!', '#ffd23f', 20);
        }
        this.stage.lastEnemyHit = e;
      }
    }
  }

  onLand() {
    if (this.state === 'jump' || this.state === 'air') {
      this.setState('land');
      this.stage.sfx('land');
      this.vx = 0;
      this.queuedAir = false;
      this.stage.fx.dust(this.x, this.y, 4);
    } else {
      this.landFromKnockdown();
    }
  }

  takeHit(hit, from) {
    const mult = [0.6, 1, 1.4][this.stage.game.settings?.difficulty ?? 1];
    if (mult !== 1) hit = { ...hit, damage: Math.round(hit.damage * mult) };
    const ok = super.takeHit(hit, from);
    if (ok) {
      this.comboCount = 0;
      this.stage.sfx('hurt');
      this.stage.camera.shake(hit.knockdown ? 6 : 3, 0.15);
      // Si la golpean cargando a Tofu, él cae asustado.
      if (this.carrying) {
        const tofu = this.carrying;
        this.carrying = null;
        tofu.putDown(this);
        tofu.setState('scared');
      }
      // Si la golpean con algo en la mano, lo suelta.
      if (this.held) {
        this.held.state = 'ground';
        this.held.owner = null;
        this.held.z = 0;
        this.held = null;
      }
    }
    return ok;
  }

  clampToCamera() {
    const cam = this.stage.camera;
    this.x = Math.max(cam.left + 30, Math.min(cam.right - 30, this.x));
  }

  updateAnim(dt) {
    if (this.state === 'jump') {
      // La pose del salto depende de si sube, está en lo alto o cae.
      this.anim.play(this.vz > 220 ? 'jumpUp' : this.vz < -220 ? 'jumpFall' : 'jumpTop');
    } else if (ANIM_FOR[this.state] && this.anim.sheet.anims[ANIM_FOR[this.state]]) {
      this.anim.play(ANIM_FOR[this.state]);
    }
    this.anim.update(dt);
  }

  draw(ctx, camX) {
    if (this.blinkHidden) return;
    drawSprite(ctx, this.anim, this.x - camX, this.y - this.z, this.facing, { flash: this.flash > 0 });
    if (this.state === 'hurt' && (this.hurtTime ?? 0) > 0.5) drawDizzy(ctx, this.x - camX, this.y - this.z - 160, this.stateTime);
  }
}
