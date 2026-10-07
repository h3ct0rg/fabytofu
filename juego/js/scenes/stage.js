import { VIEW_W, VIEW_H, FLOOR_TOP, FLOOR_BOTTOM, COLORS, FONT, fontSafe } from '../config.js';
import { Camera } from '../engine/camera.js';
import { FX } from '../engine/fx.js';
import { drawBox, worldBox } from '../engine/collision.js';
import { Background } from './background.js';
import { Faby } from '../entities/faby.js';
import { Enemy } from '../entities/enemy.js';
import { Dog } from '../entities/dog.js';
import { recolorSheet } from '../engine/sprite.js';
import { Prop } from '../entities/prop.js';
import { Tofu } from '../entities/tofu.js';
import { Butterfly } from '../entities/butterfly.js';
import { DeliveryBox, FOODS } from '../entities/breakable.js';
import { PugBoss } from '../entities/pugBoss.js';
import { Owner } from '../entities/owner.js';
import { Cutscene, NO_INPUT } from './cutscene.js';

const WORLD_W = 3400;
const MAX_ATTACKERS = 2;
const LIVES = 3;

// Objetos tirados en el camino: botellas (armas), pelota y premio (para el perro).
const PROPS = [
  [380, 470, 'bottle'], [1350, 400, 'bottle'], [2350, 500, 'bottle'],
  [1290, 480, 'ball'], [2280, 420, 'treat'], [2420, 470, 'ball'],
];

// Lugares reales del parque: al llegar a cada uno aparece su nombre.
const AREAS = [
  { x: 0, name: 'PARQUE LINCOLN', sub: 'Cochabamba · Las canchas' },
  { x: 560, name: 'LA CICLOVÍA', sub: 'Los troncos blancos' },
  { x: 1380, name: 'LA GLORIETA', sub: 'Arbustos redondos' },
  { x: 2080, name: 'LA PÉRGOLA', sub: 'Buganvillas y espejo de agua' },
  { x: 2620, name: 'LA EXPLANADA', sub: 'La bandera y la avenida' },
];

// Cajas de delivery olvidadas (x, y, comida fija opcional). Traen salteña, api con pastel o silpancho.
const BOXES = [[700, 388], [1500, 390, 'api'], [2100, 392], [2700, 388, 'silpancho'], [3200, 390]];

// Variantes de color de la ropa: [tono desde, tono hasta, giro] por tipo.
const VARIANTS = {
  jogger: [null, [55, 115, 200], [55, 115, 130]],   // verde original, azul, rosado
  skater: [null, [195, 250, 130], [195, 250, 260]], // azul original, verde, rojo
};

// Zonas de pelea: al cruzar "at" la cámara se bloquea en [min, max] y aparecen los enemigos.
// butterfly: segundos después de empezar la pelea en que aparece la mariposa (evento de Tofu).
const ZONES = [
  { at: 520, min: 300, max: 1260, enemies: ['jogger', 'jogger'] },
  { at: 1320, min: 1100, max: 2060, enemies: ['jogger', 'skater', 'jogger'] },
  { at: 2000, min: 1780, max: 2740, enemies: ['dog', 'jogger', 'skater', 'jogger'], butterfly: 5 },
  { at: 2760, min: 2440, max: 3400, boss: true },
];

// Escenario de prueba de la fase 1: un tramo del Parque Lincoln con 3 peleas.
export class Stage {
  constructor(game) {
    this.game = game;
    this.sheets = game.sheets;
    this.reset();
  }

