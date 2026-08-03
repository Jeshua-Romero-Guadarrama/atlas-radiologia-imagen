/*
 * Servidor del Atlas de Radiología e Imagen.
 * El proceso cumple dos funciones, puesto que sirve los archivos de la aplicación web y a la vez expone la API de consulta del contenido.
 * El acceso a los datos vive en la clase Almacen, de modo que las rutas no saben si responden desde MongoDB o desde los archivos de la carpeta data.
 */

const express = require("express");
const path = require("path");
const { Almacen } = require("./Almacen");
const { COLECCIONES, CAMPOS_BUSQUEDA } = require("./colecciones");

const PUERTO = process.env.PORT || 3000;
const RAIZ = path.join(__dirname, "..");

const almacen = new Almacen({
  raiz: RAIZ,
  uriMongo: process.env.MONGO_URI || "mongodb://localhost:27017",
  nombreBd: process.env.MONGO_DB || "atlas_radiologia_imagen",
});

const app = express();
app.use(express.json());

/*
 * Rutas de la API.
 * Todas siguen el mismo patrón, ya que intentan responder desde el almacén y recurren a su respaldo en memoria cuando la consulta falla.
 */

/*
 * Ruta de diagnóstico, pensada para saber de dónde vienen los datos que se están viendo.
 * Los totales se toman de los archivos porque son la fuente de la que se siembra la base, de modo que sirven de referencia para detectar una siembra incompleta.
 */
app.get("/api/estado", async (req, res) => {
  res.json({
    ok: true,
    origen: almacen.origen,
    baseDeDatos: almacen.bd ? almacen.nombreBd : null,
    totales: almacen.totales,
  });
});

app.get("/api/fichas", async (req, res) => {
  const filtros = { consulta: req.query.q, sistema: req.query.sistema, modalidad: req.query.modalidad };
  try {
    /*
     * La búsqueda por texto se resuelve aquí y no en la base de datos.
     * El motivo es que el índice de texto de MongoDB distingue los acentos, en cambio la comparación en memoria los ignora y encuentra igual escribiendo "torax".
     */
    res.json(Almacen.filtrarFichas(await almacen.obtener("fichas"), CAMPOS_BUSQUEDA.fichas, filtros));
  } catch (error) {
    console.error("Error al consultar las fichas en MongoDB:", error.message);
    console.error("La petición se atiende con los archivos de data, de modo que quien consulta no se queda sin respuesta.");
    res.json(Almacen.filtrarFichas(almacen.todo("fichas"), CAMPOS_BUSQUEDA.fichas, filtros));
  }
});

app.get("/api/fichas/:codigo", async (req, res) => {
  try {
    const ficha = await almacen.porCodigo("fichas", req.params.codigo);
    if (!ficha) {
      return res.status(404).json({
        error: `No hay ninguna ficha con el código "${req.params.codigo}". Los códigos se escriben en minúsculas y sin espacios, y la lista completa se obtiene consultando /api/fichas.`,
      });
    }
    res.json(ficha);
  } catch (error) {
    res.status(500).json({
      error: `No se pudo leer la ficha "${req.params.codigo}" por un fallo del servidor (${error.message}). Conviene revisar el registro del proceso y comprobar que data/fichas.json es JSON válido con npm run validar.`,
    });
  }
});

/*
 * Monta una colección de solo lectura que se filtra por sistema y por texto libre.
 * El glosario, los signos, las clasificaciones y las calculadoras se consultan exactamente igual, razón por la que comparten una sola función en lugar de repetir rutas casi idénticas.
 * Los campos en los que se busca vienen declarados en colecciones.js, puesto que cada colección nombra sus apartados de otro modo.
 */
function montarColeccion(nombre) {
  app.get(`/api/${nombre}`, async (req, res) => {
    try {
      let documentos = await almacen.obtener(nombre);
      const sistema = req.query.sistema;
      if (sistema && sistema !== "Todos") documentos = documentos.filter((d) => d.sistema === sistema);
      res.json(Almacen.buscarFrase(documentos, CAMPOS_BUSQUEDA[nombre] || [], req.query.q));
    } catch {
      res.json(almacen.todo(nombre));
    }
  });
}

montarColeccion("glosario");
montarColeccion("temas");
montarColeccion("signos");
montarColeccion("clasificaciones");
montarColeccion("calculadoras");

/*
 * Devuelve las listas de sistemas y de modalidades que aparecen en el catálogo.
 * Se calculan a partir de las fichas y no de una lista fija, de modo que al añadir un sistema nuevo el filtro aparece solo.
 */
app.get("/api/filtros", async (req, res) => {
  try {
    const fichas = await almacen.obtener("fichas");
    res.json({
      sistemas: ["Todos", ...new Set(fichas.map((ficha) => ficha.sistema))],
      modalidades: ["Todas", ...new Set(fichas.map((ficha) => ficha.modalidad))],
    });
  } catch (error) {
    res.status(500).json({
      error: `No se pudieron reunir los filtros por un fallo al leer las fichas (${error.message}). Mientras tanto el catálogo se puede consultar sin filtrar en /api/fichas, y conviene comprobar el contenido con npm run validar.`,
    });
  }
});

/*
 * Archivos de la aplicación web.
 * El HTML, el CSS, el JavaScript y los JSON se sirven sin caché para que al editar el contenido el navegador no muestre una versión antigua.
 * En cambio las imágenes sí se cachean, dado que no cambian nunca y pesan bastante más que el texto.
 */
app.use(
  express.static(RAIZ, {
    index: "index.html",
    setHeaders(res, ruta) {
      if (/\.(html|css|js|json)$/i.test(ruta)) {
        res.setHeader("Cache-Control", "no-store, must-revalidate");
      }
    },
  })
);

/*
 * Arranque del servidor.
 * La conexión con MongoDB se intenta primero, sin embargo un fallo no impide escuchar, en razón de que la aplicación sabe funcionar solo con los archivos.
 */
(async () => {
  try {
    await almacen.conectar();
    console.log(`MongoDB conectado (base de datos "${almacen.nombreBd}")`);
  } catch (error) {
    console.warn(`MongoDB no respondió (${error.message}).`);
    console.warn("La aplicación arranca igual y sirve el contenido desde los archivos de data, así que el atlas se puede consultar completo.");
    console.warn("Para usar la base de datos conviene levantarla con docker compose up -d mongo y reiniciar el servidor.");
  }
  app.listen(PUERTO, () => {
    console.log(`Atlas de Radiología e Imagen escuchando en el puerto ${PUERTO}`);
    const totales = almacen.totales;
    console.log(`Fichas: ${totales.fichas}, glosario: ${totales.glosario}, temas: ${totales.temas}`);
  });
})();
