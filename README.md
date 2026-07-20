# 🩻 Atlas de Radiología e Imagen

Catálogo visual de imagenología organizado por **sistemas del cuerpo**, con buscador, glosario, signos radiológicos, clasificaciones, temas de estudio y un modo de repaso tipo quiz.

Está pensado para estudiar comparando: se busca lo visto en clase o en prácticas, se compara con las imágenes del catálogo y se lee qué observar en cada estudio.

**Todas las imágenes están almacenadas localmente.** La aplicación no depende de ningún servicio externo ni enlaza a webs de terceros: funciona completa aunque no haya conexión a internet.

## ✨ Qué incluye

| Sección | Contenido |
|---|---|
| 📚 Catálogo | Fichas de estudios y hallazgos, con imagen real, técnica, qué observar, hallazgos, diagnóstico diferencial, simuladores, protocolo y perla clínica |
| 🔬 Signos | Signos radiológicos con nombre, con su base fisiopatológica y su significado |
| 📐 Clasificaciones | Escalas y sistemas de graduación con sus criterios y su implicación clínica |
| 📘 Temas | Artículos de estudio en profundidad |
| 📖 Glosario | Terminología organizada por categoría |
| 🎯 Modo estudio | Quiz que muestra una imagen y pide identificarla, con distractores del mismo sistema |

**Sistemas cubiertos:** óseo y musculoesquelético, respiratorio, cardiovascular, nervioso, digestivo, urinario, reproductor, mama, endocrino y cabeza y cuello.

**Modalidades:** radiografía (RX), tomografía computarizada (TC), resonancia magnética (RM) y ultrasonido (US).

El buscador funciona con o sin acentos (escribir `torax` encuentra «tórax») y busca en todo el texto de la ficha, no solo en el título.

## 🚀 Cómo levantarlo

### Opción 1 — Docker (recomendada, incluye MongoDB)

```bash
docker compose up -d --build
```

Luego abrir **http://localhost:8081**

Esto levanta dos contenedores: MongoDB y la aplicación. La base de datos se siembra automáticamente con el contenido de `data/` y se recarga sola cuando ese contenido cambia. Los datos persisten en un volumen de Docker.

Para detenerlo: `docker compose down` (añadir `-v` para borrar también la base de datos).

### Opción 2 — Node sin Docker

```bash
cd server
npm install
npm start
```

Abrir **http://localhost:3000**. Si no hay un MongoDB corriendo, la aplicación lo detecta y lee directamente los archivos de `data/`, así que funciona igual.

### Opción 3 — Sin instalar nada

Abrir `index.html` con doble clic. El navegador carga los JSON de `data/` directamente. Algunos navegadores restringen la lectura de archivos locales; si ocurre, usar la opción 1 o 2.

## 🗄️ La base de datos

MongoDB, base `atlas_radiologia_imagen`, con estas colecciones:

- **fichas** — el catálogo de imágenes
- **signos** — signos radiológicos con nombre
- **clasificaciones** — escalas y sistemas de graduación
- **glosario** — terminología
- **temas** — artículos de estudio

Se crean índices de texto en español sobre título, descripción, hallazgos, perlas y etiquetas, más un índice compuesto por sistema y modalidad.

Para recargar la base desde los archivos JSON:

```bash
cd server
npm run seed
```

Consultar la base directamente:

```bash
docker exec -it atlas-radiologia-imagen-mongo mongosh atlas_radiologia_imagen
```

### API

| Ruta | Descripción |
|---|---|
| `GET /api/fichas` | Todas las fichas. Acepta `?q=`, `?sistema=` y `?modalidad=` |
| `GET /api/fichas/:codigo` | Una ficha concreta |
| `GET /api/signos` | Signos radiológicos. Acepta `?q=` y `?sistema=` |
| `GET /api/clasificaciones` | Clasificaciones. Acepta `?q=` y `?sistema=` |
| `GET /api/glosario` | Términos del glosario. Acepta `?q=` |
| `GET /api/temas` | Artículos de estudio |
| `GET /api/filtros` | Listas de sistemas y modalidades disponibles |
| `GET /api/estado` | Diagnóstico: indica si los datos vienen de MongoDB o de archivos |

## ✏️ Cómo agregar contenido

Todo el contenido está en la carpeta `data/`, en archivos JSON que se pueden editar con cualquier editor de texto:

- `data/fichas.json` y `data/fichas-nuevas.json` — las fichas del catálogo
- `data/signos.json` — los signos radiológicos
- `data/clasificaciones.json` — las clasificaciones
- `data/glosario.json` — los términos
- `data/temas.json` — los artículos

Para agregar una ficha, copiar una existente (todo lo que va entre `{` y `}`), pegarla y cambiar el texto. La estructura es:

```json
{
  "codigo": "identificador-unico-sin-espacios",
  "titulo": "Nombre del estudio o hallazgo",
  "sistema": "Óseo",
  "modalidad": "RX",
  "region": "Mano",
  "dificultad": "Básico",
  "esNormal": true,
  "descripcion": "Qué es y para qué sirve...",
  "tecnica": "Cómo se realiza el estudio...",
  "observar": ["Punto clave 1", "Punto clave 2"],
  "hallazgos": "Qué se ve en esta imagen concreta...",
  "perlas": "El dato que conviene no olvidar...",
  "diferencial": [{ "entidad": "Otra entidad", "comoDistinguir": "El dato que las separa" }],
  "simuladores": ["Variante normal o artefacto que se confunde"],
  "porModalidad": { "RX": "qué aporta", "TC": "qué aporta" },
  "protocolo": "Detalle de adquisición...",
  "clasificacion": "Clasificación aplicable explicada",
  "errores": ["Error de interpretación frecuente"],
  "imagen": "img/mi-imagen.jpg",
  "credito": "Autor · Licencia · Origen",
  "etiquetas": ["palabra1", "palabra2"]
}
```

**Para usar imágenes propias:** guardarlas en la carpeta `img/` y escribir `"imagen": "img/nombre-del-archivo.jpg"`. Conviene usar nombres sin espacios ni acentos.

Después de editar, recargar la página. Con Docker y MongoDB, la recarga de la base es automática al reiniciar el contenedor; también puede forzarse con `npm run seed`.

## 📷 Sobre las imágenes

Las imágenes están descargadas en la carpeta `img/` y provienen de Wikimedia Commons con licencias libres (CC0, dominio público, CC BY y CC BY-SA). Cada ficha muestra el autor y la licencia correspondiente, tal como exigen esas licencias.

## ⚠️ Aviso

Este atlas es **material de estudio**. No sustituye los libros de texto, la enseñanza de los profesores, ni la valoración de un profesional de la salud.
