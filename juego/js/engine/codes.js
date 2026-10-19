// Códigos de nivel al estilo de los juegos de SNES, pero personales: cada dispositivo tiene un
// identificador de jugador secreto (se crea la primera vez), y el código de cada nivel sale de
// mezclar ese identificador con el número de nivel. Así, un código solo sirve en el dispositivo
// de quien lo ganó. Si se borran los datos del navegador, se genera otro jugador y otros códigos.

const KEY = 'faby-tofu-id';
// Sin letras ni números que se confundan (0/O, 1/I, 5/S…) ni teclas del juego (J K L Z X W A S D P M E).
export const ALPHABET = 'BCFGHNQRTVY234679';
export const CODE_LEN = 6;

function playerId() {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      const b = new Uint32Array(2);
      crypto.getRandomValues(b);
      id = b[0].toString(36) + b[1].toString(36);
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return 'sin-almacenamiento';
  }
}

// Mezcla tipo FNV-1a de 32 bits con una semilla.
function hash(str, seed) {
  let h = 0x811c9dc5 ^ seed;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return h >>> 0;
}

export function levelCode(level) {
  const base = `${playerId()}|faby&tofu|nivel-${level}`;
  let out = '';
  let h = hash(base, 0x9e37);
  for (let i = 0; i < CODE_LEN; i++) {
    if (i === 3) h = hash(base, 0x7f4a);
    out += ALPHABET[h % ALPHABET.length];
    h = Math.floor(h / ALPHABET.length);
  }
  return out;
}

// "BCF279" -> "BCF-279" para mostrarlo.
export function prettyCode(code) {
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

// Devuelve el nivel al que lleva el código, o null si no es válido para este jugador.
export function checkCode(code, lastLevel) {
  const c = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  for (let lv = 2; lv <= lastLevel; lv++) if (levelCode(lv) === c) return lv;
  return null;
}
