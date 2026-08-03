/*
 * Incorpora al catálogo las imágenes que dejaron preparadas las búsquedas.
 * Un manifiesto es un arreglo de entradas con la forma { "codigo": "...", "imagen": "img/archivo.jpg", "credito": "Autor · Licencia · Origen" }.
 * Existe esta herramienta porque varias búsquedas de imágenes pueden correr a la vez, y si cada una escribiera directamente sobre data/fichas.json se pisarían entre ellas y se perdería trabajo.
 * En consecuencia cada búsqueda deja su manifiesto aparte y aquí se vuelcan todos de una sola pasada.
 * Nunca se sobrescribe una imagen ya asignada ni se acepta una que no esté en el disco, de modo que repetir la orden no estropea lo que ya estaba bien.
 * Se ejecuta con node herramientas/aplicar-imagenes.js <manifiesto.json> [...] y, mientras no se añada --aplicar, solo informa de lo que haría.
 */

const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const CATALOGO = path.join(RAIZ, "data", "fichas.json");

const argumentos = process.argv.slice(2);
const APLICAR = argumentos.includes("--aplicar");
const manifiestos = argumentos.filter((argumento) => argumento !== "--aplicar");

if (!manifiestos.length) {
  console.error("No se indicó ningún manifiesto, así que no hay nada que incorporar.");
  console.error("Uso: node herramientas/aplicar-imagenes.js <manifiesto.json> [...] [--aplicar]");
  console.error("Los manifiestos los escriben las búsquedas de imágenes en su carpeta de trabajo, con el nombre manifiesto.json.");
  process.exit(1);
}

const fichas = JSON.parse(fs.readFileSync(CATALOGO, "utf8").replace(/^﻿/, ""));
const porCodigo = new Map(fichas.map((ficha) => [ficha.codigo, ficha]));

let aplicadas = 0;
let yaTenian = 0;
let sinFicha = 0;
let sinArchivo = 0;

for (const ruta of manifiestos) {
  if (!fs.existsSync(ruta)) {
    console.log(`  El manifiesto ${ruta} no existe y se omite. Conviene comprobar la ruta, que se escribe tal como la dejó la búsqueda.`);
    continue;
  }

  const entradas = JSON.parse(fs.readFileSync(ruta, "utf8").replace(/^﻿/, ""));
  let deEsteManifiesto = 0;

  for (const entrada of entradas) {
    const ficha = porCodigo.get(entrada.codigo);
    if (!ficha) {
      console.log(`  No hay ninguna ficha con el código ${entrada.codigo}, de modo que la entrada se descarta. Conviene revisar si el código cambió al fusionar el lote.`);
      sinFicha++;
      continue;
    }
    /*
     * Una ficha que ya tiene imagen se deja como está.
     * La imagen asignada pasó por una revisión a mano, razón por la que no conviene reemplazarla por una candidata nueva sin haberla mirado.
     */
    if (ficha.imagen) { yaTenian++; continue; }
    if (!fs.existsSync(path.join(RAIZ, entrada.imagen))) {
      console.log(`  El archivo ${entrada.imagen} no está en el disco, así que la entrada se descarta. Conviene copiar la imagen a la carpeta img antes de volver a intentarlo.`);
      sinArchivo++;
      continue;
    }
    /*
     * Sin crédito la imagen no entra, sin excepción.
     * Las licencias libres con las que se trabaja obligan a nombrar al autor, de manera que una imagen sin crédito no se puede publicar aunque sea la ilustración perfecta.
     */
    if (!entrada.credito) {
      console.log(`  La entrada ${entrada.codigo} no trae crédito y se descarta. El crédito se escribe como autor, licencia y origen, y la búsqueda lo deja preparado en el manifiesto.`);
      continue;
    }

    ficha.imagen = entrada.imagen;
    ficha.credito = entrada.credito;
    aplicadas++;
    deEsteManifiesto++;
  }
  console.log(`  ${path.basename(ruta).padEnd(28)} ${entradas.length} entradas, ${deEsteManifiesto} aplicadas`);
}

const conImagen = fichas.filter((ficha) => ficha.imagen).length;
console.log(`\nAplicadas: ${aplicadas}`);
console.log(`Descartadas: ${yaTenian} ya tenían imagen, ${sinFicha} sin ficha, ${sinArchivo} sin archivo en disco`);
console.log(`Catálogo: ${conImagen} de ${fichas.length} fichas con imagen`);

if (!APLICAR) {
  console.log("\nNo se escribió nada, puesto que esto ha sido una simulación.");
  console.log("Conviene repasar el resumen de arriba y, si convence, repetir la orden añadiendo --aplicar al final.");
  process.exit(0);
}

fs.writeFileSync(CATALOGO, JSON.stringify(fichas, null, 2) + "\n");
console.log("\nSe escribió data/fichas.json. Conviene pasar ahora npm run validar, que comprueba que todas las imágenes referenciadas existen y que ninguna se quedó sin crédito.");
