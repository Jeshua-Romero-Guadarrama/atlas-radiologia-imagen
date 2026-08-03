/*
 * Soporte compartido de las pruebas.
 * Reúne el contador de comprobaciones y la carga de los módulos del navegador, para que cada suite declare solo sus casos.
 * Los valores esperados de todas las suites se escriben a mano razonando cada regla, nunca copiando lo que imprime el motor.
 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const RAIZ = path.join(__dirname, "..");

/* ---------- Contador de comprobaciones ---------- */

const suites = [];
let actual = null;

// Abre una suite con nombre propio, porque el resumen final se lee por bloques.
function suite(nombre) {
  actual = { nombre, total: 0, fallos: [] };
  suites.push(actual);
}

/*
 * Comprobación de igualdad estructural, que cubre números exactos, textos y arreglos.
 * Los valores se copian antes a estructuras planas, porque deepStrictEqual distingue los prototipos y marcaría como distinto lo que es igual.
 */
function aplanar(valor) {
  return valor === undefined ? undefined : JSON.parse(JSON.stringify(valor));
}

function comprobar(nombre, obtenido, esperado) {
  actual.total++;
  try {
    assert.deepStrictEqual(aplanar(obtenido), aplanar(esperado));
  } catch {
    actual.fallos.push({ nombre, obtenido, esperado });
  }
}

/*
 * Comparación con tolerancia para los cálculos con punto flotante.
 * Las posiciones de la escala visual salen de divisiones encadenadas, de modo que exigir igualdad exacta convertiría el ruido del último bit en un falso fallo.
 */
function casi(nombre, obtenido, esperado, tolerancia = 0.000001) {
  actual.total++;
  const bien = typeof obtenido === "number" && Math.abs(obtenido - esperado) <= tolerancia;
  if (!bien) actual.fallos.push({ nombre, obtenido, esperado });
}

// Imprime el resumen y devuelve el código de salida del proceso.
function terminar() {
  let totales = 0;
  let fallidos = 0;
  console.log("");
  suites.forEach((s) => {
    totales += s.total;
    fallidos += s.fallos.length;
    const marca = s.fallos.length ? "FALLA" : "pasa";
    console.log(`  ${marca}  ${s.nombre}: ${s.total - s.fallos.length} de ${s.total}`);
    s.fallos.forEach((f) => {
      console.log(`         ${f.nombre}`);
      console.log(`           esperado: ${JSON.stringify(f.esperado)}`);
      console.log(`           obtenido: ${JSON.stringify(f.obtenido)}`);
    });
  });
  console.log(`\n  Total: ${totales - fallidos} de ${totales} comprobaciones\n`);
  return fallidos ? 1 : 0;
}

/* ---------- Carga de los módulos del navegador ---------- */

// Importa un módulo ES del cliente por su ruta relativa a la raíz del proyecto, porque las pruebas son CommonJS y los módulos del navegador solo se cargan con import dinámico.
function importar(relativa) {
  return import(pathToFileURL(path.join(RAIZ, relativa)).href);
}

/*
 * Reúne en un solo objeto las piezas con lógica pura que interesa probar.
 * Solo se cargan módulos que no tocan el documento al importarse, de modo que las pruebas corren en Node sin simular un navegador.
 */
async function montarNavegador() {
  const [texto, paginador, escala, rango, resolutor, glosario, catalogos] = await Promise.all([
    importar("js/nucleo/Texto.js"),
    importar("js/nucleo/Paginador.js"),
    importar("js/calculadoras/EscalaDeReferencia.js"),
    importar("js/calculadoras/RangoDeCampo.js"),
    importar("js/calculadoras/ResolutorDeCalculadora.js"),
    importar("js/secciones/SeccionGlosario.js"),
    importar("js/nucleo/Catalogos.js"),
  ]);
  return {
    normalizar: texto.normalizar,
    Paginador: paginador.Paginador,
    EscalaDeReferencia: escala.EscalaDeReferencia,
    RangoDeCampo: rango.RangoDeCampo,
    ResolutorDeCalculadora: resolutor.ResolutorDeCalculadora,
    SeccionGlosario: glosario.SeccionGlosario,
    ORDEN_SISTEMAS: catalogos.ORDEN_SISTEMAS,
    ORDEN_MODALIDADES: catalogos.ORDEN_MODALIDADES,
  };
}

// Lee una colección de la carpeta data, que es la misma fuente que usa la aplicación.
function leerDatos(nombre) {
  return JSON.parse(fs.readFileSync(path.join(RAIZ, "data", nombre), "utf8"));
}

module.exports = { suite, comprobar, casi, terminar, montarNavegador, leerDatos };
