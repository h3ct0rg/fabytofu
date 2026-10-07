"""Lanza varias imágenes con create_image_pro (o create_image_pixen) y descarga los candidatos.

Uso:  python tools/pixellab_pro_batch.py specs.json carpeta_destino
specs.json: [{"name": "tunari", "description": "...", "width": 688, "height": 192,
              "no_background": true, "tool": "create_image_pro",
              "refs": [{"usage": "...", "path": "ruta.png"}], "style": "ruta.png"}]
Cada imagen queda en carpeta_destino/<name>/c0.png, c1.png ... (un archivo por candidato).
"""
import base64
import io
import json
import sys
import time
import urllib.request
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from pixellab_call import call  # noqa: E402


def b64(path):
    img = Image.open(path)
    # Las fotos grandes se reducen para no exceder el tamaño del argumento.
    if max(img.size) > 512:
        img.thumbnail((512, 512))
    buf = io.BytesIO()
    img.convert("RGBA" if img.mode in ("RGBA", "P") else "RGB").save(buf, "PNG")
    return base64.b64encode(buf.getvalue()).decode()


def text_of(result):
    return "\n".join(c.get("text", "") for c in result.get("content", []) if c.get("type") == "text")


def launch(spec):
    tool = spec.get("tool", "create_image_pro")
    args = {"description": spec["description"], "width": spec["width"], "height": spec["height"],
            "no_background": spec.get("no_background", True)}
    if spec.get("refs"):
        args["reference_images"] = [{"base64": b64(r["path"]), "usage": r["usage"]} for r in spec["refs"]]
    if spec.get("style"):
        args["style_image_base64"] = b64(spec["style"])
    txt = text_of(call(tool, args))
    job = next((l.split(":", 1)[1].strip() for l in txt.splitlines() if l.startswith("job_id:")), None)
    n = next((int(l.split(":", 1)[1]) for l in txt.splitlines() if l.startswith("candidates:")), 1)
    cost = next((l for l in txt.splitlines() if l.startswith("cost:")), "")
    return job, n, cost, txt


def main():
    specs = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    dest = Path(sys.argv[2])
    queue, running = list(specs), {}
    while queue or running:
        while queue:
            job, n, cost, txt = launch(queue[0])
            if not job:
                if "rate" in txt.lower() or "at a time" in txt.lower() or "concurren" in txt.lower():
                    break
                print(f"error al lanzar {queue[0]['name']}: {txt}", flush=True)
                queue.pop(0)
                continue
            spec = queue.pop(0)
            running[spec["name"]] = (job, n)
            print(f"lanzado {spec['name']} ({cost}, {n} candidatos)", flush=True)
        time.sleep(15)
        for name, (job, n) in list(running.items()):
            txt = text_of(call("get_image", {"job_id": job}))
            if "download" in txt and "asset_status" in txt:
                out = dest / name
                out.mkdir(parents=True, exist_ok=True)
                for i in range(n):
                    urllib.request.urlretrieve(f"https://api.pixellab.ai/mcp/images/{job}/download?index={i}", out / f"c{i}.png")
                print(f"listo {name}", flush=True)
                del running[name]
            elif "status: failed" in txt.lower() or "error:" in txt.lower():
                print(f"falló {name}: {txt}", flush=True)
                del running[name]


if __name__ == "__main__":
    main()
