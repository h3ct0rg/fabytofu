import { Fighter } from './fighter.js';
import { Animator, drawSprite } from '../engine/sprite.js';
import { worldBox, boxesHit } from '../engine/collision.js';
import { COLORS } from '../config.js';

// JEFE: Corli, el pug de traje. Pequeño, gruñón y con aires de jefe mafioso.
// Fase 1 (100-60 %): embestidas y mordidas.
// Fase 2 (60-30 %): + ladrido sónico (aturde a Faby y enfurece a Tofu) y patada de tierra.
// Fase 3 (30-0 %): más rápido y encadena ataques. Entre ataques se "ajusta la corbata":
// esa es la ventana para castigarlo (recibe más daño).

const MAX_HP = 400;
const CHARGE = { damage: 12, knockdown: true, hitstop: 0.08 };
const BITE = { damage: 8, push: 120, hitstop: 0.07, box: { x: 10, w: 44, z: 10, h: 50 } };
const BARK = { damage: 3, stun: 0.9, hitstop: 0.05 };
const DIRT = { damage: 6, push: 90, hitstop: 0.05 };

export class PugBoss extends Fighter {
  constructor(stage, sheet, x, y) {
    super(stage, x, y);
    this.isBoss = true;
    this.name = 'CORLI, EL PUG DE TRAJE';
    this.anim = new Animator(sheet, 'idle');
    this.maxHp = this.hp = MAX_HP;
    // Más alto que su dibujo para que los golpes de Faby (a la altura del pecho) lo alcancen.
    this.hurtbox = { x: -34, w: 68, z: 0, h: 100 };
    this.shadowW = 70;
    this.cooldown = 1.2;
    this.recentHits = [];
    this.attackCount = 0;
    this.dirt = [];
    this.setState('idle');
  }

  get phase() {
    const k = this.hp / this.maxHp;
    return k > 0.6 ? 1 : k > 0.3 ? 2 : 3;
  }

  get alive() {
    return this.state !== 'ko' && this.state !== 'dead';
  }

  // No se le puede agarrar: es muy escurridizo.
  canBeGrabbed() {
    return false;
  }

  takeHit(hit, from) {
    if (!this.alive || this.invuln > 0) return false;
    let dmg = hit.damage;
    if (this.state === 'tie') dmg *= 1.5;                 // castigo durante la burla
    if (from === this.stage.tofu) dmg *= 2;               // la rivalidad: Tofu le duele el doble
    this.hp = Math.max(0, this.hp - dmg);
    this.flash = 0.1;
    this.hitstop = hit.hitstop ?? 0.06;
    this.stage.lastEnemyHit = this;
    if (this.hp <= 0) {
      this.stage.sfx('fall');
      this.setState('ko');
      this.anim.play('ko', true);
      this.vx = (from.x < this.x ? 1 : -1) * 120;
      this.stage.onBossDefeated?.(this);
      return true;
    }
    // Súper armadura: solo se estremece con golpes fuertes o si estaba burlándose.
    const now = this.stage.time;
    this.recentHits = this.recentHits.filter((t) => now - t < 1.5);
    this.recentHits.push(now);
    if (hit.knockdown || hit.strong || this.state === 'tie') {
      this.setState('hurt');
      this.anim.play('hurt', true);
      this.vx = (from.x < this.x ? 1 : -1) * 160;
    }
    // Si lo golpean mucho seguido, se libera con un ladrido.
    if (this.recentHits.length >= 5) {
      this.recentHits = [];
      this.invuln = 0.5;
      this.startAttack('bark');
    }
    return true;
  }

  update(dt) {
    this.tick(dt);
    for (const d of this.dirt) d.update(dt);
    this.dirt = this.dirt.filter((d) => !d.removed);
    if (this.hitstop > 0) { this.hitstop -= dt; return; }
    if (this.cooldown > 0) this.cooldown -= dt;
    this.think(dt);
    this.physics(dt);
    if (this.state !== 'script') {
      const cam = this.stage.camera;
      this.x = Math.max(cam.left + 40, Math.min(cam.right - 40, this.x));
    }
    this.anim.update(dt);
  }

  speed() {
    return this.phase === 3 ? 1.35 : 1;
  }

