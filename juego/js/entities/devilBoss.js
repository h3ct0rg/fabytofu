import { Fighter } from './fighter.js';
import { Food } from './breakable.js';
import { Animator, drawSprite } from '../engine/sprite.js';
import { worldBox, boxesHit } from '../engine/collision.js';
import { Fireball, FireRain } from './hazards.js';

// JEFE del nivel 5: el Diablo de la mina (el señor de la chistera transformado).
// Fase 1 (100-65 %): golpes y embestidas.
// Fase 2 (65-30 %): + bolas de fuego que cruzan el carril. Las velas se van encendiendo.
// Fase 3 (30-0 %): embestida más rápida y lluvia de fuego desde el techo.
// Tofu ayuda: cada tanto le ladra y lo deja aturdido un momento.

const MAX_HP = 600;
const PUNCH = { damage: 14, knockdown: true, hitstop: 0.1, box: { x: 20, w: 104, z: 60, h: 80 } };
const CHARGE = { damage: 15, knockdown: true, hitstop: 0.1 };

export class DevilBoss extends Fighter {
  constructor(stage, sheet, x, y) {
    super(stage, x, y);
    this.isBoss = true;
    this.name = 'EL DIABLO';
    this.anim = new Animator(sheet, 'idle');
    this.maxHp = this.hp = MAX_HP;
    this.hurtbox = { x: -40, w: 80, z: 0, h: 210 };
    this.shadowW = 96;
    this.cooldown = 1.2;
    this.recentHits = [];
    this.tofuBark = 9;
    this.setState('idle');
  }

  get phase() {
    const k = this.hp / this.maxHp;
    return k > 0.65 ? 1 : k > 0.3 ? 2 : 3;
  }

  get alive() {
    return this.state !== 'ko' && this.state !== 'dead';
  }

  canBeGrabbed() {
    return false;
  }

  takeHit(hit, from) {
    if (!this.alive || this.invuln > 0 || this.state === 'script') return false;
    let dmg = hit.damage;
    if (this.state === 'tired') dmg *= 1.5;
    this.hp = Math.max(0, this.hp - dmg);
    this.flash = 0.1;
    this.hitstop = hit.hitstop ?? 0.06;
    this.stage.lastEnemyHit = this;
    if (this.hp <= 0) {
      this.stage.sfx('fall');
      this.setState('ko');
      this.anim.play('ko', true);
      this.vx = 0;
      this.stage.onBossDefeated?.(this);
      return true;
    }
    const now = this.stage.time;
    this.recentHits = this.recentHits.filter((t) => now - t < 1.5);
    this.recentHits.push(now);
    if (hit.knockdown || hit.strong || this.state === 'tired') {
      if (this.state !== 'tired') {
        this.setState('hurt');
        this.anim.play('hurt', true);
      }
      this.vx = (from.x < this.x ? 1 : -1) * 130;
    }
    // Si lo acorralan, se aleja y embiste.
    if (this.recentHits.length >= 6 && this.state !== 'tired') {
      this.recentHits = [];
      this.setState('backoff');
    }
    return true;
  }

  update(dt) {
    this.tick(dt);
    this.dropFood(dt);
    this.updateTofuBark(dt);
    if (this.hitstop > 0) { this.hitstop -= dt; return; }
    if (this.cooldown > 0) this.cooldown -= dt;
    this.think(dt);
    this.physics(dt);
    if (this.state !== 'script') {
      const cam = this.stage.camera;
      this.x = Math.max(cam.left + 60, Math.min(cam.right - 60, this.x));
    }
    this.anim.update(dt);
  }

  get fighting() {
    return this.alive && this.state !== 'script' && this.stage.enemies.includes(this);
  }

  // Comida que cae de vez en cuando (Tofu la busca y se la lleva a Faby).
  dropFood(dt) {
    const st = this.stage;
    if (!this.fighting) return;
    this.foodTimer = (this.foodTimer ?? 14) - dt;
    if (this.foodTimer > 0 || st.foods.some((f) => f.fetchable && !f.removed)) return;
    const p = st.player;
    this.foodTimer = p.hp < p.maxHp * 0.4 ? 11 : 20;
    const r = Math.random();
    const type = r < 0.55 ? 'saltena' : r < 0.85 ? 'api' : 'silpancho';
    const a = st.arena();
    const x = a.left + 60 + Math.random() * (a.right - a.left - 120);
    const f = new Food(st, x, 410 + Math.random() * 100, type);
    f.z = 420;
    f.vz = 0;
    f.fetchable = true;
    st.foods.push(f);
    st.fx.text(x, 140, '¡COMIDA!', '#ffd23f', 12);
    st.sfx('select');
  }

