# Faby & Tofu — juego HTML5 estático servido con nginx.
# Solo se copia la carpeta juego/ (el resto del repo son diseños, pruebas y herramientas).
FROM nginx:1.27-alpine

# Configuración propia: compresión, caché y tipos de archivo.
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

# El juego
COPY juego/ /usr/share/nginx/html/

# Healthcheck simple: la página principal responde.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1

EXPOSE 80
