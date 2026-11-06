import { VIEW_W, VIEW_H, FONT } from '../config.js';
import { Background } from './background.js';

// Escenario del nivel 4: Oruro en pleno Carnaval. Fondo PROVISIONAL dibujado por código
// (el arte de PixelLab llega después): cielo del altiplano, cerros, casas de colores,
// graderías con público, arcos de plata, la calle con confeti y, al final, el Santuario del Socavón.
// Si existen imágenes c_* (arte de PixelLab), se dibujan encima en su lugar.

function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

const STREET = [372, 525];
const ARCHES = [300, 900, 1500, 2100, 2700];
const CROWD_COLORS = ['#ff2fa8', '#ffd23f', '#7df9ff', '#7dff8a', '#ff6b3d', '#c38bff', '#ffffff', '#e83a3a'];

export class CarnavalBackground extends Background {
  constructor(worldWidth, images = {}) {
    super(worldWidth, images);
    this.houses = this.makeHouses();
    this.stands = this.makeStands();
    this.t = 0;
  }

  // Calle empedrada con confeti y serpentina en el suelo.
  makeFloor() {
    const W = 1920;
    const c = canvas(W, VIEW_H);
    const g = c.getContext('2d');
    const r = rng(9090);
    const px = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    px(0, STREET[0] - 6, W, 6, '#8f8a80');
    px(0, STREET[0], W, STREET[1] - STREET[0], '#9a8f80');
    for (let y = STREET[0]; y < STREET[1]; y += 14) {
      const off = (Math.floor((y - STREET[0]) / 14) % 2) * 12;
      for (let x = -off; x < W; x += 24) {
        px(x + 1, y + 1, 22, 12, r() < 0.5 ? '#a89c8b' : '#b3a795');
        px(x + 1, y + 1, 22, 2, '#c4b8a6');
      }
    }
    for (let i = 0; i < 700; i++) {
      px(Math.floor(r() * W), STREET[0] + 4 + Math.floor(r() * 148), 3, 3, CROWD_COLORS[Math.floor(r() * CROWD_COLORS.length)]);
    }
    for (let i = 0; i < 40; i++) {
      let x = Math.floor(r() * W), y = STREET[0] + 10 + Math.floor(r() * 140);
      const col = CROWD_COLORS[Math.floor(r() * 6)];
      for (let k = 0; k < 8; k++) { px(x, y, 3, 3, col); x += 3; y += r() < 0.5 ? 2 : -2; }
    }
    px(0, STREET[1], W, VIEW_H - STREET[1], '#7d7468');
    px(0, STREET[1], W, 3, '#c4b8a6');
    return c;
  }

  // Casas coloniales de colores con balcones (tira que se repite).
  makeHouses() {
    const c = canvas(1200, 230);
    const g = c.getContext('2d');
    const r = rng(31);
    const cols = ['#e8b84a', '#5fa8d3', '#e07a5f', '#81b29a', '#f2cc8f', '#c38bff', '#ef476f', '#ffffff'];
    let x = 0;
    while (x < 1200) {
      const w = 90 + Math.floor(r() * 60), h = 120 + Math.floor(r() * 100);
      const col = cols[Math.floor(r() * cols.length)];
      g.fillStyle = '#140c1c'; g.fillRect(x, 230 - h - 2, w, h + 2);
      g.fillStyle = col; g.fillRect(x + 2, 230 - h, w - 4, h);
      g.fillStyle = '#7a3b2e'; g.fillRect(x, 230 - h - 8, w, 8);
      for (let wy = 230 - h + 16; wy < 210; wy += 36) {
        for (let wx = x + 12; wx < x + w - 20; wx += 30) {
          g.fillStyle = '#2a2d36'; g.fillRect(wx, wy, 14, 20);
          g.fillStyle = '#8a5a35'; g.fillRect(wx - 3, wy + 20, 20, 3);
        }
      }
      x += w;
    }
    return c;
  }

  // Graderías con público aplaudiendo (tira que se repite).
  makeStands() {
    const c = canvas(960, 120);
    const g = c.getContext('2d');
    for (let row = 0; row < 5; row++) {
      const y = 20 + row * 20;
      g.fillStyle = row % 2 ? '#3a4a8a' : '#2f3b72';
      g.fillRect(0, y, 960, 20);
      g.fillStyle = '#1f2850';
      g.fillRect(0, y + 18, 960, 2);
    }
    g.fillStyle = '#e8e2d6';
    g.fillRect(0, 118, 960, 2);
    return c;
  }

