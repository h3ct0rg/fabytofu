import { Cutscene } from './cutscene.js';
import { PradoBackground } from './prado.js';
import { Morita } from '../entities/morita.js';
import { Owner } from '../entities/owner.js';
import { BilletesBoss } from '../entities/billetesBoss.js';
import { CroquetteBag, FoodBowl } from '../entities/items.js';

// NIVEL 2: El Prado (Av. Ballivián, Cochabamba) un domingo.
// Doña Billetes se llevó a Morita, una perrita hambrienta. Faby y Tofu cruzan El Prado
// peleando con sus vendedores de comida "fit", juntando croquetas para Morita.

const WORLD_W = 3600;

export const LEVEL2 = {
  num: 2,
  worldW: WORLD_W,
  music: 'prado',
  makeBg: (images) => new PradoBackground(WORLD_W, images),

  props: [
    [420, 480, 'bottle'], [1180, 410, 'treat'], [1460, 470, 'treat'], [1700, 430, 'bottle'],
    [2350, 490, 'bottle'], [2480, 420, 'treat'],
  ],
  // Cajas de delivery (comida para Faby).
  boxes: [[860, 392], [1900, 390, 'api'], [2700, 388, 'silpancho']],
  // Bolsitas de croquetas para Morita (x, y).
  bags: [[640, 470], [1000, 430], [1250, 500], [1560, 440], [1820, 495], [2230, 450], [2620, 480], [2800, 430]],

  areas: [
    { x: 0, name: 'EL PRADO', sub: 'Cochabamba · Domingo de paseo' },
    { x: 560, name: 'LOS PUESTOS DE JUGOS', sub: 'Jugos, frutas… y batidos "detox"' },
    { x: 1360, name: 'LA FERIA DE MASCOTAS', sub: 'Auspicia: FitPet' },
    { x: 2080, name: 'EL BULEVAR', sub: 'Bancas, árboles y palmeras' },
    { x: 2860, name: 'LA ROTONDA', sub: 'El monumento' },
  ],

  zones: [
    { at: 560, min: 300, max: 1260, enemies: ['shake', 'shake'] },
    { at: 1360, min: 1100, max: 2060, enemies: ['influ', 'chihuahua', 'shake', 'influ'] },
    { at: 2160, min: 1940, max: 2900, enemies: ['coach', 'influ', 'shake', 'coach'] },
    { at: 2960, min: 2640, max: 3600, boss: true },
  ],

  // Escenas que se disparan al pasar por un punto (fuera de las peleas).
  events: [{ x: 2090, scene: corliScene }],

  setup(s) {
    s.croquettes = s.save?.croquettes ?? 0;
    s.croquettesLost = 0;
    const from = s.save?.zone > 0 ? s.camera.x : -1;
    for (const [x, y] of LEVEL2.bags) if (x > from + 200) s.foods.push(new CroquetteBag(s, x, y));
  },

  intro: introScene,
  startBoss,
  onBossDefeated,
  // Doña Billetes llama a sus vendedores por celular.
  summon(s, n) {
    const cam = s.camera;
    for (let i = 0; i < n; i++) {
      const type = i % 2 ? 'influ' : 'shake';
      const fromRight = i % 2 === 0;
      s.spawnEnemy(type, fromRight ? cam.right + 40 + i * 30 : cam.left - 40 - i * 30, 400 + Math.random() * 110);
    }
  },
};

// ---- Escenas ----

// Al empezar: Morita mira la comida con hambre; Faby le da croquetas y llega Doña Billetes.
function introScene(s) {
  return new Cutscene(s, [
    { run: (s) => {
      s.morita = new Morita(s, s.player.x + 300, 462);
      s.morita.facing = -1;
      s.morita.play('idle');
    } },
    { wait: 1 },
    { run: (s) => s.morita.play('howl') },
    { wait: 1.2 },
    { say: 'faby', text: '¡Ay, qué flaquita! ¿Tienes hambre, chiquita? Toma, unas croquetitas.' },
    { run: (s) => {
      if (s.tofu) { s.tofu.temper = 45; s.tofu.facing = 1; }
      s.sfx('growl');
    } },
    { say: 'tofu', text: 'Grrr… (¿Y esta quién es?)' },
    { say: 'tofu', text: '…Guau. (Bueno, ya. Pobrecita.)' },
    { run: (s) => {
      s.morita.facing = -1;
      s.morita.walkTo(s.player.x + 130);
    } },
    { until: (s) => Math.abs(s.morita.x - s.morita.targetX) < 4, timeout: 3 },
    { run: (s) => {
      s.morita.play('eat');
      s.boss = new BilletesBoss(s, s.sheets.billetes, s.camera.x + 1040, 462);
      s.boss.setState('script');
      s.boss.scriptX = s.morita.x + 70;
      s.boss.scriptFace = -1;
      s.boss.scriptSpeed = 230;
    } },
    { until: (s) => Math.abs(s.boss.x - s.boss.scriptX) < 8, timeout: 4 },
    { run: (s) => {
      s.boss.scriptAnim = 'scold';
      s.boss.anim.play('scold', true);
      s.morita.play('tremble');
      s.camera.shake(4, 0.2);
    } },
    { say: 'billetes', text: '¡¡MORITA NO COME ESAS COCHINADAS!!' },
    { say: 'billetes', text: 'Ella come comida FitPet: cero grasa, cero azúcar… ¡cero todo!' },
    { say: 'faby', text: '¡Pero señora, si son croquetas de perrito! ¡Está muerta de hambre!' },
    { say: 'billetes', text: 'Mi perra, mis reglas. Y mis vendedores andan por todo El Prado. ¡Ni se les ocurra seguirme!' },
    { run: (s) => {
      s.morita.carrier = s.boss;
      s.morita.play('howl');
      s.boss.scriptAnim = null;
      s.boss.scriptX = s.camera.x + 1120;
    } },
    { until: (s) => s.boss.x > s.camera.x + 1060, timeout: 6 },
    { run: (s) => {
      s.boss = null;
      s.morita = null;
      s.fx.text(s.camera.x + 880, 300, '¡AUUUU…!', '#ffb3d9', 14);
      s.sfx('howl');
    } },
    { say: 'faby', text: '¡Pobre Morita! Tofu, vamos a juntar croquetas para ella. ¡La vamos a rescatar!' },
    { say: 'tofu', text: '¡GUAU GUAU! (¡Vamos!)' },
  ]);
}

