# Faby & Tofu — Plan del MVP

> Estado: **planificación** (no se ha generado ningún asset todavía).
> Las imágenes de `design/` son **solo guía de estilo**: todos los assets se crean desde cero con PixelLab.

---

## 1. Resumen

| | |
|---|---|
| **Género** | Beat 'em up 2D con carriles de profundidad (estilo Streets of Rage / Cadillacs & Dinosaurs) |
| **Premisa** | Faby solo quería sacar a pasear a Tofu… y terminó peleando por todo el parque. |
| **Ambientación** | **Parque Lincoln, Cochabamba (Bolivia)**: el parque real donde pasean Faby y Tofu |
| **Protagonista** | Faby aparece con su nombre real (ella está de acuerdo y feliz con el juego) |
| **Plataforma** | HTML5 (navegador de escritorio y móvil), 100 % HTML/JS, sin instalación |
| **Público** | Faby (regalo personal) + publicación (itch.io / web) |
| **Duración MVP** | 1 nivel, ~5–7 minutos, 1 jefe |
| **Nombres posibles** | *Faby & Tofu: Paseo Caótico* · *Tofu Walk Mayhem* · *Un paseo normal* |

---

## 2. Personajes

### Faby (jugadora)
- Guía visual: pelo rizado oscuro con moño magenta, aros magenta, chaqueta ochentera magenta/cian/morado, polera negra, jeans oscuros, zapatillas magenta/cian.
- Ágil y expresiva. Su paleta es su identidad: no se toca.

### Tofu (compañero, controlado por IA)
- Poodle toy color damasco, collar azul con placa de hueso.
- **Personalidad real: juguetón, territorial y temperamental.** Esto define su IA (ver §4).

### El Pug de traje (jefe)
- Pug con terno negro, camisa blanca y corbata: "el jefe del parque", con aire de mafioso.
- Aparece al inicio para provocar a Tofu, huye y vuelve como jefe al final del nivel.

### Enemigos del MVP
| Enemigo | Rol | Cómo se derrota |
|---|---|---|
| **Corredor fitness** | Enemigo básico: golpe rápido, se acerca en grupo | A golpes |
| **Skater** | Enemigo rápido: embiste cruzando la pantalla y patea | A golpes (esquivar la embestida) |
| **Perro ladrador** | Perro que provoca a Tofu y sube su temperamento | **No se le pega**: se le tira la pelota o un premio y se va feliz |
| **Dueño del Pug** | Solo aparece en la escena final ("¡¿QUÉ LE HICISTE A MI PERRO?!") como gancho del nivel 2 | — |

> Regla de tono: **a los humanos se les pega; a los perros se los distrae o calma.** El Pug es la excepción porque es un jefe caricaturesco: termina mareado (ojos en espiral), no herido.

---

## 3. Controles

| Acción | Teclado | Gamepad | Táctil (móvil) |
|---|---|---|---|
| Moverse (8 direcciones en el carril) | Flechas / WASD | Stick / D-pad | Joystick virtual |
| Golpe (3 toques = combo) | J | X / □ | Botón A |
| Salto (+ golpe = patada aérea) | K | A / ✕ | Botón B |
| Especial (gasta vida, despeja alrededor) | J + K | Y / △ | Botón A+B |
| Agarrar / tomar objeto / tomar a Tofu | L | B / ○ | Botón C (contextual) |
| **"¡Tofu, ven!"** | Espacio | RB / R1 | Botón con la cara de Tofu |

Los controles táctiles son obligatorios: Faby probablemente juegue en el celular.

---

## 4. Mecánicas principales

### 4.1 Combate de Faby
- Combo de 3 golpes: jab, jab y cruzado (derriba).
- Patada aérea y patada corriendo.
- Agarre: golpe de rodilla ×2 y lanzamiento (puede derribar a otros enemigos).
- Especial: patada giratoria que gasta un poco de vida (clásico del género).
- Objetos: botella y palo (arrojables), pelota (para perros), premio (para perros).