  // save: avance guardado { zone, score, lives } para continuar desde un punto de control.
  reset(save = null) {
    this.save = save;
    this.camera = new Camera(WORLD_W);
    this.camera.noShake = this.game.settings && !this.game.settings.shake;
    this.fx = new FX();
    this.bg = this.bg ?? new Background(WORLD_W, this.game.bgImages);
    this.player = new Faby(this, this.sheets.faby, 160, 450);
    this.enemies = [];
    this.props = PROPS.map(([x, y, type]) => new Prop(this, x, y, type));
    this.breakables = BOXES.map(([x, y, food]) => new DeliveryBox(this, x, y, food));
    this.foods = [];
    this.foodEaten = { ...(save?.foodEaten ?? {}) };
    this.tofu = this.sheets.tofu ? new Tofu(this, this.sheets.tofu, 90, 470) : null;
    this.butterfly = null;
    this.butterflyTimer = 20 + Math.random() * 15;
    this.lives = LIVES;
    this.banner = null;        // mensaje grande temporal { text, time }
    this.areaIndex = -1;
    this.areaBanner = null;
    this.attackers = new Set();
    this.zoneIndex = 0;
    this.activeZone = null;
    this.goTimer = 0;
    this.lastEnemyHit = null;
    this.mode = 'play';        // play | gameover | ending
    this.modeTime = 0;
    this.time = 0;
    this.boss = null;
    this.owner = null;
    this.cutscene = this.sheets.pug ? this.introScene() : null;
    this.music('level');
    if (save?.zone > 0) this.resumeFrom(save);
    else if (save) this.player.score = 0;
  }

  sfx(name) {
    this.game.audio?.play(name);
  }

  music(name) {
    this.game.audio?.playMusic(name);
  }

  requestToken(e) {
    if (this.attackers.has(e)) return true;
    if (this.attackers.size < MAX_ATTACKERS) {
      this.attackers.add(e);
      return true;
    }
    return false;
  }

  releaseToken(e) {
    this.attackers.delete(e);
  }

  update(dt, input) {
    this.modeTime += dt;
    this.time += dt;
    if (this.mode === 'gameover') {
      // Reintenta desde el último punto de control guardado.
      if (this.modeTime > 0.8 && (input.pressed.attack || input.pressed.pause)) this.reset(this.game.save?.done ? null : this.game.save);
      else if (this.modeTime > 0.8 && input.pressed.jump) this.game.toTitle?.();
      return;
    }
    if (this.mode === 'ending') {
      if (this.modeTime > 1.5 && (input.pressed.attack || input.pressed.pause || input.pressed.jump)) this.game.toTitle?.();
      return;
    }
    // Durante una escena, Faby no recibe controles.
    let actorInput = input;
    if (this.cutscene) {
      this.cutscene.update(dt, input);
      actorInput = NO_INPUT;
      if (this.cutscene.done) this.cutscene = null;
    }

    this.player.update(dt, actorInput);
    this.owner?.update(dt);
    this.tofu?.update(dt);
    if (this.boss && !this.enemies.includes(this.boss)) this.boss.update(dt);
    this.updateButterfly(dt);
    if (this.banner && (this.banner.time -= dt) <= 0) this.banner = null;
    for (const e of this.enemies) e.update(dt);
    for (const p of this.props) p.update(dt);
    for (const b of this.breakables) b.update(dt);
    for (const f of this.foods) f.update(dt);
    this.foods = this.foods.filter((f) => !f.removed);
    this.props = this.props.filter((p) => !p.removed);
    for (const e of this.enemies) if (e.removed) this.releaseToken(e);
    this.enemies = this.enemies.filter((e) => !e.removed);
    if (this.lastEnemyHit?.removed) this.lastEnemyHit = null;

    this.updateZones(dt);
    this.updateAreas(dt);
    this.camera.follow(this.player.x, dt);
    this.fx.update(dt);

    if (this.mode === 'play') {
      if (this.player.state === 'dead') {
        this.loseLife('¡FABY CAYÓ!');
      }
    }
  }

  updateAreas(dt) {
    const next = AREAS[this.areaIndex + 1];
    if (next && this.player.x >= next.x) {
      this.areaIndex++;
      this.areaBanner = { ...next, time: 3 };
    }
    if (this.areaBanner && (this.areaBanner.time -= dt) <= 0) this.areaBanner = null;
  }

