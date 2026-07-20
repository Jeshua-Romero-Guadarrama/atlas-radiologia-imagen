/* ============================================================
   Atlas de Radiologia e Imagen · Carga de la base de datos
   Vuelca el contenido de data/*.json en MongoDB.
   Uso:  npm run seed
   ============================================================ */

const path = require("path");
const fs = require("fs");
const { MongoClient } = require("mongodb");

const URI_MONGO = process.env.MONGO_URI || "mongodb://localhost:27017";
const NOMBRE_BD = process.env.MONGO_DB || "atlas_radiologia_imagen";
const CARPETA_DATOS = path.join(__dirname, "..", "data");

async function main() {
  const cliente = new MongoClient(URI_MONGO, { serverSelectionTimeoutMS: 10000 });
  await cliente.connect();
  const bd = cliente.db(NOMBRE_BD);
  console.log(`Conectado a MongoDB · base de datos "${NOMBRE_BD}"`);

  for (const nombre of ["fichas", "glosario", "temas", "signos", "clasificaciones"]) {
    const ruta = path.join(CARPETA_DATOS, `${nombre}.json`);
    if (!fs.existsSync(ruta)) {
      console.log(`  – ${nombre}: sin archivo, se omite`);
      continue;
    }
    let documentos = JSON.parse(fs.readFileSync(ruta, "utf8"));

    // El catálogo de fichas puede venir repartido en dos archivos
    if (nombre === "fichas") {
      const rutaExtra = path.join(CARPETA_DATOS, "fichas-nuevas.json");
      if (fs.existsSync(rutaExtra)) {
        const extra = JSON.parse(fs.readFileSync(rutaExtra, "utf8"));
        const yaEstan = new Set(documentos.map((f) => f.codigo));
        documentos = documentos.concat(extra.filter((f) => !yaEstan.has(f.codigo)));
      }
    }

    const coleccion = bd.collection(nombre);
    await coleccion.deleteMany({});
    await coleccion.insertMany(documentos);
    console.log(`  ✔ ${nombre}: ${documentos.length} documentos cargados`);
  }

  await bd.collection("fichas").createIndex(
    { titulo: "text", descripcion: "text", hallazgos: "text", perlas: "text", etiquetas: "text" },
    { default_language: "spanish", name: "busqueda_texto" }
  );
  await bd.collection("fichas").createIndex({ sistema: 1, modalidad: 1 });
  await bd.collection("fichas").createIndex({ codigo: 1 }, { unique: true });
  console.log("  ✔ Índices creados");

  await cliente.close();
  console.log("Listo.");
}

main().catch((err) => {
  console.error("Error al cargar la base de datos:", err.message);
  process.exit(1);
});
