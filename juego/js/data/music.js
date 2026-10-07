// Banda sonora estilo arcade de los 80s/90s. Cada compás tiene 16 pasos (semicorcheas).
// Notación: "C5" = nota, "-" = sostener la nota anterior, "." = silencio.
// Batería: K = bombo, S = caja, H = hi-hat, O = hi-hat abierto, C = platillo (se pueden combinar: "KH").

// ---- Ayudas para escribir menos ----

// Bajo "funky" en corcheas con saltos de octava sobre la fundamental.
const funk = (r) => `${r}2 . ${r}3 . ${r}2 ${r}2 ${r}3 . ${r}2 . ${r}3 ${r}2 . ${r}3 ${r}2 .`;
// Bajo de rock: corcheas sobre fundamental y quinta.
const rock = (r, f) => `${r}2 - ${r}2 - ${r}3 - ${r}2 - ${f}2 - ${f}2 - ${r}3 - ${r}2 -`;
// Arpegio de 3 notas en semicorcheas.
const arp = (a, b, c) => `${a} ${b} ${c} ${b} ${a} ${b} ${c} ${b} ${a} ${b} ${c} ${b} ${a} ${b} ${c} ${b}`;
// Acorde "stab" en los tiempos 2 y 4.
const stab = (n) => `. . . . ${n} - . . . . . . ${n} - . .`;
const rest = '. . . . . . . . . . . . . . . .';
const rep = (bar, n) => Array(n).fill(bar);

// Instrumentos compartidos
const LEAD = { wave: 'p25', vol: 0.16 };
const HARM = { wave: 'p12', vol: 0.06, gate: 0.6 };
const BASS = { wave: 'triangle', wave2: 'sawtooth', vol: 0.22, gate: 0.8 };

