import { STEP } from '../config.js';

// Bucle de timestep fijo: update() a 60 Hz exactos, render() una vez por frame del navegador.
export function startLoop(update, render) {
  let last = performance.now();
  let acc = 0;

  function frame(now) {
    // Si la pestaña estuvo oculta no simulamos segundos de golpe.
    acc += Math.min((now - last) / 1000, 0.25);
    last = now;
    while (acc >= STEP) {
      update(STEP);
      acc -= STEP;
    }
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
