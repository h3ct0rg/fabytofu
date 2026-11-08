import { VIEW_W, VIEW_H } from '../config.js';
import { Background } from './background.js';

// Escenario del nivel 5: la mina bajo el Santuario del Socavón.
// Piso 0: afuera, al amanecer (el santuario y la boca de la mina).
// Pisos 1-4: túneles (rieles, veta de plata, goteras, galería roja). Piso 5: la cámara del Diablo.
// Pared, techo, suelo, luces, velas y el círculo de fuego son de código; las piezas (m_*) son de PixelLab.

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

const WALL_BOTTOM = 372;
// Estilo de cada piso: color de la pared, del suelo y de la luz.
const LOOK = {
  1: { tint: 'rgba(60, 40, 20, 0.25)', floor: ['#5a4636', '#4d3c2e', '#685241'], dark: 0.72, light: '255, 190, 110' },
  2: { tint: 'rgba(40, 50, 80, 0.25)', floor: ['#4a4650', '#3e3a44', '#5a5662'], dark: 0.74, light: '220, 230, 255' },
  3: { tint: 'rgba(20, 50, 70, 0.3)', floor: ['#334452', '#2b3a46', '#3f5462'], dark: 0.76, light: '170, 220, 255' },
  4: { tint: 'rgba(110, 20, 10, 0.35)', floor: ['#4a2420', '#3d1d1a', '#5c2c26'], dark: 0.8, light: '255, 90, 50' },
  5: { tint: 'rgba(120, 10, 10, 0.4)', floor: ['#3a1614', '#301210', '#481c18'], dark: 0.55, light: '255, 60, 40' },
};

export class MinaBackground extends Background {
  constructor(worldWidth, images = {}, floors = [], pieces = []) {
    super(worldWidth, images);
    this.floors = floors;
    this.pieces = pieces;
    this.t = 0;
    this.stage = null;
    this.wall = this.makeWall(images.m_wall);
    this.floorTex = {};
    for (const k of [1, 2, 3, 4, 5]) this.floorTex[k] = this.makeFloorTex(k);
    this.dark = canvas(VIEW_W, VIEW_H);
  }

  // Pared de roca: la textura de PixelLab al doble, repetida en espejo (o roca de código).
  makeWall(img) {
    if (img) {
      const s = 2;
      const w = img.width * s, h = img.height * s;
      const c = canvas(w * 2, h);
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.drawImage(img, 0, 0, w, h);
      g.save();
      g.translate(w * 2, 0);
      g.scale(-1, 1);
      g.drawImage(img, 0, 0, w, h);
      g.restore();
      return c;
    }
    const c = canvas(480, 340);
    const g = c.getContext('2d');
    const r = rng(77);
    g.fillStyle = '#3a3030';
    g.fillRect(0, 0, 480, 340);
    for (let i = 0; i < 260; i++) {
      const w = 10 + Math.floor(r() * 40), h = 8 + Math.floor(r() * 24);
      g.fillStyle = ['#463a38', '#2e2626', '#524440'][Math.floor(r() * 3)];
      g.fillRect(Math.floor(r() * 480), Math.floor(r() * 340), w, h);
    }
    return c;
  }