export const SONGS = {
  // Título: heroico y pegadizo (Do mayor).
  title: {
    bpm: 132,
    loop: true,
    inst: { lead: LEAD, harm: HARM, bass: BASS },
    parts: {
      lead: [
        'C5 - E5 - G5 - - - C6 - - - G5 - E5 -',
        'A5 - - - G5 - E5 - C5 - - - E5 - G5 -',
        'F5 - - - A5 - G5 - F5 - E5 - D5 - C5 -',
        'D5 - - - - - G4 - B4 - D5 - G5 - - -',
        'E5 - G5 - C6 - - - B5 - A5 - G5 - - -',
        'A5 - C6 - E6 - - - D6 - C6 - A5 - - -',
        'F5 - A5 - C6 - A5 - G5 - F5 - E5 - D5 -',
        'C5 - - - - - - - . . G4 - C5 - . .',
      ],
      harm: [arp('C4', 'E4', 'G4'), arp('A3', 'C4', 'E4'), arp('F3', 'A3', 'C4'), arp('G3', 'B3', 'D4'),
        arp('C4', 'E4', 'G4'), arp('A3', 'C4', 'E4'), arp('F3', 'A3', 'C4'), arp('G3', 'B3', 'D4')],
      bass: [rock('C', 'G'), rock('A', 'E'), rock('F', 'C'), rock('G', 'D'), rock('C', 'G'), rock('A', 'E'), rock('F', 'C'), rock('G', 'D')],
      drums: [...rep('KC . H . S . H . K K H . S . H H', 1), ...rep('K . H . S . H . K K H . S . H H', 6), 'K . H . S . H . K . S . S S S S'],
    },
  },

  // Nivel: Parque Lincoln. Groove arcade con bajo funky (La menor), al estilo de los beat 'em up de los 90.
  level: {
    bpm: 126,
    loop: true,
    swing: 0.12,
    inst: { lead: { wave: 'p25', vol: 0.15 }, harm: HARM, bass: { wave: 'triangle', wave2: 'p50', vol: 0.24, gate: 0.6 } },
    parts: {
      lead: [
        rest, rest,
        'E5 - - . A5 - G5 - E5 - D5 . C5 - D5 -',
        'C5 - - . F5 - E5 - C5 - A4 . C5 - - .',
        'D5 - - . G5 - F5 - D5 - B4 . D5 - E5 -',
        'E5 - - - - - . . B4 - D5 - E5 - G5 -',
        'A5 - - . G5 - E5 . A5 - G5 - E5 - D5 -',
        'C5 - - . A4 - C5 . F5 - E5 - C5 - A4 -',
        'B4 - D5 - G5 - - . F5 - E5 - D5 - B4 -',
        'G#4 - B4 - E5 - - - - - - - . . . .',
      ],
      harm: [stab('E4'), stab('E4'), stab('E4'), stab('F4'), stab('D4'), stab('E4'), stab('E4'), stab('F4'), stab('D4'), stab('G#4')],
      bass: [funk('A'), funk('A'), funk('A'), funk('F'), funk('G'), funk('E'), funk('A'), funk('F'), funk('G'), funk('E')],
      drums: ['K . H . S . H K . K H . S . H H', 'K . H . S . H K . K H . S H S S',
        ...rep('K . H . S . H K . K H . S . H O', 7), 'K . H . S . S . S . S S KC . . .'],
    },
  },

  // Jefe: el Pug de traje. Tenso, con aire de jefe mafioso (Mi menor, bajo ostinato).
  boss: {
    bpm: 150,
    loop: true,
    swing: 0.18,
    inst: { lead: { wave: 'p50', vol: 0.13 }, harm: { wave: 'p12', vol: 0.07, gate: 0.4 }, bass: { wave: 'sawtooth', wave2: 'triangle', vol: 0.14, gate: 0.5 } },
    parts: {
      lead: [
        'E5 - - . G5 - F#5 - E5 - - . B4 - - .',
        'E5 - - . G5 - A5 - A#5 - B5 - - - - -',
        'C6 - - . B5 - A5 - G5 - - . E5 - - .',
        'D#5 - - - F#5 - - - B5 - - - A5 - G5 -',
        'E5 - E5 . G5 - E5 . A#5 - A5 - G5 - E5 -',
        'G5 - - . F#5 - - . E5 - - . D#5 - - .',
        'C6 - B5 - A5 - G5 - A5 - - - E5 - - .',
        'B4 - D#5 - F#5 - B5 - - - - - . . . .',
      ],
      harm: [stab('B4'), stab('B4'), stab('C5'), stab('A4'), stab('B4'), stab('B4'), stab('C5'), stab('A4')],
      bass: [
        'E2 . E2 E3 . E2 G2 . E2 . E2 E3 . A#2 B2 .',
        'E2 . E2 E3 . E2 G2 . E2 . E2 E3 . A#2 B2 .',
        'C2 . C2 C3 . C2 E2 . C2 . C2 C3 . F#2 G2 .',
        'B1 . B1 B2 . B1 D#2 . B1 . B1 B2 . F#2 A2 .',
        'E2 . E2 E3 . E2 G2 . E2 . E2 E3 . A#2 B2 .',
        'E2 . E2 E3 . E2 G2 . E2 . E2 E3 . A#2 B2 .',
        'C2 . C2 C3 . C2 E2 . C2 . C2 C3 . F#2 G2 .',
        'B1 . B1 B2 . B1 D#2 . B1 . B1 B2 . F#2 A2 .',
      ],
      drums: [...rep('K . H K S . H . K . H K S H S S', 3), 'K . H K S . H . K . S . S S S S',
        ...rep('K . H K S . H . K . H K S H S S', 3), 'KC . . . S . S . S S S S S S S S'],
    },
  },

  // Final: versión lenta y emotiva del tema del título.
  ending: {
    bpm: 84,
    loop: true,
    inst: { lead: { wave: 'triangle', vol: 0.28, release: 0.2 }, harm: { wave: 'p12', vol: 0.05, gate: 0.5 }, bass: { wave: 'triangle', vol: 0.2 } },
    parts: {
      lead: [
        'C5 - E5 - G5 - - - C6 - - - G5 - E5 -',
        'A5 - - - G5 - E5 - C5 - - - E5 - G5 -',
        'F5 - - - A5 - G5 - F5 - E5 - D5 - C5 -',
        'D5 - - - - - - - G4 - B4 - D5 - - -',
        'E5 - G5 - C6 - - - B5 - A5 - G5 - - -',
        'A5 - C6 - E6 - - - D6 - C6 - A5 - - -',
        'F5 - A5 - C6 - A5 - G5 - F5 - E5 - D5 -',
        'C5 - - - - - - - - - - - . . . .',
      ],
      harm: [arp('C4', 'E4', 'G4'), arp('A3', 'C4', 'E4'), arp('F3', 'A3', 'C4'), arp('G3', 'B3', 'D4'),
        arp('C4', 'E4', 'G4'), arp('A3', 'C4', 'E4'), arp('F3', 'A3', 'C4'), arp('C4', 'E4', 'G4')],
      bass: ['C2 - - - - - - - G2 - - - - - - -', 'A2 - - - - - - - E2 - - - - - - -', 'F2 - - - - - - - C3 - - - - - - -',
        'G2 - - - - - - - D2 - - - - - - -', 'C2 - - - - - - - G2 - - - - - - -', 'A2 - - - - - - - E2 - - - - - - -',
        'F2 - - - - - - - G2 - - - - - - -', 'C2 - - - - - - - - - - - - - - -'],
      drums: rep('K . . . H . . . K . . . H . . .', 8),
    },
  },

  // Jingles (no se repiten)
  victory: {
    bpm: 160,
    loop: false,
    inst: { lead: LEAD, harm: HARM, bass: BASS },
    parts: {
      lead: ['C5 E5 G5 C6 - - G5 - C6 - - - - - - -', 'E6 - - - - - - - - - - - . . . .'],
      harm: ['E4 G4 C5 E5 - - C5 - E5 - - - - - - -', 'G5 - - - - - - - - - - - . . . .'],
      bass: ['C3 - - - - - G2 - C3 - - - - - - -', 'C2 - - - - - - - - - - - . . . .'],
      drums: ['K . K . K . S . KC . . . . . . .', rest],
    },
  },
  gameover: {
    bpm: 96,
    loop: false,
    inst: { lead: { wave: 'p25', vol: 0.15 }, harm: HARM, bass: BASS },
    parts: {
      lead: ['G4 - - - F#4 - - - F4 - - - E4 - - -', 'E4 - - - - - - - . . . . . . . .'],
      harm: ['B3 - - - A#3 - - - A3 - - - G#3 - - -', 'G#3 - - - - - - - . . . . . . . .'],
      bass: ['C3 - - - - - - - G2 - - - - - - -', 'C2 - - - - - - - . . . . . . . .'],
      drums: ['K . . . . . . . K . . . . . . .', rest],
    },
  },
};