  // Tofu le ladra al Diablo y lo deja aturdido (si está libre y no lo están cargando).
  updateTofuBark(dt) {
    const t = this.stage.tofu;
    if (!this.fighting || !t) return;
    this.tofuBark -= dt;
    if (this.tofuBark > 0) return;
    if (t.state === 'carried' || t.state === 'hurt' || t.state === 'knockdown' || t.state === 'down' || !['idle', 'walk', 'approach'].includes(this.state)) {
      this.tofuBark = 1;
      return;
    }
    this.tofuBark = 10 + Math.random() * 4;
    this.stage.sfx('bark');
    this.stage.fx.text(t.x, t.y - 95, '¡GUAU GUAU!', '#7df9ff', 14);
    this.barkRings = { x: t.x, y: t.y - 40, t: 0 };
    this.stage.fx.text(this.x, this.y - 250, '*aturdido*', '#ffffff', 11);
    this.vx = 0;
    this.setState('tired');
    this.anim.play('hurt', true);
  }

  speed() {
    return this.phase === 3 ? 1.3 : 1;
  }

  think(dt) {
    const p = this.stage.player;
    switch (this.state) {
      case 'script': {
        this.vx = 0;
        this.anim.play(this.scriptAnim || 'idle');
        if (this.scriptFace) this.facing = this.scriptFace;
        break;
      }
      case 'idle': {
        this.vx = 0;
        this.anim.play('idle');
        this.facing = p.x < this.x ? -1 : 1;
        const dy = p.y - this.y;
        if (Math.abs(dy) > 6) this.y += Math.sign(dy) * 70 * this.speed() * dt;
        if (this.cooldown <= 0 && p.alive) this.chooseAttack();
        break;
      }
      case 'windup':
        this.vx = 0;
        if (this.stateTime > this.windTime) this.launch();
        break;
      case 'approach': {
        this.anim.play('walk');
        const gx = p.x - Math.sign(p.x - this.x || 1) * 96;
        const dx = gx - this.x;
        this.facing = p.x < this.x ? -1 : 1;
        this.vx = Math.abs(dx) > 8 ? Math.sign(dx) * 150 * this.speed() : 0;
        const dy = p.y - this.y;
        if (Math.abs(dy) > 4) this.y += Math.sign(dy) * 120 * dt;
        if ((Math.abs(dx) <= 8 && Math.abs(dy) <= 6) || this.stateTime > 2) this.startAttack('punch', 0.35);
        break;
      }
      case 'punch': {
        this.vx = this.facing * 30;
        if (!this.hitDone && this.anim.anim.active.includes(this.anim.index)) {
          this.hitDone = true;
          const hb = worldBox(this, PUNCH.box);
          for (const t of [p, this.stage.tofu]) {
            if (t && boxesHit(hb, t.hurtWorld()) && t.takeHit(PUNCH, this)) {
              this.stage.fx.spark((hb.x0 + hb.x1) / 2, t.y - 90, true);
              this.stage.camera.shake(6, 0.2);
              break;
            }
          }
        }
        if (this.anim.done) this.recover(0.6);
        break;
      }
      case 'fire':
        this.vx = 0;
        if (!this.hitDone && this.anim.index >= 2) {
          this.hitDone = true;
          this.stage.sfx('fire');
          this.stage.fx.text(this.x, this.y - 250, '¡ARDE!', '#ff6b3d', 14);
          // Una bola por el carril de Faby y, en la fase 3, otras dos en carriles vecinos.
          const lanes = this.phase === 3 ? [0, -46, 46] : [0];
          for (const off of lanes) {
            const y = Math.max(400, Math.min(520, p.y + off));
            this.stage.hazards.push(new Fireball(this.stage, this.x + this.facing * 90, y, this.facing, this.phase === 3 ? 470 : 400));
          }
        }
        if (this.anim.done) this.recover(0.5);
        break;
      case 'rain':
        this.vx = 0;
        if (!this.hitDone && this.anim.index >= 2) {
          this.hitDone = true;
          this.stage.sfx('fire');
          this.stage.camera.shake(5, 0.4);
          this.stage.fx.text(this.x, this.y - 250, '¡LLUVIA DE FUEGO!', '#ff3040', 12);
          for (let i = 0; i < 7; i++) {
            this.stage.hazards.push(new FireRain(this.stage, p.x + (i - 3) * 64 + Math.random() * 24, p.y + (Math.random() * 40 - 20), i * 0.12));
          }
        }
        if (this.anim.done) this.recover(0.7);
        break;
      case 'backoff': {
        this.anim.play('walk');
        const cam = this.stage.camera;
        const gx = p.x < (cam.left + cam.right) / 2 ? cam.right - 120 : cam.left + 120;
        const dx = gx - this.x;
        this.facing = Math.sign(dx) || this.facing;
        this.vx = Math.sign(dx) * 220;
        if (Math.abs(dx) < 12 || this.stateTime > 2) this.startAttack('charge', this.phase === 3 ? 0.45 : 0.65);
        break;
      }
      case 'charge': {
        this.anim.play('charge');
        this.vx = this.facing * (this.phase === 3 ? 620 : 480);
        for (const t of [p, this.stage.tofu]) {
          if (!t || this.hitSet.has(t) || !t.hurtWorld) continue;
          if (Math.abs(t.x - (this.x + this.facing * 50)) < 56 && Math.abs(t.y - this.y) < 22 && (t.z ?? 0) < 50 && t.takeHit(CHARGE, this)) {
            this.hitSet.add(t);
            this.stage.fx.spark(t.x, t.y - 70, true);
            this.stage.camera.shake(8, 0.2);
          }
        }
        const cam = this.stage.camera;
        if ((this.facing > 0 && this.x > cam.right - 100) || (this.facing < 0 && this.x < cam.left + 100) || this.stateTime > 2.4) {
          this.vx = 0;
          this.stage.camera.shake(6, 0.25);
          this.stage.sfx('crash');
          this.stage.fx.text(this.x, this.y - 250, '*se marea*', '#ffffff', 10);
          this.setState('tired');
          this.anim.play('hurt', true);
        }
        break;
      }
      case 'tired':
        this.vx *= 0.85;
        if (this.stateTime > 1.6) this.recover(0.3);
        break;
      case 'hurt':
        this.vx *= 0.85;
        if (this.stateTime > 0.45) this.recover(0.3);
        break;
      case 'ko':
        this.vx = 0;
        break;
    }
  }