// A mitad del nivel: el dueño de Corli, con Corli en brazos, promete venganza.
function corliScene(s) {
  return new Cutscene(s, [
    { run: (s) => {
      s.owner = new Owner(s, s.camera.x + 1100, 470);
      s.owner.holding = 'pug';
      s.owner.targetX = s.player.x + 260;
      s.player.facing = 1;
    } },
    { until: (s) => !s.owner.moving && s.owner.t > 0.5, timeout: 5 },
    { say: 'owner', text: '¡USTEDES! ¿Creen que esto terminó?' },
    { run: (s) => {
      s.fx.text(s.owner.x - 20, s.owner.y - 170, '¡HIC!', '#ffd23f', 14);
      s.sfx('dogBark');
    } },
    { say: 'pug', text: '¡GRRR… ¡HIC! ¡GUA… ¡HIC!' },
    { run: (s) => {
      if (s.tofu) { s.tofu.temper = Math.min(100, s.tofu.temper + 30); s.tofu.facing = 1; }
      s.sfx('growl');
    } },
    { say: 'tofu', text: '¡GRRRRR! (¡Atrás de Faby!)' },
    { say: 'owner', text: 'Cuando Corli se recupere… ¡ya sabrán de nosotros!' },
    { run: (s) => {
      s.owner.targetX = s.camera.x + 1160;
      s.owner.vigilando = true;
    } },
    { wait: 1.2 },
    { run: (s) => s.fx.text(s.owner.x, s.owner.y - 230, '*TE ESTOY VIGILANDO*', '#ffffff', 10) },
    { until: (s) => s.owner.x > s.camera.x + 1080, timeout: 5 },
    { run: (s) => {
      s.owner = null;
      s.fx.text(s.camera.x + 880, 300, '¡AUUUU…!', '#ffb3d9', 14);
      s.sfx('howl');
    } },
    { say: 'faby', text: '…¿Y a este qué le pasa? Bueno, ¡vamos! Morita nos necesita.' },
  ]);
}

// La rotonda: Doña Billetes espera con Morita temblando junto al monumento.
function startBoss(s, z) {
  s.morita = new Morita(s, z.max - 140, 420);
  s.morita.facing = -1;
  s.morita.play('tremble');
  s.boss = new BilletesBoss(s, s.sheets.billetes, z.max + 80, 462);
  s.boss.setState('script');
  s.boss.scriptX = z.max - 300;
  s.boss.scriptFace = -1;
  s.boss.scriptSpeed = 220;
  s.cutscene = new Cutscene(s, [
    { until: (s) => Math.abs(s.boss.x - s.boss.scriptX) < 8, timeout: 4 },
    { run: (s) => { s.boss.scriptAnim = 'scold'; } },
    { say: 'billetes', text: '¿Otra vez ustedes? ¡Morita está A DIETA!' },
    { say: 'faby', text: '¡Está temblando de hambre! Le trajimos croquetas, déjela comer.' },
    { say: 'billetes', text: 'Esto se arregla como en el gimnasio… ¡A SUDAR!' },
    { run: (s) => {
      s.boss.scriptAnim = null;
      s.boss.setState('idle');
      s.boss.cooldown = 1;
      s.enemies.push(s.boss);
      s.lastEnemyHit = s.boss;
      s.banner = { text: '¡JEFA!', sub: 'DOÑA BILLETES', time: 1.6 };
      s.music('boss2');
    } },
  ]);
}

