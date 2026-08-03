/*
 * Carga manual de la base de datos del Atlas de Radiología e Imagen.
 * Vuelca el contenido de los archivos de la carpeta data dentro de MongoDB y deja creados los índices de consulta.
 * El servidor ya siembra la base por su cuenta al arrancar, sin embargo esta herramienta resulta útil para rehacerla sin reiniciar el proceso o para prepararla antes de levantar la aplicación.
 * Se ejecuta con npm run seed desde la carpeta server.
 */

const path = require("path");
const fs = require("fs");
const { MongoClient } = require("mongodb");

const URI_MONGO = process.env.MONGO_URI || "mongodb://localhost:27017";
const NOMBRE_BASE_DE_DATOS = process.env.MONGO_DB || "atlas_radiologia_imagen";
const CARPETA_DATOS = path.join(__dirname, "..", "data");

const COLECCIONES = ["fichas", "glosario", "temas", "signos", "clasificaciones"];

async function main() {
  const cliente = new MongoClient(URI_MONGO, { serverSelectionTimeoutMS: 10000 });
  await cliente.connect();
  const baseDeDatos = cliente.db(NOMBRE_BASE_DE_DATOS);
  console.log(`Conectado a MongoDB, base de datos "${NOMBRE_BASE_DE_DATOS}"`);

  for (const nombre of COLECCIONES) {
    const ruta = path.join(CARPETA_DATOS, `${nombre}.json`);
    /*
     * La falta de un archivo no se considera un error, puesto que las colecciones se van añadiendo conforme se escribe el contenido.
     * De ese modo la carga funciona igual en un repositorio recién clonado que en uno con el atlas completo.
     */
    if (!fs.existsSync(ruta)) {
      console.log(`  La colección ${nombre} se omite porque data/${nombre}.json todavía no existe.`);
      continue;
    }
    const documentos = JSON.parse(fs.readFileSync(ruta, "utf8"));

    /*
     * La colección se vacía antes de insertar en lugar de actualizar documento por documento.
     * La razón es que el archivo es la única fuente de verdad, motivo por el cual todo lo que quedara en la base y ya no esté en el archivo debe desaparecer.
     */
    const coleccion = baseDeDatos.collection(nombre);
    await coleccion.deleteMany({});
    await coleccion.insertMany(documentos);
    console.log(`  Colección ${nombre}: ${documentos.length} documentos cargados`);
  }

  /*
   * El índice de texto se declara en español para que MongoDB reconozca las palabras vacías y las raíces del idioma.
   * A ello se suman un índice compuesto por sistema y modalidad, que son los dos filtros del catálogo, y un índice único sobre el código, que impide que dos fichas compartan identificador.
   */
  await baseDeDatos.collection("fichas").createIndex(
    { titulo: "text", descripcion: "text", hallazgos: "text", perlas: "text", etiquetas: "text" },
    { default_language: "spanish", name: "busqueda_texto" }
  );
  await baseDeDatos.collection("fichas").createIndex({ sistema: 1, modalidad: 1 });
  await baseDeDatos.collection("fichas").createIndex({ codigo: 1 }, { unique: true });
  console.log("  Índices creados");

  await cliente.close();
  console.log("Carga terminada.");
}

main().catch((error) => {
  console.error(`No se pudo cargar la base de datos. ${error.message}`);
  console.error("La causa habitual es que MongoDB no esté escuchando en la dirección indicada, o que alguno de los archivos de data no sea JSON válido.");
  console.error("Conviene comprobar que la base responde con docker compose up -d mongo, revisar la variable MONGO_URI y validar el contenido con npm run validar.");
  process.exit(1);
});
