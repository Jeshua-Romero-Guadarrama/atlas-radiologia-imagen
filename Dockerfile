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

EXPOSE 3000
CMD ["node", "server/index.js"]
