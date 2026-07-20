/* ============================================================
   Atlas de Radiologia e Imagen · Servidor
   Sirve la aplicación web y expone la API conectada a MongoDB.
   Si MongoDB no está disponible, la API sigue funcionando
   leyendo los archivos JSON de la carpeta data/.
   ============================================================ */

const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { MongoClient } = require("mongodb");

const PUERTO = process.env.PORT || 3000;
const URI_MONGO = process.env.MONGO_URI || "mongodb://localhost:27017";
const NOMBRE_BD = process.env.MONGO_DB || "atlas_radiologia_imagen";
const RAIZ = path.join(__dirname, "..");

const app = express();
app.use(express.json());

let bd = null; // conexión a MongoDB (null si no está disponible)

/* ---------- Respaldo: los JSON del repositorio ---------- */
function leerJson(nombre) {
  const ruta = path.join(RAIZ, "data", nombre);
  return JSON.parse(fs.readFileSync(ruta, "utf8"));
}
// Las colecciones que puede tener la aplicación. Las que todavía no
// tengan archivo se cargan como lista vacía, para que el servidor
// arranque igual mientras se va añadiendo contenido.
const COLECCIONES = ["fichas", "glosario", "temas", "signos", "clasificaciones", "calculadoras"];

function leerJsonOpcional(nombre) {
  try {
    return leerJson(nombre);
  } catch {
    return [];
  }
}

const RESPALDO = {};
for (const nombre of COLECCIONES) {
  RESPALDO[nombre] = leerJsonOpcional(`${nombre}.json`);
}
// Las fichas nuevas, si existen, se unen al catálogo principal
const FICHAS_EXTRA = leerJsonOpcional("fichas-nuevas.json");
if (FICHAS_EXTRA.length) {
  const yaEstan = new Set(RESPALDO.fichas.map((f) => f.codigo));
  RESPALDO.fichas = RESPALDO.fichas.concat(FICHAS_EXTRA.filter((f) => !yaEstan.has(f.codigo)));
}

/* ---------- Conexión y carga inicial de MongoDB ---------- */
async function conectarMongo() {
  const cliente = new MongoClient(URI_MONGO, { serverSelectionTimeoutMS: 5000 });
  await cliente.connect();
  bd = cliente.db(NOMBRE_BD);

  // Sembrar o resembrar. Se compara una huella del contenido, no solo
  // el número de documentos: así, si se edita el texto de una ficha sin
  // cambiar cuántas hay, la base también se actualiza.
  for (const nombre of COLECCIONES) {
    if (!RESPALDO[nombre].length) continue;
    const coleccion = bd.collection(nombre);
    const huellaArchivo = crypto
      .createHash("sha1")
      .update(JSON.stringify(RESPALDO[nombre]))
      .digest("hex");

    const marca = await bd.collection("_huellas").findOne({ _id: nombre });
    if (marca && marca.huella === huellaArchivo) continue;

    await coleccion.deleteMany({});
    await coleccion.insertMany(RESPALDO[nombre]);
    await bd.collection("_huellas").updateOne(
      { _id: nombre },
      { $set: { huella: huellaArchivo, actualizado: new Date() } },
      { upsert: true }
    );
    console.log(`  ✔ Colección "${nombre}": ${RESPALDO[nombre].length} documentos cargados`);
  }

  // Índice de texto para búsquedas
  await bd.collection("fichas").createIndex(
    { titulo: "text", descripcion: "text", hallazgos: "text", perlas: "text", etiquetas: "text" },
    { default_language: "spanish", name: "busqueda_texto" }
  );
  await bd.collection("fichas").createIndex({ sistema: 1, modalidad: 1 });

  console.log(`✅ MongoDB conectado (base de datos "${NOMBRE_BD}")`);
}