  // Hoja de sprites del enemigo con la ropa recoloreada (se calcula una vez).
  variantSheet(type, n) {
    const list = VARIANTS[type];
    const v = list[n % list.length];
    if (!v) return this.sheets[type];
    this.variantCache ??= {};
    const key = `${type}${n % list.length}`;
    this.variantCache[key] ??= recolorSheet(this.sheets[type], v[0], v[1], v[2]);
    return this.variantCache[key];
  }

  // Continúa una partida guardada: Faby aparece al final de la última pelea ganada.
  resumeFrom(save) {
    const z = Math.min(save.zone, ZONES.length - 1);
    this.zoneIndex = z;
    const x = ZONES[z - 1].max - 360;
    this.player.x = x;
    if (this.tofu) this.tofu.x = x - 80;
    this.camera.x = Math.max(0, x - 400);
    this.player.score = save.score ?? 0;
    this.lives = save.lives ?? 3;
    this.cutscene = null;
    this.areaIndex = AREAS.reduce((acc, a, i) => (a.x <= x ? i - 1 : acc), -1);
    // Los objetos y basureros que quedaron atrás ya no importan.
    this.props = this.props.filter((p) => p.x > this.camera.x);
    this.breakables = this.breakables.filter((b) => b.x > this.camera.x);
  }

  // Guarda el avance al ganar cada pelea (punto de control).
  checkpoint() {
    this.game.saveProgress?.({ zone: this.zoneIndex, score: this.player.score, lives: this.lives, done: false, foodEaten: this.foodEaten });
  }

  // ---- Escenas ----

  // Al empezar: Corli (el pug) cruza, provoca a Tofu y se va corriendo.
  introScene() {
    return new Cutscene(this, [
      { wait: 1.2 },
      { run: (s) => {
        s.boss = new PugBoss(s, s.sheets.pug, s.camera.x + 1020, 470);
        s.boss.setState('script');
        s.boss.scriptX = s.player.x + 250;
        s.boss.scriptFace = -1;
      } },
      { until: (s) => Math.abs(s.boss.x - s.boss.scriptX) < 8, timeout: 4 },
      { run: (s) => {
        s.boss.scriptAnim = 'bark';
        s.sfx('bigBark');
        s.fx.text(s.boss.x, s.boss.y - 95, '¡GUAU!', '#ffd23f', 16);
        if (s.tofu) { s.tofu.temper = 60; s.tofu.facing = 1; }
      } },
      { say: 'pug', text: '¡GRRR... GUAU! (Este parque es mío, chiquita.)' },
      { say: 'tofu', text: '¡GRRRR! ¡GUAU GUAU!' },
      { say: 'faby', text: '…Otra vez tú, Corli. ¡Ya pues, déjanos pasear tranquilos!' },
      { run: (s) => { s.boss.scriptAnim = null; s.boss.scriptFace = 0; s.boss.scriptX = s.camera.x + 1100; } },
      { until: (s) => s.boss.x > s.camera.x + 1040, timeout: 4 },
      { run: (s) => { s.boss = null; } },
    ]);
  }

  // Zona del jefe: el Pug espera en la explanada.
  startBoss(z) {
    this.boss = new PugBoss(this, this.sheets.pug, z.max + 60, 460);
    this.boss.setState('script');
    this.boss.scriptX = z.max - 260;
    this.boss.scriptFace = -1;
    this.cutscene = new Cutscene(this, [
      { until: (s) => Math.abs(s.boss.x - s.boss.scriptX) < 8, timeout: 4 },
      { run: (s) => { s.boss.scriptAnim = 'tie'; } },
      { say: 'pug', text: '*Se ajusta la corbata* ¡GUAU! (Aquí se acaba tu paseo.)' },
      { say: 'faby', text: '¡Chuta, Corli otra vez! Tofu, quédate cerca. Vamos a arreglar esto.' },
      { run: (s) => {
        s.boss.scriptAnim = null;
        s.boss.setState('idle');
        s.boss.cooldown = 1;
        s.enemies.push(s.boss);
        s.lastEnemyHit = s.boss;
        s.banner = { text: '¡JEFE!', sub: 'CORLI, EL PUG DE TRAJE', time: 1.6 };
        s.music('boss');
      } },
    ]);
  }

