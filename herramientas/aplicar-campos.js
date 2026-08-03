/*
 * Añade campos a documentos que ya existen en una colección.
 * Se usa cuando una tanda de trabajo clasifica contenido publicado, por ejemplo al asignar sistema, modalidad y tipo para que todas las secciones ofrezcan los mismos filtros.
 * El archivo de entrada es un arreglo de objetos que identifican el documento por su código, o por su término en el caso del glosario, y traen junto a él los campos que hay que añadir.
 * Se rechaza la operación entera si el archivo no cubre todos los documentos de la colección, puesto que dejar la mitad con un campo y la mitad sin él rompería la uniformidad que la aplicación espera.
 * Se ejecuta con node herramientas/aplicar-campos.js <coleccion> <campos.json> y, mientras no se añada --aplicar, solo informa de lo que haría.
 */
const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const DATOS = path.join(RAIZ, "data");

const argumentos = process.argv.slice(2);
const APLICAR = argumentos.includes("--aplicar");
const restantes = argumentos.filter((argumento) => argumento !== "--aplicar");
const [coleccion, archivoCampos] = restantes;

if (!coleccion || !archivoCampos) {
  console.error("Faltan argumentos, puesto que hacen falta la colección y el archivo de campos.");
  console.error("Uso: node herramientas/aplicar-campos.js <coleccion> <campos.json> [--aplicar]");
  process.exit(1);
}

const destino = path.join(DATOS, `${coleccion}.json`);
if (!fs.existsSync(destino)) {
  console.error(`No existe data/${coleccion}.json, de modo que no hay nada que completar.`);
  process.exit(1);
}

const leer = (ruta) => JSON.parse(fs.readFileSync(ruta, "utf8").replace(/^﻿/, ""));

const documentos = leer(destino);
const campos = leer(archivoCampos);

const identificadorDe = (doc) => doc.codigo || doc.termino;
const porIdentificador = new Map(campos.map((entrada) => [identificadorDe(entrada), entrada]));

const sinAsignar = documentos.filter((doc) => !porIdentificador.has(identificadorDe(doc)));
const sobrantes = campos.filter((entrada) => !documentos.some((doc) => identificadorDe(doc) === identificadorDe(entrada)));

console.log(`${coleccion}: ${documentos.length} documentos, ${campos.length} entradas de campos`);
console.log(`  sin asignar: ${sinAsignar.length}   sobrantes en el archivo: ${sobrantes.length}`);

if (sinAsignar.length) {
  console.log("\nNo se aplica nada, porque quedarían documentos sin los campos nuevos.");
  console.log("La aplicación construye cada filtro recorriendo la colección entera, motivo por el cual un campo presente solo en una parte produciría un filtro que esconde documentos sin avisar.");
  console.log(`Faltan por clasificar, entre otros: ${sinAsignar.slice(0, 8).map(identificadorDe).join(", ")}`);
  process.exit(1);
}

/* Los campos nuevos se colocan detrás de los que identifican el documento, con el fin de que el archivo siga leyéndose de lo general a lo particular. */
const CLAVES_NUEVAS = ["sistema", "modalidad", "tipo"];
const resultado = documentos.map((doc) => {
  const entrada = porIdentificador.get(identificadorDe(doc));
  const completo = {};
  Object.entries(doc).forEach(([clave, valor]) => {
    completo[clave] = valor;
    if (clave === "nombre" || clave === "titulo" || clave === "termino") {
      CLAVES_NUEVAS.forEach((nueva) => {
        if (entrada[nueva] !== undefined && doc[nueva] === undefined) completo[nueva] = entrada[nueva];
      });
    }
  });
  CLAVES_NUEVAS.forEach((nueva) => {
    if (entrada[nueva] !== undefined && completo[nueva] === undefined) completo[nueva] = entrada[nueva];
  });
  return completo;
});

const resumen = {};
CLAVES_NUEVAS.forEach((clave) => {
  const valores = {};
  resultado.forEach((doc) => { if (doc[clave] !== undefined) valores[doc[clave]] = (valores[doc[clave]] || 0) + 1; });
  if (Object.keys(valores).length) resumen[clave] = valores;
});
console.log("\nReparto de los campos:");
Object.entries(resumen).forEach(([clave, valores]) => {
  console.log(`  ${clave}: ${Object.entries(valores).sort((a, b) => b[1] - a[1]).map(([v, n]) => `${v} ${n}`).join(", ")}`);
});

if (!APLICAR) {
  console.log("\nNo se escribió nada, puesto que esto ha sido una simulación.");
  console.log("Conviene repasar el reparto de arriba y, si convence, repetir la orden añadiendo --aplicar al final.");
  process.exit(0);
}

fs.writeFileSync(destino, JSON.stringify(resultado, null, 2) + "\n");
console.log(`\nSe escribió data/${coleccion}.json. Conviene pasar ahora npm run validar.`);
