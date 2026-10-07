# Faby & Tofu — juego (HTML5)

Beat 'em up en JavaScript puro + Canvas 2D, sin dependencias ni paso de build.

## Cómo correrlo

Los módulos ES necesitan un servidor (no funciona abriendo `index.html` con doble clic):

```bash
python -m http.server 8137 --directory juego
```

Luego abrir http://localhost:8137. La rocola con todas las pistas y efectos está en http://localhost:8137/musica.html. Con `?debug` se ven hitboxes, FPS y se expone `window.__faby` para pruebas.

## Menú y partidas

- Inicio: **JUGAR** (3 ranuras de partida guardada) y **CONFIGURAR** (volumen de música y efectos, dificultad, temblor de pantalla).
- El avance se guarda automáticamente al ganar cada pelea (punto de control) en el almacenamiento local del navegador.
- **COMPARTIR** abre el menú de compartir del celular (WhatsApp, etc.) con la imagen del juego; en la PC copia el enlace.
- Vista previa del enlace (imagen + descripción) con etiquetas Open Graph; la imagen `og-image.jpg` se regenera con `python tools/make_share_card.py`. En Docker, nginx completa la dirección del sitio (`__SITE_URL__`).
- La pantalla de inicio muestra cuántas personas jugaron y cuántas están jugando ahora (Firebase Realtime Database, ruta `fabytofu/` de `spud-survival-default-rtdb`).

## Controles

| Acción | Teclado | Mando | Táctil |
|---|---|---|---|
| Mover | Flechas / WASD | Stick / D-pad | Joystick |
| Correr | Doble toque adelante | Doble toque | Doble toque |
| Golpe (combo x3) / golpe corriendo | J / Z | X | A |
| Salto (+ golpe = patada aérea) | K / X | A | B |
| Especial (gasta un poco de vida si conecta) | J + K a la vez | X + A | A + B |
| Agarrar | Caminar contra un enemigo | — | — |
| Rodillazo / lanzar (agarrado) | J (2 rodillazos, 3º lanza) · atrás + J o K lanza | X / A | A / B |
| Recoger / lanzar objeto | J junto al objeto / J con él en la mano. Botella: derriba. Pelota o premio: distrae al perro | X | A |
| Llamar a Tofu (corre hacia Faby y derriba a quien se cruce) | Espacio | RB | — |
| Acariciar a Tofu (sin enemigos) / cargarlo y soltarlo (en pelea) | L junto a Tofu | B | — |
| Patada cargando a Tofu | J | X | A |
| Abrir caja de delivery (trae comida: salteña +20, api con pastel +35 e invencible 3 s, silpancho = vida completa) | Golpes | X | A |
| Estamina (solo contra el jefe): cada ataque gasta, se recarga al dejar de atacar; vacía = no puedes golpear | — | — | — |
| Pausa | Enter / Esc / P | Start | II |
| Silenciar música y sonido | M | — | ♪ |
| Debug | F1 / ` | — | — |

## Estructura

```
juego/
├── index.html, css/style.css
├── assets/sprites/       atlas PNG + JSON (generados por tools/pack_sprites.py)
├── assets/bg/            ilustraciones del parque y objetos (PixelLab)
└── js/
    ├── config.js         resolución 960×540, suelo, gravedad
    ├── main.js           arranque, escalado, escenas (título/juego/pausa)
    ├── engine/           loop, input, assets, sprite, camera, collision, fx, audio (WebAudio), save
    ├── net/stats.js      contador de jugadores y presencia en línea (Firebase REST)
    ├── data/music.js     canciones como patrones de texto (4 canales)
    ├── entities/         fighter (base), faby, tofu, enemy (corredor/skater), dog, prop, butterfly
    └── scenes/           stage (zonas, HUD, escenas), menu (inicio, ranuras, configuración), background, cutscene
```

Para regenerar el atlas de Faby después de agregar animaciones:

```bash
python tools/pack_sprites.py
```