### 4.2 Tofu: juguetón, territorial y temperamental
Tofu tiene dos barras:

- **❤️ Ánimo (5 corazones):** baja cuando lo golpean. Si llega a cero, Tofu sale corriendo y **pierdes la vida actual**. Se recupera con el plato de agua, un premio o acariciándolo (mantener el botón de agarre junto a él, fuera de combate).
- **💢 Temperamento:** sube cuando hay perros cerca, cuando lo empujan o cuando pasa el Pug. Baja con caricias o cuando Faby lo carga.

Estados de su IA:

| Estado | Qué hace | Disparador |
|---|---|---|
| **Paseo** | Sigue a Faby, olfatea y mueve la cola | Por defecto |
| **Juguetón** | Persigue una mariposa o una pelota y se aleja | Al azar, se avisa con un "!" sobre su cabeza |
| **Territorial** | Ladra y gruñe a cualquier perro o enemigo que se acerque; los mantiene a distancia | Hay un perro o enemigo en su radio |
| **Furioso** 💢 | Al llenarse el temperamento, **se lanza a morder**: hace daño y aturde, pero se expone y no obedece por unos segundos | Temperamento al máximo |
| **Asustado** | Se esconde detrás de las piernas de Faby | Recibe un golpe |
| **En brazos** | Faby lo carga: está protegido, pero Faby solo puede patear y camina más lento | Agarrar con Tofu cerca |

El temperamento funciona como un **recurso arriesgado**: dejar que Tofu se enoje te da un "ataque especial gratis", pero puede costarte corazones. Así su carácter real se convierte en una mecánica.

**"¡Tofu, ven!":** Tofu corre hacia Faby, derriba a quien esté en el camino y se calma un poco. Tiene un tiempo de espera de unos 4 segundos.

### 4.3 Recompensas
- Puntaje por golpes y combos, y bonus por terminar con Tofu a 5 corazones.
- Comida cochabambina en basureros rotos para recuperar vida de Faby (propuesta, a confirmar):
  - **Salteña**: recupera poco.
  - **Silpancho**: recupera toda la vida (el gran premio).
  - **Api con pastel**: recupera vida y da invulnerabilidad breve.
- Plato de agua o premio para Tofu.

### 4.4 Toque local (propuesta, a confirmar)
- Frases de Faby y de los enemigos con expresiones cochabambinas, por ejemplo: *"¡Chuta!"*, *"¡Ya pues!"*, *"¿Qué te pasa, pues?"*.
- El escenario se basa en elementos reconocibles del Parque Lincoln: se necesitan fotos o una descripción (ver §10).

---

## 5. Nivel 1 — "Parque Lincoln: primera mitad"

El Parque Lincoln es una franja larga y angosta entre dos calles, que va hacia la cordillera. Un beat 'em up de scroll lateral encaja perfecto con esa forma. El nivel 1 recorre la **primera mitad**, desde las canchas hasta la avenida que lo cruza; el nivel 2 sería la otra mitad.

Escenario de unas 4–5 pantallas de largo (~2 200 px a 480 px de ancho). La cámara se bloquea en cada pelea y aparece "GO →" al terminar.

