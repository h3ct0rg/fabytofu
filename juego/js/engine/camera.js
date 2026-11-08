import { VIEW_W } from '../config.js';

// Cámara horizontal: sigue al jugador, se puede bloquear en una zona de pelea y temblar.
export class Camera {
  constructor(worldWidth) {
    this.x = 0;
    this.worldWidth = worldWidth;
    this.lock = null;        // { min, max } mientras hay una pelea
    this.bounds = null;      // { min, max } tramo del mundo visible (pisos de la mina, nivel 5)
    this.dir = 1;            // hacia dónde avanza el escenario: 1 = derecha, -1 = izquierda
    this.shakeTime = 0;
    this.shakePower = 0;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  follow(targetX, dt) {
    // El jugador se mantiene un poco atrás del centro, como en los beat 'em up clásicos.
    let goal = targetX - VIEW_W * (this.dir > 0 ? 0.42 : 0.58);
    const min = this.lock ? this.lock.min : this.bounds?.min ?? 0;
    const max = this.lock ? this.lock.max - VIEW_W : (this.bounds?.max ?? this.worldWidth) - VIEW_W;
    goal = Math.max(min, Math.min(max, goal));
    // La cámara nunca retrocede fuera de una pelea (el escenario avanza hacia un solo lado).
    if (!this.lock) goal = this.dir > 0 ? Math.max(goal, this.x) : Math.min(goal, this.x);
    this.x += (goal - this.x) * Math.min(1, dt * 8);

    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const p = this.shakePower * Math.max(0, this.shakeTime / 0.2);
      this.offsetX = (Math.random() * 2 - 1) * p;
      this.offsetY = (Math.random() * 2 - 1) * p;
    } else {
      this.offsetX = this.offsetY = 0;
    }
  }

  shake(power = 4, time = 0.15) {
    if (this.noShake) return;
    this.shakePower = this.shakeTime > 0 ? Math.max(this.shakePower, power) : power;
    this.shakeTime = Math.max(this.shakeTime, time);
  }

  // Bordes visibles en coordenadas del mundo (para limitar el movimiento del jugador).
  get left() { return this.lock ? this.lock.min : this.x; }
  get right() { return this.lock ? this.lock.max : this.x + VIEW_W; }
}
