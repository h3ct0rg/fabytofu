// Mariposa que cruza el parque. Si Tofu la ve, sale corriendo detrás de ella.
// Dibujada por código: dos alas que aletean.

export class Butterfly {
  constructor(stage, x, groundY) {
    this.stage = stage;
    this.x = x;
    this.groundY = groundY;   // profundidad sobre la que vuela (para que Tofu la persiga)
    this.y = groundY;         // para ordenar por profundidad
    this.z = 90;
    this.t = 0;
    this.dir = Math.random() < 0.5 ? -1 : 1;
    this.gone = false;
    this.removed = false;
  }

  update(dt) {
    this.t += dt;
    // Vuelo errático: avanza, ondula y a ratos cambia de dirección.
    this.x += this.dir * 70 * dt;
    this.z = 80 + Math.sin(this.t * 3) * 25 + Math.sin(this.t * 7) * 8;
    this.groundY += Math.sin(this.t * 1.3) * 25 * dt;
    this.groundY = Math.max(370, Math.min(520, this.groundY));
    this.y = this.groundY;
    if (Math.random() < dt * 0.4) this.dir = -this.dir;
    // Después de un rato se aleja volando hacia arriba.
    if (this.t > 8) {
      this.z += (this.t - 8) * 200 * dt;
      if (this.t > 10) this.gone = this.removed = true;
    }
  }

  drawShadow() {}

  draw(ctx, camX) {
    const x = Math.round(this.x - camX);
    const y = Math.round(this.y - this.z);
    const flap = Math.abs(Math.sin(this.t * 18));
    const w = Math.max(1, Math.round(7 * flap));
    ctx.fillStyle = '#140c1c';
    ctx.fillRect(x - 1, y - 4, 2, 9);
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(x - 1 - w, y - 5, w, 6);
    ctx.fillRect(x + 1, y - 5, w, 6);
    ctx.fillStyle = '#f28c28';
    ctx.fillRect(x - 1 - Math.max(1, w - 2), y + 1, Math.max(1, w - 2), 4);
    ctx.fillRect(x + 1, y + 1, Math.max(1, w - 2), 4);
  }
}