  makeFloorTex(k) {
    const W = 960;
    if (k === 5 && this.img.m_cfloor) {
      // Losas de basalto con grietas de lava (PixelLab), achatadas por la perspectiva y en espejo.
      const src = this.img.m_cfloor;
      const h = VIEW_H - WALL_BOTTOM;
      const tw = src.width * 2;
      const c = canvas(tw * 2, h);
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      for (let y = 0; y < h; y += src.height) {
        g.drawImage(src, 0, y, tw, src.height);
        g.save();
        g.translate(tw * 2, 0);
        g.scale(-1, 1);
        g.drawImage(src, 0, y, tw, src.height);
        g.restore();
      }
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillRect(0, 0, c.width, 10);
      return c;
    }
    const c = canvas(W, VIEW_H - WALL_BOTTOM);
    const g = c.getContext('2d');
    const r = rng(500 + k);
    const [base, darkC, lightC] = LOOK[k].floor;
    g.fillStyle = base;
    g.fillRect(0, 0, W, c.height);
    for (let i = 0; i < 420; i++) {
      g.fillStyle = r() < 0.5 ? darkC : lightC;
      g.fillRect(Math.floor(r() * W), Math.floor(r() * c.height), 4 + Math.floor(r() * 10), 3 + Math.floor(r() * 4));
    }
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(0, 0, W, 10);
    if (k === 1) {
      // Rieles con durmientes de madera
      for (const ry of [58, 98]) {
        for (let x = 0; x < W; x += 28) {
          g.fillStyle = '#3a2618';
          g.fillRect(x, ry - 8, 14, 50);
        }
      }
      for (const ry of [62, 82, 102, 122]) {
        g.fillStyle = '#1a1414';
        g.fillRect(0, ry, W, 5);
        g.fillStyle = '#9aa0aa';
        g.fillRect(0, ry, W, 2);
      }
    }
    if (k === 2) {
      for (let i = 0; i < 90; i++) {
        g.fillStyle = r() < 0.5 ? '#dfe6f2' : '#aab4c8';
        g.fillRect(Math.floor(r() * W), Math.floor(r() * c.height), 3, 3);
      }
    }
    if (k === 3) {
      g.fillStyle = 'rgba(120, 190, 230, 0.12)';
      for (let i = 0; i < 30; i++) g.fillRect(Math.floor(r() * W), Math.floor(r() * c.height), 40 + Math.floor(r() * 60), 4);
    }
    if (k >= 4) {
      // Grietas que brillan de rojo
      for (let i = 0; i < 18; i++) {
        let x = Math.floor(r() * W), y = 12 + Math.floor(r() * (c.height - 24));
        for (let s = 0; s < 10; s++) {
          g.fillStyle = s % 3 ? '#ff4a20' : '#ffb040';
          g.fillRect(x, y, 4, 3);
          x += 4;
          y += r() < 0.5 ? 2 : -2;
        }
      }
    }
    return c;
  }

  floorAt(camX) {
    const mid = camX + VIEW_W / 2;
    return this.floors.findIndex((f) => mid >= f.x0 && mid <= f.x1);
  }

