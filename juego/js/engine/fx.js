import { FONT, fontSafe } from '../config.js';

// Efectos visuales efímeros dibujados por código: chispas de impacto, polvo y textos flotantes.
export class FX {
  constructor() {
    this.items = [];
  }

  // Chispa de golpe en coordenadas de pantalla-mundo (x, altura de pantalla sy).
  spark(x, sy, strong = false) {
    const rays = strong ? 10 : 7;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2 + Math.random() * 0.4;
      this.items.push({ type: 'ray', x, sy, a, len: strong ? 30 : 20, t: 0, life: strong ? 0.22 : 0.16 });
    }
    this.items.push({ type: 'flash', x, sy, r: strong ? 22 : 14, t: 0, life: 0.08 });
  }

  dust(x, sy, n = 4) {
    for (let i = 0; i < n; i++) {
      this.items.push({
        type: 'dust', x: x + (Math.random() * 30 - 15), sy: sy - Math.random() * 4,
        vx: Math.random() * 60 - 30, vy: -20 - Math.random() * 30, r: 4 + Math.random() * 4, t: 0, life: 0.4,
      });
    }
  }

  text(x, sy, str, color = '#ffd23f', size = 16) {
    this.items.push({ type: 'text', x, sy, str: fontSafe(str), color, size, t: 0, life: 0.7 });
  }

  update(dt) {
    for (const p of this.items) {
      p.t += dt;
      if (p.type === 'dust') { p.x += p.vx * dt; p.sy += p.vy * dt; }
      if (p.type === 'text') p.sy -= 40 * dt;
    }
    this.items = this.items.filter((p) => p.t < p.life);
  }

  draw(ctx, camX) {
    for (const p of this.items) {
      const k = p.t / p.life;
      const x = Math.round(p.x - camX);
      const y = Math.round(p.sy);
      if (p.type === 'ray') {
        const r0 = p.len * k * 0.6;
        const r1 = p.len * (0.4 + k);
        ctx.strokeStyle = k < 0.5 ? '#ffffff' : '#ffd23f';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(p.a) * r0, y + Math.sin(p.a) * r0);
        ctx.lineTo(x + Math.cos(p.a) * r1, y + Math.sin(p.a) * r1);
        ctx.stroke();
      } else if (p.type === 'flash') {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, p.r * (1 - k * 0.5), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'dust') {
        ctx.fillStyle = `rgba(220, 200, 170, ${0.6 * (1 - k)})`;
        ctx.fillRect(x - p.r / 2, y - p.r / 2, p.r, p.r);
      } else if (p.type === 'text') {
        ctx.font = `${p.size}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.globalAlpha = 1 - Math.max(0, k - 0.6) / 0.4;
        ctx.fillStyle = '#1b1030';
        ctx.fillText(p.str, x + 2, y + 2);
        ctx.fillStyle = p.color;
        ctx.fillText(p.str, x, y);
        ctx.globalAlpha = 1;
      }
    }
  }
}
