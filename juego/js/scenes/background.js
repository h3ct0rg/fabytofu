import { VIEW_W, VIEW_H } from '../config.js';

// Escenario del Parque Lincoln (Cochabamba).
// Capas de atrás hacia adelante:
//   cielo (código) · nubes (código) · Tunari · ciudad · calle con autos · fila de árboles
//   · suelo (código, con textura) · piezas del parque (glorieta, pérgola, pileta, bandera...) · primer plano.
// Las capas lejanas son ilustraciones de PixelLab que se repiten en espejo para no mostrar costuras.

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

// Copia espejada de una imagen, para repetir capas sin costura visible.
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
const GRASS_BACK = [328, 372];
const SLABS = [372, 450];
const GRASS_MID = [450, 462];
const BIKE = [462, 525];
const CURB = [525, 540];

// Dónde va cada pieza del parque (x del centro en el mundo, y de la base en pantalla, capa).
// "back" = detrás de los personajes; "front" = primer plano.
const PIECES = [
  { img: 'canchas', x: 270, base: 374 },
  { img: 'flowerbed', x: 640, base: 372 },
  { img: 'bench', x: 820, base: 368 },
  { img: 'flowerbed', x: 1060, base: 372 },
  { img: 'glorieta', x: 1650, base: 376 },
  { img: 'bench', x: 1960, base: 368 },
  { img: 'pond', x: 2470, base: 368 },
  { img: 'pergola', x: 2290, base: 378 },
  // Arbusto que tapa el borde izquierdo de la pérgola (las buganvillas siguen "detrás").
  { img: 'bush', x: 2180, base: 384 },
  { img: 'flag', x: 3130, base: 372 },
];
const LAMPS = [140, 560, 980, 1400, 1880, 2620, 3000, 3380];
const FRONT = [{ img: 'bush', x: 520 }, { img: 'bush', x: 1820 }, { img: 'bush', x: 2900 }];

export class Background {
  constructor(worldWidth, images = {}) {
    this.worldWidth = worldWidth;
    this.img = images;
    this.clouds = this.makeClouds();
    this.far = {
      tunari: images.tunari && mirrored(images.tunari),
      city: images.city && mirrored(images.city),
      street: images.street && mirrored(images.street),
      treeline: images.treeline && mirrored(images.treeline),
    };
    this.floor = this.makeFloor();
  }

  makeSun() {
    const c = canvas(144, 144);
    const g = c.getContext('2d');
    for (const [r, col] of [[70, 'rgba(255,240,190,0.25)'], [52, 'rgba(255,240,190,0.35)'], [34, '#fff3c4'], [28, '#fffbe6']]) {
      for (let y = -r; y <= r; y += 2) {
        for (let x = -r; x <= r; x += 2) {
          if (x * x + y * y <= r * r) { g.fillStyle = col; g.fillRect(72 + x, 72 + y, 2, 2); }
        }
      }
    }
    return c;
  }

