// Estadísticas en línea (Firebase Realtime Database, vía REST): cuántas personas jugaron
// y cuántas tienen el juego abierto ahora. Si no hay conexión, todo falla en silencio.

const DB = 'https://spud-survival-default-rtdb.firebaseio.com/fabytofu';
const HEARTBEAT = 30000;     // cada cuánto avisamos "sigo aquí" (ms)
const ONLINE_WINDOW = 75000; // se considera "jugando ahora" si avisó hace menos de esto
const STALE = 10 * 60000;    // presencias más viejas que esto se borran

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

async function req(path, opts = {}) {
  const res = await fetch(`${DB}/${path}.json`, { ...opts, headers: { 'Content-Type': 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export class OnlineStats {
  constructor() {
    this.session = uid();
    this.offset = 0;         // reloj del servidor - reloj local
    this.players = null;
    this.online = null;
    this.timer = null;
  }

  start() {
    this.beat();
    this.timer = setInterval(() => this.beat(), HEARTBEAT);
    // Al cerrar la pestaña, nos quitamos de la lista de "jugando ahora".
    window.addEventListener('pagehide', () => {
      fetch(`${DB}/online/${this.session}.json`, { method: 'DELETE', keepalive: true }).catch(() => {});
    });
    this.refresh();
  }

  async beat() {
    try {
      const serverTime = await req(`online/${this.session}`, { method: 'PUT', body: JSON.stringify({ '.sv': 'timestamp' }) });
      if (typeof serverTime === 'number') this.offset = serverTime - Date.now();
    } catch { /* sin conexión */ }
  }

  // Cuenta a esta persona como jugador una sola vez por navegador.
  async registerPlayer() {
    let known = false;
    try { known = localStorage.getItem('faby-tofu-player') === '1'; } catch { /* sin almacenamiento */ }
    if (known) return;
    try {
      await req('stats/players', { method: 'PUT', body: JSON.stringify({ '.sv': { increment: 1 } }) });
      try { localStorage.setItem('faby-tofu-player', '1'); } catch { /* sin almacenamiento */ }
    } catch { /* sin conexión */ }
  }

  async refresh() {
    try {
      const [players, online] = await Promise.all([req('stats/players'), req('online')]);
      this.players = players ?? 0;
      const now = Date.now() + this.offset;
      const entries = Object.entries(online ?? {});
      this.online = Math.max(1, entries.filter(([, t]) => now - t < ONLINE_WINDOW).length);
      // Limpieza de presencias abandonadas.
      const stale = Object.fromEntries(entries.filter(([, t]) => now - t > STALE).map(([k]) => [k, null]));
      if (Object.keys(stale).length) req('online', { method: 'PATCH', body: JSON.stringify(stale) }).catch(() => {});
    } catch { /* sin conexión: se muestran guiones */ }
  }
}