| # | Sección (lugar real) | Contenido | Enseña |
|---|---|---|---|
| 0 | **Las canchas** (inicio del parque, canchas de cemento y de tierra) | Faby sale con Tofu. El Pug de traje cruza la pantalla, ladra, Tofu se eriza y el Pug huye. Faby: *"…otra vez tú."* | Tono y conflicto |
| 1 | **La ciclovía de los troncos blancos** (pista roja/oscura con línea blanca, árboles con troncos pintados de blanco, autos estacionados al otro lado) | 2 corredores, luego 2 corredores + 1 skater que embiste por la ciclovía; aparece una pelota | Moverse, combo, salto, esquivar embestidas, agarrar y lanzar |
| 2 | **La glorieta de arbustos redondos** (jardinera circular con borde de ladrillo y arbustos podados en bola) | Perro ladrador (Tofu se pone territorial) + 2 enemigos | Distraer perros con la pelota, temperamento |
| 3 | **La pérgola de buganvillas** (pérgola de madera, buganvillas, cantero de flores con borde de ladrillo, espejo de agua) | Pelea mixta. Entre las flores aparece una mariposa 🦋 y Tofu sale corriendo. El espejo de agua sirve de "plato de agua" para Tofu | "¡Tofu, ven!", recuperar el ánimo de Tofu |
| 4 | **La explanada de la estrella** (jardinera en forma de estrella, pileta con chorros, faroles dobles, bandera de Bolivia) | **JEFE: El Pug de traje** | Todo lo anterior |
| 5 | **Final** (al fondo se ve la avenida que cruza el parque) | El Pug queda mareado. Llega su dueño gigante: *"¡¿QUÉ LE HICISTE A MI PERRO?!"* → "CONTINUARÁ…" → ilustración de Faby abrazando a Tofu → "Gracias por jugar" + puntaje | Gancho para el nivel 2 (la otra mitad del parque) |

### Jefe: El Pug de traje (3 fases)
1. **100–60 %:** carga en línea recta (se esquiva cambiando de carril) y mordida corta.
2. **60–30 %:** **ladrido sónico** en cono (aturde a Faby y sube el temperamento de Tofu) y **patada de tierra** con las patas traseras (proyectil).
3. **30–0 %:** más rápido, encadena carga y ladrido. Se "ajusta la corbata" entre ataques: es la ventana para castigarlo.

Detalle: si Tofu entra en modo furioso contra el Pug, hace el doble de daño. Es la rivalidad entre ellos.

---

## 6. Dirección de arte (especificación para PixelLab)

| Parámetro | Valor |
|---|---|
| Resolución interna | **960 × 540** (16:9), escalada ×2 a 1080p con `image-rendering: pixelated` |
| Vista | 3/4 mirando a la **derecha**; la izquierda es el espejo por código |
| Faby | **~151 px** de alto, reconstruida del modelo original (`assets/pilot/faby_v2/`) |
| Enemigos humanos | ~140–155 px |
| Tofu | ~70–80 px |
| Pug | ~90 px |
| Dueño del Pug | ~200 px (enorme a propósito) |
| Método de animación | `animate_image` sobre el sprite base (96–128 × 160 px): 4 cuadros = 1 gen, 8 cuadros = 2 gen |
| Contorno | `single color black outline` en personajes; fondos sin contorno o `selective outline` |
| Sombreado | `basic shading` en personajes; fondos más apagados y menos contrastados para que los personajes resalten |
| Paleta | Fondos con verdes y tierras desaturados; personajes saturados (el magenta/cian de Faby siempre debe resaltar) |
| Tipografía | **Press Start 2P** o **Silkscreen** (Google Fonts, gratis): no se gasta PixelLab en esto |
| VFX (impactos, polvo, "¡POW!") | Se dibujan con `pixelart_workbench` (gratis) o por código |
| Audio | PixelLab no hace audio: música y efectos **sintetizados por código** con WebAudio (ver §6.2) |

### 6.1 Referencia visual: Parque Lincoln (fotos en `design/parque lincon/`)

**Elementos que hacen reconocible el parque**, en orden de importancia:

1. **La cordillera del Tunari al fondo:** la silueta azul grisácea de montañas detrás de la ciudad. Es la firma de Cochabamba y va en la capa más lejana del parallax.
2. **Árboles con el tronco pintado de blanco** a lo largo de la ciclovía.
3. **Ciclovía roja/oscura con línea blanca central** y paso rojo pintado.
4. **Bordes de ladrillo** en jardineras y canteros de flores.
5. **Arbustos podados en forma de bola** (verde amarillento) en la glorieta circular.
6. **Pérgola de madera con buganvillas** y espejo de agua.
7. **Jardinera en forma de estrella**, pileta con chorros y **faroles dobles** grises.
8. **Edificios alrededor:** torres blancas, un edificio rosado, otro amarillo y casas con techo de teja roja.
9. **Vegetación:** sauces llorones, eucaliptos altos, árboles frondosos y palmeras puntuales. Pasto verde intenso con hojas secas.
10. **Bandera de Bolivia** en un mástil.

