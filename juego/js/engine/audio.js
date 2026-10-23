// Audio 100 % sintetizado con WebAudio, al estilo de las consolas de los 80s/90s.
// - Secuenciador de 4 canales: melodía (pulso 25 %), armonía (pulso 12.5 %), bajo (triangular + sierra filtrada) y batería (ruido).
// - Efectos de sonido generados al vuelo (golpes, ladridos, silbido, comida...).
// Las canciones están escritas como patrones de texto en js/data/music.js.

const NOTE_INDEX = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

export function noteFreq(name) {
  const m = /^([A-G]#?)(\d)$/.exec(name);
  if (!m) return 0;
  const midi = (Number(m[2]) + 1) * 12 + NOTE_INDEX[m[1]];
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// WAV de 0.1 s de silencio (8 kHz, 8 bits, mono) como data URI.
function silentWav() {
  const n = 800;
  const bytes = new Uint8Array(44 + n);
  const v = new DataView(bytes.buffer);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) bytes[o + i] = s.charCodeAt(i); };
  str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVEfmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  str(36, 'data'); v.setUint32(40, n, true);
  bytes.fill(128, 44); // 128 = silencio en PCM de 8 bits
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return `data:audio/wav;base64,${btoa(bin)}`;
}

// Onda de pulso con ciclo de trabajo variable (el sonido "NES").
function pulseWave(ctx, duty) {
  const n = 64;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let k = 1; k < n; k++) imag[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
  return ctx.createPeriodicWave(real, imag);
}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    try { this.muted = localStorage.getItem('faby-mute') === '1'; } catch { /* sin almacenamiento */ }
    this.song = null;
    this.songName = null;
    this.timer = null;
  }

  // Los navegadores exigen un gesto del usuario antes de sonar.
  unlock() {
    if (this.ctx && this.ctx.state === 'running') return;
    if (!this.silentTried) {
      this.silentTried = true;
      // iPhone: que el juego suene aunque el interruptor de silencio esté activado (una sola vez).
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* no soportado */ }
      this.playSilentTag();
    }
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.7;
      this.master.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.45;
      this.musicBus.connect(this.master);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.8;
      this.sfxBus.connect(this.master);
      this.waves = { p25: pulseWave(this.ctx, 0.25), p12: pulseWave(this.ctx, 0.125), p50: pulseWave(this.ctx, 0.5) };
      this.noise = this.makeNoise();
      if (this.vol) this.setVolumes(this.vol.music, this.vol.sfx);
      if (this.pending) this.playMusic(this.pending);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setVolumes(music, sfx) {
    this.vol = { music, sfx };
    if (!this.ctx) return;
    this.musicBus.gain.value = 0.45 * music;
    this.sfxBus.gain.value = 0.8 * sfx;
  }

  // Truco para iOS antiguos: un <audio> silencioso en bucle pasa la sesión de audio a "reproducción".
  // El WAV debe tener muestras: uno de duración cero falla al decodificar en Safari y,
  // en bucle, deja el elemento de audio atascado.
  playSilentTag() {
    try {
      const a = new Audio(silentWav());
      a.loop = true;
      a.volume = 0;
      a.setAttribute('playsinline', '');
      a.play().then(() => { this.silentTag = a; }).catch(() => {});
    } catch { /* sin soporte */ }
  }

  toggleMute() {
    this.muted = !this.muted;
    try { localStorage.setItem('faby-mute', this.muted ? '1' : '0'); } catch { /* sin almacenamiento */ }
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.7, this.ctx.currentTime, 0.02);
    return this.muted;
  }

  makeNoise() {
    const len = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ---------- Instrumentos ----------

  tone(t, freq, dur, { wave = 'p25', vol = 0.2, bus, slide = 0, attack = 0.005, release = 0.06, detune = 0 } = {}) {
    const c = this.ctx;
    const o = c.createOscillator();
    if (this.waves[wave]) o.setPeriodicWave(this.waves[wave]);
    else o.type = wave;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    o.detune.value = detune;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.setValueAtTime(vol, t + Math.max(attack, dur - release));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + release);
    o.connect(g);
    g.connect(bus ?? this.sfxBus);
    o.start(t);
    o.stop(t + dur + release + 0.02);
  }

  noiseHit(t, dur, { vol = 0.3, freq = 2000, type = 'highpass', bus, sweepTo = 0 } = {}) {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(bus ?? this.sfxBus);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
  }

  drum(t, kind) {
    const bus = this.musicBus;
    if (kind === 'K') {
      this.tone(t, 150, 0.12, { wave: 'sine', vol: 0.9, slide: 0.3, bus, release: 0.05 });
    } else if (kind === 'S') {
      this.noiseHit(t, 0.14, { vol: 0.45, freq: 1800, bus });
      this.tone(t, 220, 0.06, { wave: 'triangle', vol: 0.3, slide: 0.6, bus });
    } else if (kind === 'H') {
      this.noiseHit(t, 0.03, { vol: 0.18, freq: 7000, bus });
    } else if (kind === 'O') {
      this.noiseHit(t, 0.16, { vol: 0.16, freq: 6000, bus });
    } else if (kind === 'C') {
      this.noiseHit(t, 0.6, { vol: 0.3, freq: 4000, bus });
    }
  }

  // ---------- Secuenciador ----------

  playMusic(name) {
    if (this.songName === name && this.song) return;
    this.stopMusic();
    this.songName = name;
    if (!this.ctx) { this.pending = name; return; }
    this.pending = null;
    const song = this.songs?.[name];
    if (!song) return;
    this.song = {
      def: song,
      parts: Object.fromEntries(Object.entries(song.parts).map(([k, bars]) => [k, bars.join(' ').trim().split(/\s+/)])),
      step: 0,
      next: this.ctx.currentTime + 0.08,
    };
    this.song.length = Math.max(...Object.values(this.song.parts).map((p) => p.length));
    this.timer = setInterval(() => this.schedule(), 25);
    this.schedule();
  }

  stopMusic() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.song = null;
    this.songName = null;
  }

  schedule() {
    const s = this.song;
    if (!s || !this.ctx) return;
    const def = s.def;
    const stepDur = 60 / def.bpm / 4;
    while (s.next < this.ctx.currentTime + 0.12) {
      if (s.step >= s.length) {
        if (!def.loop) { this.stopMusic(); return; }
        s.step = 0;
      }
      for (const [name, tokens] of Object.entries(s.parts)) {
        const tok = tokens[s.step % tokens.length];
        if (!tok || tok === '.' || tok === '-') continue;
        // Swing leve en las corcheas pares (más "groove").
        const t = s.next + (def.swing && s.step % 2 ? stepDur * def.swing : 0);
        if (name === 'drums') {
          for (const ch of tok) this.drum(t, ch);
          continue;
        }
        // Duración: la nota se sostiene mientras siga "-".
        let len = 1;
        while (tokens[(s.step + len) % tokens.length] === '-' && len < 32) len++;
        const inst = def.inst[name];
        this.tone(t, noteFreq(tok), stepDur * len * (inst.gate ?? 0.9), {
          wave: inst.wave, vol: inst.vol, bus: this.musicBus, release: inst.release ?? 0.05, detune: inst.detune ?? 0,
        });
        if (inst.wave2) {
          this.tone(t, noteFreq(tok), stepDur * len * (inst.gate ?? 0.9), { wave: inst.wave2, vol: inst.vol * 0.6, bus: this.musicBus, detune: 8 });
        }
      }
      s.step++;
      s.next += stepDur;
    }
  }

  // ---------- Efectos ----------

  play(name) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const fx = SFX[name];
    if (fx) fx(this, t);
  }
}

