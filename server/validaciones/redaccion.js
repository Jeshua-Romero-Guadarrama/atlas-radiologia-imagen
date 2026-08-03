/*
 * Reglas de redacción del contenido, comunes a todas las colecciones.
 * Comprueban los signos prohibidos, las direcciones web, los emoji, la coma decimal y la forma de los códigos.
 */

const { fallo } = require("./reporte");

/*
 * Los guiones prohibidos se construyen a partir de su número de carácter en lugar de escribirlos.
 * De ese modo el propio validador no contiene ninguno de los signos que rechaza, con lo cual se puede buscar el guion largo en todo el proyecto sin que este archivo aparezca como falso positivo.
 */
const GUIONES = new RegExp("[" + String.fromCharCode(8212, 8211, 8722) + "]");
const DIRECCION_WEB = /https?:\/\/|www\./i;
const EMOJI = /\p{Extended_Pictographic}/u;
const COMA_DECIMAL = /\d,\d/;

/*
 * Los códigos acaban en direcciones de página y en nombres de archivo, contextos donde un acento o una mayúscula rompe el enlace en cuanto un sistema los normaliza distinto que otro.
 */
const CODIGO = /^[a-z0-9-]+$/;

const revisarCodigo = (codigo, etiqueta) => {
  if (codigo && !CODIGO.test(codigo)) fallo(`${etiqueta}: el código "${codigo}" tiene caracteres fuera de minúsculas, dígitos y guiones. Los códigos viajan en direcciones de página y en manifiestos, de modo que conviene reescribirlo sin acentos, sin espacios y sin mayúsculas.`);
};

/*
 * Recorre todo el texto de un documento, entre en el nivel que entre, y le aplica las reglas de redacción del proyecto.
 * La comprobación es recursiva porque las fichas anidan listas y objetos, de manera que buscar solo en el primer nivel dejaría fuera el diagnóstico diferencial y los apartados por modalidad.
 */
function revisarTexto(doc, etiqueta) {
  const visitar = (valor, ruta) => {
    if (typeof valor === "string") {
      /*
       * Los campos codigo e imagen guardan identificadores y rutas de archivo, no prosa.
       * En consecuencia se les perdona la comprobación de direcciones web, puesto que una ruta como img/torax-normal.jpg no es un enlace a ninguna parte.
       */
      const esCampoTecnico = /(^|\.)codigo$/.test(ruta) || /(^|\.)imagen$/.test(ruta);
      if (GUIONES.test(valor)) fallo(`${etiqueta} ${ruta}: usa guion largo o guion corto. Conviene reescribir la frase con un conector, con una coma o con paréntesis.`);
      if (!esCampoTecnico && DIRECCION_WEB.test(valor)) fallo(`${etiqueta} ${ruta}: contiene una dirección web. El atlas debe funcionar sin conexión y los enlaces caducan, motivo por el cual conviene explicar la fuente con palabras en lugar de enlazarla.`);
      if (EMOJI.test(valor)) fallo(`${etiqueta} ${ruta}: contiene un emoji. Los emoji se admiten en el README pero no en el contenido, así que conviene sustituirlo por una palabra.`);
      if (COMA_DECIMAL.test(valor)) fallo(`${etiqueta} ${ruta}: usa coma decimal. La convención del proyecto es el punto, de modo que 1,5 se escribe 1.5.`);
    } else if (Array.isArray(valor)) {
      valor.forEach((elemento, indice) => visitar(elemento, `${ruta}[${indice}]`));
    } else if (valor && typeof valor === "object") {
      Object.entries(valor).forEach(([clave, contenido]) => visitar(contenido, ruta ? `${ruta}.${clave}` : clave));
    }
  };
  visitar(doc, "");
}

module.exports = { revisarCodigo, revisarTexto };
