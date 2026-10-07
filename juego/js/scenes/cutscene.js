import { VIEW_W, VIEW_H, FONT, COLORS, fontSafe } from '../config.js';

// Escenas con diálogo: una lista de pasos que se ejecutan en orden.
//   { say: 'faby' | 'tofu' | 'pug' | 'owner', text }   cuadro de diálogo (J / Enter / A avanza)
//   { wait: segundos }
//   { run: (stage) => {} }                              acción inmediata
//   { until: (stage) => bool, timeout }                 espera una condición
// Mientras dura, Faby no recibe controles y los enemigos no atacan.

const NAMES = { faby: 'FABY', tofu: 'TOFU', pug: 'CORLI', owner: 'EL DUEÑO DE CORLI' };
const COLORS_BY = { faby: '#ff2fa8', tofu: '#7df9ff', pug: '#ffd23f', owner: '#ff6b3d' };
const TYPE_SPEED = 42; // letras por segundo

// Entrada "vacía" para los personajes durante la escena.
export const NO_INPUT = {
  pressed: {}, held: {}, usingTouch: false,
  moveVector: () => ({ x: 0, y: 0 }),
  buffered: () => false,
  chord: () => false,
};

export class Cutscene {
  constructor(stage, steps) {
    this.stage = stage;
    this.steps = steps;
    this.i = -1;
    this.done = false;
    this.next();
  }

  next() {
    this.i++;
    this.t = 0;
    this.shown = 0;
    const s = this.steps[this.i];
    if (!s) {
      this.done = true;
      return;
    }
    if (s.run) {
      s.run(this.stage);
      this.next();
    }
  }

  update(dt, input) {
    if (this.done) return;
    const s = this.steps[this.i];
    this.t += dt;
    const advance = input.pressed.attack || input.pressed.pause || input.pressed.jump;
    if (s.say) {
      const total = s.text.length;
      if (this.shown < total) {
        const before = Math.floor(this.shown);
        this.shown = Math.min(total, this.shown + TYPE_SPEED * dt);
        if (Math.floor(this.shown) !== before && before % 3 === 0) this.stage.sfx('blip');
        if (advance) this.shown = total;
      } else if (advance || this.t > total / TYPE_SPEED + 2.6) {
        this.next();
      }
    } else if (s.wait !== undefined) {
      if (this.t >= s.wait) this.next();
    } else if (s.until) {
      if (s.until(this.stage) || this.t > (s.timeout ?? 5)) this.next();
    }
  }

  draw(ctx) {
    const s = this.steps[this.i];
    if (!s || !s.say) return;
    const x = 40;
    const y = 150;   // arriba, para no tapar a los personajes
    const w = VIEW_W - 80;
    ctx.fillStyle = 'rgba(20, 12, 40, 0.88)';
    ctx.fillRect(x, y, w, 104);
    ctx.strokeStyle = COLORS_BY[s.say];
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 1.5, y + 1.5, w - 3, 101);
    portrait(ctx, this.stage, s.say, x + 12, y + 12);
    ctx.font = `12px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS_BY[s.say];
    ctx.fillText(fontSafe(NAMES[s.say]), x + 104, y + 28);
    ctx.font = `14px ${FONT}`;
    ctx.fillStyle = '#ffffff';
    wrap(ctx, fontSafe(s.text.slice(0, Math.floor(this.shown))), x + 104, y + 56, w - 124, 22);
    if (this.shown >= s.text.length && Math.floor(this.t * 3) % 2 === 0) {
      ctx.fillStyle = COLORS_BY[s.say];
      ctx.fillText('▼', x + w - 28, y + 92);
    }
  }
}

function wrap(ctx, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lh;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, y);
}

// Retrato de 80x80 recortado de los sprites de cada personaje.
export function portrait(ctx, stage, who, x, y) {
  ctx.fillStyle = '#1b1030';
  ctx.fillRect(x, y, 80, 80);
  const sheets = stage.sheets;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, 80, 80);
  ctx.clip();
  if (who === 'faby') {
    const [sx, sy] = sheets.faby.rects[sheets.faby.anims.front.frames[0]];
    ctx.drawImage(sheets.faby.image, sx + 14, sy + 4, 68, 60, x + 2, y + 6, 76, 67);
  } else if (who === 'tofu') {
    const [sx, sy, sw] = sheets.tofu.rects[sheets.tofu.anims.idle.frames[0]];
    ctx.drawImage(sheets.tofu.image, sx + sw / 2 - 6, sy + 8, 48, 44, x + 4, y + 8, 72, 66);
  } else if (who === 'pug' && sheets.pug) {
    const [sx, sy, sw] = sheets.pug.rects[sheets.pug.anims.idle.frames[0]];
    ctx.drawImage(sheets.pug.image, sx + sw / 2 - 2, sy + 8, 52, 46, x + 2, y + 8, 76, 67);
  } else if (who === 'owner') {
    const img = stage.game.bgImages.owner;
    if (img) ctx.drawImage(img, 30, 4, 90, 80, x - 4, y, 90, 80);
  }
  ctx.restore();
  ctx.strokeStyle = COLORS_BY[who] ?? COLORS.hudText;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, 78, 78);
}
