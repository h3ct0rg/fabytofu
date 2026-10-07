// Partidas guardadas (3 ranuras) y configuración, en el almacenamiento local del navegador.
// Si el navegador no permite guardar (modo privado, etc.), el juego funciona igual sin guardar.

const SLOT_KEY = (i) => `faby-tofu-slot-${i}`;
const SETTINGS_KEY = 'faby-tofu-settings';

export const SLOTS = 3;

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// Ranura: { zone, score, lives, done, best, date } o null si está vacía.
export function loadSlot(i) {
  return read(SLOT_KEY(i));
}

export function saveSlot(i, data) {
  return write(SLOT_KEY(i), { ...data, date: new Date().toISOString() });
}

export function clearSlot(i) {
  write(SLOT_KEY(i), null);
}

export const DEFAULT_SETTINGS = { music: 0.7, sfx: 0.9, difficulty: 1, shake: true };

export function loadSettings() {
  return { ...DEFAULT_SETTINGS, ...(read(SETTINGS_KEY) ?? {}) };
}

export function saveSettings(s) {
  write(SETTINGS_KEY, s);
}