  // El Pug cae mareado y llega su dueño gigante.
  onBossDefeated() {
    this.releaseToken(this.boss);
    this.player.score += 5000;
    this.music('victory');
    this.cutscene = new Cutscene(this, [
      { wait: 1.6 },
      { run: (s) => {
        s.enemies = s.enemies.filter((e) => e !== s.boss);
        s.owner = new Owner(s, s.camera.x + 1100, 470);
        s.owner.targetX = s.boss.x + 130;
        s.player.facing = 1;
      } },
      { until: (s) => !s.owner.moving && s.owner.t > 0.5, timeout: 5 },
      { say: 'owner', text: '¡¿QUÉ LE HICISTE A MI CORLI?!' },
      { say: 'faby', text: '¡¿Yo?! ¡Él empezó! ...Tofu, corre.' },
      { say: 'tofu', text: '¡GUAU! (¡Ya pues, vamos!)' },
      { wait: 0.4 },
      { run: (s) => {
        s.mode = 'ending';
        s.modeTime = 0;
        s.music('ending');
        s.game.saveProgress?.({ zone: 0, score: s.player.score, lives: s.lives, done: true });
      } },
    ]);
  }

  // Faby pierde una vida (por caer o porque Tofu se asustó). Sin vidas: game over.
  loseLife(msg) {
    this.lives--;
    this.sfx('lifeLost');
    if (this.lives <= 0) {
      this.mode = 'gameover';
      this.modeTime = 0;
      this.music('gameover');
      return;
    }
    this.banner = { text: msg, sub: `Vidas: ${this.lives}`, time: 2 };
    const p = this.player;
    if (p.carrying) p.stopCarry();
    p.hp = p.maxHp;
    p.removed = false;
    p.vx = p.vz = p.z = 0;
    p.setState('idle');
    p.invuln = 2.5;
    this.tofu?.restore();
    // Todos los enemigos cerca retroceden, como en los arcades.
    for (const e of this.enemies) if (e.alive && e.grounded) e.takeHit({ damage: 0, knockdown: true, hitstop: 0 }, p);
  }

  onTofuFrightened() {
    this.fx.text(this.tofu.x, this.tofu.y - 110, '¡TOFU SE ASUSTÓ!', '#ff2fa8', 14);
    this.loseLife('¡TOFU SE ASUSTÓ!');
  }

  updateButterfly(dt) {
    if (!this.tofu) return;
    if (this.butterfly) {
      this.butterfly.update(dt);
      if (this.butterfly.removed) this.butterfly = null;
      return;
    }
    const scripted = this.activeZone?.butterfly;
    if (scripted && this.zoneTime > scripted && !this.activeZone.butterflyDone) {
      this.activeZone.butterflyDone = true;
      this.spawnButterfly();
    } else if (!this.activeZone && (this.butterflyTimer -= dt) <= 0) {
      this.butterflyTimer = 25 + Math.random() * 20;
      this.spawnButterfly();
    }
  }

  spawnButterfly() {
    const cam = this.camera;
    const fromLeft = Math.random() < 0.5;
    this.butterfly = new Butterfly(this, fromLeft ? cam.x + 120 : cam.x + 840, 400 + Math.random() * 100);
  }

  // Faby celebra al despejar una zona si está libre para hacerlo.
  celebrate() {
    const p = this.player;
    if (['idle', 'walk', 'run', 'land'].includes(p.state) && p.anim.sheet.anims.victory) {
      p.vx = 0;
      p.setState('victory');
    }
  }

