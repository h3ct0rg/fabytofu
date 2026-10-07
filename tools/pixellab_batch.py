"""Lanza varias animaciones animate_image de PixelLab y descarga los cuadros.

Uso:  python tools/pixellab_batch.py specs.json carpeta_destino
specs.json: [{"name": "walk", "base": "ruta/base.png", "frames": 8, "action": "..."}, ...]

Respeta el límite de trabajos simultáneos reintentando, y deja cada animación en
carpeta_destino/<name>/f0.png ... (f0 es el cuadro de entrada).
"""
import base64
import json
import sys
import time
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from pixellab_call import call  # noqa: E402


def text_of(result):
    return "\n".join(c.get("text", "") for c in result.get("content", []) if c.get("type") == "text")


def launch(spec):
    args = {
        "action": spec["action"],
        "frame_count": spec["frames"],
        "no_background": True,
        "first_frame_url": "data:image/png;base64," + base64.b64encode(Path(spec["base"]).read_bytes()).decode(),
    }
    txt = text_of(call("animate_image", args))
    for line in txt.splitlines():
        if line.startswith("job_id:"):
            cost = next((l for l in txt.splitlines() if l.startswith("cost:")), "")
            return line.split(":", 1)[1].strip(), cost
    return None, txt


def main():
    specs = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    dest = Path(sys.argv[2])
    queue = list(specs)
    running = {}
    while queue or running:
        # Lanza lo que se pueda; si el servidor dice "rate limit", espera a que termine algo.
        while queue:
            job, info = launch(queue[0])
            if not job:
                if "rate" in info.lower() or "concurren" in info.lower() or "at a time" in info.lower():
                    break
                print(f"error al lanzar {queue[0]['name']}: {info}")
                queue.pop(0)
                continue
            spec = queue.pop(0)
            running[spec["name"]] = (job, spec["frames"])
            print(f"lanzado {spec['name']} ({info})", flush=True)
        time.sleep(15)
        for name, (job, n) in list(running.items()):
            txt = text_of(call("get_image", {"job_id": job}))
            if "download" in txt and "asset_status" in txt:
                out = dest / name
                out.mkdir(parents=True, exist_ok=True)
                for i in range(n + 1):
                    urllib.request.urlretrieve(f"https://api.pixellab.ai/mcp/images/{job}/download?index={i}", out / f"f{i}.png")
                print(f"listo {name}", flush=True)
                del running[name]
            elif "status: failed" in txt.lower() or "error:" in txt.lower():
                print(f"falló {name}: {txt}", flush=True)
                del running[name]


if __name__ == "__main__":
    main()