// Doña Billetes cae rendida. Tofu le lleva a Morita un plato con todas las croquetas que juntaron;
// Morita deja de temblar, se acerca y come feliz mientras Faby y Tofu la miran.
function onBossDefeated(s) {
  s.releaseToken(s.boss);
  s.player.score += 5000;
  s.hazards = [];
  s.music('victory');
  const m = s.morita;
  const t = s.tofu;
  const p = s.player;
  // Todo pasa en el carril de adelante, para que Doña Billetes (sentada) no tape nada.
  const bowlX = m.x - 70;
  const bowlY = 500;
  const near = (a) => !a || a.script?.arrived;
  s.cutscene = new Cutscene(s, [
    { wait: 1.6 },
    { run: (s) => {
      s.enemies = s.enemies.filter((e) => e !== s.boss);
      for (const e of s.enemies) e.takeHit?.({ damage: 999, knockdown: true, hitstop: 0 }, p);
      // Faby saca el plato y lo deja en el suelo; Tofu se pone detrás para empujarlo.
      p.script = { x: m.x - 340, y: bowlY + 12, face: 1 };
      if (t) t.script = { x: m.x - 290, y: bowlY - 3, face: 1 };
    } },
    { until: () => near(p) && near(t), timeout: 5 },
    { run: (s) => {
      s.bowl = new FoodBowl(s, (t ?? p).x + 36, bowlY);
      s.foods.push(s.bowl);
      s.sfx('pickup');
      s.fx.text(s.bowl.x, m.y - 60, `¡CROQUETAS x${Math.max(1, s.croquettes)}!`, '#ffd23f', 12);
    } },
    { say: 'faby', text: 'Tofu, llévale esto a Morita. ¡Con cuidadito!' },
    // Tofu empuja el plato con el hocico hasta Morita.
    { run: (s) => {
      if (!t) { s.bowl.x = bowlX; s.bowl.y = bowlY; return; }
      s.bowl.pusher = t;
      t.script = { x: bowlX - 36, y: bowlY - 3, face: 1, speed: 70 };
    } },
    { until: () => near(t), timeout: 7 },
    { run: (s) => {
      s.bowl.pusher = null;
      s.fx.text(s.bowl.x, m.y - 70, '♥', '#ff2fa8', 16);
      s.sfx('heart');
    } },
    { say: 'tofu', text: 'Guau… (Toma, Morita. ¡Todas son para ti!)' },
    // Tofu se hace a un lado; Morita deja de temblar y se acerca al plato.
    { run: () => {
      if (t) t.script = { x: bowlX - 70, y: bowlY + 16, face: 1, speed: 90 };
      m.play('idle');
    } },
    { wait: 0.8 },
    { run: () => { m.walkTo(bowlX + 30, 70, bowlY - 2); } },
    { until: () => Math.abs(m.x - m.targetX) < 3 && Math.abs(m.y - m.targetY) < 3, timeout: 6 },
    { run: (s) => {
      m.facing = -1;
      m.feed();
      s.bowl.eaters = 0.22;
      s.music('morita');
      s.fx.text(m.x, m.y - 70, '¡ÑAM ÑAM!', '#ffd23f', 12);
      // Faby y Tofu se acercan a mirar cómo come.
      p.script = { x: bowlX - 150, y: bowlY + 14, face: 1, speed: 110 };
      if (t) t.script = { x: bowlX - 62, y: bowlY + 20, face: 1, speed: 80, anim: 'happy' };
    } },
    { until: () => near(p) && near(t), timeout: 5 },
    { say: 'faby', text: '¡Mírala, Tofu! Come feliz…' },
    { until: (s) => s.bowl.fill <= 0, timeout: 4 },
    { run: (s) => {
      m.play('happy');
      for (let i = 0; i < 3; i++) s.fx.text(m.x - 30 + i * 30, m.y - 70 - i * 10, '♥', '#ff2fa8', 14);
      s.sfx('heart');
      s.fx.text(m.x, m.y - 110, '¡PANCITA LLENA!', '#ffb3d9', 12);
    } },
    { say: 'billetes', text: '…¡No sabía que Morita tenía tanta hambre!' },
    { say: 'billetes', text: 'Bueno… croquetas de verdad. Pero de calidad, ¿ya?' },
    // Morita, gordita, corre feliz alrededor.
    { run: () => m.walkTo(m.x + 170, 260) },
    { until: () => Math.abs(m.x - m.targetX) < 3, timeout: 2 },
    { run: () => m.walkTo(m.x - 120, 260) },
    { until: () => Math.abs(m.x - m.targetX) < 3, timeout: 2 },
    { run: () => { m.walkTo(m.x + 80, 260); m.mood = 'happy'; } },
    { until: () => Math.abs(m.x - m.targetX) < 3, timeout: 2 },
    { say: 'tofu', text: '¡GUAU! (¡Ahora sí, a jugar!)' },
    { wait: 0.4 },
    { run: (s) => {
      p.script = null;
      if (t) t.script = null;
      s.finishLevel();
    } },
  ]);
}