**Luz y paleta:** cielo azul intenso con nubes blancas y luz dorada de tarde, como en las fotos. Verdes vivos, ladrillo rojo, teja terracota y troncos blancos.

**Ojo con el magenta:** las buganvillas son del mismo color que la chaqueta de Faby. En el fondo deben ir más apagadas y oscuras para que Faby siempre resalte.

**Capas del parallax:**

| Capa | Velocidad | Contenido |
|---|---|---|
| 1. Cielo | 0 | Azul con nubes |
| 2. Cordillera | 0,05 | Tunari azul grisáceo con bruma |
| 3. Ciudad | 0,2 | Torres blancas, edificio rosado/amarillo, techos de teja |
| 4. Calle lateral | 0,5 | Calle con autos estacionados y vereda (el parque está entre calles) |
| 5. Parque (fondo) | 0,8 | Árboles de tronco blanco, sauces, faroles, pérgola, pileta, bandera |
| 6. Suelo jugable | 1 | Dos carriles: **ciclovía** (abajo) y **pasto con losas de cemento** (arriba) |
| 7. Primer plano | 1,3 | Bordes de ladrillo, arbustos y flores que tapan parcialmente |

**Borradores de prompt para PixelLab** (se afinan en el piloto):
- *Cordillera:* "pixel art side view distant blue-gray mountain range with haze, Tunari mountains, clear blue sky with white clouds, 16-bit beat em up background layer"
- *Ciudad:* "pixel art side view city skyline of white apartment towers, one pink building, one yellow building, red clay tile roofs, Cochabamba Bolivia, afternoon light, muted colors"
- *Ciclovía:* "pixel art side view park bike lane, dark red asphalt with white center line, row of trees with trunks painted white, green grass, parked cars on street behind, golden afternoon light, 16-bit arcade"
- *Glorieta:* "pixel art side view circular garden with red brick border and round trimmed yellow-green topiary bushes, concrete slab paths, green lawn, trees behind"
- *Pérgola:* "pixel art side view wooden pergola covered with muted purple bougainvillea, flower bed with red brick curb, shallow reflecting pool, weeping willows"
- *Explanada:* "pixel art side view plaza with star-shaped hedge planter, water fountain with jets, double-headed gray street lamps, Bolivian flag on pole, eucalyptus trees"

### 6.2 Música y sonido: estilo 80s/90s
Mismo enfoque que el `AudioManager` de **SimbaGame**: todo se sintetiza en tiempo real con osciladores de WebAudio, sin archivos de audio. Costo cero y el juego pesa muy poco.

Para el sonido arcade de los beat 'em up de los 80s/90s, se amplía a un **secuenciador chiptune** con canales tipo consola:

| Canal | Onda | Uso |
|---|---|---|
| Pulso 1 | cuadrada (ciclo de trabajo variable) | Melodía principal |
| Pulso 2 | cuadrada | Armonía y arpegios |
| Bajo | triangular / sierra filtrada | Línea de bajo con "slap" estilo Streets of Rage |
| Ruido | buffer de ruido filtrado | Batería: bombo, caja, hi-hat |

Las canciones se escriben como patrones de notas en JS (`js/data/music/*.js`) y se reproducen en bucle.

