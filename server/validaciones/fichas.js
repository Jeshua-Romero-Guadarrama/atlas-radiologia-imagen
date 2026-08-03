/*
 * Validación de las fichas del catálogo y de las imágenes que referencian.
 * Se aceptan varios archivos que empiecen por "fichas" porque el contenido nuevo se prepara aparte, razón por la cual durante una tanda de trabajo puede haber más de un lote sin fusionar.
 */

const fs = require("fs");
const path = require("path");
const { RAIZ, DATOS, fallo, aviso, leer } = require("./reporte");
const { revisarCodigo, revisarTexto } = require("./redaccion");
const { SISTEMAS_FICHA, MODALIDADES_FICHA, DIFICULTADES } = require("../colecciones");

const CAMPOS_FICHA = ["codigo", "titulo", "sistema", "modalidad", "region", "dificultad",
                      "esNormal", "descripcion", "tecnica", "observar", "hallazgos", "perlas",
                      "diferencial", "simuladores", "porModalidad", "protocolo", "clasificacion",
                      "errores", "imagen", "credito", "etiquetas"];

// Nombres de archivo de las imágenes que alguna ficha referencia, para descubrir al final las que se publican sin que nadie las use.
const imagenesReferenciadas = new Set();

function validarFichas() {
  const archivos = fs.readdirSync(DATOS).filter((archivo) => /^fichas.*\.json$/.test(archivo)).sort();
  if (!archivos.length) {
    return fallo("No hay ningún archivo de fichas en data. El catálogo se lee de data/fichas.json, así que sin ese archivo la aplicación arranca vacía y conviene recuperarlo del historial.");
  }

  const codigos = new Map();
  // Los códigos de los temas se cargan aparte porque el botón de tema relacionado de una ficha se queda sin destino cuando apunta a un tema inexistente.
  const codigosDeTemas = new Set((leer("temas.json") || []).map((tema) => tema.codigo));
  let totalFichas = 0;
  let conImagen = 0;

  for (const archivo of archivos) {
    const lote = leer(archivo);
    if (!Array.isArray(lote)) {
      fallo(`${archivo} no contiene un arreglo. Todo archivo de fichas empieza con [ y termina con ], de modo que conviene envolver el contenido entre corchetes.`);
      continue;
    }

    lote.forEach((ficha, indice) => {
      totalFichas++;
      const etiqueta = `${archivo}[${indice}] ${ficha.codigo || "sin código"}`;

      for (const campo of CAMPOS_FICHA) {
        if (!(campo in ficha)) fallo(`${etiqueta}: le falta el campo ${campo}. Todas las fichas comparten la misma forma para que la aplicación pinte los mismos apartados, así que conviene copiar ese campo de otra ficha y rellenarlo.`);
      }
      const sobrantes = Object.keys(ficha).filter((campo) => !CAMPOS_FICHA.includes(campo) && campo !== "temaRelacionado");
      if (sobrantes.length) aviso(`${etiqueta}: tiene campos no previstos (${sobrantes.join(", ")}). La aplicación no los pinta, de manera que conviene retirarlos o darles su sitio en la plantilla.`);

      if (codigos.has(ficha.codigo)) fallo(`${etiqueta}: el código se repite, puesto que ya está en ${codigos.get(ficha.codigo)}. El código identifica la ficha en la base y en los manifiestos de imágenes, así que conviene añadirle un sufijo que lo distinga.`);
      else codigos.set(ficha.codigo, archivo);
      revisarCodigo(ficha.codigo, etiqueta);

      if (ficha.temaRelacionado && !codigosDeTemas.has(ficha.temaRelacionado)) fallo(`${etiqueta}: el temaRelacionado "${ficha.temaRelacionado}" no existe en data/temas.json. El botón de tema relacionado no abriría nada, de modo que conviene apuntar a un código real o retirar el campo.`);

      if (!SISTEMAS_FICHA.includes(ficha.sistema)) fallo(`${etiqueta}: el sistema "${ficha.sistema}" no está reconocido. Los admitidos son ${SISTEMAS_FICHA.join(", ")}, y el filtro del catálogo se construye con esa lista.`);
      if (!MODALIDADES_FICHA.includes(ficha.modalidad)) fallo(`${etiqueta}: la modalidad "${ficha.modalidad}" no está reconocida. Las admitidas son ${MODALIDADES_FICHA.join(", ")}.`);
      if (!DIFICULTADES.includes(ficha.dificultad)) fallo(`${etiqueta}: la dificultad "${ficha.dificultad}" no está reconocida. Las admitidas son ${DIFICULTADES.join(", ")}.`);
      if (typeof ficha.esNormal !== "boolean") fallo(`${etiqueta}: el campo esNormal debe valer true o false sin comillas, dado que la aplicación lo usa para separar el estudio normal del patológico.`);
      if (!Array.isArray(ficha.observar) || ficha.observar.length < 3) fallo(`${etiqueta}: el campo observar necesita al menos tres puntos. Es el apartado que enseña a mirar la imagen, motivo por el cual con menos de tres queda demasiado pobre para estudiar.`);
      if (!Array.isArray(ficha.diferencial)) fallo(`${etiqueta}: el campo diferencial debe ser una lista, aunque solo tenga un elemento.`);
      else ficha.diferencial.forEach((entrada, posicion) => {
        if (!entrada || !entrada.entidad || !entrada.comoDistinguir) fallo(`${etiqueta}: el diferencial ${posicion} está incompleto. Cada entrada lleva la entidad con la que se confunde y el dato que las separa, dado que nombrarla sin explicar cómo distinguirla no enseña nada.`);
      });

      if (ficha.imagen) {
        conImagen++;
        imagenesReferenciadas.add(path.basename(ficha.imagen));
        if (!fs.existsSync(path.join(RAIZ, ficha.imagen))) fallo(`${etiqueta}: la imagen ${ficha.imagen} no está en el disco. Conviene copiar el archivo a la carpeta img o corregir la ruta, que se escribe siempre relativa a la raíz del proyecto.`);
        if (!ficha.credito) fallo(`${etiqueta}: tiene imagen pero no tiene crédito. Las licencias libres obligan a nombrar al autor, así que conviene rellenar el crédito con autor, licencia y origen.`);
      } else if (ficha.credito) {
        aviso(`${etiqueta}: tiene crédito pero no tiene imagen. Probablemente la imagen se quitó y quedó el crédito huérfano, de modo que conviene retirarlo.`);
      }

      revisarTexto(ficha, etiqueta);
    });
  }

  console.log(`Fichas: ${totalFichas} en ${archivos.length} archivo(s), ${conImagen} con imagen, ${totalFichas - conImagen} sin imagen`);
}

/*
 * Avisa de cada imagen de la carpeta img que ninguna ficha referencia.
 * Es aviso y no error porque una imagen suelta no rompe nada, sin embargo se publica ocupando espacio y suele delatar una ficha que perdió su referencia.
 */
function avisarImagenesSinFicha() {
  const carpeta = path.join(RAIZ, "img");
  if (!fs.existsSync(carpeta)) return;
  fs.readdirSync(carpeta)
    .filter((archivo) => /\.(jpe?g|png|svg|gif|webp)$/i.test(archivo))
    .forEach((archivo) => {
      if (!imagenesReferenciadas.has(archivo)) aviso(`img/${archivo}: ninguna ficha la referencia. Conviene asignarla a la ficha que la esperaba o retirarla del repositorio.`);
    });
}

module.exports = { validarFichas, avisarImagenesSinFicha };
