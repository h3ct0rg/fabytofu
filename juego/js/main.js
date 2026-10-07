import { VIEW_W, VIEW_H, FONT } from './config.js';
import { startLoop } from './engine/loop.js';
import { Input } from './engine/input.js';
import { loadSheet, loadImage } from './engine/assets.js';
import { Stage, overlay, hudText } from './scenes/stage.js';
import { Menu } from './scenes/menu.js';
import { AudioEngine } from './engine/audio.js';
import { SONGS } from './data/music.js';
import { loadSettings, loadSlot, saveSlot } from './engine/save.js';
import { OnlineStats } from './net/stats.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
ctx.imageSmoothingEnabled = false;

// Escala el canvas para llenar la ventana manteniendo 16:9.
function fit() {
  const s = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  canvas.style.width = `${Math.floor(VIEW_W * s)}px`;
  canvas.style.height = `${Math.floor(VIEW_H * s)}px`;
}
window.addEventListener('resize', fit);
fit();

const input = new Input();
input.bindTouch(document.getElementById('touch'));

// Audio: se activa con el primer gesto del usuario (exigencia de los navegadores).
const audio = new AudioEngine();
audio.songs = SONGS;
for (const ev of ['keydown', 'pointerdown', 'pointerup', 'touchend', 'mouseup', 'click']) {
  window.addEventListener(ev, () => audio.unlock(), { passive: true, capture: true });
}

const game = {
  audio,
  input,
  settings: loadSettings(),
  stats: new OnlineStats(),
  scene: 'loading',   // loading | title | play | pause
  debug: new URLSearchParams(location.search).has('debug'),
  sheets: {},
  stage: null,
  menu: null,
  slot: 0,
  fps: 0,

  toTitle() {
    game.scene = 'title';
    game.menu.open();
    audio.playMusic('title');
  },

  // Empieza (o continúa) la partida de una ranura.
  startGame(slot, data) {
    game.slot = slot;
    game.save = data;
    audio.play('select');
    game.stats.registerPlayer();
    // Una partida nueva ocupa la ranura desde el primer momento.
    if (!(data?.zone > 0)) game.saveProgress({ zone: 0, score: 0, lives: 3, done: false });
    game.stage.reset(data);
    game.scene = 'play';
  },

  // Guarda el avance en la ranura actual.
  saveProgress(progress) {
    const prev = loadSlot(game.slot) ?? {};
    const best = Math.max(prev.best ?? 0, progress.score ?? 0);
    game.save = { ...progress, best };
    saveSlot(game.slot, game.save);
  },

  applySettings() {
    const s = game.settings;
    audio.setVolumes(s.music, s.sfx);
  },
};

async function boot() {
  try {
    await document.fonts.load(`16px ${FONT}`).catch(() => {});
    for (const n of ['faby', 'tofu', 'jogger', 'skater', 'dog', 'pug']) game.sheets[n] = await loadSheet(n);
    // Ilustraciones del parque (si alguna falta, el escenario la omite).
    const BG = ['tunari', 'city', 'street', 'treeline', 'canchas', 'glorieta', 'pergola', 'pond',
      'lamp', 'bench', 'flag', 'bush', 'flowerbed',
      'delivery', 'delivery_open', 'saltena', 'silpancho', 'api', 'ball', 'treat', 'bottle', 'owner'];
    game.bgImages = {};
    await Promise.all(BG.map((n) => loadImage(`assets/bg/${n}.png`).then((im) => { game.bgImages[n] = im; }).catch(() => {})));
    game.stage = new Stage(game);
    game.menu = new Menu(game);
    game.applySettings();
    game.stats.start();
    game.toTitle();
  } catch (err) {
    game.scene = 'error';
    game.error = err.message;
    console.error(err);
  }
}

// Toques y clics sobre el menú (en coordenadas internas 960x540).
canvas.addEventListener('pointerdown', (e) => {
  if (game.scene !== 'title') return;
  const r = canvas.getBoundingClientRect();
  game.menu.click(((e.clientX - r.left) / r.width) * VIEW_W, ((e.clientY - r.top) / r.height) * VIEW_H);
});

// En un teléfono en vertical el juego espera (se muestra el aviso de girar).
const portrait = matchMedia('(orientation: portrait) and (pointer: coarse)');

// En el primer toque, pantalla completa y orientación horizontal (donde el navegador lo permita).
window.addEventListener('touchend', async () => {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' });
    await screen.orientation?.lock?.('landscape');
  } catch { /* iOS y algunos navegadores no lo permiten: queda el aviso de girar */ }
}, { once: true });

// Los controles táctiles solo se muestran dentro del juego.
const touchRoot = document.getElementById('touch');

const muteBtn = touchRoot.querySelector('[data-action=mute]');

function update(dt) {
  touchRoot.classList.toggle('ingame', game.scene === 'play' || game.scene === 'pause');
  if (muteBtn) muteBtn.textContent = audio.muted ? '✕' : '♪';
  if (portrait.matches) return;
  input.update();
  if (input.pressed.debug) game.debug = !game.debug;
  if (input.pressed.mute) audio.toggleMute();

  switch (game.scene) {
    case 'title':
      game.menu.update(dt, input);
      break;
    case 'play':
      if (input.pressed.pause && game.stage.mode === 'play' && !game.stage.cutscene) {
        game.scene = 'pause';
        audio.play('select');
        break;
      }
      game.stage.update(dt, input);
      break;
    case 'pause':
      if (input.pressed.pause || input.pressed.attack) game.scene = 'play';
      else if (input.pressed.jump) game.toTitle();
      break;
  }
}

let frames = 0;
let fpsTime = performance.now();

function render() {
  frames++;
  const now = performance.now();
  if (now - fpsTime > 500) {
    game.fps = Math.round((frames * 1000) / (now - fpsTime));
    frames = 0;
    fpsTime = now;
  }

  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#0b0d1a';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  if (game.scene === 'loading') {
    hudText(ctx, 'Cargando...', VIEW_W / 2, VIEW_H / 2, 16, '#ffffff', 'center');
  } else if (game.scene === 'error') {
    hudText(ctx, 'Error al cargar', VIEW_W / 2, VIEW_H / 2 - 20, 16, '#ff2fa8', 'center');
    hudText(ctx, game.error, VIEW_W / 2, VIEW_H / 2 + 14, 10, '#ffffff', 'center');
  } else if (game.scene === 'title') {
    game.menu.draw(ctx);
  } else {
    game.stage.draw(ctx, game.debug);
    if (audio.muted) hudText(ctx, 'SIN SONIDO (M)', VIEW_W - 16, VIEW_H - 14, 8, '#ff3040', 'right');
    if (game.scene === 'pause') {
      overlay(ctx, 'PAUSA', input.usingTouch ? 'A: continuar · B: salir al menú' : 'Enter / J: continuar · K: salir al menú');
    }
  }

  if (game.debug) {
    hudText(ctx, `FPS ${game.fps}`, VIEW_W - 12, VIEW_H - 12, 10, '#00ff88', 'right');
    if (game.stage && game.scene === 'play') {
      const p = game.stage.player;
      hudText(ctx, `${p.state} x${Math.round(p.x)} y${Math.round(p.y)}`, 12, VIEW_H - 12, 10, '#00ff88');
    }
  }
}

startLoop(update, render);
boot();

// Gancho de pruebas: permite avanzar la simulación paso a paso desde la consola o un script.
if (game.debug) {
  window.__faby = {
    game,
    input,
    step(n = 1, keys = {}) {
      Object.assign(input.keys, keys);
      for (let i = 0; i < n; i++) update(1 / 60);
      render();
    },
  };
}
