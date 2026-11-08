import { VIEW_H } from '../config.js';
import { Cutscene } from './cutscene.js';
import { MinaBackground } from './mina.js';
import { DevilBoss } from '../entities/devilBoss.js';
import { Gent } from '../entities/gent.js';
import { Bat } from '../entities/bat.js';
import { Puddle, FallingRock } from '../entities/hazards.js';

// NIVEL 5: La Mina del Socavón. Después del Carnaval, Faby y Tofu entran a la mina que está bajo el
// santuario. Se baja en zigzag: cada piso es un tramo horizontal y se recorre en sentido contrario al
// anterior (al final de cada túnel hay una rampa). Los murciélagos asustan a Tofu, que salta a los
// brazos de Faby; los diablitos salen de las cuevas de las paredes. Abajo espera un señor elegante
// con chistera que le ofrece un contrato a Faby… y es el Diablo.

// Pisos: x0..x1 en el mundo y sentido de avance.
const FLOORS = [
  { x0: 0, x1: 1300, dir: 1 },          // 0: afuera, la boca de la mina
  { x0: 1500, x1: 3600, dir: 1 },       // 1: los rieles
  { x0: 3800, x1: 5900, dir: -1 },      // 2: la veta de plata
  { x0: 6100, x1: 8200, dir: 1 },       // 3: las goteras
  { x0: 8400, x1: 10500, dir: -1 },     // 4: la galería roja
  { x0: 10700, x1: 11800, dir: 1 },     // 5: la cámara del Diablo
];
const WORLD_W = 11800;
const CHAMBER_X = (FLOORS[5].x0 + FLOORS[5].x1) / 2;

const ZONES = [
  { floor: 1, at: 2100, min: 1700, max: 2700, enemies: ['imp', 'imp', 'imp'], caves: [2420] },
  { floor: 1, at: 2950, min: 2600, max: 3600, enemies: ['imp', 'impFork', 'imp'], caves: [3260], bats: 5 },
  { floor: 2, at: 5350, min: 4850, max: 5900, enemies: ['impFork', 'imp', 'imp', 'impFork'], caves: [5150] },
  { floor: 2, at: 4550, min: 3800, max: 4800, enemies: ['imp', 'impThrow', 'impFork', 'imp'], caves: [4250], bats: 7 },
  { floor: 3, at: 6650, min: 6250, max: 7250, enemies: ['impThrow', 'imp', 'impFork', 'imp'], caves: [6980] },
  { floor: 3, at: 7550, min: 7200, max: 8200, enemies: ['imp', 'impFork', 'impThrow', 'imp'], caves: [7880], bats: 6 },
  { floor: 4, at: 9950, min: 9450, max: 10500, enemies: ['impFork', 'impThrow', 'imp', 'imp', 'impFork'], caves: [9740] },
  { floor: 4, at: 8950, min: 8400, max: 9400, enemies: ['impThrow', 'impFork', 'imp', 'impThrow', 'imp'], caves: [8700], bats: 6 },
  { floor: 5, at: 10950, min: 10700, max: 11800, boss: true },
];

