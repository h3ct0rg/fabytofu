# Faby & Tofu — Plan del Nivel 3: Carretera a Oruro

> Estado: **jugable** ✅ (22-oct-2026). Nivel de transición, de manejo, sin jefe. Costo real: **~115 generaciones**.
> Reutiliza menú, HUD, música, guardado y códigos de nivel. Lo nuevo es un **modo de juego**: manejo con scroll vertical.

---

## 1. Resumen

| | |
|---|---|
| **Lugar** | Carretera Cochabamba → Oruro: primero cerros y curvas, después el altiplano |
| **Premisa** | Faby y Tofu viajan a Oruro en el Baleno de Faby. Corli y su dueño cumplen su amenaza: su pandilla bloquea la carretera. |
| **Vista** | 2.5D desde atrás y un poco arriba (estilo *Top Gear* / *Spy Hunter*): el auto sube por la pantalla, la carretera baja |
| **Duración** | ~3–4 minutos: 50 % cerros, 50 % altiplano |
| **Jefe** | No hay. Final con la camioneta de Corli y la llegada al casco de Oruro |

---

## 2. Personajes y objetos

### El auto de Faby
- **Suzuki Baleno 2025 gris granito** (guía: `design/nivel3/baleno.webp`), **sin logos ni nombre** de la marca.
- Vista desde atrás: techo, alerón, vidrio trasero, franja cromada, luces traseras rojas anchas.
- Por el vidrio trasero se ve la **silueta de Faby al volante (izquierda)**. **Tofu asoma por la ventana derecha** (copiloto) con las orejas al viento.
- Variantes por código: inclinación al doblar, parpadeo al recibir daño, humo cuando tiene poca salud.

### La pandilla del dueño de Corli (personas)
- Personas normales vestidas como su jefe: **buzo azul marino con rayas blancas, cadenita, gorra**; cada uno con un detalle distinto (chamarra, lentes de sol…). Nada de ponchos, ternos ni pugs.
- **Tirapiedras** (cerros): desde el borde de la carretera lanza piedras; una sombra avisa dónde caen.
- **Bloqueadores** (altiplano): arman y corren barreras de llantas, piedras y conos, dejando huecos.

### Animales
- **Llamas y vicuñas** cruzando o paradas en la carretera. No se les hace daño: se esquivan o se apartan con la bocina.

### Camioneta del dueño de Corli
- Pasa al final con el dueño manejando y Corli asomado: "¡Te salvaste esta vez, Faby! ¡Pero ya nos veremos!".

---

## 3. Cómo se juega

| Acción | Teclado | Táctil |
|---|---|---|
| Esquivar | ← → / A D | Joystick |
| Bocina (aparta llamas) | J | A |

- **El auto acelera solo** y cada vez más rápido: el jugador solo esquiva. La dificultad sube por tramos.
- **Salud del auto**: barra en el HUD. Piedras, barreras, baches y llamas la bajan. Se recupera con **llaves** y **bidones de gasolina**.
- **Tofu avisa**: ladra ("¡GUAU!") un momento antes de que caiga una piedra.
- **Sin salud**: "¡Qué lástima! Los bloqueadores te cerraron el paso" → reintentar desde el punto de control (mitad del nivel) o volver al menú.

---

## 4. Recorrido

| Tramo | Paisaje | Peligros |
|---|---|---|
| 1. Saliendo de Cochabamba | Cerros verdes, curvas suaves | Baches, primeras piedras |
| 2. Los cerros | Laderas rocosas, curvas | Tirapiedras, derrumbes |
| — | **Punto de control** | — |
| 3. El altiplano | Llanura dorada, pajas bravas, llamas | Llamas cruzando, primeras barreras |
| 4. El bloqueo | Altiplano abierto | Barreras de llantas con huecos que se mueven |
| Final | Camioneta de Corli → casco de Oruro | — |

---

## 5. Final

1. Pasa la camioneta del dueño de Corli: "¡Te salvaste esta vez, Faby! ¡Pero ya nos veremos!". Corli ladra y se van.
2. Escena en vista lateral: el **casco de bienvenida de Oruro** con las letras "ORURO" (guía: `design/nivel3/casco_oruro.png`). Faby estaciona el Baleno y bajan ella y Tofu.
3. **Faby:** "¡Siii! ¡Llegamos justo para el Carnaval!" · **Tofu:** "¡GUAU!".
4. Resultados con el **código para el nivel 4** (Carnaval de Oruro).

---

## 6. Música (0 gen)
- Pista **"Carretera"**: rápida, de manejo, estilo *Top Gear*.
- Jingle de **llegada a Oruro** con aire de banda de Carnaval.
- Efectos: bocina, piedra que cae, choque, llantas, llave/gasolina.

---

## 7. Cálculo de generaciones

| Pieza | Herramienta | Gen |
|---|---|---|
| Bosquejos de perspectiva (hechos) | Pixen | 3 |
| Baleno desde atrás con Faby y Tofu | Pro (pequeño) | 15–20 |
| Baleno de costado (escena de estacionar) | Pro (pequeño) | 15 |
| Bordes de carretera: cerros | Pro | 40–60 |
| Bordes de carretera: altiplano | Pro | 25–40 |
| Pandilla (tirapiedras y bloqueador) con animación | Pro + animación | 35–45 |
| Llamas y vicuñas con animación | Pro + animación | 17–20 |
| Camioneta del dueño con Corli | Pro (pequeño) | 15 |
| Objetos: piedra, llantas, cono, bache, llave, gasolina | Pixen | 6–10 |
| Escena final: casco de Oruro con letras "ORURO" | Pro grande | 40 |
| **Total** | | **~210–265** |

Saldo al empezar: **484** (se recargan 2 000 el 7-nov-2026). El asfalto, las líneas, las sombras, el humo y los efectos se dibujan por código.

---

## 8. Hoja de ruta

| Etapa | Entregable |
|---|---|
| A. El Baleno | Sprite desde atrás (Faby y Tofu) + inclinaciones |
| B. Motor de manejo | Escena nueva con scroll vertical, carretera por código, esquivar, salud, aceleración automática, punto de control |
| C. Peligros | Piedras con sombra, baches, barreras con huecos, llamas, bocina, llaves y gasolina |
| D. Paisaje | Bordes de cerros y altiplano |
| E. Pandilla | Tirapiedras y bloqueadores |
| F. Final | Camioneta de Corli, casco de Oruro, Faby estacionando, resultados y código del nivel 4 |
| G. Música e integración | Pista y jingle, paso del nivel 2 al 3, guardado, pruebas en celular |