// Recetas de efectos de sonido.
const SFX = {
  // Golpes graves y con cuerpo: ruido filtrado abajo + un "thump" de onda sinusoidal.
  swing: (a, t) => a.noiseHit(t, 0.13, { vol: 0.16, freq: 350, type: 'bandpass', sweepTo: 900 }),
  hit: (a, t) => {
    a.noiseHit(t, 0.16, { vol: 0.55, freq: 650, type: 'lowpass', sweepTo: 220 });
    a.tone(t, 120, 0.13, { wave: 'sine', vol: 0.55, slide: 0.45, release: 0.08 });
    a.tone(t, 95, 0.1, { wave: 'p50', vol: 0.12, slide: 0.6 });
  },
  hitStrong: (a, t) => {
    a.noiseHit(t, 0.32, { vol: 0.75, freq: 480, type: 'lowpass', sweepTo: 120 });
    a.tone(t, 95, 0.26, { wave: 'sine', vol: 0.75, slide: 0.35, release: 0.12 });
    a.tone(t, 70, 0.22, { wave: 'p50', vol: 0.16, slide: 0.5 });
    a.noiseHit(t + 0.03, 0.1, { vol: 0.18, freq: 1400, type: 'bandpass' });
  },
  hurt: (a, t) => {
    a.tone(t, 260, 0.24, { wave: 'p25', vol: 0.2, slide: 0.45 });
    a.noiseHit(t, 0.14, { vol: 0.3, freq: 500, type: 'lowpass' });
  },
  jump: (a, t) => a.tone(t, 260, 0.12, { wave: 'p25', vol: 0.15, slide: 2.2 }),
  land: (a, t) => a.noiseHit(t, 0.08, { vol: 0.25, freq: 400, type: 'lowpass' }),
  fall: (a, t) => {
    a.noiseHit(t, 0.25, { vol: 0.5, freq: 300, type: 'lowpass' });
    a.tone(t, 90, 0.2, { wave: 'triangle', vol: 0.4, slide: 0.5 });
  },
  special: (a, t) => {
    for (let i = 0; i < 4; i++) a.noiseHit(t + i * 0.07, 0.07, { vol: 0.2, freq: 800 + i * 600, type: 'bandpass' });
    a.tone(t, 300, 0.3, { wave: 'p12', vol: 0.15, slide: 3 });
  },
  pickup: (a, t) => a.tone(t, 660, 0.06, { wave: 'p25', vol: 0.15, slide: 1.5 }),
  throw: (a, t) => a.noiseHit(t, 0.15, { vol: 0.2, freq: 500, type: 'bandpass', sweepTo: 2500 }),
  break: (a, t) => {
    a.noiseHit(t, 0.35, { vol: 0.55, freq: 900, type: 'lowpass' });
    a.noiseHit(t, 0.2, { vol: 0.2, freq: 2200, type: 'bandpass' });
    a.tone(t, 130, 0.16, { wave: 'triangle', vol: 0.35, slide: 0.5 });
  },
  eat: (a, t) => [523, 659, 784, 1047].forEach((f, i) => a.tone(t + i * 0.06, f, 0.07, { wave: 'p25', vol: 0.18 })),
  heart: (a, t) => [784, 988, 1175].forEach((f, i) => a.tone(t + i * 0.09, f, 0.12, { wave: 'triangle', vol: 0.25 })),
  bark: (a, t) => {
    for (let i = 0; i < 2; i++) {
      a.tone(t + i * 0.13, 820, 0.07, { wave: 'p25', vol: 0.2, slide: 0.55 });
      a.noiseHit(t + i * 0.13, 0.05, { vol: 0.12, freq: 1500, type: 'bandpass' });
    }
  },
  dogBark: (a, t) => {
    a.tone(t, 520, 0.09, { wave: 'p50', vol: 0.22, slide: 0.5 });
    a.noiseHit(t, 0.06, { vol: 0.15, freq: 900, type: 'bandpass' });
  },
  growl: (a, t) => a.tone(t, 110, 0.4, { wave: 'sawtooth', vol: 0.12, slide: 0.8 }),
  bigBark: (a, t) => {
    a.tone(t, 300, 0.35, { wave: 'sawtooth', vol: 0.35, slide: 0.35 });
    a.noiseHit(t, 0.4, { vol: 0.4, freq: 700, type: 'bandpass', sweepTo: 200 });
  },
  whistle: (a, t) => {
    a.tone(t, 1400, 0.16, { wave: 'sine', vol: 0.25, slide: 1.6 });
    a.tone(t + 0.2, 1500, 0.25, { wave: 'sine', vol: 0.25, slide: 0.7 });
  },
  zoom: (a, t) => a.noiseHit(t, 0.5, { vol: 0.3, freq: 300, type: 'bandpass', sweepTo: 4000 }),
  go: (a, t) => [0, 0.18].forEach((d) => a.tone(t + d, 988, 0.1, { wave: 'p25', vol: 0.2 })),
  alert: (a, t) => a.tone(t, 1320, 0.05, { wave: 'p12', vol: 0.12 }),
  blip: (a, t) => a.tone(t, 900 + Math.random() * 200, 0.02, { wave: 'p25', vol: 0.05 }),
  select: (a, t) => [660, 990].forEach((f, i) => a.tone(t + i * 0.07, f, 0.07, { wave: 'p25', vol: 0.2 })),
  lifeLost: (a, t) => [440, 392, 330, 262].forEach((f, i) => a.tone(t + i * 0.12, f, 0.12, { wave: 'p25', vol: 0.22 })),
  stomp: (a, t) => a.tone(t, 70, 0.12, { wave: 'triangle', vol: 0.45, slide: 0.6 }),
  // Lluvia de billetes de Doña Billetes: tintineo de monedas.
  coins: (a, t) => [1568, 2093, 1760, 2349, 1976].forEach((f, i) => a.tone(t + i * 0.05, f, 0.05, { wave: 'p12', vol: 0.12 })),
  // Celular sonando (llama a sus vendedores).
  ring: (a, t) => [0, 0.12, 0.36, 0.48].forEach((d) => a.tone(t + d, 1320, 0.09, { wave: 'p50', vol: 0.12 })),
  // Batido que se revienta en el suelo.
  splash: (a, t) => a.noiseHit(t, 0.25, { vol: 0.3, freq: 1200, type: 'bandpass', sweepTo: 400 }),
  // Nivel 3: bocina del Baleno, choque y piedra que cae.
  horn: (a, t) => { a.tone(t, 440, 0.18, { wave: 'p50', vol: 0.18 }); a.tone(t, 554, 0.18, { wave: 'p50', vol: 0.14 }); },
  crash: (a, t) => {
    a.noiseHit(t, 0.3, { vol: 0.5, freq: 700, type: 'lowpass' });
    a.tone(t, 110, 0.2, { wave: 'triangle', vol: 0.35, slide: 0.5 });
  },
  rock: (a, t) => a.noiseHit(t, 0.18, { vol: 0.35, freq: 400, type: 'lowpass' }),
  // Aullido de Morita: sube, se sostiene temblando y cae.
  howl: (a, t) => {
    a.tone(t, 560, 0.3, { wave: 'triangle', vol: 0.22, slide: 1.45, attack: 0.06 });
    [0, 1, 2, 3].forEach((i) => a.tone(t + 0.3 + i * 0.14, i % 2 ? 790 : 830, 0.14, { wave: 'triangle', vol: 0.2, release: 0.02 }));
    a.tone(t + 0.86, 810, 0.6, { wave: 'triangle', vol: 0.2, slide: 0.5, release: 0.25 });
  },
};