  think(dt) {
    const p = this.stage.player;
    switch (this.state) {
      case 'script': {
        // Controlado por una escena: corre hasta scriptX y espera.
        const dx = this.scriptX - this.x;
        if (Math.abs(dx) > 6) {
          this.vx = Math.sign(dx) * 330;
          this.facing = Math.sign(dx);
          this.anim.play('run');
        } else {
          this.vx = 0;
          this.anim.play(this.scriptAnim || 'idle');
          if (this.scriptFace) this.facing = this.scriptFace;
        }
        break;
      }
      case 'idle': {
        this.vx = 0;
        this.anim.play('idle');
        this.facing = p.x < this.x ? -1 : 1;
        // Se acomoda en el carril de Faby, a media distancia.
        const dy = p.y - this.y;
        if (Math.abs(dy) > 6) this.y += Math.sign(dy) * 90 * this.speed() * dt;
        if (this.cooldown <= 0 && p.alive) this.chooseAttack();
        break;
      }
      case 'windup':
        this.vx = 0;
        if (this.stateTime > this.windTime) this.launch();
        break;
      case 'charge': {
        this.anim.play('run');
        this.vx = this.facing * 540 * this.speed();
        for (const t of [p, this.stage.tofu]) {
          if (!t || this.hitSet.has(t) || !t.hurtWorld) continue;
          if (Math.abs(t.x - this.x) < 44 && Math.abs(t.y - this.y) < 18 && t.takeHit(CHARGE, this)) {
            this.hitSet.add(t);
            this.stage.fx.spark(t.x, t.y - 60, true);
            this.stage.camera.shake(6, 0.15);
          }
        }
        const cam = this.stage.camera;
        if ((this.facing > 0 && this.x > cam.right - 50) || (this.facing < 0 && this.x < cam.left + 50) || this.stateTime > 2.2) {
          this.vx = 0;
          this.facing = -this.facing;
          this.recover(0.7);
        }
        break;
      }
      case 'approach': {
        // Corre hasta quedar al lado de Faby para morder.
        this.anim.play('run');
        const gx = p.x - Math.sign(p.x - this.x || 1) * 52;
        const dx = gx - this.x;
        this.facing = p.x < this.x ? -1 : 1;
        this.vx = Math.abs(dx) > 8 ? Math.sign(dx) * 260 * this.speed() : 0;
        const dy = p.y - this.y;
        if (Math.abs(dy) > 4) this.y += Math.sign(dy) * 160 * dt;
        if ((Math.abs(dx) <= 8 && Math.abs(dy) <= 6) || this.stateTime > 1.6) this.startAttack('bite', 0.3);
        break;
      }
      case 'bite': {
        this.vx = this.facing * 60;
        if (!this.hitDone && this.anim.index >= 2) {
          this.hitDone = true;
          const hb = worldBox(this, BITE.box);
          for (const t of [p, this.stage.tofu]) {
            if (t && boxesHit(hb, t.hurtWorld()) && t.takeHit(BITE, this)) {
              this.stage.fx.spark((hb.x0 + hb.x1) / 2, t.y - 45, false);
              break;
            }
          }
        }
        if (this.anim.done) this.recover(0.6);
        break;
      }
      case 'bark': {
        this.vx = 0;
        if (!this.hitDone && this.anim.index >= 1) {
          this.hitDone = true;
          this.stage.fx.text(this.x + this.facing * 60, this.y - 90, '¡¡GUAUUU!!', '#ff4040', 18);
          this.stage.sfx('bigBark');
          this.stage.camera.shake(8, 0.3);
          this.barkRing = 0.01;
          // Cono hacia adelante: aturde a Faby si está en su carril.
          const dx = (p.x - this.x) * this.facing;
          if (dx > 0 && dx < 260 && Math.abs(p.y - this.y) < 45) p.takeHit(BARK, this);
          const t = this.stage.tofu;
          if (t) t.temper = Math.min(100, t.temper + 40);
        }
        if (this.anim.done) this.recover(0.8);
        break;
      }
      case 'dirt': {
        this.vx = 0;
        // Se da vuelta (mira al lado contrario) y patea tierra hacia Faby.
        if (this.anim.index >= 2 && this.thrown < 3 && this.stateTime > 0.25 + this.thrown * 0.18) {
          this.dirt.push(new Dirt(this.stage, this.x - this.facing * 30, this.y, -this.facing, this.thrown));
          this.stage.sfx('throw');
          this.thrown++;
        }
        if (this.anim.done) {
          this.facing = -this.facing;
          this.recover(0.7);
        }
        break;
      }
      case 'tie':
        this.vx = 0;
        if (this.stateTime > 1.3) {
          this.setState('idle');
          this.cooldown = 0.3;
        }
        break;
      case 'hurt':
        this.vx *= 0.85;
        if (this.stateTime > 0.4) this.recover(0.3);
        break;
      case 'ko':
        this.vx *= 0.9;
        break;
    }
  }

  chooseAttack() {
    const p = this.stage.player;
    const ph = this.phase;
    const dist = Math.abs(p.x - this.x);
    const options = ['charge', 'approach'];
    if (ph >= 2) options.push('bark', 'dirt');
    let pick = options[Math.floor(Math.random() * options.length)];
    if (pick === 'charge' && dist < 160) pick = 'approach';
    if (pick === 'bark' && dist > 240) pick = 'charge';
    if (pick === 'approach') { this.setState('approach'); return; }
    this.startAttack(pick, pick === 'charge' ? 0.55 : pick === 'bark' ? 0.6 : 0.35);
  }

