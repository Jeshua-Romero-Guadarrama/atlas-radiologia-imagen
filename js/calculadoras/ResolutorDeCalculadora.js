/*
 * Evaluación pura de una calculadora.
 * Resuelve las fórmulas, elige la regla de interpretación y redacta la frase del informe sin tocar el documento, motivo por el cual las pruebas ejecutan estas reglas tal cual.
 */

export class ResolutorDeCalculadora {
  // Evalúa una expresión de la definición con las variables dadas, y devuelve nada cuando la expresión no se sostiene.
  // Las expresiones vienen del archivo de datos del propio proyecto, nunca de lo que escriba quien usa la aplicación.
  static evaluarExpresion(expresion, variables) {
    try {
      const nombres = Object.keys(variables);
      const valores = nombres.map((n) => variables[n]);
      return Function(...nombres, `"use strict"; return (${expresion});`)(...valores);
    } catch {
      return null;
    }
  }

  /*
   * Filas del resultado de una calculadora de fórmula, listas para pintarse.
   * Cada resultado queda además disponible como variable r0, r1 y sucesivas, porque las reglas de interpretación pueden nombrarlas.
   */
  static filasDeResultados(calc, variables) {
    return (calc.resultados || []).map((res, i) => {
      const valor = ResolutorDeCalculadora.evaluarExpresion(res.formula, variables);
      variables["r" + i] = valor;
      const decimales = res.decimales !== undefined ? res.decimales : 2;
      const bueno = typeof valor === "number" && Number.isFinite(valor);
      return {
        etiqueta: res.etiqueta,
        unidad: res.unidad || "",
        decimales,
        valor: bueno ? valor : NaN,
        texto: bueno ? Number(valor).toFixed(decimales) : "n/d"
      };
    });
  }

  // La interpretación gana la primera condición verdadera.
  static reglaActiva(calc, variables) {
    return (calc.interpretacion || []).find(
      (r) => ResolutorDeCalculadora.evaluarExpresion(r.si, variables) === true
    );
  }

  // Frase lista para pegar en un informe radiológico.
  static fraseInforme(calc, variables, regla) {
    const partes = [];
    if (calc.tipo === "puntuacion") {
      partes.push("Puntuación total " + variables.total);
    } else {
      (calc.resultados || []).forEach((res, i) => {
        const v = variables["r" + i];
        const texto = v === null || Number.isNaN(v)
          ? "n/d"
          : Number(v).toFixed(res.decimales !== undefined ? res.decimales : 2);
        partes.push(res.etiqueta + " " + texto + (res.unidad ? " " + res.unidad : ""));
      });
    }
    return calc.nombre + ". " + partes.join(", ") + "." + (regla ? " " + regla.texto : "");
  }
}
