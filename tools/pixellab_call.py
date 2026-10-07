"""Llama a una herramienta del servidor MCP de PixelLab directamente por HTTP.

Sirve cuando la sesión de Claude quedó conectada con un token viejo: lee el token
actual de ~/.claude.json (mcpServers.pixellab) y habla JSON-RPC con el servidor.

Uso:
  python tools/pixellab_call.py get_balance
  python tools/pixellab_call.py animate_image '{"action": "...", "frame_count": 4}' --image first_frame_url=ruta.png
  python tools/pixellab_call.py get_image '{"job_id": "..."}' --save carpeta/

--image clave=ruta.png  incrusta un PNG local como data URL en el argumento "clave".
--ref uso=ruta.png      agrega una imagen de referencia etiquetada (create_image_pro).
--save carpeta          guarda las imágenes devueltas como PNG numerados.
"""
import base64
import json
import sys
import urllib.request
from pathlib import Path

URL = "https://api.pixellab.ai/mcp"


def token():
    cfg = json.loads((Path.home() / ".claude.json").read_text(encoding="utf-8"))
    return cfg["mcpServers"]["pixellab"]["headers"]["Authorization"]


def post(body, auth, session=None):
    headers = {
        "Authorization": auth,
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
    }
    if session:
        headers["mcp-session-id"] = session
    req = urllib.request.Request(URL, data=json.dumps(body).encode(), headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=300) as res:
        sid = res.headers.get("mcp-session-id")
        raw = res.read().decode("utf-8")
    # La respuesta puede venir como JSON plano o como eventos SSE ("data: {...}").
    msgs = []
    for line in raw.splitlines():
        if line.startswith("data:"):
            msgs.append(json.loads(line[5:].strip()))
    if not msgs and raw.strip():
        msgs.append(json.loads(raw))
    return sid, msgs


def call(name, args):
    auth = token()
    sid, _ = post({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {
        "protocolVersion": "2025-03-26", "capabilities": {}, "clientInfo": {"name": "tofuyfa-tools", "version": "1"}}}, auth)
    post({"jsonrpc": "2.0", "method": "notifications/initialized"}, auth, sid)
    _, msgs = post({"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": name, "arguments": args}}, auth, sid)
    for m in msgs:
        if m.get("id") == 2:
            if "error" in m:
                raise SystemExit(f"Error: {m['error']}")
            return m["result"]
    raise SystemExit("Sin respuesta del servidor")


def main():
    argv = sys.argv[1:]
    if not argv:
        raise SystemExit(__doc__)
    name = argv.pop(0)
    args = json.loads(argv.pop(0)) if argv and not argv[0].startswith("--") else {}
    save = None
    while argv:
        flag = argv.pop(0)
        if flag == "--image":
            key, path = argv.pop(0).split("=", 1)
            args[key] = "data:image/png;base64," + base64.b64encode(Path(path).read_bytes()).decode()
        elif flag == "--ref":
            usage, path = argv.pop(0).split("=", 1)
            args.setdefault("reference_images", []).append(
                {"base64": base64.b64encode(Path(path).read_bytes()).decode(), "usage": usage})
        elif flag == "--save":
            save = Path(argv.pop(0))

    result = call(name, args)
    n = 0
    for c in result.get("content", []):
        if c.get("type") == "text":
            print(c["text"])
        elif c.get("type") == "image" and save:
            save.mkdir(parents=True, exist_ok=True)
            out = save / f"img{n}.png"
            out.write_bytes(base64.b64decode(c["data"]))
            print(f"[imagen guardada] {out}")
            n += 1
    if result.get("isError"):
        sys.exit(1)


if __name__ == "__main__":
    main()