  makeClouds() {
    const c = canvas(1920, 200);
    const g = c.getContext('2d');
    const r = rng(7);
    for (let i = 0; i < 10; i++) {
      const x = r() * 1800;
      const y = 14 + r() * 110;
      const s = 18 + r() * 26;
      // Nube de pixel art: bloques redondeados con sombra lavanda abajo.
      const puffs = 4 + Math.floor(r() * 4);
      for (const [col, dy] of [['#c9d8ff', 6], ['#ffffff', 0]]) {
        g.fillStyle = col;
        for (let j = 0; j < puffs; j++) {
          const px = Math.round(x + j * s * 0.7);
          const py = Math.round(y + dy - Math.sin((j / (puffs - 1)) * Math.PI) * s * 0.6);
          g.beginPath();
          g.arc(px, py, Math.round(s * (0.6 + 0.4 * Math.sin((j / (puffs - 1)) * Math.PI))), 0, Math.PI * 2);
          g.fill();
        }
        g.fillRect(Math.round(x - s * 0.5), Math.round(y + dy), Math.round(puffs * s * 0.7 + s * 0.4), Math.round(s * 0.5));
      }
    }
    // Bordes duros, como pixel art (sin antialias).
    const img = g.getImageData(0, 0, c.width, c.height);
    for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i] > 110 ? 255 : 0;
    g.putImageData(img, 0, 0);
    return c;
  }

  // Suelo con textura: pasto, losas de cemento, ciclovía roja y bordillo de ladrillo.
  // Se pinta una vez en un tile de 1920 px (múltiplo de todas las repeticiones).
  makeFloor() {
    const W = 1920;
    const c = canvas(W, VIEW_H);
    const g = c.getContext('2d');
    const r = rng(1234);
    const px = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };

    // Pasto del fondo con matas y flores pequeñas
    px(0, GRASS_BACK[0], W, GRASS_BACK[1] - GRASS_BACK[0], '#4fb340');
    px(0, GRASS_BACK[0], W, 3, '#3d9a33');
    for (let i = 0; i < 1400; i++) {
      const x = Math.floor(r() * W), y = GRASS_BACK[0] + Math.floor(r() * 42);
      px(x, y, 2, 2, r() < 0.5 ? '#66c94f' : '#3f9e35');
    }
    for (let i = 0; i < 80; i++) {
      const x = Math.floor(r() * W), y = GRASS_BACK[0] + 6 + Math.floor(r() * 34);
      const col = ['#ffffff', '#ffe14d', '#ff7ab8', '#b98cff'][Math.floor(r() * 4)];
      px(x, y, 2, 2, col);
      px(x - 2, y + 2, 2, 2, '#2f8a2a');
    }
    // Borde de cemento
    px(0, SLABS[0] - 4, W, 4, '#9e9a8f');

    // Losas de cemento con juntas, grietas y hojas caídas
    px(0, SLABS[0], W, SLABS[1] - SLABS[0], '#d9d4c7');
    for (let i = 0; i < 3000; i++) {
      const x = Math.floor(r() * W), y = SLABS[0] + Math.floor(r() * 78);
      px(x, y, 2, 2, r() < 0.5 ? '#cfc9bb' : '#e4e0d4');
    }
    for (let x = 0; x < W; x += 64) px(x, SLABS[0], 2, SLABS[1] - SLABS[0], '#b8b2a3');
    px(0, 410, W, 2, '#b8b2a3');
    for (let i = 0; i < 26; i++) {
      // Grieta zigzag
      let x = Math.floor(r() * W), y = SLABS[0] + 6 + Math.floor(r() * 60);
      for (let k = 0; k < 6; k++) { px(x, y, 2, 2, '#a59f90'); x += 2; y += r() < 0.5 ? 2 : -2; }
    }
    for (let i = 0; i < 70; i++) {
      // Hojas caídas (amarillas y verdes)
      const x = Math.floor(r() * W), y = SLABS[0] + 4 + Math.floor(r() * 70);
      const col = ['#e8b23a', '#d98a2b', '#8bbf3f'][Math.floor(r() * 3)];
      px(x, y, 4, 2, col);
      px(x + 1, y + 2, 2, 2, col);
    }

    // Franja de pasto con matas
    px(0, GRASS_MID[0], W, GRASS_MID[1] - GRASS_MID[0], '#4fb340');
    for (let x = 0; x < W; x += 4) {
      if (r() < 0.6) px(x, GRASS_MID[0] - 2, 2, 2 + Math.floor(r() * 3), '#66c94f');
    }

    // Ciclovía: asfalto rojo con grano, línea blanca discontinua y bicicletas pintadas
    px(0, BIKE[0], W, BIKE[1] - BIKE[0], '#a2443c');
    for (let i = 0; i < 4000; i++) {
      const x = Math.floor(r() * W), y = BIKE[0] + Math.floor(r() * 63);
      px(x, y, 2, 2, r() < 0.5 ? '#8f3a33' : '#b1544a');
    }
    px(0, BIKE[0], W, 3, '#f2ede4');
    px(0, BIKE[1] - 3, W, 3, '#f2ede4');
    for (let x = 0; x < W; x += 80) px(x, 492, 44, 4, '#f2ede4');
    for (let x = 240; x < W; x += 640) this.paintBike(g, x, 468);
    for (let x = 560; x < W; x += 640) this.paintBike(g, x, 500);

    // Bordillo de ladrillo con mortero
    px(0, CURB[0], W, VIEW_H - CURB[0], '#c4553a');
    px(0, CURB[0], W, 2, '#e07a5a');
    for (let x = 0; x < W; x += 24) px(x, CURB[0], 2, 15, '#8e3d2c');
    for (let x = 12; x < W; x += 24) px(x, 533, 2, 7, '#8e3d2c');
    px(0, 532, W, 1, '#8e3d2c');
    return c;
  }

  // Ícono de bicicleta pintado en el asfalto: dos ruedas, cuadro y manubrio en bloques de 2 px.
  paintBike(g, x, y) {
    g.fillStyle = '#f2ede4';
    const dot = (px, py) => g.fillRect(Math.round(px / 2) * 2, Math.round(py / 2) * 2, 2, 2);
    for (const cx of [x + 7, x + 29]) {
      for (let a = 0; a < Math.PI * 2; a += 0.25) dot(cx + Math.cos(a) * 7, y + 12 + Math.sin(a) * 7);
    }
    const line = (x0, y0, x1, y1) => {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) / 2;
      for (let i = 0; i <= n; i++) dot(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n);
    };
    line(x + 7, y + 12, x + 16, y + 12);   // vaina
    line(x + 16, y + 12, x + 12, y + 3);   // tubo del asiento
    line(x + 12, y + 3, x + 25, y + 3);    // tubo superior
    line(x + 16, y + 12, x + 25, y + 3);   // tubo diagonal
    line(x + 25, y + 3, x + 29, y + 12);   // horquilla
    line(x + 9, y + 1, x + 15, y + 1);     // asiento
    line(x + 23, y - 1, x + 27, y - 1);    // manubrio
  }

  drawTiled(ctx, img, camX, factor, y, gap = 0) {
    if (!img) return;
    const span = img.width + gap;
    const off = -(((camX * factor) % span) + span) % span;
    for (let x = off - span; x < VIEW_W; x += span) ctx.drawImage(img, Math.round(x), y);
  }

  drawBack(ctx, camX) {
    // Cielo azul intenso con brillo cálido hacia el horizonte
    const sky = ctx.createLinearGradient(0, 0, 0, 330);
    sky.addColorStop(0, '#1f6fe0');
    sky.addColorStop(0.55, '#5fb4ff');
    sky.addColorStop(1, '#ffe2b0');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // Sol de pixel art con halo
    this.sun ??= this.makeSun();
    ctx.drawImage(this.sun, Math.round(800 - camX * 0.01 - 72), -2);

    this.drawTiled(ctx, this.clouds, camX, 0.03, 0);
    this.drawTiled(ctx, this.far.tunari, camX, 0.05, 60);
    this.drawTiled(ctx, this.far.city, camX, 0.15, 118);
    this.drawTiled(ctx, this.far.street, camX, 0.4, 196);
    // Árboles en grupos, con espacios por donde se ve la calle y la ciudad.
    this.drawTiled(ctx, this.far.treeline, camX, 0.7, 62, 420);
    const fw = this.floor.width;
    const off = ((camX % fw) + fw) % fw;
    ctx.drawImage(this.floor, -off, 0);
    if (fw - off < VIEW_W) ctx.drawImage(this.floor, fw - off, 0);
    this.drawEnd(ctx, camX);
    this.drawPieces(ctx, camX);
  }

  // Final del tramo: la avenida que cruza el parque, con bordillo, rampa y paso de cebra.
  drawEnd(ctx, camX) {
    const x0 = Math.round(this.worldWidth - 120 - camX);
    if (x0 > VIEW_W) return;
    const top = GRASS_BACK[0];
    // Bordillo gris con rampa para bicicletas
    ctx.fillStyle = '#b9b4a8';
    ctx.fillRect(x0 - 10, top, 14, VIEW_H - top);
    ctx.fillStyle = '#8f8a80';
    ctx.fillRect(x0 + 2, top, 4, VIEW_H - top);
    // Calzada con grano
    ctx.fillStyle = '#4b4b55';
    ctx.fillRect(x0 + 6, top, 420, VIEW_H - top);
    const r = rng(77);
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = r() < 0.5 ? '#55555f' : '#42424b';
      ctx.fillRect(x0 + 6 + Math.floor(r() * 210) * 2, top + Math.floor(r() * 106) * 2, 2, 2);
    }
    // Paso de cebra (se cruza hacia el fondo) y línea amarilla de la avenida
    ctx.fillStyle = '#f2ede4';
    for (let y = top + 10; y < VIEW_H - 8; y += 22) ctx.fillRect(x0 + 24, y, 76, 12);
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(x0 + 150, top, 4, VIEW_H - top);
    ctx.fillRect(x0 + 158, top, 4, VIEW_H - top);
    // Semáforo peatonal
    ctx.fillStyle = '#2b2b33';
    ctx.fillRect(x0 - 4, top - 150, 6, 152);
    ctx.fillRect(x0 - 12, top - 168, 22, 40);
    ctx.fillStyle = '#ff4d4d';
    ctx.fillRect(x0 - 7, top - 163, 12, 12);
    ctx.fillStyle = '#4dff88';
    ctx.fillRect(x0 - 7, top - 146, 12, 12);
  }

  drawPieces(ctx, camX) {
    for (const x of LAMPS) this.drawPiece(ctx, 'lamp', x, 364, camX);
    for (const p of PIECES) this.drawPiece(ctx, p.img, p.x, p.base, camX);
  }

  drawPiece(ctx, name, wx, base, camX, factor = 1) {
    const img = this.img[name];
    if (!img) return;
    const x = Math.round(wx * factor - camX * factor - img.width / 2);
    if (x > VIEW_W || x + img.width < 0) return;
    ctx.drawImage(img, x, Math.round(base - img.height));
  }

  // Primer plano: arbustos y flores que pasan por delante, más rápido que la cámara.
  drawFront(ctx, camX) {
    for (const f of FRONT) {
      const img = this.img[f.img];
      if (!img) continue;
      const x = Math.round(f.x * 1.25 - camX * 1.25 - img.width / 2);
      if (x > VIEW_W || x + img.width < 0) continue;
      // Solo asoma la parte de arriba, para no tapar la pelea.
      ctx.drawImage(img, x, VIEW_H - Math.round(img.height * 0.45));
    }
  }
}