  // Aviso "!" y luego el ataque.
  startAttack(kind, wind = 0.35) {
    this.next = kind;
    this.windTime = wind / this.speed();
    this.facing = this.stage.player.x < this.x ? -1 : 1;
    this.setState('windup');
    this.stage.sfx('alert');
    this.anim.play(kind === 'charge' ? 'run' : 'idle', true);
    if (kind === 'dirt') this.facing = -this.facing;
  }

  launch() {
    const k = this.next;
    this.hitDone = false;
    this.hitSet = new Set();
    this.thrown = 0;
    this.setState(k);
    const anim = { charge: 'run', bite: 'bite', bark: 'bark', dirt: 'dirt' }[k];
    this.anim.play(anim, true);
    if (k === 'charge') {
      this.stage.fx.text(this.x, this.y - 95, '¡GRRR!', '#ffd23f', 14);
      this.stage.sfx('zoom');
    }
    if (k === 'bite') this.stage.sfx('dogBark');
  }

  recover(wait) {
    this.attackCount++;
    // En fase 3 encadena dos ataques antes de burlarse; si no, se burla cada 3 ataques.
    const tauntEvery = this.phase === 3 ? 2 : 3;
    if (this.attackCount % tauntEvery === 0) {
      this.setState('tie');
      this.anim.play('tie', true);
      this.stage.fx.text(this.x, this.y - 95, '*se ajusta la corbata*', '#ffffff', 10);
      return;
    }
    this.setState('idle');
    this.cooldown = (this.phase === 3 ? 0.35 : 0.8) + wait * 0.5;
  }

  onLand() {}

  drawShadow(ctx, camX) {
    super.drawShadow(ctx, camX);
    for (const d of this.dirt) d.drawShadow(ctx, camX);
  }

  draw(ctx, camX) {
    if (this.blinkHidden && this.state !== 'ko') return;
    const x = this.x - camX;
    const y = this.y - this.z;
    drawSprite(ctx, this.anim, x, y, this.facing, { flash: this.flash > 0 });
    for (const d of this.dirt) d.draw(ctx, camX);
    if (this.state === 'windup') {
      ctx.fillStyle = this.next === 'bark' ? '#ff4040' : '#ffd23f';
      ctx.fillRect(Math.round(x) - 3, Math.round(y) - 102, 6, 16);
      ctx.fillRect(Math.round(x) - 3, Math.round(y) - 82, 6, 5);
    }
    if (this.state === 'bark' && this.anim.index >= 1) {
      // Ondas del ladrido sónico
      const k = Math.min(1, this.stateTime * 3);
      ctx.strokeStyle = `rgba(255, 64, 64, ${1 - k})`;
      ctx.lineWidth = 4;
      const a0 = this.facing > 0 ? -0.7 : Math.PI - 0.7;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(Math.round(x + this.facing * 30), Math.round(y - 40), 30 * i * (0.5 + k), a0, a0 + 1.4);
        ctx.stroke();
      }
    }
    if (this.state === 'ko') drawDizzy(ctx, x, y - 70, this.stateTime);
  }
}

// Estrellitas girando sobre la cabeza (mareado).
export function drawDizzy(ctx, x, y, t) {
  for (let i = 0; i < 3; i++) {
    const a = t * 5 + (i * Math.PI * 2) / 3;
    const sx = Math.round(x + Math.cos(a) * 22);
    const sy = Math.round(y + Math.sin(a) * 7);
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(sx - 1, sy - 4, 3, 9);
    ctx.fillRect(sx - 4, sy - 1, 9, 3);
  }
}

// Terrón de tierra pateado por el Pug: vuela en arco hacia Faby.
class Dirt {
  constructor(stage, x, y, dir, n) {
    this.stage = stage;
    this.x = x;
    this.y = y + (n - 1) * 14;
    this.z = 20;
    this.vx = dir * (300 + n * 40);
    this.vz = 260 + n * 30;
    this.removed = false;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.z += this.vz * dt;
    this.vz -= 900 * dt;
    const p = this.stage.player;
    if (Math.abs(p.x - this.x) < 26 && Math.abs(p.y - this.y) < 18 && this.z < 120 && p.takeHit(DIRT, this)) {
      this.stage.fx.dust(this.x, this.y, 4);
      this.removed = true;
    }
    if (this.z <= 0) {
      this.stage.fx.dust(this.x, this.y, 3);
      this.removed = true;
    }
  }

  drawShadow(ctx, camX) {
    ctx.fillStyle = COLORS.shadow;
    ctx.fillRect(Math.round(this.x - camX) - 6, Math.round(this.y) - 2, 12, 4);
  }

  draw(ctx, camX) {
    const x = Math.round(this.x - camX);
    const y = Math.round(this.y - this.z);
    ctx.fillStyle = '#140c1c';
    ctx.fillRect(x - 7, y - 6, 14, 12);
    ctx.fillStyle = '#8a5a35';
    ctx.fillRect(x - 5, y - 4, 10, 8);
    ctx.fillStyle = '#b07a4a';
    ctx.fillRect(x - 3, y - 4, 4, 3);
  }
}
