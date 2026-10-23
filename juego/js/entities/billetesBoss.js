import { Fighter } from './fighter.js';
import { Food } from './breakable.js';
import { Animator, drawSprite } from '../engine/sprite.js';
import { worldBox, boxesHit } from '../engine/collision.js';
import { PilatesBall, Shake, Bill, drawBall, drawStroller, drawPant } from './hazards.js';

// JEFA del nivel 2: Doña Billetes, dueña de Morita y de la marca de comida "fit" para mascotas.
// Fase 1 (100-65 %): golpes, cachetada y escudo con la pelota de pilates (que luego lanza rodando).
// Fase 2 (65-30 %): + batidos detox (dejan charcos resbalosos), lluvia de billetes y llama
//                   por celular a sus vendedores.
// Fase 3 (30-0 %): + carga con el cochecito de perro. Después de cargar queda jadeando:
//                   esa es la ventana para castigarla (recibe más daño).
// KO: cae sentada, sin aire. No queda "golpeada".

const MAX_HP = 460;
const JAB = { damage: 7, push: 110, hitstop: 0.07, box: { x: 20, w: 70, z: 70, h: 40 } };
const SLAP = { damage: 11, knockdown: true, hitstop: 0.09, box: { x: 10, w: 86, z: 60, h: 50 } };
const STROLLER = { damage: 14, knockdown: true, hitstop: 0.1 };

export class BilletesBoss extends Fighter {
  constructor(stage, sheet, x, y) {
    super(stage, x, y);
    this.isBoss = true;
    this.name = 'DOÑA BILLETES';
    this.anim = new Animator(sheet, 'idle');
    this.maxHp = this.hp = MAX_HP;
    this.hurtbox = { x: -28, w: 56, z: 0, h: 170 };
    this.shadowW = 64;
    this.cooldown = 1.2;
    this.recentHits = [];
    this.attackCount = 0;
    this.calls = 0;        // veces que llamó a sus vendedores
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
    // Escudo de pilates: los golpes de frente rebotan. Hay que saltar o pegarle por detrás.
    if (this.state === 'hold') {
      const front = Math.sign(from.x - this.x) === this.facing;
      if (front && (from.z ?? 0) < 30) {
        this.stage.fx.text(this.x + this.facing * 50, this.y - 120, '¡BOING!', '#c38bff', 12);
        this.stage.sfx('land');
        if (from.vx !== undefined && from.takeHit) from.vx = this.facing * 260;   // rebota hacia atrás
        return true;
      }
    }
    let dmg = hit.damage;
    if (this.state === 'tired') dmg *= 1.5;                // castigo mientras jadea
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
    // Súper armadura salvo golpes fuertes o mientras jadea.
    if (hit.knockdown || hit.strong || this.state === 'tired') {
      this.setState('hurt');
      this.anim.play('hurt', true);
      this.vx = (from.x < this.x ? 1 : -1) * 150;
    }
    // Si la acorralan, se cubre con la pelota.
    if (this.recentHits.length >= 5) {
      this.recentHits = [];
      this.startAttack('hold', 0.15);
    }
    return true;
  }

