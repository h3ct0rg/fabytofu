"""Espera trabajos de animate_image de PixelLab y descarga sus cuadros.

Uso:  python tools/pixellab_wait.py destino/carpeta nombre=JOB_ID:CUADROS [nombre=JOB_ID:CUADROS ...]
Cada animación queda en destino/nombre/f0.png ... fN.png (f0 es el cuadro de entrada).
"""
import json
import sys
import time
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from pixellab_call import call  # noqa: E402


def text_of(result):
    return "\n".join(c.get("text", "") for c in result.get("content", []) if c.get("type") == "text")


def main():
    dest = Path(sys.argv[1])
    jobs = {}
    for spec in sys.argv[2:]:
        name, rest = spec.split("=", 1)
        job, n = rest.split(":")
        jobs[name] = (job, int(n))

    pending = dict(jobs)
    for _ in range(40):
        for name, (job, n) in list(pending.items()):
            txt = text_of(call("get_image", {"job_id": job}))
            if "download" in txt and "asset_status" in txt:
                out = dest / name
                out.mkdir(parents=True, exist_ok=True)
                for i in range(n + 1):
                    url = f"https://api.pixellab.ai/mcp/images/{job}/download?index={i}"
                    urllib.request.urlretrieve(url, out / f"f{i}.png")
                print(f"listo: {name} ({n + 1} cuadros) -> {out}")
                del pending[name]
            elif "fail" in txt.lower() or "error" in txt.lower():
                print(f"falló: {name}\n{txt}")
                del pending[name]
        if not pending:
            return
        time.sleep(15)
    print("tiempo agotado:", json.dumps(list(pending)))


if __name__ == "__main__":
    main()
