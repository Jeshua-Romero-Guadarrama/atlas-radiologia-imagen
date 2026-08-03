/*
 * Validación de las calculadoras ejecutando de verdad sus fórmulas y sus reglas.
 * Una fórmula guardada como texto no falla hasta que alguien la usa, razón por la cual aquí se evalúa cada una antes de publicar y no se espera a que la rompa quien estudia.
 */

const { fallo, leer } = require("./reporte");
const { revisarCodigo, revisarTexto } = require("./redaccion");

/*
 * Toma del ejemplo de una calculadora los valores de sus campos, en el mismo orden en que se declararon.
 * El orden importa porque las fórmulas se evalúan como funciones cuyos parámetros son los identificadores de los campos.
 */
const valoresDelEjemplo = (identificadores, ejemplo) => identificadores.map((id) => ejemplo[id]);

// Revisa una calculadora de fórmula: Identificadores únicos, resultados evaluables y reglas que solo nombren variables existentes.
function validarFormula(calculadora, etiqueta, reglas, contadores) {
  const identificadores = (calculadora.campos || []).map((campo) => campo.id);
  if (new Set(identificadores).size !== identificadores.length) {
    fallo(`${etiqueta}: tiene identificadores de campo repetidos. Cada identificador se convierte en una variable de la fórmula, así que dos campos con el mismo nombre hacen que uno tape al otro.`);
  }

  /*
   * Cada fórmula se ejecuta con los valores de ejemplo cuando la calculadora los trae, y con unos cuando no.
   * El uno es un valor neutro que rara vez rompe una operación, sin embargo basta para descubrir una variable mal escrita, que es el fallo más frecuente al redactar una fórmula nueva.
   */
  const usarEjemplo = calculadora.ejemplo && identificadores.every((id) => typeof calculadora.ejemplo[id] === "number");
  if (calculadora.ejemplo) contadores.conEjemplo++;
  const valores = identificadores.map((id) => (usarEjemplo ? calculadora.ejemplo[id] : 1));

  const resultados = [];
  (calculadora.resultados || []).forEach((resultado, posicion) => {
    try {
      const evaluar = new Function(...identificadores, `return (${resultado.formula});`);
      const valor = evaluar(...valores);
      resultados.push(valor);
      contadores.formulasProbadas++;
      if (usarEjemplo && !Number.isFinite(valor)) {
        fallo(`${etiqueta}: el resultado ${posicion} da ${valor} con los valores de ejemplo. Suele deberse a una división entre cero o a una raíz de un número negativo, así que conviene revisar la fórmula o cambiar el ejemplo por uno realista.`);
      }
    } catch (error) {
      fallo(`${etiqueta}: el resultado ${posicion} no se puede evaluar. ${error.message} La fórmula se escribe en JavaScript usando como variables los identificadores de los campos, de modo que conviene comprobar que todos los nombres coinciden.`);
    }
  });

  /*
   * Las reglas se evalúan igual que en la aplicación, que pone a su disposición tanto los campos de entrada como los resultados nombrados r0, r1 y sucesivos.
   * De ese modo se detecta aquí la regla que menciona una variable inexistente, que en la aplicación se manifestaría como una interpretación que nunca aparece.
   */
  if (usarEjemplo && resultados.length) {
    const nombres = [...identificadores, ...resultados.map((_, posicion) => `r${posicion}`)];
    const valoresDeLaRegla = [...valoresDelEjemplo(identificadores, calculadora.ejemplo), ...resultados];
    reglas.forEach((regla, posicion) => {
      try {
        new Function(...nombres, `return (${regla.si});`)(...valoresDeLaRegla);
      } catch (error) {
        fallo(`${etiqueta}: la regla ${posicion} no se puede evaluar. ${error.message} Las condiciones solo pueden nombrar los campos de entrada y los resultados r0, r1 y sucesivos.`);
      }
    });
  }
}

// Revisa una escala de puntuación: Preguntas con opciones, puntos numéricos y reglas evaluables con la puntuación más alta.
function validarPuntuacion(calculadora, etiqueta, reglas, contadores) {
  if (!Array.isArray(calculadora.preguntas) || !calculadora.preguntas.length) {
    fallo(`${etiqueta}: no tiene preguntas. Una escala de puntuación se construye con la lista de preguntas y las opciones de cada una, así que sin ellas no hay nada que puntuar.`);
  }
  (calculadora.preguntas || []).forEach((pregunta, posicion) => {
    if (!Array.isArray(pregunta.opciones) || !pregunta.opciones.length) {
      fallo(`${etiqueta}: la pregunta ${posicion} no tiene opciones. Cada pregunta necesita al menos dos, dado que se pintan como botones de elección.`);
    }
    (pregunta.opciones || []).forEach((opcion, posicionOpcion) => {
      if (typeof opcion.puntos !== "number") {
        fallo(`${etiqueta}: la opción ${posicion}.${posicionOpcion} no tiene puntos numéricos. Los puntos se escriben sin comillas, puesto que se suman.`);
      }
    });
  });
  if (calculadora.ejemplo) contadores.conEjemplo++;

  /*
   * Las reglas se prueban con la puntuación más alta posible, que se obtiene sumando la mejor opción de cada pregunta.
   * Ese extremo basta para descubrir una condición mal escrita, y de paso comprueba que el tramo superior de la escala está contemplado.
   */
  const puntuacionMaxima = (calculadora.base || 0) +
    (calculadora.preguntas || []).reduce((suma, pregunta) => suma + Math.max(...pregunta.opciones.map((opcion) => opcion.puntos)), 0);
  reglas.forEach((regla, posicion) => {
    try {
      new Function("total", `return (${regla.si});`)(puntuacionMaxima);
    } catch (error) {
      fallo(`${etiqueta}: la regla ${posicion} no se puede evaluar. ${error.message} En una escala de puntuación la condición solo puede nombrar la variable total.`);
    }
  });
}

function validarCalculadoras() {
  const lista = leer("calculadoras.json");
  if (!Array.isArray(lista)) return;

  const contadores = { formulasProbadas: 0, conEjemplo: 0 };

  lista.forEach((calculadora, indice) => {
    const etiqueta = `calculadora ${calculadora.codigo || indice}`;
    revisarCodigo(calculadora.codigo, etiqueta);
    revisarTexto(calculadora, etiqueta);

    const reglas = calculadora.interpretacion || [];
    if (!reglas.length) {
      fallo(`${etiqueta}: no tiene reglas de interpretación. Un número sin interpretar no orienta a quien lo calcula, de modo que conviene añadir al menos un tramo con su lectura clínica.`);
    } else if (String(reglas[reglas.length - 1].si).trim() !== "true") {
      fallo(`${etiqueta}: la última regla de interpretación debe tener la condición "true" para servir de caso por defecto. Sin ella hay valores que no caen en ningún tramo y la aplicación se queda sin nada que mostrar.`);
    }

    if (calculadora.tipo === "formula") {
      validarFormula(calculadora, etiqueta, reglas, contadores);
    } else if (calculadora.tipo === "puntuacion") {
      validarPuntuacion(calculadora, etiqueta, reglas, contadores);
    } else {
      fallo(`${etiqueta}: el tipo "${calculadora.tipo}" no está reconocido. Solo existen dos, ya que una calculadora o se resuelve con una fórmula ("formula") o sumando puntos ("puntuacion").`);
    }
  });

  console.log(`Calculadoras: ${lista.length}, ${contadores.formulasProbadas} fórmulas ejecutadas, ${contadores.conEjemplo} con valores de ejemplo`);
}

module.exports = { validarCalculadoras };
