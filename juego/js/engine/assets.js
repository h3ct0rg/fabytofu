// Carga de imágenes y hojas de sprites (atlas PNG + JSON generados por tools/pack_sprites.py).

const BASE = 'assets/';

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    img.src = src;
  });
}

export async function loadSheet(name) {
  const res = await fetch(`${BASE}sprites/${name}.json`);
  if (!res.ok) throw new Error(`No se pudo cargar ${name}.json`);
  const data = await res.json();
  const image = await loadImage(`${BASE}sprites/${data.image}`);
  return { name, image, rects: data.rects, anims: data.anims };
}
