# Faby & Tofu

Beat 'em up en HTML5 (JavaScript puro + Canvas 2D) ambientado en el **Parque Lincoln de Cochabamba**.
Faby solo quería sacar a pasear a su poodle Tofu… y terminó peleando por todo el parque contra corredores,
skaters, perros ladradores y **Corli, el pug de traje**.

En el **nivel 2, El Prado**, Faby y Tofu rescatan a **Morita**, una perrita hambrienta, de **Doña Billetes**
y sus vendedores de comida "fit" para mascotas, juntando croquetas por el camino.

## Jugar

- **Docker:** `docker compose up -d --build` y abrir `http://localhost:8099`
  (el puerto se cambia con la variable `FABY_TOFU_PORT`).
- **Local sin Docker:** `python tools/serve.py` y abrir `http://localhost:8137`.

Controles, estructura del código y detalles en [juego/README.md](juego/README.md).

## Contenido del repositorio

| Carpeta | Qué hay |
|---|---|
| `juego/` | El juego listo para servir (HTML, JS, CSS, sprites y fondos) |
| `deploy/` | Configuración de nginx para la imagen Docker |
| `tools/` | Scripts para generar arte con PixelLab y empaquetar los sprites (`pack_sprites.py`) |
| `assets/pilot/` | Cuadros originales generados con PixelLab, antes de empaquetar |
| `design/` | Bocetos y guías de estilo |
| `documento/` | Plan de diseño del MVP (nivel 1) y del nivel 2 |

Arte generado con [PixelLab](https://pixellab.ai). Música y efectos sintetizados en vivo con WebAudio.
