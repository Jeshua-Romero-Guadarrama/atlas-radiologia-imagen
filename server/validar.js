/*
 * Validador del contenido del Atlas de Radiología e Imagen.
 * Comprueba que los archivos JSON se pueden leer, que las fichas traen todos los campos que les tocan, que los códigos y las referencias entre colecciones son coherentes, que las imágenes referenciadas existen en el disco, que todas las fórmulas de las calculadoras se ejecutan sin romperse, que el texto respeta las convenciones de redacción del proyecto y que las páginas estáticas están al día.
 * Cada bloque de comprobaciones vive en su archivo de la carpeta validaciones, así que aquí solo queda el orden en que se ejecutan.
 * Termina con código de salida 1 cuando encuentra errores, motivo por el cual sirve como comprobación antes de publicar (los avisos se imprimen pero no detienen nada).
 * Se ejecuta con npm run validar desde la carpeta server, o con node server/validar.js desde la raíz.
 */

const { resumen } = require("./validaciones/reporte");
const { validarFichas, avisarImagenesSinFicha } = require("./validaciones/fichas");
const { validarCalculadoras } = require("./validaciones/calculadoras");
const { validarColeccion } = require("./validaciones/documentos");
const { validarPaginas } = require("./validaciones/paginas");

console.log("Revisando el contenido del atlas\n");
validarFichas();
validarCalculadoras();
validarColeccion("signos.json", "Signos");
validarColeccion("clasificaciones.json", "Clasificaciones");
validarColeccion("glosario.json", "Glosario");
validarColeccion("temas.json", "Temas");
avisarImagenesSinFicha();
validarPaginas();

process.exit(resumen());