// Piezas del fondo por piso (x del centro en el mundo, base en pantalla).
const PIECES = [];
const beams = (floor, from, to) => { for (let x = from; x <= to; x += 520) PIECES.push({ img: 'm_beam', floor, x, base: 376 }); };
beams(1, 1700, 3500); beams(2, 3950, 5800); beams(3, 6250, 8100); beams(4, 8550, 10400);
for (const p of PIECES) p.scale = 2.3;
for (const z of ZONES) for (const x of z.caves ?? []) PIECES.push({ img: 'm_cave', floor: z.floor, x, base: 374, scale: 1.3 });
PIECES.push(
  { img: 'm_tio', floor: 1, x: 2760, base: 372, scale: 1.4 },
  { img: 'm_vein', floor: 2, x: 5600, base: 378 },
  { img: 'm_vein', floor: 2, x: 4980, base: 378, flip: true },
  { img: 'm_vein', floor: 2, x: 4480, base: 378 },
  { img: 'm_vein', floor: 4, x: 9200, base: 378, flip: true },
  { img: 'm_pillar', floor: 4, x: 10180, base: 376, scale: 1.6 },
  { img: 'm_pillar', floor: 4, x: 8650, base: 376, scale: 1.6, flip: true },
  { img: 'm_pillar', floor: 5, x: 10820, base: 380, scale: 2 },
  { img: 'm_pillar', floor: 5, x: 11680, base: 380, scale: 2, flip: true },
  // Rampas al final de cada túnel
  { img: 'm_ladder', floor: 1, x: 3460, base: 400 },
  { img: 'm_ladder', floor: 2, x: 3940, base: 400, flip: true },
  { img: 'm_ladder', floor: 3, x: 8060, base: 400 },
  { img: 'm_ladder', floor: 4, x: 8540, base: 400, flip: true },
);

// Velas rojas alrededor del círculo (son actores para que Faby pueda pasar por delante o por detrás).
class Candle {
  constructor(stage, i, x, y) {
    this.stage = stage;
    this.i = i;
    this.x = x;
    this.y = y;
    this.z = 0;
    this.removed = false;
  }

  update() {}

  drawShadow(ctx, camX) {
    ctx.fillStyle = 'rgba(10, 4, 8, 0.4)';
    ctx.beginPath();
    ctx.ellipse(Math.round(this.x - camX), Math.round(this.y), 16, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  draw(ctx, camX) {
    const st = this.stage;
    const lit = this.i < (st.candlesLit ?? 0);
    const img = st.game.bgImages[lit ? 'm_candle' : 'm_candle_off'];
    const x = Math.round(this.x - camX), y = Math.round(this.y);
    if (lit) {
      const f = 0.85 + Math.sin(st.time * 11 + this.i * 1.7) * 0.15;
      const g = ctx.createRadialGradient(x, y - 70, 3, x, y - 70, 60 * f);
      g.addColorStop(0, 'rgba(255, 140, 60, 0.4)');
      g.addColorStop(1, 'rgba(255, 140, 60, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 60, y - 130, 120, 120);
    }
    if (!img) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, x - Math.round(img.width / 2), y - img.height);
  }
}

function placeCandles(s) {
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2 - Math.PI / 2;
    s.hazards.push(new Candle(s, i, CHAMBER_X + Math.cos(a) * 370, 456 + Math.sin(a) * 82));
  }
}

// Carritos mineros del piso 1: son actores ordenados por profundidad, así Faby y Tofu pasan
// por delante o por detrás, nunca encima. Las ruedas se apoyan en el primer par de rieles.
const CARTS = [[1980, 456, false], [3050, 456, true]];
const CART_HW = 66, CART_HD = 14;   // medio ancho y media profundidad de la base del carrito

class Cart {
  constructor(stage, x, y, flip) {
    this.stage = stage;
    this.x = x;
    this.y = y;
    this.z = 0;
    this.flip = flip;
    this.removed = false;
  }

  // Es sólido: quien choca con su base (Faby, Tofu, diablitos) sale por el lado más corto,
  // así se lo rodea por delante o por detrás sin poder atravesarlo por el medio.
  update() {
    const st = this.stage;
    for (const a of [st.player, st.tofu, ...st.enemies]) {
      if (!a || (a.z ?? 0) > 40) continue;
      const dx = a.x - this.x, dy = a.y - this.y;
      const ox = CART_HW - Math.abs(dx), oy = CART_HD - Math.abs(dy);
      if (ox <= 0 || oy <= 0) continue;
      if (oy < ox) a.y += dy < 0 ? -oy : oy;
      else {
        a.x += dx < 0 ? -ox : ox;
        // Los que no maneja el jugador se deslizan hacia el borde más cercano para rodearlo.
        if (a !== st.player) a.y += (dy < 0 ? -1 : 1) * 3;
      }
    }
  }

