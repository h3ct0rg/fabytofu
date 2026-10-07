import { VIEW_W, VIEW_H } from '../config.js';
import { SLOTS, loadSlot, clearSlot, saveSettings } from '../engine/save.js';
import { hudText as text } from './stage.js';

// Pantalla de inicio: fondo del parque con la persecución (Faby tras Tofu; luego el Pug tras los dos),
// menú JUGAR / CONFIGURAR, ranuras de partida y configuración. Se maneja con teclado, mando o toque.

const GROUND = 508;
const DIFFICULTY = ['FÁCIL', 'NORMAL', 'DIFÍCIL'];

export class Menu {
  constructor(game) {
    this.game = game;
    this.screen = 'main';     // main | slots | slot | config
    this.sel = 0;
    this.t = 0;
    this.parade = 0;          // tiempo de la animación de fondo
    this.slotSel = 0;
    this.items = [];          // rectángulos clicables del cuadro actual
  }

  open() {
    this.screen = 'main';
    this.sel = 0;
    this.game.stats?.refresh();
  }

  // ---------- Lógica ----------

  options() {
    const g = this.game;
    switch (this.screen) {
      case 'main':
        return [
          { label: 'JUGAR', go: () => this.goto('slots') },
          { label: 'CONFIGURAR', go: () => this.goto('config') },
          { label: 'COMPARTIR', go: () => this.share() },
        ];
      case 'slots':
        return [
          ...Array.from({ length: SLOTS }, (_, i) => ({ slot: i, go: () => this.pickSlot(i) })),
          { label: 'VOLVER', go: () => this.goto('main') },
        ];
      case 'slot': {
        const data = loadSlot(this.slotSel);
        const list = [];
        if (data && !data.done && data.zone > 0) list.push({ label: 'CONTINUAR', go: () => g.startGame(this.slotSel, data) });
        list.push({ label: data ? 'NUEVA PARTIDA' : 'EMPEZAR', go: () => g.startGame(this.slotSel, { best: data?.best ?? 0 }) });
        if (data) list.push({ label: 'BORRAR PARTIDA', go: () => { clearSlot(this.slotSel); this.goto('slots', this.slotSel); } });
        list.push({ label: 'VOLVER', go: () => this.goto('slots', this.slotSel) });
        return list;
      }
      case 'config': {
        const s = g.settings;
        return [
          { label: `MÚSICA  ${bar(s.music)}`, adjust: (d) => { s.music = clamp(s.music + d * 0.1); } },
          { label: `EFECTOS ${bar(s.sfx)}`, adjust: (d) => { s.sfx = clamp(s.sfx + d * 0.1); g.audio.play('hit'); } },
          { label: `DIFICULTAD  < ${DIFFICULTY[s.difficulty]} >`, adjust: (d) => { s.difficulty = (s.difficulty + d + 3) % 3; } },
          { label: `TEMBLOR DE PANTALLA  ${s.shake ? 'SÍ' : 'NO'}`, adjust: () => { s.shake = !s.shake; } },
          { label: `SONIDO  ${g.audio.muted ? 'SILENCIADO' : 'ACTIVADO'}`, adjust: () => { g.audio.unlock(); g.audio.toggleMute(); g.audio.play('select'); } },
          { label: 'VOLVER', go: () => this.goto('main', 1) },
        ];
      }
    }
    return [];
  }

  goto(screen, sel = 0) {
    this.screen = screen;
    this.sel = sel;
    this.game.audio.play('select');
    if (screen !== 'config') {
      saveSettings(this.game.settings);
      this.game.applySettings();
    }
  }