  updateZones(dt) {
    if (this.goTimer > 0) this.goTimer -= dt;
    this.zoneTime = (this.zoneTime ?? 0) + dt;
    if (this.activeZone) {
      if (this.enemies.length === 0) {
        this.activeZone = null;
        this.camera.lock = null;
        this.goTimer = 2.5;
        this.sfx('go');
        this.checkpoint();
        this.celebrate();
      }
      return;
    }
    const z = ZONES[this.zoneIndex];
    if (z && this.player.x > z.at) {
      this.activeZone = z;
      this.zoneIndex++;
      this.zoneTime = 0;
      this.camera.lock = { min: Math.max(this.camera.x, z.min), max: z.max };
      if (z.boss) {
        this.startBoss(z);
        return;
      }
      const count = {};
      z.enemies.forEach((type, i) => {
        const fromRight = i % 2 === 0;
        const x = fromRight ? z.max + 40 + i * 30 : this.camera.lock.min - 40 - i * 30;
        const y = FLOOR_TOP + 10 + Math.random() * (FLOOR_BOTTOM - FLOOR_TOP - 20);
        count[type] = (count[type] ?? -1) + 1;
        const e = type === 'dog'
          ? new Dog(this, this.sheets.dog, x, y)
          : new Enemy(this, this.variantSheet(type, count[type]), type, x, y);
        e.cooldown += i * 0.5;
        this.enemies.push(e);
      });
    }
  }

  draw(ctx, debug) {
    const cam = this.camera;
    const camX = Math.round(cam.x + cam.offsetX);
    ctx.save();
    ctx.translate(0, Math.round(cam.offsetY));
    this.bg.drawBack(ctx, camX);

    // Orden por profundidad: lo que está más abajo en pantalla se dibuja encima.
    const loneBoss = this.boss && !this.enemies.includes(this.boss) ? this.boss : null;
    const extra = [this.tofu, this.butterfly, this.owner, loneBoss].filter(Boolean);
    const actors = [this.player, ...extra, ...this.enemies, ...this.props, ...this.breakables, ...this.foods].sort((a, b) => a.y - b.y || (a.z ?? 0) - (b.z ?? 0));
    for (const a of actors) a.drawShadow(ctx, camX);
    for (const a of actors) a.draw(ctx, camX);

    this.fx.draw(ctx, camX);
    this.bg.drawFront(ctx, camX);
    if (debug) this.drawDebug(ctx, camX, actors);
    ctx.restore();

    this.drawHud(ctx);
  }

  drawDebug(ctx, camX, actors) {
    for (const a of actors) {
      if (!a.hurtWorld) continue;
      drawBox(ctx, a.hurtWorld(), camX, '#00ff88');
      const hit = a === this.player ? a.currentHit : null;
      if (hit && ['attack', 'air', 'runattack', 'special'].includes(a.state)) drawBox(ctx, worldBox(a, hit.box), camX, '#ff3355');
    }
    if (this.activeZone) {
      ctx.strokeStyle = '#ffd23f';
      ctx.strokeRect(this.camera.lock.min - camX, 0, this.camera.lock.max - this.camera.lock.min, VIEW_H);
    }
  }

