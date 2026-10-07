// Constantes globales del juego. Todas las medidas en píxeles de la resolución interna.

export const VIEW_W = 960;
export const VIEW_H = 540;

// Franja del suelo donde se puede caminar (coordenada "y" = profundidad, donde están los pies).
export const FLOOR_TOP = 380;
export const FLOOR_BOTTOM = 525;

export const GRAVITY = 1900;   // px/s² sobre el eje z (altura de salto)
export const DEPTH_HIT = 18;   // diferencia máxima de profundidad para que un golpe conecte

export const STEP = 1 / 60;    // timestep fijo de la simulación

export const COLORS = {
  shadow: 'rgba(10, 12, 30, 0.35)',
  hudText: '#ffffff',
  hudShadow: '#1b1030',
  hpFaby: '#ff2fa8',
  hpBack: '#2a1b3d',
  hpEnemy: '#ffd23f',
};

export const FONT = '"Press Start 2P", monospace';

// La fuente pixel no trae mayúsculas con tilde (dibuja "VACíA"); se quitan solo en mayúsculas.
const NO_ACCENT = { Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U' };
export function fontSafe(str) {
  return String(str).replace(/[ÁÉÍÓÚ]/g, (c) => NO_ACCENT[c]);
}