  drawBack(ctx, camX) {
    this.t += 1 / 60;
    const sky = ctx.createLinearGradient(0, 0, 0, 330);
    sky.addColorStop(0, '#1f6fe0');
    sky.addColorStop(1, '#a8dcff');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    this.sun ??= this.makeSun();
    ctx.drawImage(this.sun, Math.round(760 - camX * 0.01 - 72), -6);
    this.drawTiled(ctx, this.clouds, camX, 0.03, 0);
    this.drawTiled(ctx, this.far.tunari, camX, 0.05, 70);
    // Banderines de colores cruzando el cielo
    for (let i = -1; i < 12; i++) {
      const bx = Math.round(i * 100 - ((camX * 0.3) % 100));
      for (let k = 0; k < 5; k++) {
        ctx.fillStyle = CROWD_COLORS[(i + k + 20) % CROWD_COLORS.length];
        const fx = bx + k * 20, fy = 40 + Math.round(Math.sin((fx + camX * 0.3) / 80) * 6);
        ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + 14, fy); ctx.lineTo(fx + 7, fy + 14); ctx.fill();
      }
    }
    this.drawTiled(ctx, this.houses, camX, 0.35, 120);
    // Graderías con público que se mueve
    const sx = -(((camX * 0.7) % 960) + 960) % 960;
    for (let ox = sx - 960; ox < VIEW_W; ox += 960) {
      ctx.drawImage(this.stands, Math.round(ox), 250);
      for (let row = 0; row < 5; row++) {
        for (let k = 0; k < 48; k++) {
          const px = Math.round(ox + k * 20 + (row % 2) * 10);
          if (px < -10 || px > VIEW_W + 10) continue;
          const bob = Math.round(Math.sin(this.t * 6 + k + row) * 2);
          const col = CROWD_COLORS[(k * 7 + row * 3) % CROWD_COLORS.length];
          ctx.fillStyle = '#140c1c'; ctx.fillRect(px - 1, 250 + 8 + row * 20 - bob, 10, 12);
          ctx.fillStyle = '#c68a5c'; ctx.fillRect(px + 1, 250 + 9 + row * 20 - bob, 6, 5);
          ctx.fillStyle = col; ctx.fillRect(px, 250 + 14 + row * 20 - bob, 8, 6);
        }
      }
    }
    const fw = this.floor.width;
    const off = ((camX % fw) + fw) % fw;
    ctx.drawImage(this.floor, -off, 0);
    if (fw - off < VIEW_W) ctx.drawImage(this.floor, fw - off, 0);
    this.drawArches(ctx, camX);
    this.drawSocavon(ctx, camX);
  }

  // Arcos de plata (en Oruro se adornan con vajilla de plata).
  drawArches(ctx, camX) {
    const img = this.img.c_arch;
    for (const ax of ARCHES) {
      const x = Math.round(ax - camX);
      if (x < -200 || x > VIEW_W + 200) continue;
      if (img) { ctx.drawImage(img, x - img.width / 2, 376 - img.height); continue; }
      ctx.fillStyle = '#140c1c';
      ctx.fillRect(x - 110, 170, 14, 206);
      ctx.fillRect(x + 96, 170, 14, 206);
      ctx.lineWidth = 16;
      ctx.strokeStyle = '#140c1c';
      ctx.beginPath(); ctx.arc(x, 180, 103, Math.PI, 0); ctx.stroke();
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#c9ced8';
      ctx.beginPath(); ctx.arc(x, 180, 103, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = '#c9ced8';
      ctx.fillRect(x - 107, 176, 8, 200);
      ctx.fillRect(x + 99, 176, 8, 200);
      for (let a = Math.PI; a <= Math.PI * 2; a += 0.22) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(x + Math.cos(a) * 103) - 3, Math.round(180 + Math.sin(a) * 103) - 3, 6, 6);
      }
    }
  }

  // Al final del recorrido: la fachada del Santuario del Socavón.
  drawSocavon(ctx, camX) {
    const img = this.img.c_socavon;
    const x = Math.round(this.worldWidth - 260 - camX);
    if (x > VIEW_W + 300) return;
    if (img) { ctx.drawImage(img, x - img.width / 2, 380 - img.height); return; }
    ctx.fillStyle = '#140c1c'; ctx.fillRect(x - 150, 130, 300, 250);
    ctx.fillStyle = '#e8dcc0'; ctx.fillRect(x - 146, 134, 292, 246);
    ctx.fillStyle = '#140c1c'; ctx.fillRect(x - 40, 60, 80, 76);
    ctx.fillStyle = '#e8dcc0'; ctx.fillRect(x - 36, 64, 72, 72);
    ctx.fillStyle = '#5a3a28'; ctx.fillRect(x - 40, 270, 80, 110);
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(x - 4, 40, 8, 26); ctx.fillRect(x - 12, 48, 24, 8);
    ctx.font = `10px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#5a3a28';
    ctx.fillText('SOCAVON', x, 220);
  }

  drawPieces() {}

  drawFront() {}
}