  drawHud(ctx) {
    const p = this.player;
    // Retrato de Faby recortado del sprite
    const sheet = this.sheets.faby;
    const [sx, sy] = sheet.rects[sheet.anims.front.frames[0]];
    ctx.fillStyle = '#1b1030';
    ctx.fillRect(14, 14, 72, 64);
    ctx.drawImage(sheet.image, sx + 14, sy + 4, 68, 60, 16, 16, 68, 60);
    ctx.strokeStyle = '#ff2fa8';
    ctx.lineWidth = 2;
    ctx.strokeRect(15, 15, 70, 62);

    text(ctx, 'FABY', 96, 30, 14, '#ffffff');
    bar(ctx, 96, 40, 260, 14, p.hp / p.maxHp, COLORS.hpFaby);
    text(ctx, `${String(p.score).padStart(6, '0')}`, 96, 84, 12, '#ffd23f');
    text(ctx, `x${this.lives}`, 300, 84, 12, '#ffffff');

    if (this.tofu) this.drawTofuHud(ctx, this.tofu);

    if (p.comboShow > 0 && p.comboCount > 1) {
      text(ctx, `${p.comboCount} GOLPES`, 380, 30, 12, '#7df9ff');
    }

    // Barra de estamina justo debajo de la vida de Faby (solo en la pelea contra el jefe)
    if (p.staminaOn) {
      const tired = p.exhausted;
      const blink = tired && Math.floor(this.time * 6) % 2;
      bar(ctx, 96, 58, 260, 6, p.stamina / 100, blink ? '#ff3040' : tired ? '#b02030' : '#7dff7a');
      if (tired) text(ctx, '¡SIN AIRE!', 364, 66, 8, '#ff3040');
    }

    const e = this.lastEnemyHit;
    if (this.boss && this.enemies.includes(this.boss)) {
      // Barra grande del jefe
      text(ctx, this.boss.name, VIEW_W - 336, 30, 12, '#ffd23f');
      bar(ctx, VIEW_W - 336, 42, 320, 16, this.boss.hp / this.boss.maxHp, '#ff3040');
    } else if (e && e.alive && !e.isDog) {
      text(ctx, e.name, VIEW_W - 316, 30, 10, '#ffffff');
      bar(ctx, VIEW_W - 316, 40, 300, 12, e.hp / e.maxHp, COLORS.hpEnemy);
    }

    if (this.goTimer > 0 && Math.floor(this.goTimer * 4) % 2 === 0) {
      text(ctx, 'GO →', VIEW_W - 170, 200, 32, '#ffd23f');
    }

    if (this.areaBanner && !this.banner) {
      const a = this.areaBanner;
      const k = Math.min(1, a.time / 0.4, (3 - a.time) / 0.3);
      ctx.globalAlpha = Math.max(0, k);
      ctx.fillStyle = 'rgba(20, 12, 40, 0.55)';
      ctx.fillRect(VIEW_W / 2 - 230, 150, 460, 62);
      text(ctx, a.name, VIEW_W / 2, 180, 20, '#ffd23f', 'center');
      text(ctx, a.sub, VIEW_W / 2, 202, 10, '#ffffff', 'center');
      ctx.globalAlpha = 1;
    }

    if (this.banner) {
      text(ctx, this.banner.text, VIEW_W / 2, 220, 24, '#ff2fa8', 'center');
      text(ctx, this.banner.sub, VIEW_W / 2, 252, 12, '#ffffff', 'center');
    }

    this.cutscene?.draw(ctx);
    if (this.mode === 'gameover') overlay(ctx, 'GAME OVER', 'J/Enter: reintentar desde el punto de control · K: menú');
    if (this.mode === 'ending') this.drawEnding(ctx);
  }
}