| Pista | Estilo |
|---|---|
| Título | Melodía pegadiza y heroica |
| Nivel 1 (Parque Lincoln) | Groove arcade con bajo funky, al estilo Streets of Rage 2 |
| Jefe: El Pug de traje | Tensa, con aire de "jefe mafioso" (swing y bajo marcado) |
| Victoria (jingle) | 3–4 segundos |
| Game over (jingle) | 3–4 segundos |
| Final "Gracias por jugar" | Versión lenta y emotiva del tema del título |

Efectos, también sintetizados: golpe, golpe fuerte, derribo, salto, agarre, ladrido de Tofu, gruñido, ladrido sónico del Pug, silbido "¡Tofu, ven!", recoger comida, romper basurero y "GO →".

---

## 7. Lista de assets y consumo estimado de PixelLab

Precios de referencia de PixelLab (consultados el 2026-10-07):

| Plan | Precio | Generaciones/mes |
|---|---|---|
| Trial (actual) | gratis | 40 en total + 5 diarias de bono |
| **Tier 1** | **US$12/mes** | **2 000** |
| Tier 2 | US$24/mes | 5 000 |
| Tier 3 | US$50/mes | 10 000 |

Costos unitarios usados en la estimación:
- `create_character` standard: **1 gen** (incluye todas las direcciones). Modo v3: 2–9 gen. Modo pro: 20–40 gen.
- Animación con **template**: **1 gen por dirección** (solo usamos east).
- Animación **custom v3**: ~1 gen a 64 px y ~2–3 gen a 96 px, por dirección.
- `create_image_pixflux`: **1 gen** por imagen (máximo 400×400).
- `create_image_pro`: 20–40 gen por llamada (da 4–64 candidatos según el tamaño).

### 7.1 Faby — base: v3 (~6 gen)
| Animación | Tipo | Gen |
|---|---|---|
| Idle de pelea | template `fight-stance-idle-8-frames` | 1 |
| Caminar | template `walking-8-frames` | 1 |
| Correr | template `running-6-frames` | 1 |
| Jab | template `lead-jab` | 1 |
| Cruzado (remate) | template `cross-punch` | 1 |
| Patada | template `high-kick` | 1 |
| Salto | template `jumping-1` | 1 |
| Patada aérea | template `flying-kick` | 1 |
| Especial | template `hurricane-kick` | 1 |
| Recibir golpe | template `taking-punch` | 1 |
| Caer derribada | template `falling-back-death` | 1 |
| Levantarse | template `getting-up` | 1 |
| Tomar objeto | template `picking-up` | 1 |
| Lanzar objeto | template `throw-object` | 1 |
| Agarre + rodillazo | custom v3 | 3 |
| Silbar "¡Tofu, ven!" | custom v3 | 3 |
| Acariciar a Tofu (agachada) | custom v3 | 3 |
| Pose de victoria | custom v3 | 3 |
| **Variante "Faby cargando a Tofu"** (estado) + idle/caminar/patada | estado + 3 templates | ~6 |
| **Subtotal** | | **~42** |

### 7.2 Tofu — base: standard quadruped `dog` (~1–3 gen)
| Animación | Tipo | Gen |
|---|---|---|
| Idle respirando | template `breathing-idle` | 1 |
| Caminar | template `walking-8-frames` | 1 |
| Correr | template `running-8-frames` | 1 |
| Ladrar (territorial) | template `barking` | 1 |
| Mover la cola (feliz) | template `tail-wagging` | 1 |
| Sentado | template `sitting` | 1 |
| Morder / lanzarse (furioso) | custom v3 | 1–2 |
| Gruñir erizado | custom v3 | 1–2 |
| Asustado / encogido | custom v3 | 1–2 |
| Olfatear el suelo | custom v3 | 1–2 |
| Saltar (perseguir mariposa) | custom v3 | 1–2 |
| **Subtotal** | | **~18** |

### 7.3 El Pug de traje — base: standard o pro (3–30 gen)
El traje sobre un template de perro es lo más difícil de lograr. Hay que presupuestar el modo **pro** por si el standard no respeta el traje.

