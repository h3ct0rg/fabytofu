// Entrada unificada: teclado + gamepad + controles táctiles -> acciones del juego.
// Las acciones "pressed" se calculan una vez por paso de simulación en update().

const ACTIONS = ['left', 'right', 'up', 'down', 'attack', 'jump', 'grab', 'call', 'pause', 'debug', 'mute'];

const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  KeyJ: 'attack', KeyZ: 'attack',
  KeyK: 'jump', KeyX: 'jump',
  KeyL: 'grab', KeyC: 'grab',
  Space: 'call',
  Enter: 'pause', Escape: 'pause', KeyP: 'pause',
  F1: 'debug', Backquote: 'debug',
  KeyM: 'mute',
};

// Botones del mando estándar (layout Xbox).
const PADMAP = { 0: 'jump', 2: 'attack', 1: 'grab', 5: 'call', 9: 'pause', 12: 'up', 13: 'down', 14: 'left', 15: 'right' };

const BUFFER_MS = 130; // ventana para "recordar" un botón pulsado un poco antes de tiempo

export class Input {
  constructor() {
    this.keys = {};
    this.touch = {};
    this.latch = {};   // garantiza que un toque/tecla muy breve se registre al menos un paso
    this.held = {};
    this.prev = {};
    this.pressed = {};
    this.lastPress = {};
    this.pressTime = {};  // como lastPress pero nunca se consume (para detectar J+K juntos)
    this.axis = { x: 0, y: 0 };
    this.usingTouch = false;
    for (const a of ACTIONS) this.keys[a] = this.touch[a] = this.held[a] = this.prev[a] = this.pressed[a] = false;

    window.addEventListener('keydown', (e) => {
      const a = KEYMAP[e.code];
      if (!a) return;
      e.preventDefault();
      if (!e.repeat) this.latch[a] = true;
      this.keys[a] = true;
    });
    window.addEventListener('keyup', (e) => {
      const a = KEYMAP[e.code];
      if (a) this.keys[a] = false;
    });
    window.addEventListener('blur', () => {
      for (const a of ACTIONS) this.keys[a] = false;
    });
  }

  // Conecta los controles táctiles del DOM (#touch).
  bindTouch(root) {
    if (!root) return;
    const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    if (isTouch) this.showTouch(root);
    window.addEventListener('touchstart', () => this.showTouch(root), { once: true });

    for (const btn of root.querySelectorAll('[data-action]')) {
      const a = btn.dataset.action;
      // "special" no es una acción propia: equivale a apretar golpe + salto juntos.
      const acts = a === 'special' ? ['attack', 'jump'] : [a];
      const on = (e) => {
        e.preventDefault();
        for (const x of acts) { this.touch[x] = true; this.latch[x] = true; }
        btn.classList.add('on');
        navigator.vibrate?.(12);
      };
      const off = (e) => {
        e.preventDefault();
        for (const x of acts) this.touch[x] = false;
        btn.classList.remove('on');
      };
      btn.addEventListener('pointerdown', on);
      btn.addEventListener('pointerup', off);
      btn.addEventListener('pointercancel', off);
      btn.addEventListener('pointerleave', off);
    }

    const stick = root.querySelector('.stick');
    const knob = root.querySelector('.knob');
    if (!stick) return;
    let id = null;
    const move = (e) => {
      const r = stick.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const max = r.width / 2;
      let dx = (e.clientX - cx) / max;
      let dy = (e.clientY - cy) / max;
      const len = Math.hypot(dx, dy);
      if (len > 1) { dx /= len; dy /= len; }
      this.axis.x = Math.abs(dx) > 0.3 ? dx : 0;
      this.axis.y = Math.abs(dy) > 0.3 ? dy : 0;
      knob.style.transform = `translate(calc(-50% + ${dx * max * 0.55}px), calc(-50% + ${dy * max * 0.55}px))`;
    };
    const end = () => {
      id = null;
      this.axis.x = this.axis.y = 0;
      knob.style.transform = 'translate(-50%, -50%)';
    };
    stick.addEventListener('pointerdown', (e) => {
      id = e.pointerId;
      try { stick.setPointerCapture(id); } catch { /* puntero no capturable: seguimos sin captura */ }
      move(e);
    });
    stick.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
    stick.addEventListener('pointerup', end);
    stick.addEventListener('pointercancel', end);
  }

  showTouch(root) {
    this.usingTouch = true;
    root.hidden = false;
  }

  // Llamar al inicio de cada paso de simulación.
  update() {
    const pad = this.readPad();
    const now = performance.now();
    for (const a of ACTIONS) {
      let h = this.keys[a] || this.touch[a] || pad[a] || this.latch[a];
      this.latch[a] = false;
      if (a === 'left') h ||= this.axis.x < 0;
      if (a === 'right') h ||= this.axis.x > 0;
      if (a === 'up') h ||= this.axis.y < 0;
      if (a === 'down') h ||= this.axis.y > 0;
      this.prev[a] = this.held[a];
      this.held[a] = h;
      this.pressed[a] = h && !this.prev[a];
      if (this.pressed[a]) this.lastPress[a] = this.pressTime[a] = now;
    }
  }

  readPad() {
    const out = {};
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      p.buttons.forEach((b, i) => { if (b.pressed && PADMAP[i]) out[PADMAP[i]] = true; });
      const [ax, ay] = p.axes;
      if (ax < -0.4) out.left = true;
      if (ax > 0.4) out.right = true;
      if (ay < -0.4) out.up = true;
      if (ay > 0.4) out.down = true;
    }
    return out;
  }

  // Devuelve true si la acción se pulsó hace menos de BUFFER_MS, y la consume.
  buffered(a) {
    const t = this.lastPress[a];
    if (t && performance.now() - t < BUFFER_MS) {
      this.lastPress[a] = 0;
      return true;
    }
    return false;
  }

  // true si ambas acciones se pulsaron con menos de `ms` de diferencia y una de ellas recién ahora.
  chord(a, b, ms = 80) {
    const ta = this.pressTime[a] || 0;
    const tb = this.pressTime[b] || 0;
    const fresh = (this.pressed[a] && this.held[b]) || (this.pressed[b] && this.held[a]);
    if (fresh && Math.abs(ta - tb) < ms) {
      this.lastPress[a] = this.lastPress[b] = 0; // consume ambos para que no disparen otra acción
      return true;
    }
    return false;
  }

  // Vector de movimiento normalizado (-1..1).
  moveVector() {
    const x = (this.held.right ? 1 : 0) - (this.held.left ? 1 : 0);
    const y = (this.held.down ? 1 : 0) - (this.held.up ? 1 : 0);
    return { x, y };
  }
}