// Pantalla final: Faby abraza a Tofu frente a la glorieta. "Gracias por jugar".
Stage.prototype.drawEnding = function drawEnding(ctx) {
  const k = Math.min(1, this.modeTime / 1.2);
  this.bg.drawBack(ctx, 1240);
  ctx.fillStyle = `rgba(20, 10, 40, ${0.55 * k})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (this.modeTime < 1.2) {
    text(ctx, 'CONTINUARÁ…', VIEW_W / 2, VIEW_H / 2, 28, '#ffffff', 'center');
    return;
  }
  const t = this.modeTime;
  // Faby con Tofu en brazos, ampliada al triple
  const sheet = this.sheets.faby;
  const anim = sheet.anims.carryIdle;
  if (anim) {
    const fi = anim.frames[Math.floor(t * 4) % anim.frames.length];
    const [sx, sy, sw, sh] = sheet.rects[fi];
    const [ax, ay] = anim.anchor;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sheet.image, sx, sy, sw, sh, 250 - ax * 3, 520 - ay * 3, sw * 3, sh * 3);
  }
  // Corazones que suben
  for (let i = 0; i < 7; i++) {
    const hx = 180 + ((i * 97) % 260);
    const hy = 470 - ((t * 60 + i * 70) % 420);
    heart(ctx, hx, hy, true);
  }
  ctx.fillStyle = 'rgba(20, 12, 40, 0.72)';
  ctx.fillRect(420, 110, 440, 310);
  ctx.strokeStyle = '#ff2fa8';
  ctx.lineWidth = 3;
  ctx.strokeRect(421.5, 111.5, 437, 307);
  text(ctx, '¡GRACIAS POR JUGAR!', 640, 150, 22, '#ff2fa8', 'center');
  text(ctx, 'FABY & TOFU', 640, 200, 16, '#7df9ff', 'center');
  text(ctx, 'Parque Lincoln · Cochabamba', 640, 228, 10, '#ffffff', 'center');
  text(ctx, `PUNTAJE  ${String(this.player.score).padStart(6, '0')}`, 640, 270, 14, '#ffd23f', 'center');
  // Lo que comió Faby en el paseo: ícono, nombre y cantidad.
  text(ctx, 'LO QUE COMISTE', 640, 302, 10, '#7df9ff', 'center');
  const names = { saltena: 'Salteña', api: 'Api con pastel', silpancho: 'Silpancho' };
  Object.keys(FOODS).forEach((type, i) => {
    const y = 318 + i * 30;
    const img = this.game.bgImages[type];
    if (img) {
      const k = Math.min(1, 26 / img.height);
      ctx.drawImage(img, 470, y, Math.round(img.width * k), Math.round(img.height * k));
    }
    text(ctx, names[type], 520, y + 18, 10, '#ffffff');
    text(ctx, `x${this.foodEaten[type] ?? 0}`, 800, y + 18, 12, '#ffd23f', 'right');
  });
  if (Math.floor(t * 2) % 2 === 0) text(ctx, 'J / ENTER PARA VOLVER AL INICIO', 640, 448, 10, '#ffd23f', 'center');
};

Stage.prototype.drawTofuHud = function drawTofuHud(ctx, t) {
  // Retrato de Tofu (cabeza recortada del sprite), corazones de ánimo y barra de temperamento.
  const sheet = this.sheets.tofu;
  const [sx, sy, sw] = sheet.rects[sheet.anims.idle.frames[0]];
  ctx.fillStyle = '#1b1030';
  ctx.fillRect(14, 88, 52, 44);
  ctx.drawImage(sheet.image, sx + sw / 2 - 2, sy + 12, 44, 40, 18, 90, 44, 40);
  ctx.strokeStyle = '#7df9ff';
  ctx.lineWidth = 2;
  ctx.strokeRect(15, 89, 50, 42);
  for (let i = 0; i < 5; i++) heart(ctx, 76 + i * 22, 96, i < t.mood);
  const angry = t.temper > 75 || t.state === 'furious';
  text(ctx, 'GENIO', 76, 128, 8, angry && Math.floor(performance.now() / 150) % 2 ? '#ff3040' : '#ffffff');
  bar(ctx, 124, 120, 110, 8, t.temper / 100, angry ? '#ff3040' : '#f28c28');
};

// Corazón de 7x6 "píxeles" escalado ×2.
function heart(ctx, x, y, full) {
  const rows = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'];
  ctx.fillStyle = '#140c1c';
  ctx.fillRect(x - 2, y - 2, 18, 16);
  rows.forEach((r, j) => [...r].forEach((c, i) => {
    if (c === '1') {
      ctx.fillStyle = full ? (j === 1 && i < 3 ? '#ff9ad5' : '#ff2fa8') : '#3a2a4a';
      ctx.fillRect(x + i * 2, y + j * 2, 2, 2);
    }
  }));
}

function text(ctx, str, x, y, size, color, align = 'left') {
  str = fontSafe(str);
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.fillStyle = COLORS.hudShadow;
  ctx.fillText(str, x + 2, y + 2);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function bar(ctx, x, y, w, h, k, color) {
  ctx.fillStyle = '#140c1c';
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = COLORS.hpBack;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.round(w * Math.max(0, k)), h);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x, y, Math.round(w * Math.max(0, k)), 3);
}

export function overlay(ctx, title, sub) {
  ctx.fillStyle = 'rgba(15, 8, 30, 0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  text(ctx, title, VIEW_W / 2, VIEW_H / 2 - 10, 32, '#ff2fa8', 'center');
  text(ctx, sub, VIEW_W / 2, VIEW_H / 2 + 36, 12, '#ffffff', 'center');
}

export { text as hudText };
