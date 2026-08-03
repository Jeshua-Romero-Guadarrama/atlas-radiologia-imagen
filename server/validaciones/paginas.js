/*
 * Validación de las páginas estáticas de posicionamiento.
 * Cada documento debe tener su página y el h1, lo único que se lee por ser barato, debe coincidir con el título del dato.
 */

const fs = require("fs");
const path = require("path");
const { RAIZ, fallo } = require("./reporte");

// Misma conversión mínima que aplican las plantillas, para comparar el h1 publicado con el título del dato.
const aHtml = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/\*([^*\n]+)\*/g, "<em>$1</em>");

function validarPaginas() {
  for (const col of JSON.parse(fs.readFileSync(path.join(RAIZ, "seo.json"), "utf8")).colecciones) {
    if (!fs.existsSync(path.join(RAIZ, col.ruta, "index.html"))) fallo(`${col.ruta}/index.html no existe: falta regenerar con npm run seo`);
    for (const doc of JSON.parse(fs.readFileSync(path.join(RAIZ, "data", `${col.archivo}.json`), "utf8"))) {
      const rutaPagina = path.join(RAIZ, col.ruta, `${doc.codigo}.html`);
      if (typeof doc[col.titulo] !== "string" || !fs.existsSync(rutaPagina)) {
        fallo(`${col.ruta}/${doc.codigo}.html: falta la página o el campo de título "${col.titulo}" del dato; regenerar con npm run seo`);
        continue;
      }
      if (aHtml(doc[col.titulo]) !== (/<h1>(.*?)<\/h1>/.exec(fs.readFileSync(rutaPagina, "utf8")) || [])[1]) {
        fallo(`${col.ruta}/${doc.codigo}.html: el <h1> no coincide con el título del dato`);
      }
    }
  }
}

module.exports = { validarPaginas };
