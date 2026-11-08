import { COLORS } from '../config.js';

// Proyectiles y trampas "fit" del nivel 2 (los usan Doña Billetes y sus vendedores).
// Viven en stage.hazards. Dibujos provisionales por código: se reemplazan por arte de PixelLab en la etapa de objetos.

const BALL = { damage: 10, knockdown: true, hitstop: 0.08 };
const SHAKE = { damage: 5, push: 80, hitstop: 0.05 };
const BILL = { damage: 6, push: 60, hitstop: 0.05 };
const SLIP = { damage: 2, knockdown: true, hitstop: 0.03 };

// Imagen de PixelLab dibujada nítida (sin suavizado), con giro y escala opcionales.
function sprite(ctx, img, x, y, k = 1, rot = 0, flip = false) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(x), Math.round(y));
  if (flip) ctx.scale(-1, 1);
  if (rot) ctx.rotate(rot);
  ctx.drawImage(img, Math.round(-img.width * k / 2), Math.round(-img.height * k / 2), Math.round(img.width * k), Math.round(img.height * k));
  ctx.restore();
}

export function drawBall(ctx, x, y, spin, img) {
  if (img) return sprite(ctx, img, x, y - 38, 1.4, spin);
  x = Math.round(x);
  y = Math.round(y);
  ctx.fillStyle = '#140c1c';
  ctx.beginPath(); ctx.arc(x, y - 38, 40, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#9b5de5';
  ctx.beginPath(); ctx.arc(x, y - 38, 37, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c38bff';
  ctx.beginPath(); ctx.arc(x - 10, y - 50, 18, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#7a3fc0';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y - 38, 26, spin, spin + 2); ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 18, y - 64, 6, 6);
}

export function drawStroller(ctx, x, y, dir, t, img) {
  if (img) return sprite(ctx, img, x, y - img.height / 2 + Math.round(Math.sin(t * 30)), 1, 0, dir < 0);
  x = Math.round(x);
  y = Math.round(y);
  ctx.save();
  ctx.translate(x, y);
  if (dir < 0) ctx.scale(-1, 1);
  ctx.fillStyle = '#140c1c';
  ctx.fillRect(-34, -62, 70, 36);
  ctx.fillStyle = '#ff6fb5';
  ctx.fillRect(-31, -59, 64, 30);
  ctx.fillStyle = '#ffd1e8';
  ctx.fillRect(-31, -59, 64, 6);
  ctx.fillStyle = '#140c1c';
  ctx.fillRect(-46, -74, 4, 40);      // manija
  ctx.fillRect(-46, -74, 16, 4);
  ctx.fillRect(-36, -30, 4, 18);
  ctx.fillRect(28, -30, 4, 18);
  const w = Math.floor(t * 12) % 2 ? 1 : 0;
  for (const wx of [-26, 26]) {
    ctx.fillStyle = '#140c1c';
    ctx.beginPath(); ctx.arc(wx, -10, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d0d0e0';
    ctx.fillRect(wx - 2 + w, -12, 4, 4);
  }
  ctx.restore();
}

export function drawPant(ctx, x, y, t) {
  for (let i = 0; i < 2; i++) {
    const k = (t * 1.5 + i * 0.5) % 1;
    ctx.fillStyle = `rgba(255,255,255,${1 - k})`;
    ctx.fillRect(Math.round(x + k * 22), Math.round(y - k * 14), 8, 4);
    ctx.fillRect(Math.round(x + k * 22) + 2, Math.round(y - k * 14) - 2, 4, 8);
  }
}

// Pelota de pilates rodando por el carril: hay que saltarla.
export class PilatesBall {
  constructor(stage, x, y, dir) {
    this.stage = stage;
    this.x = x;
    this.y = y;
    this.vx = dir * 380;
    this.spin = 0;
    this.hit = new Set();
    this.removed = false;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.spin += (this.vx / 40) * dt;
    for (const t of [this.stage.player, this.stage.tofu]) {
      if (!t || this.hit.has(t)) continue;
      if (Math.abs(t.x - this.x) < 40 && Math.abs(t.y - this.y) < 22 && (t.z ?? 0) < 60 && t.takeHit(BALL, this)) {
        this.hit.add(t);
        this.stage.fx.text(t.x, t.y - 150, '¡BOING!', '#c38bff', 12);
      }
    }
    const cam = this.stage.camera;
    if (this.x < cam.left - 60 || this.x > cam.right + 60) this.removed = true;
  }

  drawShadow(ctx, camX) {
    ctx.fillStyle = COLORS.shadow;
    ctx.beginPath();
    ctx.ellipse(Math.round(this.x - camX), Math.round(this.y), 36, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  draw(ctx, camX) {
    drawBall(ctx, this.x - camX, this.y, this.spin, this.stage.game.bgImages.o_ball);
  }
}

// Batido detox: vuela en arco y deja un charco resbaloso donde cae.
export class Shake {
  constructor(stage, x, y, tx, ty) {
    this.stage = stage;
    this.x = x;
    this.y = y;
    this.z = 150;
    const T = 0.75;
    this.vx = (tx - x) / T;
    this.vy = (ty - y) / T;
    this.vz = 300;
    this.removed = false;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.z += this.vz * dt;
    this.vz -= 1200 * dt;
    const p = this.stage.player;
    if (Math.abs(p.x - this.x) < 24 && Math.abs(p.y - this.y) < 16 && Math.abs(p.z + 90 - this.z) < 70 && p.takeHit(SHAKE, this)) {
      this.removed = true;
      this.stage.fx.text(p.x, p.y - 150, '¡DETOX!', '#7dff8a', 12);
      this.stage.sfx('splash');
    }
    if (this.z <= 0) {
      this.removed = true;
      this.stage.sfx('splash');
      this.stage.hazards.push(new Puddle(this.stage, this.x, this.y));
    }
  }

  drawShadow(ctx, camX) {
    ctx.fillStyle = COLORS.shadow;
    ctx.fillRect(Math.round(this.x - camX) - 6, Math.round(this.y) - 2, 12, 4);
  }

  draw(ctx, camX) {
    const x = Math.round(this.x - camX);
    const y = Math.round(this.y - this.z);
    const img = this.stage.game.bgImages.o_cup;
    if (img) return sprite(ctx, img, x, y, 1, this.z * 0.03);
    ctx.fillStyle = '#140c1c';
    ctx.fillRect(x - 8, y - 14, 16, 22);
    ctx.fillStyle = '#e8f4ff';
    ctx.fillRect(x - 6, y - 12, 12, 18);
    ctx.fillStyle = '#5fd35f';
    ctx.fillRect(x - 6, y - 6, 12, 12);
    ctx.fillStyle = '#ff6fb5';
    ctx.fillRect(x + 2, y - 20, 2, 10);   // pajita
  }
}

export class Puddle {
  constructor(stage, x, y) {
    this.stage = stage;
    this.floor = true;   // se dibuja en el suelo, debajo de todos
    this.x = x;
    this.y = y;
    this.life = 7;
    this.cool = 0;
    this.removed = false;
  }

  update(dt) {
    this.life -= dt;
    if (this.cool > 0) this.cool -= dt;
    if (this.life <= 0) this.removed = true;
    // Faby resbala si camina o corre encima.
    const p = this.stage.player;
    if (this.cool <= 0 && p.grounded && Math.abs(p.x - this.x) < 34 && Math.abs(p.y - this.y) < 12 && Math.abs(p.vx) > 40 && p.takeHit(SLIP, this)) {
      this.cool = 1.2;
      this.stage.fx.text(p.x, p.y - 150, '¡SE RESBALÓ!', '#7dff8a', 12);
    }
  }

  drawShadow() {}

  draw(ctx, camX) {
    const a = Math.min(1, this.life);
    ctx.fillStyle = `rgba(95, 211, 95, ${0.75 * a})`;
    ctx.beginPath();
    ctx.ellipse(Math.round(this.x - camX), Math.round(this.y), 34, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(200, 255, 200, ${0.8 * a})`;
    ctx.fillRect(Math.round(this.x - camX) - 14, Math.round(this.y) - 3, 8, 2);
  }
}

// Billete que cae del cielo sobre Faby; su sombra avisa dónde va a caer.
export class Bill {
  constructor(stage, x, y, delay) {
    this.stage = stage;
    this.x = x;
    this.y = y;
    this.z = 520;
    this.delay = delay + 0.5;
    this.t = 0;
    this.removed = false;
  }

  update(dt) {
    this.t += dt;
    if (this.t < this.delay) return;
    this.z -= 520 * dt;
    const p = this.stage.player;
    if (this.z < 160 && Math.abs(p.x - this.x) < 22 && Math.abs(p.y - this.y) < 14 && p.takeHit(BILL, this)) this.removed = true;
    if (this.z <= 0) {
      this.removed = true;
      this.stage.fx.dust(this.x, this.y, 2);
    }
  }

  drawShadow(ctx, camX) {
    const k = Math.max(0.3, 1 - this.z / 520);
    ctx.fillStyle = COLORS.shadow;
    ctx.beginPath();
    ctx.ellipse(Math.round(this.x - camX), Math.round(this.y), 16 * k, 5 * k, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  draw(ctx, camX) {
    if (this.t < this.delay) return;
    const x = Math.round(this.x - camX + Math.sin(this.t * 9) * 6);
    const y = Math.round(this.y - this.z);
    const img = this.stage.game.bgImages.o_bill;
    if (img) return sprite(ctx, img, x, y, 1, Math.sin(this.t * 7) * 0.4);
    ctx.fillStyle = '#140c1c';
    ctx.fillRect(x - 14, y - 8, 28, 16);
    ctx.fillStyle = '#5fbf6a';
    ctx.fillRect(x - 12, y - 6, 24, 12);
    ctx.fillStyle = '#d9ffd9';
    ctx.fillRect(x - 4, y - 4, 8, 8);
    ctx.fillStyle = '#2f7a3a';
    ctx.fillRect(x - 2, y - 2, 4, 4);
  }
}

// Serpentina del jefe del Carnaval: cae sobre Faby (la sombra avisa) y suelta confeti.
const STREAMER = { damage: 6, push: 70, hitstop: 0.05 };
const STREAMER_COLORS = ['#ff2fa8', '#ffd23f', '#7df9ff', '#7dff8a', '#ff6b3d'];

export class Streamer extends Bill {
  constructor(stage, x, y, delay) {
    super(stage, x, y, delay);
    this.color = STREAMER_COLORS[Math.floor(Math.random() * STREAMER_COLORS.length)];
  }

  update(dt) {
    this.t += dt;
    if (this.t < this.delay) return;
    this.z -= 520 * dt;
    const p = this.stage.player;
    if (this.z < 160 && Math.abs(p.x - this.x) < 22 && Math.abs(p.y - this.y) < 14 && p.takeHit(STREAMER, this)) this.removed = true;
    if (this.z <= 0) {
      this.removed = true;
      this.stage.fx.dust(this.x, this.y, 2);
    }
  }

  draw(ctx, camX) {
    if (this.t < this.delay) return;
    const x = Math.round(this.x - camX);
    const y = Math.round(this.y - this.z);
    // Cinta en espiral y algunos papelitos de confeti
    for (let i = 0; i < 6; i++) {
      const ox = Math.round(Math.sin(this.t * 10 + i) * 6);
      ctx.fillStyle = '#140c1c';
      ctx.fillRect(x + ox - 3, y - i * 6 - 3, 6, 6);
      ctx.fillStyle = this.color;
      ctx.fillRect(x + ox - 2, y - i * 6 - 2, 4, 4);
    }
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = STREAMER_COLORS[(i + 1) % STREAMER_COLORS.length];
      ctx.fillRect(x + Math.round(Math.cos(this.t * 6 + i * 2) * 14), y - 10 - i * 8, 3, 3);
    }
  }
}

// Nivel 5: piedrita encendida que lanza el diablito minero (vuela en arco y se apaga al caer).
const EMBER = { damage: 6, push: 90, hitstop: 0.05 };

export class Ember extends Shake {
  update(dt) {
    this.t = (this.t ?? 0) + dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.z += this.vz * dt;
    this.vz -= 1200 * dt;
    for (const target of [this.stage.player, this.stage.tofu]) {
      if (!target || this.removed || !target.hurtWorld) continue;
      const tall = target === this.stage.player ? 90 : 30;
      if (Math.abs(target.x - this.x) < 24 && Math.abs(target.y - this.y) < 16 && Math.abs((target.z ?? 0) + tall - this.z) < 60 && target.takeHit(EMBER, this)) {
        this.removed = true;
        this.stage.fx.text(target.x, target.y - 150, '¡AY, QUEMA!', '#ff6b3d', 11);
      }
    }
    if (this.z <= 0) {
      this.removed = true;
      this.stage.fx.dust(this.x, this.y, 2);
    }
  }

  draw(ctx, camX) {
    const x = Math.round(this.x - camX);
    const y = Math.round(this.y - this.z);
    const f = Math.floor((this.t ?? 0) * 20) % 2;
    ctx.fillStyle = 'rgba(255, 120, 40, 0.35)';
    ctx.fillRect(x - 10, y - 10, 20, 20);
    ctx.fillStyle = '#140c1c';
    ctx.fillRect(x - 7, y - 7, 14, 14);
    ctx.fillStyle = '#5a4a48';
    ctx.fillRect(x - 5, y - 5, 10, 10);
    ctx.fillStyle = f ? '#ffd23f' : '#ff6b3d';
    ctx.fillRect(x - 3, y - 3, 6, 6);
    ctx.fillStyle = '#ff6b3d';
    ctx.fillRect(x - 2 - Math.sign(this.vx) * 10, y - 1 + f, 4, 3);
    ctx.fillRect(x - 1 - Math.sign(this.vx) * 16, y + 1 - f, 3, 2);
  }
}

// Nivel 5: bola de fuego del Diablo. Vuela recta por el carril (hay que cambiar de carril o saltar).
const FIREBALL = { damage: 11, knockdown: true, hitstop: 0.08 };

export class Fireball {
  constructor(stage, x, y, dir, speed = 420) {
    this.stage = stage;
    this.x = x;
    this.y = y;
    this.z = 70;
    this.vx = dir * speed;
    this.t = 0;
    this.hit = new Set();
    this.removed = false;
  }

  update(dt) {
    this.t += dt;
    this.x += this.vx * dt;
    for (const target of [this.stage.player, this.stage.tofu]) {
      if (!target || this.hit.has(target) || !target.hurtWorld) continue;
      if (Math.abs(target.x - this.x) < 34 && Math.abs(target.y - this.y) < 18 && (target.z ?? 0) < 50 && target.takeHit(FIREBALL, this)) {
        this.hit.add(target);
        this.removed = true;
        this.stage.fx.text(target.x, target.y - 150, '¡FUEGO!', '#ff6b3d', 12);
        this.stage.fx.spark(target.x, target.y - 70, true);
      }
    }
    const cam = this.stage.camera;
    if (this.x < cam.left - 80 || this.x > cam.right + 80) this.removed = true;
  }

  drawShadow(ctx, camX) {
    ctx.fillStyle = 'rgba(255, 90, 30, 0.35)';
    ctx.beginPath();
    ctx.ellipse(Math.round(this.x - camX), Math.round(this.y), 30, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  draw(ctx, camX) {
    drawFireball(ctx, this.x - camX, this.y - this.z, Math.sign(this.vx), this.t);
  }
}

export function drawFireball(ctx, x, y, dir, t, k = 1) {
  x = Math.round(x);
  y = Math.round(y);
  const f = Math.floor(t * 16) % 2;
  const s = (n) => Math.round(n * k);
  // Estela
  for (let i = 1; i <= 4; i++) {
    ctx.fillStyle = i % 2 ? '#ff6b3d' : '#ffd23f';
    const r = s(10 - i * 2);
    ctx.fillRect(x - dir * s(i * 12) - r, y - r + ((i + f) % 2 ? 2 : -2), r * 2, r * 2);
  }
  ctx.fillStyle = 'rgba(255, 80, 20, 0.35)';
  ctx.fillRect(x - s(22), y - s(22), s(44), s(44));
  ctx.fillStyle = '#140c1c';
  ctx.fillRect(x - s(16), y - s(16), s(32), s(32));
  ctx.fillStyle = '#e8331f';
  ctx.fillRect(x - s(14), y - s(14), s(28), s(28));
  ctx.fillStyle = '#ff6b3d';
  ctx.fillRect(x - s(10), y - s(10), s(20), s(20));
  ctx.fillStyle = f ? '#ffd23f' : '#fff3a0';
  ctx.fillRect(x - s(5) + dir * s(3), y - s(5), s(10), s(10));
}

// Nivel 5: fuego que cae del techo sobre Faby (fase 3 del Diablo); la sombra avisa dónde cae.
const FIRE_RAIN = { damage: 9, knockdown: true, hitstop: 0.06 };

export class FireRain extends Bill {
  update(dt) {
    this.t += dt;
    if (this.t < this.delay) return;
    this.z -= 600 * dt;
    const p = this.stage.player;
    if (this.z < 150 && Math.abs(p.x - this.x) < 26 && Math.abs(p.y - this.y) < 16 && p.takeHit(FIRE_RAIN, this)) this.removed = true;
    if (this.z <= 0) {
      this.removed = true;
      this.stage.fx.spark(this.x, this.y - 10, false);
    }
  }

  drawShadow(ctx, camX) {
    if (this.t < this.delay * 0.4) return;
    const k = Math.max(0.3, 1 - this.z / 520);
    ctx.fillStyle = 'rgba(255, 60, 30, 0.45)';
    ctx.beginPath();
    ctx.ellipse(Math.round(this.x - camX), Math.round(this.y), 22 * k, 7 * k, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  draw(ctx, camX) {
    if (this.t < this.delay) return;
    ctx.save();
    ctx.translate(Math.round(this.x - camX), Math.round(this.y - this.z));
    ctx.rotate(Math.PI / 2);
    drawFireball(ctx, 0, 0, 1, this.t, 0.7);
    ctx.restore();
  }
}

// Nivel 5: piedra que cae del techo cuando la mina tiembla (final del nivel).
export class FallingRock extends Bill {
  update(dt) {
    this.t += dt;
    if (this.t < this.delay) return;
    this.z -= 700 * dt;
    if (this.z <= 0) {
      this.removed = true;
      this.stage.fx.dust(this.x, this.y, 3);
    }
  }

  draw(ctx, camX) {
    if (this.t < this.delay) return;
    const x = Math.round(this.x - camX), y = Math.round(this.y - this.z);
    ctx.fillStyle = '#140c1c';
    ctx.fillRect(x - 11, y - 9, 22, 18);
    ctx.fillStyle = '#6b5a52';
    ctx.fillRect(x - 9, y - 7, 18, 14);
    ctx.fillStyle = '#8f7d72';
    ctx.fillRect(x - 7, y - 7, 8, 5);
  }
}
