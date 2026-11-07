# Faby & Tofu — Plan del Nivel 5: La Mina del Socavón

> Estado: **planificado** (7-nov-2026). Todo el arte de personajes y fondos es de PixelLab; velas, círculo de fuego, oscuridad y brillos se dibujan en código.
> Reutiliza el motor de peleas, el HUD, las escenas, el guardado y los códigos de nivel.

---

## 1. Resumen

| | |
|---|---|
| **Lugar** | La mina bajo el Santuario del Socavón, en Oruro: 4 pisos de túneles que bajan en zigzag hasta una cámara profunda |
| **Premisa** | Después del Carnaval, Faby y Tofu entran a la mina. Abajo los espera un señor elegante con chistera que les ofrece un contrato… y resulta ser el Diablo |
| **Jefe** | **El Diablo**: grande y aterrador, en una cámara con velas rojas y un círculo de fuego con símbolos en el centro |
| **Duración** | ~7–9 minutos: 4 pisos de túnel + jefe |
| **Sigue en** | Nivel 6: la huida de la mina que se derrumba (ver sección 7) |

### Tono
- El villano es **el Diablo** de la leyenda de la Diablada, **no el Tío de la mina**, figura que los mineros respetan. El Tío no aparece como enemigo.
- En lugar de un pentagrama se usa un **círculo de fuego con símbolos**: igual de amenazante y apto para toda la familia.

---

## 2. Recorrido: bajar en zigzag

Cada piso es un tramo horizontal. Al terminar un piso hay una **rampa o escalera de madera**: la cámara baja, Faby y Tofu aparecen en el piso de abajo y **avanzan en el sentido contrario** (izquierda → derecha, luego derecha → izquierda, y así).

| # | Piso | Sentido | Identidad | Contenido |
|---|---|---|---|---|
| 0 | Entrada | → | Boca de la mina bajo el Santuario | Escena: Faby y Tofu entran a la mina |
| 1 | Los rieles | → | Rieles, carritos mineros, lámparas colgantes | Diablitos normales, primeros murciélagos |
| 2 | La veta de plata | ← | Vetas de plata que brillan en las paredes | Diablitos normales y con tridente |
| 3 | Las goteras | → | Agua, goteras, **charcos que hacen resbalar** | Los 3 tipos de diablito |
| 4 | La galería roja | ← | Más oscuro, luz roja, calor | Grupo mixto; anuncia al jefe |
| 5 | La cámara del Diablo | — | Velas rojas, círculo de fuego con símbolos | Escena del contrato → jefe |

- **Cuevas en las paredes:** los diablitos salen de agujeros en el fondo del túnel.
- **Decorado opcional y respetuoso:** una estatua del Tío con coca y serpentinas de fondo en un piso, como homenaje.

---

## 3. Mecánica nueva: Tofu en brazos

- Los **murciélagos** pasan volando cuando Faby se acerca. **No atacan**: solo asustan a Tofu.
- Tofu asustado **salta a los brazos de Faby**. Tiembla y le salen gotitas de sudor.
- Mientras Faby lo carga:
  - Tofu **no ataca** ni recoge cosas.
  - Faby **solo patea** y camina **un poco más lento**.
- Después de avanzar un tramo (o unos segundos) Faby lo vuelve a soltar.
- **Riesgo para el jugador:** si los murciélagos asustan a Tofu justo cuando llegan los diablitos, la pelea se pone más difícil.

---

## 4. Enemigos: los diablitos

| Tipo | Cómo pelea |
|---|---|
| **Diablito** | Rápido y débil. Salta y araña |
| **Diablito con tridente** | Pincha de lejos (alcance largo, como el latigazo del Nivel 4) |
| **Diablito lanzador** | Se queda en la boca de su cueva y lanza piedritas o chispas |

Los murciélagos no son enemigos: no tienen vida y no se pueden golpear.

---

## 5. Jefe: el Diablo

### Escena del contrato
1. Faby se acerca a un señor elegante con chistera: "¿Está perdido, señor?"
2. Él: "No… pero puedo ofrecerte lo que tú quieras." Le muestra un **contrato**: "Firma aquí y tendrás todo lo que desees."
3. Tofu ladra: "¡GUAU! (¡No firmes, Faby, es una trampa!)"
4. Faby: "¡Ni loca! Déjeme tranquila."
5. El señor se enoja, **libera un humo** que lo cubre y al despejarse aparece **el Diablo**. Se encienden las velas rojas y el **círculo de fuego** brilla en el centro.

### Pelea
- **Fase 1:** golpes y embestidas.
- **Fase 2:** **bolas de fuego**. Las velas se encienden una por una a medida que pierde vida.
- **Fase 3:** embestida más rápida y **lluvia de fuego** desde arriba.
- **Ayuda de Tofu:** cada cierto tiempo Tofu le ladra y el Diablo queda aturdido un momento.

### Final del nivel
- Derrotado, el Diablo vuelve a ser el señor de la chistera y escapa: "¡Ese perro… se arrepentirá!"
- **La mina empieza a temblar** y caen piedritas: se encadena con el Nivel 6.
- Pantalla de nivel completado con el código del Nivel 6.

---

## 6. Cálculo de generaciones

| Bloque | Gen |
|---|---|
| Animación de entrada a la mina | 15–25 |
| Murciélagos (vuelo) | 5–10 |
| Faby cargando a Tofu: quieta, caminando y patada; Tofu temblando | 35–50 |
| 3 diablitos (base + animaciones: idle, caminar, ataque, golpe, caída) | 80–110 |
| Señor de la chistera con contrato + transformación con humo | 30–45 |
| Diablo grande: base, golpe, embestida, fuego, golpeado, caída | 80–110 |
| Fondos: boca de la mina + 4 pisos (rieles y carritos, veta de plata, goteras, galería roja) + rampas, escaleras y cuevas | 100–140 |
| Cámara del Diablo (paredes y piso) | 15–25 |
| Efectos: humo, bolas de fuego, piedritas o chispas | 10–20 |
| **Total** | **~370–535** |

**En código, sin costo:** velas y su llama, círculo de fuego con símbolos, oscuridad y luz de las lámparas, brillo de las vetas, gotas y charcos, temblor de la mina, transición de la cámara entre pisos.

---

## 7. Nivel 6 (idea, se planifica aparte): la huida de la mina

- Faby toma a Tofu en brazos y **sale corriendo por la mina** que se derrumba porque el Diablo la hizo temblar.
- Cámara como la del Nivel 3: **avance constante hacia adelante**, esquivando rocas que caen.
- Reutiliza la mecánica de manejo del Nivel 3 (`drive.js`) y el arte de Faby cargando a Tofu del Nivel 5.

---

## 8. Hoja de ruta

| Etapa | Entregable |
|---|---|
| A. Personajes | Faby cargando a Tofu, murciélagos, 3 diablitos |
| B. Jefe | Señor de la chistera, Diablo, humo y fuego |
| C. Motor | Pisos en zigzag (sentido alternado, transición de cámara), modo "Tofu en brazos", cuevas que generan enemigos |
| D. IA | Tipos de diablito y jefe de 3 fases con velas que se encienden |
| E. Fondos | Boca de la mina, 4 pisos y cámara del Diablo; velas y círculo en código |
| F. Escenas y música | Entrada, contrato y transformación, final con temblor; tema de la mina y tema del Diablo |
| G. Integración | Paso del nivel 4 al 5, código de nivel y de prueba, pruebas en celular |