/* ---------- Utilidad: quitar acentos para buscar ---------- */
function normalizar(texto) {
  return (texto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function filtrarEnMemoria(fichas, { q, sistema, modalidad }) {
  return fichas.filter((f) => {
    if (sistema && sistema !== "Todos" && f.sistema !== sistema) return false;
    if (modalidad && modalidad !== "Todas" && f.modalidad !== modalidad) return false;
    if (!q) return true;
    const texto = normalizar(
      [f.titulo, f.sistema, f.modalidad, f.region, f.descripcion, f.tecnica,
       f.hallazgos, f.perlas, (f.observar || []).join(" "), (f.etiquetas || []).join(" ")].join(" ")
    );
    return normalizar(q).split(/\s+/).filter(Boolean).every((p) => texto.includes(p));
  });
}

/* ============================================================
   API
   ============================================================ */

app.get("/api/estado", async (req, res) => {
  res.json({
    ok: true,
    origen: bd ? "mongodb" : "archivos",
    baseDeDatos: bd ? NOMBRE_BD : null,
    totales: Object.fromEntries(COLECCIONES.map((c) => [c, RESPALDO[c].length])),
  });
});

app.get("/api/fichas", async (req, res) => {
  const { q, sistema, modalidad } = req.query;
  try {
    if (bd) {
      const filtro = {};
      if (sistema && sistema !== "Todos") filtro.sistema = sistema;
      if (modalidad && modalidad !== "Todas") filtro.modalidad = modalidad;
      let fichas = await bd.collection("fichas").find(filtro).project({ _id: 0 }).toArray();
      if (q) fichas = filtrarEnMemoria(fichas, { q }); // búsqueda sin acentos
      return res.json(fichas);
    }
    res.json(filtrarEnMemoria(RESPALDO.fichas, { q, sistema, modalidad }));
  } catch (err) {
    console.error("Error en /api/fichas:", err.message);
    res.json(filtrarEnMemoria(RESPALDO.fichas, { q, sistema, modalidad }));
  }
});

app.get("/api/fichas/:codigo", async (req, res) => {
  try {
    const buscar = (lista) => lista.find((f) => f.codigo === req.params.codigo);
    if (bd) {
      const ficha = await bd.collection("fichas").findOne({ codigo: req.params.codigo }, { projection: { _id: 0 } });
      if (ficha) return res.json(ficha);
    }
    const ficha = buscar(RESPALDO.fichas);
    if (!ficha) return res.status(404).json({ error: "Ficha no encontrada" });
    res.json(ficha);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/glosario", async (req, res) => {
  const q = req.query.q;
  try {
    let terminos = bd
      ? await bd.collection("glosario").find({}).project({ _id: 0 }).toArray()
      : RESPALDO.glosario;
    if (q) {
      const n = normalizar(q);
      terminos = terminos.filter((t) => normalizar(t.termino + " " + t.definicion + " " + (t.categoria || "")).includes(n));
    }
    res.json(terminos);
  } catch (err) {
    res.json(RESPALDO.glosario);
  }
});

app.get("/api/temas", async (req, res) => {
  try {
    const temas = bd
      ? await bd.collection("temas").find({}).project({ _id: 0 }).toArray()
      : RESPALDO.temas;
    res.json(temas);
  } catch (err) {
    res.json(RESPALDO.temas);
  }
});

/* ---------- Signos radiológicos y clasificaciones ---------- */
function montarColeccion(ruta, nombre, campos) {
  app.get(ruta, async (req, res) => {
    const q = req.query.q;
    const sistema = req.query.sistema;
    try {
      let docs = bd
        ? await bd.collection(nombre).find({}).project({ _id: 0 }).toArray()
        : RESPALDO[nombre];
      if (!docs.length) docs = RESPALDO[nombre];
      if (sistema && sistema !== "Todos") docs = docs.filter((d) => d.sistema === sistema);
      if (q) {
        const n = normalizar(q);
        docs = docs.filter((d) =>
          normalizar(campos.map((c) => JSON.stringify(d[c] || "")).join(" ")).includes(n)
        );
      }
      res.json(docs);
    } catch (err) {
      res.json(RESPALDO[nombre]);
    }
  });
}

montarColeccion("/api/signos", "signos",
  ["nombre", "sistema", "modalidad", "queEs", "porQueOcurre", "significado", "diferencial", "comoRecordarlo", "etiquetas"]);
montarColeccion("/api/clasificaciones", "clasificaciones",
  ["nombre", "sistema", "modalidad", "paraQue", "grados", "comoUsarla", "limitaciones", "etiquetas"]);
montarColeccion("/api/calculadoras", "calculadoras",
  ["nombre", "categoria", "modalidad", "descripcion", "formulaTexto", "notas"]);

app.get("/api/filtros", async (req, res) => {
  try {
    const fichas = bd
      ? await bd.collection("fichas").find({}).project({ _id: 0, sistema: 1, modalidad: 1 }).toArray()
      : RESPALDO.fichas;
    res.json({
      sistemas: ["Todos", ...new Set(fichas.map((f) => f.sistema))],
      modalidades: ["Todas", ...new Set(fichas.map((f) => f.modalidad))],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- Archivos estáticos de la aplicación ---------- */
// El HTML, el CSS y el JS no se cachean: así, al editar el contenido,
// el navegador nunca muestra una versión antigua. Las imágenes sí se
// cachean, porque son fijas y pesan.
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

/* ---------- Arranque ---------- */
(async () => {
  try {
    await conectarMongo();
  } catch (err) {
    console.warn(`⚠️  MongoDB no disponible (${err.message}).`);
    console.warn("   La aplicación funcionará leyendo los archivos de data/.");
  }
  app.listen(PUERTO, () => {
    console.log(`\n🩻 Atlas de Radiologia e Imagen escuchando en http://localhost:${PUERTO}`);
    console.log(`   Fichas: ${RESPALDO.fichas.length} · Glosario: ${RESPALDO.glosario.length} · Temas: ${RESPALDO.temas.length}\n`);
  });
})();