  update(dt) {
    this.tick(dt);
    this.dropFood(dt);
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

  // Durante la pelea cae comida del cielo para que Faby recupere vida (más seguido si tiene poca).
  // Tofu corre a buscarla y se la lleva.
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

  speed() {
    return this.phase === 3 ? 1.25 : 1;
  }

  think(dt) {
    const p = this.stage.player;
    switch (this.state) {
      case 'script': {
        // Controlado por una escena: camina hasta scriptX y hace scriptAnim.
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
        if (Math.abs(dy) > 6) this.y += Math.sign(dy) * 80 * this.speed() * dt;
        // Fase 2: llama a sus vendedores al entrar a la fase y otra vez a mitad.
        const wantCall = (this.phase >= 2 && this.calls === 0) || (this.hp / this.maxHp < 0.45 && this.calls === 1);
        if (this.cooldown <= 0 && p.alive && wantCall && !this.stage.enemies?.some((e) => e.alive && !e.isBoss)) {
          this.calls++;
          this.startAttack('phone', 0.2);
        } else if (this.cooldown <= 0 && p.alive) this.chooseAttack();
        break;
      }
      case 'windup':
        this.vx = 0;
        if (this.stateTime > this.windTime) this.launch();
        break;
      case 'approach': {
        // Camina hasta quedar al lado de Faby para golpear.
        this.anim.play('walk');
        const gx = p.x - Math.sign(p.x - this.x || 1) * 70;
        const dx = gx - this.x;
        this.facing = p.x < this.x ? -1 : 1;
        this.vx = Math.abs(dx) > 8 ? Math.sign(dx) * 170 * this.speed() : 0;
        const dy = p.y - this.y;
        if (Math.abs(dy) > 4) this.y += Math.sign(dy) * 130 * dt;
        if ((Math.abs(dx) <= 8 && Math.abs(dy) <= 6) || this.stateTime > 1.8) {
          this.startAttack(Math.random() < 0.55 ? 'jab' : 'slap', 0.25);
        }
        break;
      }
      case 'backoff': {
        // Se aleja hacia el borde contrario para tomar impulso con el cochecito.
        this.anim.play('walk');
        const cam = this.stage.camera;
        const gx = p.x < (cam.left + cam.right) / 2 ? cam.right - 100 : cam.left + 100;
        const dx = gx - this.x;
        this.facing = Math.sign(dx) || this.facing;
        this.vx = Math.sign(dx) * 220;
        if (Math.abs(dx) < 12 || this.stateTime > 2) this.startAttack('charge', 0.6);
        break;
      }
      case 'jab':
      case 'slap': {
        const hit = this.state === 'jab' ? JAB : SLAP;
        this.vx = this.facing * 40;
        if (!this.hitDone && this.anim.anim.active.includes(this.anim.index)) {
          this.hitDone = true;
          const hb = worldBox(this, hit.box);
          for (const t of [p, this.stage.tofu]) {
            if (t && boxesHit(hb, t.hurtWorld()) && t.takeHit(hit, this)) {
              this.stage.fx.spark((hb.x0 + hb.x1) / 2, t.y - 90, hit === SLAP);
              if (hit === SLAP) this.stage.fx.text(t.x, t.y - 150, '¡PLAF!', '#ffd23f', 14);
              break;
            }
          }
        }
        if (this.anim.done) this.recover(0.5);
        break;
      }
      case 'hold':
        // Se cubre con la pelota; al rato la lanza rodando por el carril.
        this.vx = 0;
        this.facing = p.x < this.x ? -1 : 1;
        if (this.stateTime > 2.2) {
          this.setState('roll');
          this.anim.play('push', true);
        }
        break;
      case 'roll':
        if (!this.hitDone && this.anim.index >= 2) {
          this.hitDone = true;
          this.stage.hazards.push(new PilatesBall(this.stage, this.x + this.facing * 60, this.y, this.facing));
          this.stage.sfx('throw');
        }
        if (this.anim.done) this.recover(0.6);
        break;
      case 'throw':
        if (!this.hitDone && this.anim.index >= 3) {
          this.hitDone = true;
          if (this.next === 'bills') {
            this.stage.fx.text(this.x, this.y - 200, '¡TOMEN SU PLATA!', '#7dff8a', 12);
            this.stage.sfx('coins');
            for (let i = 0; i < 5; i++) this.stage.hazards.push(new Bill(this.stage, p.x + (i - 2) * 46 + Math.random() * 16, p.y + (Math.random() * 30 - 15), i * 0.12));
          } else {
            this.stage.sfx('throw');
            this.stage.hazards.push(new Shake(this.stage, this.x + this.facing * 30, this.y, p.x, p.y));
          }
        }
        if (this.anim.done) this.recover(0.6);
        break;
      case 'phone':
        this.vx = 0;
        if (!this.hitDone && this.stateTime > 0.4) {
          this.hitDone = true;
          this.stage.fx.text(this.x, this.y - 200, '¡VENGAN YA! ¡LES PAGO DOBLE!', '#ff6b3d', 11);
          this.stage.sfx('ring');
        }
        if (this.anim.done) {
          this.stage.summon?.(2);
          this.recover(0.4);
        }
        break;
      case 'charge': {
        this.anim.play('charge');
        this.vx = this.facing * 470;
        for (const t of [p, this.stage.tofu]) {
          if (!t || this.hitSet.has(t) || !t.hurtWorld) continue;
          if (Math.abs(t.x - (this.x + this.facing * 60)) < 46 && Math.abs(t.y - this.y) < 20 && (t.z ?? 0) < 40 && t.takeHit(STROLLER, this)) {
            this.hitSet.add(t);
            this.stage.fx.spark(t.x, t.y - 60, true);
            this.stage.camera.shake(7, 0.18);
          }
        }
        const cam = this.stage.camera;
        if ((this.facing > 0 && this.x > cam.right - 90) || (this.facing < 0 && this.x < cam.left + 90) || this.stateTime > 2.4) {
          this.vx = 0;
          this.stage.fx.text(this.x, this.y - 200, '*jadea*', '#ffffff', 10);
          this.setState('tired');
          this.anim.play('guard', true);
        }
        break;
      }
      case 'tired':
        this.vx = 0;
        if (this.stateTime > 1.6) this.recover(0.3, true);
        break;
      case 'hurt':
        this.vx *= 0.85;
        if (this.stateTime > 0.4) this.recover(0.3, true);
        break;
      case 'ko':
        this.vx = 0;
        if (this.anim.done) this.anim.play('down');
        break;
    }
  }

  chooseAttack() {
    const p = this.stage.player;
    const ph = this.phase;
    const dist = Math.abs(p.x - this.x);
    const options = ['approach', 'approach', 'hold'];
    if (ph >= 2) options.push('shake', 'bills');
    if (ph >= 3) options.push('charge', 'charge');
    let pick = options[Math.floor(Math.random() * options.length)];
    if (pick === 'charge' && dist < 240) { this.setState('backoff'); return; }
    if (pick === 'shake' && dist < 120) pick = 'approach';
    if (pick === 'approach') { this.setState('approach'); return; }
    this.startAttack(pick, pick === 'charge' ? 0.6 : 0.35);
  }

  // Aviso "!" y luego el ataque.
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
    const state = { shake: 'throw', bills: 'throw' }[k] ?? k;
    this.setState(state);
    const anim = { hold: 'hold', shake: 'throw', bills: 'throw', phone: 'phone', charge: 'charge', jab: 'jab', slap: 'slap' }[k];
    this.anim.play(anim, true);
    if (k === 'hold') this.stage.fx.text(this.x, this.y - 200, '¡PILATES!', '#c38bff', 12);
    if (k === 'charge') {
      this.stage.fx.text(this.x, this.y - 200, '¡ABRAN PASO!', '#ffd23f', 14);
      this.stage.sfx('zoom');
    }
    if (k === 'jab' || k === 'slap') this.stage.sfx('swing');
  }