  // Comparte el juego: en el celular abre el menú de compartir del sistema (WhatsApp, etc.);
  // en la PC, si el navegador no lo permite, copia el enlace al portapapeles.
  async share() {
    const g = this.game;
    g.audio.play('select');
    const url = location.origin + location.pathname;
    const data = {
      title: 'Faby & Tofu',
      text: 'Solo quería sacar a pasear a Tofu… y terminó peleando por todo el Parque Lincoln. ¡Juega gratis! 🐶👊',
      url,
    };
    try {
      if (navigator.share) {
        // Si se puede, también va la imagen del juego.
        try {
          const blob = await (await fetch('og-image.jpg')).blob();
          const file = new File([blob], 'faby-y-tofu.jpg', { type: 'image/jpeg' });
          if (navigator.canShare?.({ files: [file] })) data.files = [file];
        } catch { /* sin imagen */ }
        await navigator.share(data);
        this.toast = '¡GRACIAS POR COMPARTIR!';
      } else {
        await navigator.clipboard.writeText(`${data.text} ${url}`);
        this.toast = '¡ENLACE COPIADO! PEGALO DONDE QUIERAS';
      }
    } catch (err) {
      if (err?.name === 'AbortError') return; // la persona cerró el menú de compartir
      this.toast = url;
    }
    this.toastTime = 3;
  }

  pickSlot(i) {
    this.slotSel = i;
    this.goto('slot');
  }

  update(dt, input) {
    this.t += dt;
    if (this.toastTime > 0) this.toastTime -= dt;
    this.parade += dt;
    const opts = this.options();
    // En las ranuras (que van en fila) también se navega con izquierda/derecha.
    const horiz = this.screen === 'slots';
    if (input.pressed.up || (horiz && input.pressed.left)) { this.sel = (this.sel - 1 + opts.length) % opts.length; this.game.audio.play('blip'); }
    if (input.pressed.down || (horiz && input.pressed.right)) { this.sel = (this.sel + 1) % opts.length; this.game.audio.play('blip'); }
    const o = opts[this.sel];
    if (o?.adjust && (input.pressed.left || input.pressed.right)) {
      o.adjust(input.pressed.right ? 1 : -1);
      this.game.applySettings();
    }
    if (input.pressed.attack || input.pressed.pause) {
      if (o?.go) o.go();
      else if (o?.adjust) { o.adjust(1); this.game.applySettings(); }
    }
    if (input.pressed.jump && this.screen !== 'main') {
      this.goto(this.screen === 'slot' ? 'slots' : 'main', this.screen === 'slot' ? this.slotSel : 0);
    }
  }

  // Toque o clic sobre una opción (coordenadas internas 960x540).
  click(x, y) {
    const hit = this.items.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    if (!hit) return;
    this.sel = hit.i;
    const o = this.options()[hit.i];
    if (o?.go) o.go();
    else if (o?.adjust) {
      o.adjust(x > hit.x + hit.w / 2 ? 1 : -1);
      this.game.applySettings();
    }
  }

  // ---------- Dibujo ----------

  draw(ctx) {
    const g = this.game;
    g.stage.bg.drawBack(ctx, 0);
    this.drawParade(ctx);
    ctx.fillStyle = 'rgba(15, 8, 30, 0.45)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // Logo
    const bob = Math.round(Math.sin(this.t * 2) * 3);
    text(ctx, 'FABY & TOFU', VIEW_W / 2, 96 + bob, 46, '#ff2fa8', 'center');
    text(ctx, 'UN PASEO NORMAL POR EL PARQUE', VIEW_W / 2, 132, 12, '#7df9ff', 'center');

    this.items = [];
    if (this.screen === 'slots') this.drawSlots(ctx);
    else this.drawList(ctx, this.screen === 'slot' ? `PARTIDA ${this.slotSel + 1}` : this.screen === 'config' ? 'CONFIGURAR' : null);

    // Estadísticas en línea (solo en la pantalla de inicio)
    const st = g.stats;
    const players = st?.players ?? '—';
    const online = st?.online ?? '—';
    if (g.audio.muted) text(ctx, 'SONIDO SILENCIADO (M)', VIEW_W - 16, 26, 8, '#ff3040', 'right');
    if (this.toastTime > 0) {
      ctx.fillStyle = 'rgba(20, 12, 40, 0.9)';
      ctx.fillRect(VIEW_W / 2 - 300, 400, 600, 40);
      ctx.strokeStyle = '#7df9ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(VIEW_W / 2 - 299, 401, 598, 38);
      text(ctx, this.toast, VIEW_W / 2, 426, 10, '#7df9ff', 'center');
    }
    // Arriba a la izquierda: abajo quedan los botones táctiles en el celular.
    ctx.fillStyle = 'rgba(20, 12, 40, 0.7)';
    ctx.fillRect(10, 10, 186, 40);
    text(ctx, `JUGADORES: ${players}`, 18, 27, 8, '#ffd23f');
    text(ctx, `JUGANDO AHORA: ${online}`, 18, 43, 8, '#7df9ff');

    const help = g.input.usingTouch ? 'Toca una opción para elegirla' : 'Flechas: elegir y ajustar · J/Enter: aceptar · K: volver';
    text(ctx, help, 20, VIEW_H - 22, 8, '#ffffff');
  }

