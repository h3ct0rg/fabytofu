import { VIEW_W, VIEW_H, FONT } from '../config.js';
import { Background } from './background.js';

// Escenario de El Prado (Av. Ballivián, Cochabamba), inspirado en el paseo real:
// baldosas rojizas con dibujo circular, árboles viejos con el tronco pintado de blanco,
// jardineras con rejita verde, edificios color crema con cafés y la rotonda del monumento.
// Capas: cielo · nubes · Tunari · ciudad (del nivel 1) · edificios del Prado · avenida con autos
//        · fila de árboles · piso (código) · piezas · primer plano.

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

function mirrored(img) {
  const c = canvas(img.width * 2, img.height);
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  g.save();
  g.translate(img.width * 2, 0);
  g.scale(-1, 1);
  g.drawImage(img, 0, 0);
  g.restore();
  return c;
}

// Franjas del suelo (coordenadas de pantalla).
const GRASS = [330, 374];
const TILES = [374, 505];
const BAND = [505, 525];
const CURB = [525, 540];

// Piezas (x del centro en el mundo, base en pantalla).
const PIECES = [
  { img: 'p_juice', x: 760, base: 380 },
  { img: 'p_juice', x: 1120, base: 380, flip: true },
  { img: 'p_fitpet', x: 1520, base: 380 },
  { img: 'p_fitpet2', x: 1880, base: 380 },
  { img: 'bench', x: 2240, base: 370 },
  { img: 'p_palm', x: 2400, base: 376 },
  { img: 'bench', x: 2600, base: 370 },
  { img: 'p_palm', x: 2780, base: 376 },
  { img: 'p_monument', x: 3300, base: 380 },
];
const TREES = [40, 470, 980, 1330, 1700, 2080, 2500, 2920];
const PLANTERS = [260, 620, 1240, 2160, 2700, 3080];
const LAMPS = [330, 900, 1430, 2000, 2330, 2860];
const FRONT = [{ img: 'p_planter', x: 600 }, { img: 'bush', x: 1700 }, { img: 'p_planter', x: 2650 }];

export class PradoBackground extends Background {
  constructor(worldWidth, images = {}) {
    super(worldWidth, images);
    this.far.buildings = images.p_buildings && mirrored(images.p_buildings);
  }

  // Paseo de baldosas rojizas con rosetones, franja gris con rombos y bordillo.
  makeFloor() {
    const W = 1920;
    const c = canvas(W, VIEW_H);
    const g = c.getContext('2d');
    const r = rng(4321);
    const px = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };

    // Pasto de las jardineras del fondo, con flores rojo oscuro y rejita verde.
    px(0, GRASS[0], W, GRASS[1] - GRASS[0], '#4fb340');
    px(0, GRASS[0], W, 3, '#3d9a33');
    for (let i = 0; i < 1300; i++) px(Math.floor(r() * W), GRASS[0] + Math.floor(r() * 42), 2, 2, r() < 0.5 ? '#66c94f' : '#3f9e35');
    for (let i = 0; i < 160; i++) {
      const x = Math.floor(r() * W), y = GRASS[0] + 8 + Math.floor(r() * 26);
      px(x, y, 4, 4, r() < 0.6 ? '#8e1f3a' : '#c2185b');
      px(x + 1, y + 1, 2, 2, '#e04a7a');
    }
    // Rejita verde en arcos
    for (let x = 0; x < W; x += 16) {
      for (let a = 0; a <= 8; a += 2) {
        const yy = GRASS[1] - 14 + Math.round(Math.abs(a - 4) * 1.2);
        px(x + a * 2, yy, 2, 2, '#2fbf4a');
      }
      px(x, GRASS[1] - 14, 2, 12, '#239a3a');
    }
    // Borde de cemento
    px(0, TILES[0] - 4, W, 4, '#a39f96');

    // Baldosas rojizas 32x32 con rosetón: cuarto de círculo en cada esquina.
    px(0, TILES[0], W, TILES[1] - TILES[0], '#c4766c');
    const S = 32;
    for (let ty = TILES[0]; ty < TILES[1]; ty += S) {
      for (let tx = 0; tx < W; tx += S) {
        const shade = r() < 0.15 ? '#bb6c63' : '#c4766c';
        px(tx, ty, S, Math.min(S, TILES[1] - ty), shade);
        // Puntos del rosetón (arcos claros) y centro oscuro
        for (let a = 0; a < Math.PI / 2; a += 0.22) {
          for (const [cx, cy] of [[tx, ty], [tx + S, ty], [tx, ty + S], [tx + S, ty + S]]) {
            const sx = cx === tx ? 1 : -1, sy = cy === ty ? 1 : -1;
            const x = Math.round(cx + sx * Math.cos(a) * 12), y = Math.round(cy + sy * Math.sin(a) * 12);
            if (y >= TILES[0] && y < TILES[1] - 1) px(x, y, 2, 2, '#e3a69c');
          }
        }
        if (ty + 16 < TILES[1]) {
          px(tx + 14, ty + 14, 4, 4, '#9c4f48');
          px(tx + 15, ty + 15, 2, 2, '#e3a69c');
        }
        // Junta
        px(tx, ty, S, 1, '#a65a52');
        px(tx, ty, 1, Math.min(S, TILES[1] - ty), '#a65a52');
      }
    }
    // Grano y pétalos morados de jacarandá
    for (let i = 0; i < 2600; i++) px(Math.floor(r() * W), TILES[0] + Math.floor(r() * 130), 2, 2, r() < 0.5 ? '#b86b62' : '#cf857b');
    for (let i = 0; i < 90; i++) {
      const x = Math.floor(r() * W), y = TILES[0] + 4 + Math.floor(r() * 120);
      px(x, y, 4, 2, r() < 0.6 ? '#9b7be0' : '#e8b23a');
      px(x + 1, y + 2, 2, 2, '#7d5cc8');
    }