  chooseAttack() {
    const p = this.stage.player;
    const ph = this.phase;
    const dist = Math.abs(p.x - this.x);
    const options = ['approach', 'approach', 'charge'];
    if (ph >= 2) options.push('fire', 'fire');
    if (ph >= 3) options.push('charge', 'rain', 'rain');
    let pick = options[Math.floor(Math.random() * options.length)];
    if (pick === 'charge' && dist < 260) { this.setState('backoff'); return; }
    if (pick === 'fire' && dist < 160) pick = 'approach';
    if (pick === 'approach') { this.setState('approach'); return; }
    this.startAttack(pick, pick === 'charge' ? 0.6 : 0.45);
  }

  startAttack(kind, wind = 0.35) {
    this.next = kind;
    this.windTime = wind / this.speed();
    this.facing = this.stage.player.x < this.x ? -1 : 1;
    this.setState('windup');
    this.stage.sfx('alert');
    this.anim.play(kind === 'charge' ? 'charge' : 'idle', true);
  }

  launch() {
    const k = this.next;
    this.hitDone = false;
    this.hitSet = new Set();
    this.setState(k);
    const anim = { punch: 'punch', fire: 'fire', rain: 'fire', charge: 'charge' }[k];
    this.anim.play(anim, true);
    if (k === 'charge') {
      this.stage.fx.text(this.x, this.y - 250, '¡GRAAAH!', '#ff3040', 14);
      this.stage.sfx('zoom');
    }
    if (k === 'punch') this.stage.sfx('swing');
  }

  recover(wait) {
    this.setState('idle');
    this.cooldown = (this.phase === 3 ? 0.4 : 0.85) + wait * 0.5;
  }

  onLand() {}

  draw(ctx, camX) {
    const x = this.x - camX;
    const y = this.y - this.z;
    // Ondas del ladrido de Tofu
    if (this.barkRings) {
      const r = this.barkRings;
      r.t += 1 / 60;
      for (let i = 0; i < 3; i++) {
        const k = r.t * 2.2 - i * 0.18;
        if (k <= 0 || k > 1) continue;
        ctx.strokeStyle = `rgba(125, 249, 255, ${1 - k})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(Math.round(r.x - camX), Math.round(r.y), 20 + k * 110, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (r.t > 0.8) this.barkRings = null;
    }
    // Aura de fuego en la fase 3
    if (this.phase === 3 && this.alive && this.state !== 'script') {
      const f = Math.floor(this.stage.time * 10) % 2;
      ctx.fillStyle = 'rgba(255, 70, 30, 0.18)';
      ctx.beginPath();
      ctx.ellipse(Math.round(x), Math.round(y - 100), 90 + f * 6, 120 + f * 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    drawSprite(ctx, this.anim, x, y, this.facing, { flash: this.flash > 0 });
    if (this.state === 'windup') {
      ctx.fillStyle = this.next === 'charge' ? '#ff4040' : '#ffd23f';
      ctx.fillRect(Math.round(x) - 3, Math.round(y) - 254, 6, 16);
      ctx.fillRect(Math.round(x) - 3, Math.round(y) - 234, 6, 5);
    }
  }
}