  drawList(ctx, title) {
    const opts = this.options();
    let y = 220;
    if (title) {
      text(ctx, title, VIEW_W / 2, 196, 14, '#ffd23f', 'center');
      y = 240;
    }
    opts.forEach((o, i) => {
      const w = this.screen === 'config' ? 520 : 340;
      const x = VIEW_W / 2 - w / 2;
      const on = i === this.sel;
      ctx.fillStyle = on ? 'rgba(255, 47, 168, 0.85)' : 'rgba(20, 12, 40, 0.75)';
      ctx.fillRect(x, y - 24, w, 36);
      ctx.strokeStyle = on ? '#ffffff' : '#ff2fa8';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y - 23, w - 2, 34);
      text(ctx, o.label, VIEW_W / 2, y + 2, 14, '#ffffff', 'center');
      if (on && Math.floor(this.t * 3) % 2 === 0) text(ctx, '>', x + 16, y + 2, 14, '#ffd23f');
      this.items.push({ x, y: y - 24, w, h: 36, i });
      y += 48;
    });
  }

  drawSlots(ctx) {
    text(ctx, 'ELIGE UNA PARTIDA', VIEW_W / 2, 196, 14, '#ffd23f', 'center');
    const opts = this.options();
    opts.forEach((o, i) => {
      const on = i === this.sel;
      if (o.slot === undefined) {
        const w = 200;
        const x = VIEW_W / 2 - w / 2;
        const y = 440;
        ctx.fillStyle = on ? 'rgba(255, 47, 168, 0.85)' : 'rgba(20, 12, 40, 0.75)';
        ctx.fillRect(x, y - 24, w, 36);
        text(ctx, o.label, VIEW_W / 2, y + 2, 12, '#ffffff', 'center');
        this.items.push({ x, y: y - 24, w, h: 36, i });
        return;
      }
      const w = 260;
      const x = 60 + i * 290;
      const y = 220;
      const d = loadSlot(o.slot);
      ctx.fillStyle = on ? 'rgba(255, 47, 168, 0.85)' : 'rgba(20, 12, 40, 0.8)';
      ctx.fillRect(x, y, w, 180);
      ctx.strokeStyle = on ? '#ffffff' : '#ff2fa8';
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 1.5, y + 1.5, w - 3, 177);
      text(ctx, `PARTIDA ${o.slot + 1}`, x + w / 2, y + 32, 14, '#ffd23f', 'center');
      if (!d) {
        text(ctx, 'VACÍA', x + w / 2, y + 96, 14, '#ffffff', 'center');
        text(ctx, 'Nueva partida', x + w / 2, y + 124, 8, '#bbbbbb', 'center');
      } else {
        const zone = d.done ? '¡COMPLETADA!' : d.zone > 0 ? `ZONA ${d.zone + 1} DE 4` : 'INICIO';
        text(ctx, zone, x + w / 2, y + 70, 10, d.done ? '#7df9ff' : '#ffffff', 'center');
        text(ctx, `PUNTAJE ${String(d.score ?? 0).padStart(6, '0')}`, x + w / 2, y + 98, 10, '#ffffff', 'center');
        text(ctx, `VIDAS x${d.lives ?? 3}`, x + w / 2, y + 122, 10, '#ffffff', 'center');
        if (d.best) text(ctx, `RÉCORD ${String(d.best).padStart(6, '0')}`, x + w / 2, y + 146, 8, '#ffd23f', 'center');
        if (d.date) text(ctx, new Date(d.date).toLocaleDateString('es'), x + w / 2, y + 166, 8, '#bbbbbb', 'center');
      }
      this.items.push({ x, y, w, h: 180, i });
    });
  }

  // Persecución en bucle:
  //  1) de izquierda a derecha: Faby corre detrás de Tofu;
  //  2) de derecha a izquierda: Faby y Tofu huyen asustados, el Pug de traje los persigue.
  drawParade(ctx) {
    const sh = this.game.sheets;
    const cycle = 11;
    const t = this.parade % cycle;
    const second = t > cycle / 2;
    const k = (second ? t - cycle / 2 : t) / (cycle / 2);
    let actors;
    if (!second) {
      const lead = -160 + k * (VIEW_W + 420);
      actors = [
        { sheet: sh.tofu, anim: 'run', x: lead, dir: 1 },
        { sheet: sh.faby, anim: 'run', x: lead - 150, dir: 1 },
      ];
    } else {
      const lead = VIEW_W + 160 - k * (VIEW_W + 560);
      actors = [
        { sheet: sh.faby, anim: 'panic', x: lead, dir: -1, scared: '¡AAAH!' },
        { sheet: sh.tofu, anim: 'panic', x: lead + 120, dir: -1, scared: '¡CAÍN!' },
        { sheet: sh.pug, anim: 'run', x: lead + 290, dir: -1, bark: true },
      ];
    }
    for (const a of actors) {
      const anim = a.sheet?.anims[a.anim] ? a.anim : 'run';
      if (!a.sheet?.anims[anim]) continue;
      ctx.fillStyle = 'rgba(10, 12, 30, 0.35)';
      ctx.beginPath();
      ctx.ellipse(Math.round(a.x), GROUND, 30, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      drawAnim(ctx, a.sheet, anim, this.parade, a.x, GROUND, a.dir);
      const head = a.sheet === sh.faby ? 150 : 70;
      if (a.scared) {
        // Gotas de sudor saltando de la cabeza y grito
        const ph = (this.parade * 3) % 1;
        ctx.fillStyle = '#7df9ff';
        for (const [ox, d] of [[18, 0], [30, 0.5]]) {
          const p = (ph + d) % 1;
          ctx.fillRect(Math.round(a.x + ox + p * 14), Math.round(GROUND - head - 6 + p * 18), 4, 6);
          ctx.fillRect(Math.round(a.x + ox + 1 + p * 14), Math.round(GROUND - head - 9 + p * 18), 2, 3);
        }
        if (Math.floor(this.parade * 2) % 2 === 0) text(ctx, a.scared, a.x, GROUND - head - 18, a.sheet === sh.faby ? 12 : 8, '#ffffff', 'center');
      }
      if (a.bark && Math.floor(this.parade * 2) % 3 === 0) text(ctx, '¡GRRR! ¡GUAU!', a.x - 20, GROUND - 92, 10, '#ffd23f', 'center');
    }
  }
}

function drawAnim(ctx, sheet, name, time, x, y, dir = 1) {
  const anim = sheet.anims[name];
  const total = anim.ms.reduce((a, b) => a + b, 0);
  let tm = (time * 1000) % total;
  let i = 0;
  while (tm >= anim.ms[i]) { tm -= anim.ms[i]; i++; }
  const [sx, sy, sw, shh] = sheet.rects[anim.frames[i]];
  const [ax, ay] = anim.anchors ? anim.anchors[i] : anim.anchor;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (dir !== (anim.faces ?? 1)) ctx.scale(-1, 1);
  ctx.drawImage(sheet.image, sx, sy, sw, shh, -ax, -ay, sw, shh);
  ctx.restore();
}

function clamp(v) {
  return Math.round(Math.max(0, Math.min(1, v)) * 10) / 10;
}

function bar(v) {
  const n = Math.round(v * 10);
  return `[${'#'.repeat(n)}${'-'.repeat(10 - n)}]`;
}