    // Franja gris con rombos blancos (como en la foto del paseo)
    px(0, BAND[0], W, BAND[1] - BAND[0], '#5f6670');
    px(0, BAND[0], W, 2, '#8c939c');
    for (let x = 0; x < W; x += 24) {
      const cy = BAND[0] + 10;
      for (let k = 0; k < 4; k++) px(x + 12 - k * 2, cy - k * 2, 4 + k * 4, 2, '#e8ecef');
      for (let k = 0; k < 4; k++) px(x + 12 - k * 2, cy + k * 2, 4 + k * 4, 2, '#e8ecef');
    }
    // Bordillo gris y la avenida
    px(0, CURB[0], W, VIEW_H - CURB[0], '#b9b4a8');
    px(0, CURB[0], W, 2, '#d8d3c8');
    for (let x = 0; x < W; x += 48) px(x, CURB[0], 2, 15, '#8f8a80');
    px(0, 536, W, 4, '#4b4b55');
    return c;
  }

  drawBack(ctx, camX) {
    const sky = ctx.createLinearGradient(0, 0, 0, 330);
    sky.addColorStop(0, '#2a78e4');
    sky.addColorStop(0.55, '#6cbcff');
    sky.addColorStop(1, '#ffe6bd');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    this.sun ??= this.makeSun();
    ctx.drawImage(this.sun, Math.round(140 - camX * 0.01 - 72), -6);

    this.drawTiled(ctx, this.clouds, camX, 0.03, 0);
    this.drawTiled(ctx, this.far.tunari, camX, 0.05, 60);
    this.drawTiled(ctx, this.far.city, camX, 0.12, 110);
    this.drawTiled(ctx, this.far.buildings, camX, 0.25, 118);
    this.drawTiled(ctx, this.far.street, camX, 0.45, 200);
    this.drawTiled(ctx, this.far.treeline, camX, 0.7, 60, 520);
    const fw = this.floor.width;
    const off = ((camX % fw) + fw) % fw;
    ctx.drawImage(this.floor, -off, 0);
    if (fw - off < VIEW_W) ctx.drawImage(this.floor, fw - off, 0);
    this.drawPieces(ctx, camX);
  }

  // La rotonda del final no se dibuja: el monumento cierra el paseo.
  drawEnd() {}

  drawPieces(ctx, camX) {
    for (const x of PLANTERS) this.drawPiece(ctx, 'p_planter', x, 376, camX);
    for (const x of TREES) this.drawPiece(ctx, 'p_tree', x, 382, camX);
    for (const x of LAMPS) this.drawPiece(ctx, 'lamp', x, 366, camX);
    for (const p of PIECES) this.drawPiece(ctx, p.img, p.x, p.base, camX, 1, p.flip);
    this.drawSign(ctx, 150 - camX, 378);
  }

  // Letrero verde de calle "EL PRADO" con poste de fierro.
  drawSign(ctx, x, base) {
    x = Math.round(x);
    if (x < -120 || x > VIEW_W + 120) return;
    const px = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, base + b, w, h); };
    px(-5, -170, 10, 170, '#140c1c');
    px(-3, -168, 6, 168, '#1f5a3a');
    px(-9, -6, 18, 6, '#140c1c');
    px(-7, -182, 14, 14, '#140c1c');
    px(-4, -179, 8, 8, '#2f7a50');
    px(-80, -164, 160, 44, '#140c1c');
    px(-77, -161, 154, 38, '#1f6a44');
    px(-72, -156, 144, 28, '#f2ede4');
    ctx.font = `14px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1f6a44';
    ctx.fillText('EL PRADO', x, base - 135);
  }

  drawPiece(ctx, name, wx, base, camX, factor = 1, flip = false) {
    const img = this.img[name];
    if (!img) return;
    const x = Math.round(wx * factor - camX * factor - img.width / 2);
    if (x > VIEW_W || x + img.width < 0) return;
    if (!flip) {
      ctx.drawImage(img, x, Math.round(base - img.height));
      return;
    }
    ctx.save();
    ctx.translate(x + img.width, Math.round(base - img.height));
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }

  drawFront(ctx, camX) {
    for (const f of FRONT) {
      const img = this.img[f.img];
      if (!img) continue;
      const x = Math.round(f.x * 1.25 - camX * 1.25 - img.width / 2);
      if (x > VIEW_W || x + img.width < 0) continue;
      ctx.drawImage(img, x, VIEW_H - Math.round(img.height * 0.45));
    }
  }
}