  drawBack(ctx, camX) {
    this.t += 1 / 60;
    const fi = Math.max(0, this.floorAt(camX));
    this.current = fi;
    if (fi === 0) return this.drawOutside(ctx, camX);
    const look = LOOK[fi] ?? LOOK[1];
    // Techo y pared
    ctx.fillStyle = '#120c10';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const ww = this.wall.width;
    const off = ((camX * 0.92) % ww + ww) % ww;
    for (let x = -off; x < VIEW_W; x += ww) {
      for (let y = WALL_BOTTOM - this.wall.height; y > -this.wall.height; y -= this.wall.height) ctx.drawImage(this.wall, Math.round(x), y);
    }
    ctx.fillStyle = look.tint;
    ctx.fillRect(0, 0, VIEW_W, WALL_BOTTOM);
    this.drawCeiling(ctx, camX);
    // Suelo
    const tex = this.floorTex[fi];
    const fo = ((camX % tex.width) + tex.width) % tex.width;
    ctx.drawImage(tex, -fo, WALL_BOTTOM);
    if (tex.width - fo < VIEW_W) ctx.drawImage(tex, tex.width - fo, WALL_BOTTOM);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, WALL_BOTTOM - 4, VIEW_W, 6);
    this.drawPieces(ctx, camX, fi);
    if (fi === 3) this.drawDrips(ctx, camX);
    if (fi === 5) this.drawChamber(ctx, camX);
  }

  drawCeiling(ctx, camX) {
    // Estalactitas recortando el techo
    ctx.fillStyle = '#120c10';
    ctx.fillRect(0, 0, VIEW_W, 34);
    for (let i = -1; i < 22; i++) {
      const wx = Math.floor(camX / 50) + i;
      const r = rng(wx * 97 + 13)();
      const x = Math.round(wx * 50 - camX);
      const h = 20 + Math.floor(r * 46);
      ctx.beginPath();
      ctx.moveTo(x, 30);
      ctx.lineTo(x + 50, 30);
      ctx.lineTo(x + 18 + r * 14, 30 + h);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Piezas de PixelLab (vigas, carritos, cuevas, vetas, rampas...) del piso actual.
  drawPieces(ctx, camX, fi) {
    ctx.imageSmoothingEnabled = false;
    for (const p of this.pieces) {
      if (p.floor !== fi) continue;
      const img = this.img[p.img];
      const s = p.scale ?? 2;
      const x = Math.round(p.x - camX);
      if (!img) {
        if (p.img === 'm_beam') this.codeBeam(ctx, x);
        if (p.img === 'm_cave') this.codeCave(ctx, x, p.base);
        continue;
      }
      const w = img.width * s, h = img.height * s;
      if (x + w / 2 < -40 || x - w / 2 > VIEW_W + 40) continue;
      ctx.save();
      ctx.translate(x, p.base);
      if (p.flip) ctx.scale(-1, 1);
      ctx.drawImage(img, -w / 2, -h, w, h);
      ctx.restore();
      if (p.img === 'm_beam') this.lampGlow(ctx, x, p.base - h * 0.6);
      if (p.img === 'm_cave') {
        // Ojitos que brillan dentro de la cueva
        const blink = Math.floor((this.t + p.x) * 1.3) % 4 === 0;
        if (!blink) {
          ctx.fillStyle = '#ffd23f';
          ctx.fillRect(x - 10, p.base - h * 0.5, 4, 3);
          ctx.fillRect(x + 6, p.base - h * 0.5, 4, 3);
        }
      }
    }
  }

  lampGlow(ctx, x, y) {
    const f = 0.85 + Math.sin(this.t * 9 + x) * 0.05;
    const g = ctx.createRadialGradient(x, y, 4, x, y, 90 * f);
    g.addColorStop(0, 'rgba(255, 200, 120, 0.35)');
    g.addColorStop(1, 'rgba(255, 200, 120, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 100, y - 100, 200, 200);
  }

  codeBeam(ctx, x) {
    ctx.fillStyle = '#140c1c';
    ctx.fillRect(x - 130, 30, 24, 344);
    ctx.fillRect(x + 106, 30, 24, 344);
    ctx.fillRect(x - 140, 30, 280, 26);
    ctx.fillStyle = '#6b4a2e';
    ctx.fillRect(x - 127, 33, 18, 340);
    ctx.fillRect(x + 109, 33, 18, 340);
    ctx.fillRect(x - 137, 33, 274, 20);
  }

  codeCave(ctx, x, base) {
    ctx.fillStyle = '#2a2224';
    ctx.beginPath();
    ctx.ellipse(x, base - 60, 70, 64, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#050305';
    ctx.beginPath();
    ctx.ellipse(x, base - 54, 50, 48, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Goteras: gotas que caen del techo y salpican.
  drawDrips(ctx, camX) {
    for (let i = 0; i < 9; i++) {
      const wx = Math.floor(camX / 120) * 120 + i * 120 + 40;
      const seed = rng(wx)();
      const k = (this.t * (0.6 + seed * 0.5) + seed) % 1;
      const x = Math.round(wx - camX);
      const y = 60 + k * 400;
      ctx.fillStyle = '#9fe8ff';
      if (k < 0.92) ctx.fillRect(x, Math.round(y), 3, 7);
      else {
        ctx.fillRect(x - 6, 458, 3, 2);
        ctx.fillRect(x + 6, 458, 3, 2);
      }
    }
  }

  // La cámara del Diablo: velas rojas en anillo y el círculo de fuego con símbolos.
  drawChamber(ctx, camX) {
    const f = this.floors[5];
    const cx = Math.round((f.x0 + f.x1) / 2 - camX);
    const cy = 452;
    const st = this.stage;
    const glow = st?.circleGlow ?? 0.25;
    const lit = st?.candlesLit ?? 0;
    const art = this.img.m_circle;
    if (art) {
      // Círculo de fuego con runas (PixelLab): brilla más a medida que avanza la pelea.
      const w = art.width * 2, h = Math.round(art.height * 1.4);
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = 0.55 + glow * 0.45;
      ctx.drawImage(art, cx - w / 2, cy - h / 2, w, h);
      ctx.globalAlpha = 1;
      const pulse = 0.5 + Math.sin(this.t * 4) * 0.5;
      const g = ctx.createRadialGradient(cx, cy, 30, cx, cy, 320);
      g.addColorStop(0, `rgba(255, 60, 20, ${0.05 + glow * 0.12 * pulse})`);
      g.addColorStop(1, 'rgba(255, 60, 20, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - 320, cy - 130, 640, 260);
      return;   // las velas de PixelLab son actores (se ordenan por profundidad, ver level5.js)
    }
    // Círculo de fuego
    ctx.save();
    ctx.lineWidth = 6;
    ctx.strokeStyle = `rgba(255, 40, 30, ${0.3 + glow * 0.6})`;
    ctx.beginPath(); ctx.ellipse(cx, cy, 290, 62, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(cx, cy, 250, 50, 0, 0, Math.PI * 2); ctx.stroke();
    // Símbolos que giran entre los dos anillos
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2 + this.t * 0.25;
      const x = Math.round(cx + Math.cos(a) * 270), y = Math.round(cy + Math.sin(a) * 56);
      ctx.fillStyle = `rgba(255, ${80 + Math.floor(glow * 120)}, 40, ${0.4 + glow * 0.6})`;
      const m = i % 4;
      ctx.fillRect(x - 5, y - 2, 10, 3);
      if (m === 0) ctx.fillRect(x - 1, y - 6, 3, 10);
      if (m === 1) { ctx.fillRect(x - 5, y - 6, 3, 6); ctx.fillRect(x + 3, y - 1, 3, 6); }
      if (m === 2) ctx.fillRect(x - 4, y + 2, 8, 3);
      if (m === 3) { ctx.fillRect(x - 6, y - 5, 3, 3); ctx.fillRect(x + 4, y + 2, 3, 3); }
    }
    if (glow > 0.6) {
      const g = ctx.createRadialGradient(cx, cy, 20, cx, cy, 300);
      g.addColorStop(0, `rgba(255, 40, 20, ${(glow - 0.6) * 0.5})`);
      g.addColorStop(1, 'rgba(255, 40, 20, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - 300, cy - 120, 600, 240);
    }
    ctx.restore();
    // Velas (las de atrás del anillo)
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2 - Math.PI / 2;
      const x = Math.round(cx + Math.cos(a) * 330), y = Math.round(cy - 6 + Math.sin(a) * 74);
      this.candle(ctx, x, y, i < lit, i);
    }
  }

  candle(ctx, x, y, lit, i) {
    ctx.fillStyle = '#140c1c';
    ctx.fillRect(x - 6, y - 30, 12, 32);
    ctx.fillStyle = '#b01822';
    ctx.fillRect(x - 4, y - 28, 8, 28);
    ctx.fillStyle = '#e04050';
    ctx.fillRect(x - 4, y - 28, 3, 28);
    ctx.fillStyle = '#140c1c';
    ctx.fillRect(x - 1, y - 33, 2, 5);
    if (!lit) return;
    const fl = Math.floor(this.t * 12 + i) % 3;
    const g = ctx.createRadialGradient(x, y - 38, 2, x, y - 38, 40);
    g.addColorStop(0, 'rgba(255, 120, 60, 0.45)');
    g.addColorStop(1, 'rgba(255, 120, 60, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 40, y - 78, 80, 80);
    ctx.fillStyle = '#ff3a20';
    ctx.fillRect(x - 3, y - 44 - fl, 6, 10 + fl);
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(x - 1, y - 40 - fl, 3, 6 + fl);
  }

  // Afuera, al amanecer: cielo con sol y nubes, los cerros de Oruro con la Virgen en la cima,
  // las casas de la ciudad, el Santuario del Socavón y la boca de la mina con su carrito.
  drawOutside(ctx, camX) {
    const sky = ctx.createLinearGradient(0, 0, 0, 330);
    sky.addColorStop(0, '#2e3a7a');
    sky.addColorStop(0.45, '#8a6aa8');
    sky.addColorStop(0.8, '#f29a8a');
    sky.addColorStop(1, '#ffd29a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // Sol que asoma detrás de los cerros
    this.sun ??= this.makeSun();
    ctx.drawImage(this.sun, Math.round(700 - camX * 0.02 - 72), 70);
    // Nubes rosadas del amanecer
    ctx.globalAlpha = 0.85;
    this.drawTiled(ctx, this.clouds, camX + this.t * 6, 0.05, 10);
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = false;
    // Cerros (Santa Bárbara con la Virgen) muy al fondo
    const cer = this.img.m_cerros;
    if (cer) {
      const k = 1.52;
      ctx.drawImage(cer, Math.round(-30 - camX * 0.08), 52, Math.round(cer.width * k), Math.round(cer.height * k));
    } else {
      ctx.fillStyle = '#6a4a5a';
      for (let i = -1; i < 8; i++) {
        const x = Math.round(i * 220 - ((camX * 0.2) % 220));
        ctx.beginPath(); ctx.moveTo(x - 40, 372); ctx.lineTo(x + 110, 200 + (i % 3) * 30); ctx.lineTo(x + 260, 372); ctx.fill();
      }
    }
    // Casas de Oruro (las del Carnaval), más chicas por la distancia
    const houses = this.img.c_houses;
    if (houses) {
      this.housesM ??= (() => {
        const c = canvas(houses.width * 2, houses.height);
        const g = c.getContext('2d');
        g.drawImage(houses, 0, 0);
        g.translate(houses.width * 2, 0);
        g.scale(-1, 1);
        g.drawImage(houses, 0, 0);
        return c;
      })();
      const k = 0.62, w = Math.round(this.housesM.width * k), h = Math.round(this.housesM.height * k);
      const off = Math.round(camX * 0.35) % w;
      for (let x = -off; x < VIEW_W; x += w) ctx.drawImage(this.housesM, x, 374 - h, w, h);
      // Neblina del amanecer sobre la ciudad
      const mist = ctx.createLinearGradient(0, 300, 0, 374);
      mist.addColorStop(0, 'rgba(255, 210, 180, 0)');
      mist.addColorStop(1, 'rgba(255, 210, 180, 0.35)');
      ctx.fillStyle = mist;
      ctx.fillRect(0, 300, VIEW_W, 74);
    }
    // Plaza y camino de tierra hacia la mina
    ctx.fillStyle = '#8a6a50';
    ctx.fillRect(0, 372, VIEW_W, VIEW_H - 372);
    ctx.fillStyle = '#6f5440';
    ctx.fillRect(0, 372, VIEW_W, 6);
    const r = rng(4);
    for (let i = 0; i < 220; i++) {
      ctx.fillStyle = r() < 0.5 ? '#7a5c44' : '#9a7a5c';
      const x = Math.round(r() * 1400 - camX);
      ctx.fillRect(x, 380 + Math.floor(r() * 150), 6 + Math.floor(r() * 6), 3 + Math.floor(r() * 3));
    }
    // Rieles que salen de la mina
    const rx = Math.round(1010 - camX);
    for (let x = rx - 520; x < rx + 40; x += 26) {
      ctx.fillStyle = '#4a3220';
      ctx.fillRect(x, 404, 12, 40);
    }
    for (const ry of [410, 434]) {
      ctx.fillStyle = '#2a1a14';
      ctx.fillRect(rx - 530, ry, 560, 5);
      ctx.fillStyle = '#b0a8a0';
      ctx.fillRect(rx - 530, ry, 560, 2);
    }
    const soc = this.img.c_socavon;
    if (soc) ctx.drawImage(soc, Math.round(300 - camX - soc.width / 2), 378 - soc.height);
    const ent = this.img.m_entrance;
    const ex = Math.round(1010 - camX);
    if (ent) ctx.drawImage(ent, ex - ent.width, 384 - ent.height * 2, ent.width * 2, ent.height * 2);
    else {
      ctx.fillStyle = '#4a3a30';
      ctx.fillRect(ex - 200, 180, 240, 200);
      ctx.fillStyle = '#050305';
      ctx.fillRect(ex - 140, 240, 120, 140);
    }
    // Carrito minero y rocas junto a la entrada
    const cart = this.img.m_cart;
    if (cart) ctx.drawImage(cart, ex - 330, 430 - cart.height * 2, cart.width * 2, cart.height * 2);
    for (const [name, x, k] of [['d_hill', ex + 150, 1.4], ['d_hill2', ex - 560, 1.2]]) {
      const im = this.img[name];
      if (im) ctx.drawImage(im, Math.round(x - im.width * k / 2), Math.round(380 - im.height * k), Math.round(im.width * k), Math.round(im.height * k));
    }
    // Luz cálida del amanecer
    const warm = ctx.createLinearGradient(0, 0, VIEW_W, 0);
    warm.addColorStop(0, 'rgba(255, 170, 120, 0)');
    warm.addColorStop(1, 'rgba(255, 170, 120, 0.12)');
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  drawFront(ctx, camX) {
    const fi = this.current ?? 0;
    if (fi === 0) return;
    // Oscuridad de la mina: solo se ve cerca de Faby, de las lámparas y de las velas.
    const look = LOOK[fi] ?? LOOK[1];
    const g = this.dark.getContext('2d');
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, VIEW_W, VIEW_H);
    g.fillStyle = `rgba(5, 2, 8, ${look.dark})`;
    g.fillRect(0, 0, VIEW_W, VIEW_H);
    g.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, a = 1) => {
      const rg = g.createRadialGradient(x, y, r * 0.25, x, y, r);
      rg.addColorStop(0, `rgba(0,0,0,${a})`);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    };
    const st = this.stage;
    if (st?.player) hole(st.player.x - camX, st.player.y - 80, 360);
    for (const p of this.pieces) {
      if (p.floor !== fi || p.img !== 'm_beam') continue;
      const x = p.x - camX;
      if (x > -200 && x < VIEW_W + 200) hole(x, 120, 230, 0.8);
    }
    if (fi === 5) {
      const f = this.floors[5];
      hole((f.x0 + f.x1) / 2 - camX, 400, 120 + (st?.candlesLit ?? 0) * 40, 0.9);
    }
    g.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.dark, 0, 0);
  }
}
