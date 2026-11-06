import { Cutscene } from './cutscene.js';
import { CarnavalBackground } from './carnaval.js';
import { Owner } from '../entities/owner.js';
import { DiabloBoss } from '../entities/diabloBoss.js';

// NIVEL 4: El Carnaval de Oruro. Faby y Tofu quieren llegar al Socavón.
// El dueño de Corli cumple su venganza: su pandilla se mete al Carnaval disfrazada con trajes
// robados (no son danzantes de verdad: se les cae la careta). El jefe es el propio dueño con una
// careta de diablo gigante, con Corli a su lado.

const WORLD_W = 3600;

export const LEVEL4 = {
  num: 4,
  worldW: WORLD_W,
  music: 'carnaval',
  makeBg: (images) => new CarnavalBackground(WORLD_W, images),

  props: [[460, 480, 'bottle'], [1500, 430, 'bottle'], [2380, 470, 'bottle']],
  boxes: [[820, 392], [1700, 390, 'api'], [2600, 388, 'silpancho']],

  areas: [
    { x: 0, name: 'EL CARNAVAL DE ORURO', sub: 'Patrimonio de la Humanidad' },
    { x: 560, name: 'LA AVENIDA CÍVICA', sub: 'Graderías y arcos de plata' },
    { x: 1360, name: 'LA ENTRADA', sub: 'Bandas y comparsas' },
    { x: 2160, name: 'CERCA DEL SOCAVÓN', sub: 'Ya se ve el santuario' },
    { x: 2860, name: 'EL SOCAVÓN', sub: 'La entrada a la mina' },
  ],

  zones: [
    { at: 560, min: 300, max: 1260, enemies: ['caporal', 'china'] },
    { at: 1360, min: 1100, max: 2060, enemies: ['moreno', 'diablo', 'caporal'] },
    { at: 2160, min: 1940, max: 2900, enemies: ['diablo', 'china', 'moreno', 'caporal'] },
    { at: 2960, min: 2640, max: 3600, boss: true },
  ],

  events: [],
  intro: introScene,
  startBoss,
  onBossDefeated,
  // El jefe llama a sus "danzantes".
  summon(s, n) {
    const cam = s.camera;
    for (let i = 0; i < n; i++) {
      const type = i % 2 ? 'china' : 'caporal';
      s.spawnEnemy(type, i % 2 === 0 ? cam.right + 40 + i * 30 : cam.left - 40 - i * 30, 400 + Math.random() * 110);
    }
  },
};

// Llegada al Carnaval: el dueño de Corli anuncia que su pandilla anda disfrazada.
function introScene(s) {
  return new Cutscene(s, [
    { wait: 0.8 },
    { run: (s) => {
      s.owner = new Owner(s, s.camera.x + 1100, 470);
      s.owner.holding = 'pug';
      s.owner.targetX = s.player.x + 280;
      s.player.facing = 1;
    } },
    { until: (s) => !s.owner.moving && s.owner.t > 0.5, timeout: 5 },
    { say: 'owner', text: '¡Bienvenida al Carnaval, Faby! Te dije que nos volveríamos a ver.' },
    { say: 'owner', text: 'Mis muchachos se consiguieron unos trajes de danzantes… ¡y te están esperando!' },
    { say: 'pug', text: '¡GUAU GUAU! (¡Esta vez sí, Tofu!)' },
    { run: (s) => { if (s.tofu) s.tofu.temper = 55; s.sfx('growl'); } },
    { say: 'tofu', text: '¡GRRRR!' },
    { run: (s) => { s.owner.targetX = s.camera.x + 1160; } },
    { until: (s) => s.owner.x > s.camera.x + 1080, timeout: 5 },
    { run: (s) => { s.owner = null; } },
    { say: 'faby', text: '¿Danzantes con zapatillas y cadenita de oro? Esos no bailan de verdad… ¡Vamos al Socavón, Tofu!' },
  ]);
}

// Frente al Socavón: el dueño de Corli aparece con su careta de diablo gigante.
function startBoss(s, z) {
  s.boss = new DiabloBoss(s, s.sheets.diablo4, z.max + 90, 462);
  s.boss.setState('script');
  s.boss.scriptX = z.max - 300;
  s.boss.scriptFace = -1;
  s.boss.scriptSpeed = 200;
  s.cutscene = new Cutscene(s, [
    { until: (s) => Math.abs(s.boss.x - s.boss.scriptX) < 8, timeout: 4 },
    { say: 'owner', text: '¡JA, JA, JA! ¿Te gusta mi careta? ¡De aquí no pasas, Faby!' },
    { say: 'pug', text: '¡GUAU! (¡Mi traje de diablo también es nuevo!)' },
    { say: 'faby', text: 'Ese traje es para bailar con devoción, no para molestar a la gente. ¡Vamos, Tofu!' },
    { run: (s) => {
      s.boss.setState('idle');
      s.boss.cooldown = 1;
      s.enemies.push(s.boss);
      s.lastEnemyHit = s.boss;
      s.banner = { text: '¡JEFE!', sub: 'EL DIABLO DE LA CARETA GIGANTE', time: 1.6 };
      s.music('boss4');
    } },
  ]);
}

// Se le cae la careta: es el dueño de Corli. Se rinde y Faby y Tofu llegan al Socavón.
function onBossDefeated(s) {
  s.releaseToken(s.boss);
  s.player.score += 6000;
  s.hazards = [];
  s.music('victory');
  s.cutscene = new Cutscene(s, [
    { wait: 1.8 },
    { run: (s) => {
      s.enemies = s.enemies.filter((e) => e !== s.boss);
      for (const e of s.enemies) e.takeHit?.({ damage: 999, knockdown: true, hitstop: 0 }, s.player);
      s.fx.text(s.boss.x, s.boss.y - 200, '¡SE LE CAYÓ LA CARETA!', '#ffd23f', 12);
    } },
    { wait: 1 },
    { say: 'owner', text: '¡¿Otra vez tú, Faby?! …Está bien, está bien. Me rindo.' },
    { say: 'owner', text: 'Corli, vámonos. Devolvamos los trajes… y aprendamos a bailar de verdad.' },
    { say: 'pug', text: 'Guau… (Buena pelea, Tofu.)' },
    { say: 'tofu', text: '¡GUAU! (¡Cuando quieras, Corli!)' },
    { say: 'faby', text: '¡Llegamos al Socavón! Ahora sí, Tofu… ¡a disfrutar del Carnaval!' },
    { wait: 0.4 },
    { run: (s) => s.finishLevel() },
  ]);
}
