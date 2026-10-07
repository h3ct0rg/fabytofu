import { DEPTH_HIT } from '../config.js';

// Las cajas se definen relativas a los pies del personaje mirando a la derecha:
// { x, w } en horizontal y { z, h } en altura (z crece hacia arriba desde el suelo).

export function worldBox(ent, box) {
  const x0 = ent.facing > 0 ? ent.x + box.x : ent.x - box.x - box.w;
  return { x0, x1: x0 + box.w, z0: ent.z + box.z, z1: ent.z + box.z + box.h, y: ent.y };
}

export function boxesHit(a, b) {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0 && Math.abs(a.y - b.y) <= DEPTH_HIT;
}

// Dibuja una caja en pantalla (modo debug). camX = desplazamiento de cámara.
export function drawBox(ctx, b, camX, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(Math.round(b.x0 - camX) + 0.5, Math.round(b.y - b.z1) + 0.5, b.x1 - b.x0, b.z1 - b.z0);
}