| Animación | Tipo | Gen |
|---|---|---|
| Idle / caminar / correr (carga) / ladrar | 4 templates | 4 |
| Mordida | custom v3 | 2 |
| Ladrido sónico (cargado) | custom v3 | 2 |
| Patada de tierra | custom v3 | 2 |
| Recibir golpe | custom v3 | 2 |
| KO mareado | custom v3 | 2 |
| Ajustarse la corbata (burla) | custom v3 | 2 |
| **Subtotal** | | **~16 + base (3–30) = 19–46** |

### 7.4 Enemigos y NPCs
| Asset | Detalle | Gen |
|---|---|---|
| Corredor fitness | base 1–6 + idle, caminar, correr, jab, golpe recibido, caída, levantarse (7 templates) | ~10 |
| Skater | base 1–6 + idle, caminar, patada, golpe recibido, caída, levantarse (templates) + embestida en patineta (custom) | ~12 |
| Perro ladrador | base 1 + idle, correr, ladrar, mover la cola, sentado (templates) + perseguir la pelota (custom) | ~8 |
| Dueño del Pug (escena final) | base 1–6 (96 px) + idle, caminar + gritar enojado (custom ~3) | ~10 |
| 2 NPCs paseando de fondo | base + caminar | ~4 |
| Variantes de color de enemigos | **por código** (hue shift en canvas) | 0 |
| **Subtotal** | | **~44** |

### 7.5 Escenario (parallax)
| Capa | Piezas | Gen |
|---|---|---|
| Cielo (degradado y nubes **por código**) | 0 | 0 |
| Cordillera del Tunari (se repite) | 1 | 1 |
| Ciudad: torres y techos de teja (se repite) | 2 | 2 |
| Calle lateral con autos estacionados (se repite) | 1 | 1 |
| Parque: canchas, ciclovía ×2, glorieta, pérgola, explanada de la estrella, avenida del final | 7 | 7 |
| Suelo: ciclovía + pasto con losas (franja que se repite) | 2 | 2 |
| Primer plano: bordes de ladrillo, arbustos, flores | 2 | 2 |
| Retoques de uniones (`inpaint_image`) | ~5 | 5 |
| **Subtotal** | | **~20** |

### 7.6 Objetos, UI y arte clave
| Asset | Gen |
|---|---|
| Objetos: basurero (entero y roto), botella, palo, pelota, premio, plato de agua, salteña, silpancho, api con pastel, banco rompible | ~12 |
| Retratos del HUD: Faby, Tofu, Pug, Dueño (64×64) | ~4 |
| Logo del título | ~3 |
| Ilustración de la pantalla de título | ~3 |
| **Ilustración final "Gracias por jugar"** (Faby abrazando a Tofu, sin el globo de la guía): es la imagen emotiva, se justifica usar `create_image_pro` | ~30 |
| Iconos de controles táctiles | ~3 |
| **Subtotal** | **~55** |

### 7.7 Total
| Bloque | Base | Realista (×1,6 por re-intentos) |
|---|---|---|
| Faby | 42 | 67 |
| Tofu | 18 | 29 |
| Pug | 19–46 | 30–74 |
| Enemigos y NPCs | 44 | 70 |
| Escenario | 20 | 32 |
| Objetos, UI y arte clave | 55 | 72 |
| **TOTAL** | **~190–220** | **~290–340** |

**Escenario pesimista:** si la mitad de las animaciones custom salen mal o usamos modo pro para los personajes principales, se llega a **~500–600 generaciones**.

### Conclusión de costos
- **El plan Trial no alcanza** (quedan 9 gen hoy; con el bono de 5 diarias, juntar ~300 tomaría unos 60 días).
- **Tier 1 (US$12, 2 000 gen/mes) cubre el MVP completo con margen de 3–6×**, incluso en el escenario pesimista. Con un mes basta, y se puede cancelar después.
- Tier 2 o 3 solo se justifican si después se hacen los 5 niveles completos.

