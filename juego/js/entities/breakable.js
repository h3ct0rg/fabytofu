import { COLORS } from '../config.js';

// Caja térmica de delivery olvidada en el parque: se abre a golpes y trae comida cochabambina.
// La comida se recoge pasando por encima.

export const FOODS = {
  saltena: { heal: 20, label: '¡SALTEÑA!', color: '#ffd23f' },
  api: { heal: 35, invuln: 3, label: '¡API CON PASTEL!', color: '#c38bff' },
  silpancho: { heal: 100, label: '¡SILPANCHO!', color: '#7df9ff' },
};

function pickFood() {
  const r = Math.random();
  return r < 0.6 ? 'saltena' : r < 0.85 ? 'api' : 'silpancho';
}

export class DeliveryBox {
  constructor(stage, x, y, food = null) {
    this.stage = stage;
    this.x = x;
    this.y = y;
    this.z = 0;
    this.hp = 2;
    this.broken = false;
    this.flash = 0;
    this.food = food;
    this.removed = false;
    this.shake = 0;
  }

  hurtWorld() {
    if (this.broken) return { x0: 0, x1: 0, z0: 0, z1: 0, y: -999 };
    // Más alta que el dibujo para que los golpes de Faby (a la altura del pecho) la alcancen.
    return { x0: this.x - 26, x1: this.x + 26, z0: 0, z1: 100, y: this.y };
  }

  takeHit(hit) {
    if (this.broken) return false;
    this.hp -= hit.knockdown ? 2 : 1;
    this.flash = 0.1;
    this.shake = 0.15;
    if (this.hp <= 0) {
      this.broken = true;
      this.stage.fx.dust(this.x, this.y, 6);
      this.stage.fx.text(this.x, this.y - 70, '¡TU PEDIDO!', '#ffd23f', 12);
      this.stage.foods.push(new Food(this.stage, this.x, this.y + 4, this.food ?? pickFood()));
    }
    return true;
  }

  update(dt) {
    if (this.flash > 0) this.flash -= dt;
    if (this.shake > 0) this.shake -= dt;
  }

  drawShadow(ctx, camX) {
    ctx.fillStyle = COLORS.shadow;
    ctx.beginPath();
    ctx.ellipse(Math.round(this.x - camX), Math.round(this.y), 26, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  draw(ctx, camX) {
    const img = this.stage.game.bgImages[this.broken ? 'delivery_open' : 'delivery'];
    const dx = this.shake > 0 ? (Math.random() * 4 - 2) : 0;
    const x = Math.round(this.x - camX + dx);
    if (img) {
      ctx.drawImage(img, x - img.width / 2, Math.round(this.y - img.height + 4));
      if (this.flash > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillRect(x - img.width / 2, this.y - img.height + 4, img.width, img.height);
      }
    } else {
      ctx.fillStyle = '#d0312d';
      ctx.fillRect(x - 24, this.y - 48, 48, 48);
    }
  }
}

export class Food {
  constructor(stage, x, y, type) {
    this.stage = stage;
    this.type = type;
    this.x = x;
    this.y = y;
    this.z = 40;
    this.vz = 260;
    this.t = 0;
    this.removed = false;
  }

  update(dt) {
    this.t += dt;
    if (this.z > 0 || this.vz > 0) {
      this.z = Math.max(0, this.z + this.vz * dt);
      this.vz -= 1200 * dt;
      if (this.z === 0) this.vz = 0;
    }
    const p = this.stage.player;
    if (this.z === 0 && Math.abs(p.x - this.x) < 34 && Math.abs(p.y - this.y) < 16 && p.grounded && p.alive) {
      const f = FOODS[this.type];
      p.hp = Math.min(p.maxHp, p.hp + f.heal);
      if (f.invuln) p.invuln = Math.max(p.invuln, f.invuln);
      p.score += 200;
      this.stage.foodEaten[this.type] = (this.stage.foodEaten[this.type] ?? 0) + 1;
      this.stage.fx.text(this.x, this.y - 120, f.label, f.color, 14);
      this.stage.sfx('eat');
      this.removed = true;
    }
  }

  drawShadow(ctx, camX) {
    ctx.fillStyle = COLORS.shadow;
    ctx.beginPath();
    ctx.ellipse(Math.round(this.x - camX), Math.round(this.y), 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  draw(ctx, camX) {
    const img = this.stage.game.bgImages[this.type];
    const bob = this.z === 0 ? Math.round(Math.sin(this.t * 4) * 2) : 0;
    const x = Math.round(this.x - camX);
    const y = Math.round(this.y - this.z - 6 + bob);
    if (img) ctx.drawImage(img, x - img.width / 2, y - img.height);
    else {
      ctx.fillStyle = '#e8a33a';
      ctx.fillRect(x - 12, y - 16, 24, 16);
    }
    // Destello para que se note que se puede recoger
    if (Math.floor(this.t * 3) % 2 === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 12, y - 30, 3, 3);
    }
  }
}
