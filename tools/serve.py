"""Servidor local para probar el juego: python tools/serve.py [puerto]

Igual que `python -m http.server`, pero fuerza el tipo correcto de los .js: en Windows,
el registro a veces los declara como text/plain y el navegador se niega a cargar los módulos.
"""
import http.server
import sys
from functools import partial
from pathlib import Path


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.js': 'application/javascript',
        '.mjs': 'application/javascript',
        '.json': 'application/json',
        '.css': 'text/css',
    }

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8137
root = Path(__file__).resolve().parent.parent / 'juego'
print(f'Faby & Tofu en http://localhost:{port}')
http.server.ThreadingHTTPServer(('', port), partial(Handler, directory=str(root))).serve_forever()