### Recomendación antes de pagar: piloto con las 9 generaciones gratis
Validar las dos incertidumbres técnicas grandes:
1. Faby, standard, vista `side`, size 64 → **1 gen**
2. Faby: `walking-8-frames` east → **1 gen**
3. Faby: `cross-punch` east (confirma que los templates de pelea funcionan en vista lateral) → **1 gen**
4. Tofu, quadruped `dog`, `side`, size 40 → **1 gen**
5. Tofu: `barking` east → **1 gen**
6. Pug de traje, quadruped `dog`, `side` (¿respeta el traje?) → **1 gen**
7. Un fondo de prueba con pixflux, 400×225 → **1 gen**
8. Quedan **2 gen** de margen

Si el piloto se ve bien, se paga Tier 1 y se ejecuta todo el plan. Si el traje del Pug o la vista lateral fallan, se ajusta la estrategia (modo pro o v3 con imagen de referencia) antes de gastar.

---

## 8. Arquitectura técnica (HTML)

- **Vanilla JS + Canvas 2D**, módulos ES, sin paso de build. Se abre con cualquier servidor estático y se sube tal cual a itch.io o GitHub Pages.
- Bucle de juego a timestep fijo de 60 Hz; render a 480×270 en un canvas offscreen, escalado entero al canvas visible.

```
tofuyFa/
├── index.html
├── css/style.css
├── js/
│   ├── main.js            # arranque, loop, escalado
│   ├── engine/
│   │   ├── input.js       # teclado + gamepad + táctil
│   │   ├── assets.js      # carga de PNG/JSON
│   │   ├── sprite.js      # animaciones por tiras, espejo, hue-shift
│   │   ├── camera.js      # scroll + bloqueos de pelea
│   │   ├── audio.js       # WebAudio + jsfxr
│   │   └── collision.js   # hitboxes/hurtboxes por frame
│   ├── entities/
│   │   ├── faby.js        # máquina de estados + combos
│   │   ├── tofu.js        # IA: paseo/juguetón/territorial/furioso/asustado/brazos
│   │   ├── enemy.js       # base + jogger.js, skater.js, dog.js
│   │   ├── pugBoss.js     # 3 fases
│   │   └── props.js       # objetos arrojables y recuperables
│   ├── scenes/            # title, level1, cutscene, ending
│   └── data/level1.js     # oleadas, bloqueos y eventos (mariposa, etc.)
└── assets/
    ├── sprites/           # tiras PNG + JSON (frames, hitboxes, fps)
    ├── bg/
    ├── ui/
    └── audio/
```

- Profundidad: se ordena por `y` (pies) en cada frame, con sombra elíptica bajo cada personaje. Los golpes solo conectan si |Δy| < 10 px (mismo carril).
- Pipeline de assets: PixelLab → descarga del ZIP → script `tools/pack.js` (Node) que arma tiras PNG + JSON por animación.
- Guardado: `localStorage` solo para el récord y las opciones (con try/catch).

---

## 9. Hoja de ruta

| Fase | Entregable | PixelLab |
|---|---|---|
| 0. Piloto ✅ | Estilo de Faby validado; método `animate_image` probado (idle, caminar, guardia) | 5 gen (hecho) |
| 1. Motor jugable ✅ | Faby se mueve y pelea en un escenario de prueba (`juego/`) | 0 |
| 2. Faby completa ✅ | Todas las animaciones de Faby integradas (cargar a Tofu queda para la fase 3) | 55 (real) |
| 3. Tofu ✅ | Tofu animado con su IA de temperamento + Faby cargándolo | 94 (real) |
| 4. Enemigos ✅ | Corredor, skater y perro ladrador con IA, variantes de color, pelota y premio | 116 (real) |
| 5. Parque Lincoln ✅ | Fondos y piezas del parque, basureros con comida, objetos, nombres de cada lugar | 435 (real, la mayoría en modo Pro) |
| 6. Jefe Pug + escenas ✅ | Pelea de 3 fases, intro, final con el dueño y pantalla "Gracias por jugar" | 31 (real) |
| 7. Música y sonido ✅ | 6 pistas chiptune de 4 canales + 24 efectos, todo sintetizado | 0 |
| 8. Pulido y publicación | Menús, HUD, móvil, pruebas con Faby, itch.io | ~30 |
| **Total** | | **~270 + reintentos ≈ 300–400** |

