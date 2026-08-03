/*
 * Incorpora los archivos de preparación a su colección definitiva.
 * El contenido nuevo se redacta en archivos aparte, llamados de preparación, con el fin de que varias tandas de trabajo puedan escribir a la vez sin pisarse dentro del mismo archivo.
 * Esta herramienta los vuelca de una sola pasada, rechaza lo que colisione por código o por nombre y avisa de cada rechazo, de modo que nada entra por duplicado sin que se sepa.
 * El archivo de preparación se borra únicamente cuando se incorporó entero, razón por la cual un lote con rechazos permanece en el disco hasta que se corrige.
 * Se ejecuta con node herramientas/fusionar.js <coleccion> <preparacion.json> [...] y, mientras no se añada --aplicar, solo informa de lo que haría.
 */

const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const DATOS = path.join(RAIZ, "data");

const argumentos = process.argv.slice(2);
const APLICAR = argumentos.includes("--aplicar");
const restantes = argumentos.filter((argumento) => argumento !== "--aplicar");
const coleccion = restantes[0];
const entradas = restantes.slice(1);

if (!coleccion || !entradas.length) {
  console.error("Faltan argumentos, puesto que hacen falta la colección de destino y al menos un archivo de preparación.");
  console.error("Uso: node herramientas/fusionar.js <coleccion> <preparacion.json> [...] [--aplicar]");
  console.error("Ejemplo: node herramientas/fusionar.js signos data/staging-signos.json --aplicar");
  process.exit(1);
}

const destino = path.join(DATOS, `${coleccion}.json`);
if (!fs.existsSync(destino)) {
  console.error(`No existe data/${coleccion}.json, de manera que no hay colección a la que incorporar el lote.`);
  console.error("El nombre de la colección se escribe sin la extensión, y las que existen hoy son fichas, signos, clasificaciones, calculadoras, glosario y temas.");
  process.exit(1);
}

const leer = (ruta) => JSON.parse(fs.readFileSync(ruta, "utf8").replace(/^﻿/, ""));

const actual = leer(destino);

/*
 * La forma que deben tener los documentos nuevos se deduce del primero de la colección, en lugar de escribirla aquí.
 * De ese modo la herramienta sirve igual para todas las colecciones y no hay que tocarla cada vez que una de ellas gana un campo.
 */
const esquemaEsperado = JSON.stringify(Object.keys(actual[0]).sort());

/*
 * Cada colección nombra de otra manera aquello que identifica a un documento y aquello con lo que se le llama.
 * Al respecto, las fichas y los signos llevan código, en cambio el glosario se identifica por el término, motivo por el cual ambos casos se resuelven aquí en un solo sitio.
 */
const identificadorDe = (doc) => doc.codigo || doc.termino;
const rotuloDe = (doc) => doc.nombre || doc.titulo || doc.termino || doc.codigo;

const codigos = new Set(actual.map(identificadorDe).filter(Boolean));
const rotulos = new Set(actual.map((doc) => String(rotuloDe(doc)).toLowerCase()));

let incorporados = 0;
const completos = [];

for (const ruta of entradas) {
  if (!fs.existsSync(ruta)) {
    console.log(`  El archivo ${ruta} no existe y se omite. Conviene comprobar la ruta, que se escribe desde la raíz del proyecto.`);
    continue;
  }

  let lote;
  try {
    lote = leer(ruta);
  } catch (error) {
    console.log(`  ${path.basename(ruta)} no se puede interpretar como JSON, así que se omite entero. ${error.message} Conviene abrirlo en un editor con resaltado de JSON y revisar la posición indicada.`);
    continue;
  }

  const rechazos = [];
  let deEsteArchivo = 0;

  for (const doc of lote) {
    const identificador = identificadorDe(doc);
    const rotuloNormalizado = String(rotuloDe(doc)).toLowerCase();

    /*
     * Se comprueban tres cosas antes de aceptar un documento: Que tenga exactamente los mismos campos que el resto de la colección, que su código no esté ya usado y que su nombre tampoco.
     * La comprobación del nombre importa tanto como la del código, dado que dos tandas distintas pueden describir el mismo signo con códigos diferentes y el duplicado solo se nota al leerlo.
     */
    if (JSON.stringify(Object.keys(doc).sort()) !== esquemaEsperado) {
      rechazos.push(`${identificador}: tiene campos distintos a los del resto de la colección, así que conviene igualarlos copiando la forma de un documento ya publicado`);
      continue;
    }
    if (identificador && codigos.has(identificador)) {
      rechazos.push(`${identificador}: el código ya está en uso, de modo que conviene cambiarlo o descartar el documento por repetido`);
      continue;
    }
    if (rotulos.has(rotuloNormalizado)) {
      rechazos.push(`${identificador}: el nombre ya existe (${rotuloDe(doc)}), razón por la cual conviene comprobar si se trata del mismo contenido escrito dos veces`);
      continue;
    }

    if (identificador) codigos.add(identificador);
    rotulos.add(rotuloNormalizado);
    actual.push(doc);
    incorporados++;
    deEsteArchivo++;
  }

  console.log(`  ${path.basename(ruta).padEnd(34)} ${String(lote.length).padStart(4)} leídos, ${deEsteArchivo} incorporados`);
  rechazos.slice(0, 8).forEach((rechazo) => console.log(`      rechazado ${rechazo}`));
  if (rechazos.length > 8) console.log(`      y ${rechazos.length - 8} rechazos más`);

  if (!rechazos.length) completos.push(ruta);
}

console.log(`\n${coleccion}: ${actual.length} documentos tras incorporar ${incorporados}`);

if (!APLICAR) {
  console.log("\nNo se escribió nada, puesto que esto ha sido una simulación.");
  console.log("Conviene repasar los rechazos de arriba y, si convence, repetir la orden añadiendo --aplicar al final.");
  process.exit(0);
}

fs.writeFileSync(destino, JSON.stringify(actual, null, 2) + "\n");
completos.forEach((ruta) => {
  fs.unlinkSync(ruta);
  console.log(`  Se eliminó ${path.relative(RAIZ, ruta)} porque se incorporó entero`);
});
console.log(`\nSe escribió data/${coleccion}.json. Conviene pasar ahora npm run validar, que revisa la redacción y la estructura de todo lo que acaba de entrar.`);