  drawShadow(ctx, camX) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(Math.round(this.x - camX), Math.round(this.y), 120, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  draw(ctx, camX) {
    const img = this.stage.game.bgImages.m_cart;
    if (!img) return;
    const x = Math.round(this.x - camX);
    const w = img.width * 2, h = img.height * 2;
    if (x + w / 2 < -40 || x - w / 2 > 1000) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(x, Math.round(this.y));
    if (this.flip) ctx.scale(-1, 1);
    ctx.drawImage(img, -w / 2, -h, w, h);
    ctx.restore();
  }
}

// Charcos de agua del piso 3 (resbalan, como los batidos del nivel 2).
const PUDDLES = [[6450, 470], [6820, 420], [7120, 500], [7420, 450], [7720, 410], [7980, 490]];

class WaterPuddle extends Puddle {
  constructor(stage, x, y) {
    super(stage, x, y);
    this.life = Infinity;
  }

  draw(ctx, camX) {
    const x = Math.round(this.x - camX), y = Math.round(this.y);
    ctx.fillStyle = 'rgba(70, 150, 210, 0.7)';
    ctx.beginPath();
    ctx.ellipse(x, y, 44, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(200, 240, 255, 0.8)';
    ctx.fillRect(x - 18, y - 4, 10, 2);
    ctx.fillRect(x + 8, y + 2, 6, 2);
  }
}

const AREAS = [
  { floor: 0, x: 0, name: 'LA MINA DEL SOCAVÓN', sub: 'Oruro · Bajo el santuario' },
  { floor: 1, x: 1500, name: 'PISO 1: LOS RIELES', sub: 'Carritos mineros y lámparas' },
  { floor: 2, x: 5900, name: 'PISO 2: LA VETA DE PLATA', sub: 'Cuidado con los tridentes' },
  { floor: 3, x: 6100, name: 'PISO 3: LAS GOTERAS', sub: '¡El piso resbala!' },
  { floor: 4, x: 10500, name: 'PISO 4: LA GALERÍA ROJA', sub: 'Hace cada vez más calor…' },
  { floor: 5, x: 10700, name: 'LA CÁMARA PROFUNDA', sub: '¿Hay alguien ahí?' },
];

export const LEVEL5 = {
  num: 5,
  worldW: WORLD_W,
  music: 'mina',
  floors: FLOORS,
  makeBg: (images) => new MinaBackground(WORLD_W, images, FLOORS, PIECES),
  props: [[2250, 470, 'bottle'], [5050, 440, 'bottle'], [7300, 480, 'bottle'], [9600, 460, 'bottle']],
  boxes: [[2600, 392], [4700, 390, 'api'], [6900, 392], [9200, 390, 'silpancho']],
  areas: AREAS,
  zones: ZONES,
  events: [
    // Murciélagos antes de las peleas
    { floor: 1, x: 1850, scene: (s) => bats(s, 4) },
    { floor: 2, x: 5650, scene: (s) => bats(s, 5) },
    { floor: 3, x: 6400, scene: (s) => bats(s, 5) },
    { floor: 4, x: 10200, scene: (s) => bats(s, 6) },
    // Rampas al piso de abajo
    { floor: 1, x: 3380, scene: (s) => descend(s, 2) },
    { floor: 2, x: 4020, scene: (s) => descend(s, 3) },
    { floor: 3, x: 7980, scene: (s) => descend(s, 4) },
    { floor: 4, x: 8620, scene: (s) => descend(s, 5) },
  ],
  intro: introScene,
  startBoss,
  onBossDefeated,
  setup(s) {
    s.bg.stage = s;
    s.candlesLit = 0;
    s.circleGlow = 0.2;
    s.smoke = null;
    s.rumble = 0;
    for (const [x, y] of PUDDLES) {
      const p = new WaterPuddle(s, x, y);
      p.floor = 3;
      s.hazards.push(p);
    }
  },
  // Cada piso: murciélagos a mitad de pelea, el humo del Diablo, velas y temblor.
  update(s, dt) {
    if (s.floor === 1 && !s.hazards.some((h) => h instanceof Cart)) {
      for (const [x, y, flip] of CARTS) s.hazards.push(new Cart(s, x, y, flip));
    }
    const z = s.activeZone;
    if (z?.bats && !z.batsDone && s.zoneTime > z.bats) {
      z.batsDone = true;
      bats(s, 4);
    }
    if (s.smoke) {
      s.smoke.t += dt;
      if (s.smoke.t > 3.5) s.smoke = null;
    }
    // Las velas se encienden una por una a medida que el Diablo pierde vida.
    const b = s.boss;
    if (b?.isBoss && b.alive && s.enemies.includes(b)) {
      const want = Math.min(12, 4 + Math.floor((1 - b.hp / b.maxHp) * 9));
      if (want > s.candlesLit) {
        s.candlesLit = want;
        s.sfx('fire');
      }
      s.circleGlow = b.phase === 3 ? 1 : b.phase === 2 ? 0.7 : 0.5;
    }
    if (s.rumble > 0) {
      s.rumble -= dt;
      s.camera.shake(4, 0.2);
      s.rockTimer = (s.rockTimer ?? 0) - dt;
      if (s.rockTimer <= 0) {
        s.rockTimer = 0.25;
        const cam = s.camera;
        s.hazards.push(new FallingRock(s, cam.left + 60 + Math.random() * 840, 400 + Math.random() * 120, 0));
      }
    }
  },
  drawFx(s, ctx, camX) {
    if (!s.smoke) return;
    // Humo del Diablo: nubes que crecen y se disipan.
    const { x, y, t } = s.smoke;
    const k = Math.min(1, t / 0.6) * (t > 2.4 ? Math.max(0, 1 - (t - 2.4) / 1.1) : 1);
    for (let i = 0; i < 16; i++) {
      const a = i * 2.4;
      const r = 40 + (i % 4) * 22 + t * 30;
      const px = Math.round(x - camX + Math.cos(a) * r * 0.9);
      const py = Math.round(y - 110 + Math.sin(a) * r * 0.7 - t * 20);
      ctx.fillStyle = `rgba(${40 + (i % 3) * 20}, 20, 30, ${0.75 * k})`;
      ctx.beginPath();
      ctx.arc(px, py, 46 + (i % 3) * 14, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = `rgba(120, 10, 20, ${0.25 * k})`;
    ctx.fillRect(0, 0, 960, 540);
  },
};

// Bandada de murciélagos que viene de frente.
function bats(s, n) {
  const cam = s.camera;
  const dir = -s.dir;
  const startX = dir < 0 ? cam.x + 1000 : cam.x - 40;
  s.sfx('bats');
  s.fx.text(s.player.x + s.dir * 200, 200, '¡MURCIÉLAGOS!', '#c38bff', 12);
  for (let i = 0; i < n; i++) s.hazards.push(new Bat(s, startX - dir * i * 40, 420 + Math.random() * 90, dir, i * 0.18));
  return null;
}

// Bajar por la rampa al piso siguiente: la cámara baja y Faby y Tofu aparecen abajo, avanzando al revés.
function descend(s, to) {
  const p = s.player;
  const t = s.tofu;
  return new Cutscene(s, [
    { run: (s) => {
      const f = FLOORS[s.floor];
      const ex = f.dir > 0 ? f.x1 - 140 : f.x0 + 140;
      p.script = { x: ex, y: 440, speed: 180 };
      if (t && t.state !== 'carried') t.script = { x: ex - f.dir * 60, y: 456, speed: 180 };
      s.fx.text(ex, 300, '↓', '#ffd23f', 24);
    } },
    { until: () => p.script?.arrived, timeout: 4 },
    { run: (s) => s.sfx('jump') },
    { until: (s, dt) => (s.shiftY -= 1000 * dt) <= -VIEW_H, timeout: 2 },
    { run: (s) => {
      p.script = null;
      if (t) t.script = null;
      s.hazards = s.hazards.filter((h) => h instanceof WaterPuddle);
      s.enterFloor(to);
      s.shiftY = VIEW_H;
    } },
    { until: (s, dt) => (s.shiftY = Math.max(0, s.shiftY - 1000 * dt)) <= 0, timeout: 2 },
    { run: (s) => {
      s.shiftY = 0;
      s.sfx('land');
      if (to === 5 && s.game.bgImages.m_candle) placeCandles(s);
    } },
  ]);
}

// Llegada a la mina después del Carnaval: entran por la boca de la mina.
function introScene(s) {
  const p = s.player;
  const t = s.tofu;
  return new Cutscene(s, [
    { wait: 0.6 },
    { say: 'faby', text: 'Ya amaneció en Oruro… Dicen que debajo del Socavón hay una mina antiquísima.' },
    { say: 'tofu', text: 'Guau… (¿Y si mejor volvemos a bailar?)' },
    { say: 'faby', text: '¡Solo un ratito, Tofu! Vamos a ver qué hay adentro.' },
    { run: () => {
      p.script = { x: 1010, y: 440, speed: 150 };
      if (t) t.script = { x: 950, y: 456, speed: 150 };
    } },
    { until: () => p.script?.arrived, timeout: 9 },
    { until: (s, dt) => (s.fade = Math.min(1, s.fade + dt * 1.5)) >= 1, timeout: 2 },
    { run: (s) => {
      p.script = null;
      if (t) t.script = null;
      s.enterFloor(1);
    } },
    { until: (s, dt) => (s.fade = Math.max(0, s.fade - dt * 1.2)) <= 0, timeout: 2 },
    { say: 'faby', text: 'Qué oscuro… Quédate cerca, Tofu.' },
  ]);
}

// La cámara profunda: el señor de la chistera ofrece un contrato… y es el Diablo.
function startBoss(s, z) {
  const p = s.player;
  const t = s.tofu;
  if (p.carrying) p.stopCarry();
  s.gent = new Gent(s, CHAMBER_X + 160, 452);
  if (s.game.bgImages.m_candle && !s.hazards.some((h) => h instanceof Candle)) placeCandles(s);
  return (s.cutscene = new Cutscene(s, [
    { run: () => {
      p.script = { x: CHAMBER_X - 120, y: 452, face: 1 };
      if (t) t.script = { x: CHAMBER_X - 190, y: 468, face: 1 };
    } },
    { until: () => p.script?.arrived, timeout: 5 },
    { say: 'faby', text: '¿Señor? ¿Está perdido? Esta mina es peligrosa…' },
    { run: () => s.gent.play('offer') },
    { say: 'gent', text: 'No, señorita… pero puedo ofrecerte lo que tú quieras.' },
    { say: 'gent', text: 'Firma este contrato y tendrás todo lo que desees. Fama, fortuna… ¡lo que pidas!' },
    { run: (s) => { s.sfx('bigBark'); if (t) t.temper = 70; } },
    { say: 'tofu', text: '¡GUAU GUAU! (¡No firmes, Faby! ¡Es una trampa!)' },
    { say: 'faby', text: '¡Ni loca! Déjeme tranquila, señor.' },
    { run: () => s.gent.play('angry') },
    { say: 'gent', text: 'Nadie… le dice que no… ¡A MÍ!' },
    { run: (s) => {
      s.smoke = { x: s.gent.x, y: s.gent.y, t: 0 };
      s.sfx('smoke');
      s.camera.shake(8, 0.8);
      s.music(null);
    } },
    { wait: 1.1 },
    { run: (s) => {
      s.gent = null;
      s.boss = new DevilBoss(s, s.sheets.devil, CHAMBER_X + 200, 452);
      s.boss.setState('script');
      s.boss.scriptFace = -1;
      s.candlesLit = 4;
      s.circleGlow = 0.6;
      s.sfx('fire');
    } },
    { wait: 1.6 },
    { say: 'devil', text: '¡JA, JA, JA! ¡Entonces te quedarás aquí abajo para siempre!' },
    { say: 'faby', text: '¡¿EL DIABLO?! …Tofu, quédate cerca. ¡Vamos!' },
    { run: (s) => {
      p.script = null;
      if (t) t.script = null;
      s.boss.setState('idle');
      s.boss.cooldown = 1.2;
      s.enemies.push(s.boss);
      s.lastEnemyHit = s.boss;
      s.banner = { text: '¡JEFE!', sub: 'EL DIABLO', time: 1.6 };
      s.music('boss5');
    } },
  ]));
}

// El Diablo cae, vuelve a ser el señor de la chistera y escapa. La mina empieza a temblar.
function onBossDefeated(s) {
  s.releaseToken(s.boss);
  s.player.score += 8000;
  s.hazards = s.hazards.filter((h) => h instanceof WaterPuddle || h instanceof Candle);
  s.music('victory');
  const p = s.player;
  const t = s.tofu;
  s.cutscene = new Cutscene(s, [
    { wait: 1.8 },
    { run: (s) => {
      for (const e of s.enemies) if (e !== s.boss) e.takeHit?.({ damage: 999, knockdown: true, hitstop: 0 }, p);
      s.smoke = { x: s.boss.x, y: s.boss.y, t: 0 };
      s.sfx('smoke');
    } },
    { wait: 1.1 },
    { run: (s) => {
      const bx = s.boss.x;
      s.enemies = s.enemies.filter((e) => e !== s.boss);
      s.boss = null;
      s.gent = new Gent(s, bx, 452);
      s.gent.facing = p.x < bx ? -1 : 1;
      s.gent.play('angry');
      s.candlesLit = 12;
    } },
    { wait: 1.2 },
    { say: 'gent', text: '¡¿Cómo…?! ¡¿Una chiquita y un perrito?!' },
    { say: 'gent', text: '¡Ese perro… se arrepentirá!' },
    { run: (s) => {
      s.smoke = { x: s.gent.x, y: s.gent.y, t: 0.5 };
      s.sfx('smoke');
    } },
    { wait: 0.7 },
    { run: (s) => { s.gent = null; } },
    { wait: 0.8 },
    // Las velas se apagan y la mina empieza a temblar.
    { until: (s, dt) => {
      s.candleOff = (s.candleOff ?? 0) + dt;
      if (s.candleOff > 0.12) { s.candleOff = 0; s.candlesLit = Math.max(0, s.candlesLit - 1); }
      return s.candlesLit <= 0;
    }, timeout: 3 },
    { run: (s) => {
      s.circleGlow = 0.1;
      s.rumble = 9;
      s.sfx('rumble');
      s.music(null);
    } },
    { wait: 1 },
    { say: 'faby', text: '¡La mina está temblando! ¡Tofu, ven a mis brazos!' },
    { run: () => {
      if (t) { t.script = null; t.x = p.x + 30; t.y = p.y + 4; }
      p.script = null;
      if (t && t.state !== 'carried') p.startCarry(t);
      p.facing = 1;
    } },
    { say: 'tofu', text: '¡GUAU! (¡Corre, Faby, corre!)' },
    { run: (s) => { s.sfx('rumble'); s.whiteout = 0.1; } },
    { wait: 0.8 },
    { run: (s) => {
      s.rumble = 0;
      if (p.carrying) p.stopCarry();
      s.finishLevel();
    } },
  ]);
}