**Fase 1 — Motor jugable (0 gen).** Bucle de juego, escalado a 960×540, controles de teclado, gamepad y táctil. Movimiento en carriles con orden por profundidad, sombras y cámara con bloqueos de pelea. Combate básico con hitboxes usando las animaciones ya hechas, y un enemigo de prueba con forma de caja. *Hito: se puede caminar y golpear en el navegador.*

**Fase 2 — Faby completa (~40 gen).** Pose base de perfil, caminar y correr de 8 cuadros, jab, cruzado, patada, salto, patada aérea, especial, recibir golpe, caída, levantarse, agarrar, lanzar, silbar, acariciar, victoria y la variante cargando a Tofu. *Hito: Faby se siente bien al controlarla.*

**Fase 3 — Tofu (~35 gen).** Sprite base y animaciones: caminar, correr, ladrar, gruñir, morder, asustado, olfatear, saltar, mover la cola y en brazos. IA con los estados paseo, juguetón, territorial, furioso, asustado y en brazos; barras de ánimo y temperamento; "¡Tofu, ven!". *Hito: Tofu tiene personalidad propia en pantalla.*

**Fase 4 — Enemigos (~50 gen).** Corredor fitness, skater (embestida) y perro ladrador (se distrae con pelota o premio). Cada uno con su IA, oleadas y variantes de color por código. *Hito: peleas variadas contra grupos.*

**Fase 5 — Parque Lincoln (~45 gen).** Las 7 capas del parallax, con el Tunari, la ciudad, la ciclovía de troncos blancos, la glorieta, la pérgola y la explanada de la estrella. Objetos (basureros, pelota, botella, salteña, silpancho, api con pastel), el guion del nivel y el evento de la mariposa. *Hito: el nivel 1 completo se juega de principio a fin.*

**Fase 6 — Jefe Pug + escenas (~70 gen).** Pug de traje con sus ataques (carga, mordida, ladrido sónico, patada de tierra, ajustarse la corbata), 3 fases y KO mareado. Escena de intro y final con el dueño ("¡¿QUÉ LE HICISTE A MI PERRO?!"), retratos de diálogo e ilustración "Gracias por jugar". *Hito: el MVP tiene historia completa.*

**Fase 7 — Música y sonido (0 gen).** Secuenciador chiptune de 4 canales y 6 pistas: título, nivel, jefe, victoria, game over y final. Todos los efectos de golpes, ladridos y objetos. *Hito: suena como un arcade de los 90.*

**Fase 8 — Pulido y publicación (~30 gen).** Pantalla de título con logo, menú de opciones, HUD con retratos, pausa y récord. Ajuste de dificultad, pruebas en celular y **prueba con Faby**. Publicación en itch.io. *Hito: link para compartir.*

Las fases 1 y 7 no gastan generaciones. La fase 1 puede avanzar en paralelo con las demás.

---

## 10. Decisiones y pendientes

### Decididas
- El globo de la imagen guía era solo decoración: no se incluye.
- Faby aparece con su nombre real y está feliz con el juego.
- El juego transcurre en el **Parque Lincoln de Cochabamba**. Las fotos ya están analizadas (§6.1) y el nivel 1 sigue su recorrido real (§5).
- Música y efectos al estilo de los 80s/90s, sintetizados por código como en SimbaGame.

### Pendientes
1. Confirmar las comidas de recuperación (salteña, silpancho, api con pastel) y las frases cochabambinas.
