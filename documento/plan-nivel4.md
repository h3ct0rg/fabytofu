# Faby & Tofu — Plan del Nivel 4: El Carnaval de Oruro

> Estado: **en producción** (6-nov-2026). Beat 'em up, como los niveles 1 y 2.
> Reutiliza el motor de peleas, el HUD, las escenas, el guardado y los códigos de nivel.

---

## 1. Resumen

| | |
|---|---|
| **Lugar** | Oruro en pleno Carnaval: la Avenida Cívica con graderías y arcos de plata, las calles con bandas y comparsas, y la plaza frente al Santuario del Socavón |
| **Premisa** | Faby y Tofu quieren llegar a la mina del Socavón. El dueño de Corli cumple su venganza: su pandilla **se mete al Carnaval disfrazada con trajes robados** para atraparlos. |
| **Jefe** | **El dueño de Corli con una careta de diablo gigante**, con Corli a su lado en un mini traje de diablo |
| **Duración** | ~6–8 minutos, 3 zonas de pelea + jefe |

### Tono (importante)
El Carnaval de Oruro es Patrimonio de la Humanidad y una fiesta de **devoción a la Virgen del Socavón**. Por eso los enemigos **no son danzantes de verdad**: son la pandilla de Corli **disfrazada**.
- Se nota que son impostores: trajes mal puestos, cadenita de oro, zapatillas; al recibir un golpe fuerte **se les cae la careta o el sombrero** ("¡SE LE CAYÓ LA CARETA!").
- Los **danzantes reales** bailan de fondo y el público aplaude desde las graderías.
- Al final, los danzantes de verdad invitan a Faby y Tofu a bailar.

---

## 2. Enemigos (la pandilla disfrazada)

| Disfraz | Cómo pelea |
|---|---|
| **Caporal** | Rápido. Patadas saltando con las botas de cascabeles |
| **Moreno** | Lento y pesado (traje enorme). Gira la **matraca**: el ruido aturde a Faby. Súper armadura |
| **Diablo** | Mediano. Latigazo de alcance largo |
| **China supay** | Muy rápida. Giros que empujan |

### Jefe: el dueño de Corli con careta de diablo gigante
- **Fase 1:** embestidas y golpes pesados; al pisar fuerte tiembla el piso.
- **Fase 2:** lluvia de serpentina y confeti (proyectiles que caen) y llama a sus "danzantes".
- **Fase 3:** más rápido; Corli ayuda ladrando (aturde, como en el nivel 1).
- **KO:** se le cae la careta: "¡¿Otra vez tú, Faby?!". La venganza de Corli termina aquí.
- Comida que cae durante la pelea y Tofu la trae (igual que con Doña Billetes).

---

## 3. Recorrido

| # | Zona | Contenido |
|---|---|---|
| 0 | Llegada al Carnaval | Escena: el dueño de Corli anuncia su venganza; su pandilla se disfraza |
| 1 | La Avenida Cívica | Graderías con público, arcos de plata. Caporales y chinas supay |
| 2 | Las calles de la entrada | Bandas y comparsas de fondo. Morenos y diablos |
| 3 | Cerca del Socavón | Grupo mixto |
| 4 | Plaza del Santuario del Socavón | Jefe → final con los danzantes de verdad |

---

## 4. Cálculo de generaciones

| Bloque | Gen |
|---|---|
| 4 enemigos disfrazados (base + animaciones) | 130–160 |
| Jefe con careta gigante + Corli disfrazado | 60–80 |
| Fondo: graderías con público, arcos de plata, calles, Santuario del Socavón | 120–160 |
| Danzantes reales de fondo y escena final | 20–30 |
| Objetos y efectos (serpentina, confeti, careta que cae) | 10–15 |
| **Total** | **~340–445** |

**Plan de gasto:** antes del reinicio del 7-nov-2026 se usan las 232 que quedan en los enemigos y el jefe; desde el 7-nov (2 000 nuevas) el fondo, los danzantes y la escena final.

---

## 5. Hoja de ruta

| Etapa | Entregable |
|---|---|
| A. Enemigos | 4 disfrazados con animaciones (idle, caminar, ataque, golpe, caída) |
| B. Jefe | Dueño con careta gigante: base y animaciones |
| C. IA | Tipos nuevos de enemigo y jefe de 3 fases |
| D. Fondo | Oruro de Carnaval (desde el 7-nov) |
| E. Escenas y música | Intro, final con baile, música de Carnaval |
| F. Integración | Paso del nivel 3 al 4, código de nivel, pruebas en celular |
