import { Fighter } from './fighter.js';
import { Food } from './breakable.js';
import { Animator, drawSprite } from '../engine/sprite.js';
import { worldBox, boxesHit } from '../engine/collision.js';
import { Streamer } from './hazards.js';

// JEFE del nivel 4: el dueño de Corli disfrazado de diablo de la Diablada, con una careta gigante.
// Corli lo acompaña con su propio mini traje de diablo.
// Fase 1 (100-65 %): golpe de martillo y pisotón (onda en el suelo: hay que saltarla).
// Fase 2 (65-30 %): + lluvia de serpentina que cae sobre Faby y llama a sus "danzantes".
// Fase 3 (30-0 %): + embestida con la careta baja como toro; Corli ladra y aturde.
// KO: se sienta mareado y se le cae la careta.

const MAX_HP = 520;
const PUNCH = { damage: 13, knockdown: true, hitstop: 0.1, box: { x: 16, w: 96, z: 50, h: 70 } };
const QUAKE = { damage: 8, stun: 0.8, hitstop: 0.05 };
const CHARGE = { damage: 15, knockdown: true, hitstop: 0.1 };
const BARK = { damage: 3, stun: 0.9, hitstop: 0.05 };

export class DiabloBoss extends Fighter {
  constructor(stage, sheet, x, y) {
    super(stage, x, y);
    this.isBoss = true;
    this.name = 'EL DIABLO DE LA CARETA';
    this.anim = new Animator(sheet, 'idle');
    this.maxHp = this.hp = MAX_HP;
    this.hurtbox = { x: -34, w: 68, z: 0, h: 190 };
    this.shadowW = 80;
    this.cooldown = 1.2;
    this.recentHits = [];
    this.calls = 0;
    this.quake = 0;         // onda del pisotón (radio que crece)
    this.corli = stage.sheets.pug ? new Animator(stage.sheets.pug, 'idle') : null;
    this.corliBark = 6;
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
    if (!this.alive || this.invuln > 0) return false;
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
      this.setState('hurt');
      this.anim.play('hurt', true);
      this.vx = (from.x < this.x ? 1 : -1) * 140;
    }
    // Si lo acorralan, responde con un pisotón.
    if (this.recentHits.length >= 5) {
      this.recentHits = [];
      this.startAttack('stomp', 0.15);
    }
    return true;
  }

  update(dt) {
    this.tick(dt);
    this.dropFood(dt);
    this.updateCorli(dt);
    if (this.quake > 0) this.updateQuake(dt);
    if (this.hitstop > 0) { this.hitstop -= dt; return; }
    if (this.cooldown > 0) this.cooldown -= dt;
    this.think(dt);
    this.physics(dt);
    if (this.state !== 'script') {
      const cam = this.stage.camera;
      this.x = Math.max(cam.left + 50, Math.min(cam.right - 50, this.x));
    }
    this.anim.update(dt);
  }

  // Comida que cae durante la pelea (Tofu la busca y se la lleva a Faby).
  dropFood(dt) {
    const st = this.stage;
    if (!this.alive || this.state === 'script' || !st.enemies.includes(this)) return;
    this.foodTimer = (this.foodTimer ?? 10) - dt;
    if (this.foodTimer > 0 || st.foods.some((f) => f.fetchable && !f.removed)) return;
    const p = st.player;
    this.foodTimer = p.hp < p.maxHp * 0.4 ? 9 : 16;
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

  // Corli camina detrás de su dueño; en la fase 3 ladra y aturde a Faby.
  updateCorli(dt) {
    if (!this.corli) return;
    this.corli.update(dt);
    if (!this.alive || this.state === 'script' || this.phase < 3) return;
    this.corliBark -= dt;
    if (this.corliBark <= 0) {
      this.corliBark = 5 + Math.random() * 2;
      this.corli.play('bark', true);
      this.stage.sfx('bigBark');
      const cx = this.x - this.facing * 70;
      this.stage.fx.text(cx, this.y - 90, '¡GUAU!', '#ff4040', 14);
      const p = this.stage.player;
      if (Math.abs(p.x - cx) < 280 && Math.abs(p.y - this.y) < 50) p.takeHit(BARK, this);
    }
    if (this.corli.name === 'bark' && this.corli.done) this.corli.play('idle');
  }

  // Onda del pisotón: un anillo que se expande por el suelo; si alcanza a Faby en el piso, la aturde.
  updateQuake(dt) {
    const prev = this.quake;
    this.quake += 520 * dt;
    const p = this.stage.player;
    const d = Math.hypot(p.x - this.quakeX, (p.y - this.quakeY) * 2.5);
    if (!this.quakeHit && p.grounded && d >= prev && d < this.quake) {
      this.quakeHit = true;
      p.takeHit(QUAKE, this);
    }
    if (this.quake > 420) this.quake = 0;
  }

  speed() {
    return this.phase === 3 ? 1.3 : 1;
  }

  think(dt) {
    const p = this.stage.player;
    switch (this.state) {
      case 'script': {
        const dx = this.scriptX - this.x;
        if (Math.abs(dx) > 6) {
          this.vx = Math.sign(dx) * (this.scriptSpeed ?? 150);
          this.facing = Math.sign(dx);
          this.anim.play('walk');
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
        const dy = p.y - this.y;
        if (Math.abs(dy) > 6) this.y += Math.sign(dy) * 70 * this.speed() * dt;
        const wantCall = (this.phase >= 2 && this.calls === 0) || (this.hp / this.maxHp < 0.45 && this.calls === 1);
        if (this.cooldown <= 0 && p.alive && wantCall && !this.stage.enemies.some((e) => e.alive && !e.isBoss)) {
          this.calls++;
          this.startAttack('call', 0.2);
        } else if (this.cooldown <= 0 && p.alive) this.chooseAttack();
        break;
      }
      case 'windup':
        this.vx = 0;
        if (this.stateTime > this.windTime) this.launch();
        break;
      case 'approach': {
        this.anim.play('walk');
        const gx = p.x - Math.sign(p.x - this.x || 1) * 84;
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
      case 'stomp':
        this.vx = 0;
        if (!this.hitDone && this.anim.index >= 2) {
          this.hitDone = true;
          this.quake = 1;
          this.quakeHit = false;
          this.quakeX = this.x;
          this.quakeY = this.y;
          this.stage.camera.shake(10, 0.35);
          this.stage.sfx('stomp');
          this.stage.fx.text(this.x, this.y - 230, '¡PUM!', '#ffd23f', 16);
        }
        if (this.anim.done) this.recover(0.6);
        break;
      case 'throw':
        if (!this.hitDone && this.anim.index >= 2) {
          this.hitDone = true;
          this.stage.fx.text(this.x, this.y - 230, '¡A BAILAR!', '#ff6fb5', 12);
          this.stage.sfx('coins');
          for (let i = 0; i < 6; i++) this.stage.hazards.push(new Streamer(this.stage, p.x + (i - 2.5) * 50 + Math.random() * 20, p.y + (Math.random() * 30 - 15), i * 0.1));
        }
        if (this.anim.done) this.recover(0.6);
        break;
      case 'call':
        this.vx = 0;
        if (!this.hitDone && this.stateTime > 0.3) {
          this.hitDone = true;
          this.stage.fx.text(this.x, this.y - 230, '¡MUCHACHOS, A ELLOS!', '#ff6b3d', 11);
          this.stage.sfx('bigBark');
        }
        if (this.anim.done) {
          this.stage.summon?.(2);
          this.recover(0.4);
        }
        break;
      case 'backoff': {
        this.anim.play('walk');
        const cam = this.stage.camera;
        const gx = p.x < (cam.left + cam.right) / 2 ? cam.right - 110 : cam.left + 110;
        const dx = gx - this.x;
        this.facing = Math.sign(dx) || this.facing;
        this.vx = Math.sign(dx) * 200;
        if (Math.abs(dx) < 12 || this.stateTime > 2) this.startAttack('charge', 0.6);
        break;
      }
      case 'charge': {
        this.anim.play('charge');
        this.vx = this.facing * 480;
        for (const t of [p, this.stage.tofu]) {
          if (!t || this.hitSet.has(t) || !t.hurtWorld) continue;
          if (Math.abs(t.x - (this.x + this.facing * 40)) < 50 && Math.abs(t.y - this.y) < 20 && (t.z ?? 0) < 50 && t.takeHit(CHARGE, this)) {
            this.hitSet.add(t);
            this.stage.fx.spark(t.x, t.y - 70, true);
            this.stage.camera.shake(8, 0.2);
          }
        }
        const cam = this.stage.camera;
        if ((this.facing > 0 && this.x > cam.right - 90) || (this.facing < 0 && this.x < cam.left + 90) || this.stateTime > 2.4) {
          this.vx = 0;
          this.stage.fx.text(this.x, this.y - 230, '*se marea*', '#ffffff', 10);
          this.setState('tired');
          this.anim.play('hurt', true);
        }
        break;
      }
      case 'tired':
        this.vx = 0;
        if (this.stateTime > 1.6) this.recover(0.3, true);
        break;
      case 'hurt':
        this.vx *= 0.85;
        if (this.stateTime > 0.45) this.recover(0.3, true);
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
    const options = ['approach', 'approach', 'stomp'];
    if (ph >= 2) options.push('throw', 'throw');
    if (ph >= 3) options.push('charge', 'charge');
    let pick = options[Math.floor(Math.random() * options.length)];
    if (pick === 'charge' && dist < 240) { this.setState('backoff'); return; }
    if (pick === 'stomp' && dist > 360) pick = 'approach';
    if (pick === 'approach') { this.setState('approach'); return; }
    this.startAttack(pick, pick === 'charge' ? 0.6 : 0.4);
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
    const anim = { punch: 'punch', stomp: 'stomp', throw: 'throw', call: 'throw', charge: 'charge' }[k];
    this.anim.play(anim, true);
    if (k === 'charge') {
      this.stage.fx.text(this.x, this.y - 230, '¡FUERA DEL CAMINO!', '#ffd23f', 12);
      this.stage.sfx('zoom');
    }
    if (k === 'punch') this.stage.sfx('swing');
  }

  recover(wait, noCount = false) {
    this.setState('idle');
    this.cooldown = (this.phase === 3 ? 0.4 : 0.85) + wait * 0.5;
  }

  onLand() {}

  draw(ctx, camX) {
    const x = this.x - camX;
    const y = this.y - this.z;
    // Corli, detrás de su dueño
    const corliImg = this.stage.game.bgImages.c_corli;
    if (this.state !== 'ko' && corliImg) {
      // Corli con su mini traje de diablo
      const cx = Math.round(x - this.facing * 70), bob = Math.round(Math.abs(Math.sin(this.stage.time * 8)) * 3);
      ctx.save();
      ctx.translate(cx, Math.round(this.y + 4 - bob));
      if (this.facing < 0) ctx.scale(-1, 1);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(corliImg, -corliImg.width * 0.75, -corliImg.height * 1.5, corliImg.width * 1.5, corliImg.height * 1.5);
      ctx.restore();
    } else if (this.corli && this.state !== 'ko') drawSprite(ctx, this.corli, x - this.facing * 70, this.y + 4, this.facing);
    // Onda del pisotón
    if (this.quake > 0) {
      ctx.strokeStyle = `rgba(255, 210, 63, ${Math.max(0, 1 - this.quake / 420)})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(Math.round(this.quakeX - camX), Math.round(this.quakeY), this.quake, this.quake / 2.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    drawSprite(ctx, this.anim, x, y, this.facing, { flash: this.flash > 0 });
    if (this.state === 'windup') {
      ctx.fillStyle = this.next === 'charge' ? '#ff4040' : '#ffd23f';
      ctx.fillRect(Math.round(x) - 3, Math.round(y) - 232, 6, 16);
      ctx.fillRect(Math.round(x) - 3, Math.round(y) - 212, 6, 5);
    }
  }
}
