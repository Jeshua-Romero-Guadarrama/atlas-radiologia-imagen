# Atlas de Radiologia e Imagen
FROM node:20-alpine

WORKDIR /app

# Se copia server/ completo. Si la carpeta incluye node_modules (porque ya se
# ejecutó "npm install" en el equipo), el build no necesita red. Si no los
# incluye, se instalan aquí. El "||" hace que el build funcione en ambos casos,
# incluso en redes que interceptan el tráfico TLS y rompen npm.
COPY server/ ./server/
RUN cd server && \
    if [ ! -d node_modules ]; then npm install --omit=dev --no-audit --no-fund; fi && \
    node -e "require('express'); require('mongodb'); console.log('Dependencias OK')"

# Aplicación: datos, imágenes y frontend
COPY data/ ./data/
COPY img/ ./img/
COPY css/ ./css/
COPY js/ ./js/
COPY index.html ./index.html

# El servidor sirve la raíz entera, así que las páginas estáticas y los
# archivos de publicación también viajan en la imagen; sin ellos el
# contenedor respondería 404 donde GitHub Pages responde contenido.
COPY manifest.webmanifest 404.html portada.svg robots.txt sitemap.xml seo.json sw.js ./
COPY casos/ ./casos/
COPY signos/ ./signos/
COPY clasificaciones/ ./clasificaciones/
COPY calculadoras/ ./calculadoras/
COPY temas/ ./temas/

EXPOSE 3000
CMD ["node", "server/index.js"]
