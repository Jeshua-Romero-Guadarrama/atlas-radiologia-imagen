/*
 * Colector de los hallazgos del validador y lectura de los archivos de datos.
 * Los errores impiden publicar, en cambio los avisos solo señalan algo que conviene mirar.
 * La distinción importa porque el contenido crece a lotes, situación en la que una irregularidad menor no debería frenar la incorporación de material correcto.
 */

const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..", "..");
const DATOS = path.join(RAIZ, "data");

const errores = [];
const avisos = [];
const fallo = (mensaje) => errores.push(mensaje);
const aviso = (mensaje) => avisos.push(mensaje);

function leer(archivo) {
  const ruta = path.join(DATOS, archivo);
  if (!fs.existsSync(ruta)) return null;
  try {
    /*
     * La marca de orden de bytes se retira antes de interpretar el archivo.
     * La razón es que algunos editores de Windows la escriben al guardar y JSON.parse la rechaza, con lo que un archivo correcto parecería roto.
     */
    return JSON.parse(fs.readFileSync(ruta, "utf8").replace(/^﻿/, ""));
  } catch (error) {
    fallo(`${archivo} no se puede interpretar como JSON. ${error.message} Conviene abrirlo en un editor con resaltado de JSON y revisar la posición indicada, donde casi siempre falta una coma o sobra la última.`);
    return null;
  }
}

/*
 * Imprime el resumen final y devuelve el código de salida del proceso.
 * Del listado se imprimen solo los primeros mensajes de cada tipo, porque un descuido repetido en un lote entero genera cientos de líneas iguales, con lo cual la consola dejaría de ser legible justo cuando más falta hace.
 */
function resumen() {
  console.log("");
  if (avisos.length) {
    console.log(`Avisos (${avisos.length}):`);
    avisos.slice(0, 25).forEach((textoAviso) => console.log(`  ${textoAviso}`));
    if (avisos.length > 25) console.log(`  y ${avisos.length - 25} avisos más`);
    console.log("");
  }
  if (errores.length) {
    console.log(`Errores (${errores.length}):`);
    errores.slice(0, 40).forEach((textoError) => console.log(`  ${textoError}`));
    if (errores.length > 40) console.log(`  y ${errores.length - 40} errores más`);
    console.log("\nEl contenido no está listo para publicar. Conviene corregir los errores de la lista y volver a pasar esta comprobación hasta que termine sin ninguno.");
    return 1;
  }
  console.log("Todo correcto.");
  return 0;
}

module.exports = { RAIZ, DATOS, fallo, aviso, leer, resumen };
