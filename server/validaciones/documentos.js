/*
 * Validación de las colecciones de texto, es decir, los signos, las clasificaciones, el glosario y los temas.
 * Estas colecciones no tienen una plantilla fija como las fichas, motivo por el cual aquí se comprueba sobre todo que los documentos se parezcan entre sí y que su texto respete la redacción del proyecto.
 */

const { fallo, aviso, leer } = require("./reporte");
const { revisarCodigo, revisarTexto } = require("./redaccion");

function validarColeccion(archivo, nombre) {
  const lista = leer(archivo);
  if (!Array.isArray(lista)) return;

  const esquemas = new Set();
  const codigos = new Set();
  lista.forEach((doc, indice) => {
    const etiqueta = `${nombre}[${indice}] ${doc.codigo || doc.termino || doc.nombre || ""}`;
    esquemas.add(JSON.stringify(Object.keys(doc).sort()));
    if (doc.codigo) {
      if (codigos.has(doc.codigo)) fallo(`${etiqueta}: el código se repite. Conviene añadirle un sufijo que lo distinga, dado que la aplicación lo usa para abrir la ficha correcta.`);
      codigos.add(doc.codigo);
      revisarCodigo(doc.codigo, etiqueta);
    }
    revisarTexto(doc, etiqueta);
  });

  if (esquemas.size > 1) {
    aviso(`${nombre}: conviven ${esquemas.size} formas distintas de documento. La aplicación pinta los apartados que encuentra, de modo que los documentos con campos de menos se ven más pobres que el resto y conviene igualarlos.`);
  }
  console.log(`${nombre}: ${lista.length}`);
}

module.exports = { validarColeccion };