  recover(wait, noCount = false) {
    if (!noCount) this.attackCount++;
    this.setState('idle');
    this.cooldown = (this.phase === 3 ? 0.4 : 0.85) + wait * 0.5;
  }

  onLand() {}

  draw(ctx, camX) {
    const x = this.x - camX;
    const y = this.y - this.z;
    const ball = this.state === 'hold' || (this.state === 'windup' && this.next === 'hold');
    if (ball && this.facing < 0) drawBall(ctx, x + this.facing * 62, y - 4, 0, this.stage.game.bgImages.o_ball);
    if (this.state === 'charge' || (this.state === 'windup' && this.next === 'charge')) drawStroller(ctx, x + this.facing * 70, y, this.facing, this.stateTime, this.stage.game.bgImages.o_stroller);
    drawSprite(ctx, this.anim, x, y, this.facing, { flash: this.flash > 0 });
    if (ball && this.facing > 0) drawBall(ctx, x + this.facing * 62, y - 4, 0, this.stage.game.bgImages.o_ball);
    if (this.state === 'windup') {
      ctx.fillStyle = this.next === 'charge' ? '#ff4040' : '#ffd23f';
      ctx.fillRect(Math.round(x) - 3, Math.round(y) - 212, 6, 16);
      ctx.fillRect(Math.round(x) - 3, Math.round(y) - 192, 6, 5);
    }
    if (this.state === 'ko' || this.state === 'tired') drawPant(ctx, x + this.facing * 24, y - (this.state === 'ko' ? 110 : 170), this.stateTime);
  }
}
