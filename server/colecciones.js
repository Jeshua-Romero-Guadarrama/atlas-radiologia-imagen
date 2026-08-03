/*
 * Declaración de las colecciones y de los catálogos del contenido.
 * Es un módulo sin dependencias, para que el validador pueda usarlo sin tener instalado el controlador de MongoDB.
 * El cliente declara las mismas listas de sistemas y de modalidades en js/nucleo/Catalogos.js y una prueba comprueba que coinciden, porque las dos copias ya divergieron una vez y el fallo solo se notaba al validar contenido nuevo.
 */

/*
 * Colecciones que puede llegar a tener la aplicación.
 * Las que todavía no tengan archivo se cargan como lista vacía, con el fin de que el servidor arranque igual mientras se va añadiendo contenido.
 */
const COLECCIONES = ["fichas", "glosario", "temas", "signos", "clasificaciones", "calculadoras"];

/*
 * Sistemas del cuerpo en su orden de presentación, que va de los que más contenido tienen a los que menos.
 * "General" es un cajón para el contenido que no pertenece a ningún aparato, así que se queda al final.
 */
const SISTEMAS = ["Óseo", "Respiratorio", "Nervioso", "Digestivo", "Cardiovascular",
                  "Urinario", "Reproductor", "Cabeza y cuello", "Mama", "Endocrino", "General"];

// Modalidades de imagen, con "Varias" para el contenido que abarca más de una.
const MODALIDADES = ["RX", "TC", "RM", "US", "Varias"];

/*
 * Una ficha del catálogo siempre retrata un estudio concreto, de modo que ni el cajón "General" ni la etiqueta "Varias" tienen sentido en ella.
 * Las listas de las fichas se derivan de las completas en lugar de escribirse aparte, para que un sistema nuevo entre por un solo sitio.
 */
const SISTEMAS_FICHA = SISTEMAS.filter((s) => s !== "General");
const MODALIDADES_FICHA = MODALIDADES.filter((m) => m !== "Varias");

const DIFICULTADES = ["Básico", "Intermedio", "Avanzado"];

/*
 * Campos en los que busca la API de cada colección.
 * Cada colección nombra sus apartados de otro modo, motivo por el cual la lista se declara aquí y no se deduce.
 */
const CAMPOS_BUSQUEDA = {
  fichas: ["titulo", "sistema", "modalidad", "region", "descripcion", "tecnica",
           "hallazgos", "perlas", "observar", "etiquetas"],
  glosario: ["termino", "definicion", "categoria"],
  temas: ["titulo", "sistema", "resumen", "secciones", "puntosClave"],
  signos: ["nombre", "sistema", "modalidad", "queEs", "porQueOcurre", "significado",
           "diferencial", "comoRecordarlo", "etiquetas"],
  clasificaciones: ["nombre", "sistema", "modalidad", "paraQue", "grados", "comoUsarla",
                    "limitaciones", "etiquetas"],
  calculadoras: ["nombre", "categoria", "modalidad", "descripcion", "formulaTexto", "notas"],
};

module.exports = { COLECCIONES, SISTEMAS, MODALIDADES, SISTEMAS_FICHA, MODALIDADES_FICHA, DIFICULTADES, CAMPOS_BUSQUEDA };
