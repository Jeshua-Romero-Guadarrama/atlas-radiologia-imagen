/*
 * Escala visual de referencia, solo la parte de cálculo.
 * Traduce las reglas de interpretación en una barra con zonas de color y un marcador en el punto que ocupa el resultado, sin tocar el documento, motivo por el cual las pruebas la ejecutan tal cual.
 * Solo se construye cuando todas las reglas son umbrales numéricos simples sobre una misma variable, como ocurre con "r0 > 500" o con "total >= 7".
 * En caso de que las reglas combinen varias variables la barra se omite y el resto de la calculadora sigue funcionando igual.
 */

import { decimalesDeTexto } from "../nucleo/util.js";

const RE_UMBRAL = /^([A-Za-z_][A-Za-z0-9_]*)\s*(>=|<=|>|<)\s*(-?\d+(?:\.\d+)?)$/;

export class EscalaDeReferencia {
  // Rango posible de una escala de puntuación, sumando el mínimo y el máximo de cada pregunta.
  static rangoPuntuacion(calc) {
    let min = calc.base || 0;
    let max = calc.base || 0;
    (calc.preguntas || []).forEach((preg) => {
      const puntos = (preg.opciones || []).map((op) => Number(op.puntos));
      if (!puntos.length) return;
      min += Math.min(...puntos);
      max += Math.max(...puntos);
    });
    return [min, max];
  }

  // Regla que gana en un punto concreto del eje, con el mismo orden que emplea el resolutor.
  static reglaEnPunto(punto, condiciones, reglaFinal) {
    for (const c of condiciones) {
      if (c.op === ">" && punto > c.umbral) return c;
      if (c.op === ">=" && punto >= c.umbral) return c;
      if (c.op === "<" && punto < c.umbral) return c;
      if (c.op === "<=" && punto <= c.umbral) return c;
    }
    return reglaFinal;
  }

  // Nombre legible de la variable sobre la que se aplican los umbrales.
  static etiquetaDeVariable(calc, variable) {
    if (variable === "total") return "Puntuación total";
    const res = /^r(\d+)$/.exec(variable);
    if (res && calc.resultados && calc.resultados[Number(res[1])]) {
      return calc.resultados[Number(res[1])].etiqueta || "";
    }
    const campo = (calc.campos || []).find((c) => c.id === variable);
    return campo ? campo.etiqueta : "";
  }

  // Unidad en la que se mide la variable de los umbrales.
  static unidadDeVariable(calc, variable) {
    if (variable === "total") return "puntos";
    const res = /^r(\d+)$/.exec(variable);
    if (res && calc.resultados && calc.resultados[Number(res[1])]) {
      return calc.resultados[Number(res[1])].unidad || "";
    }
    const campo = (calc.campos || []).find((c) => c.id === variable);
    return campo ? campo.unidad || "" : "";
  }

  // Convierte las reglas de interpretación en zonas de una barra, o devuelve nada cuando no forman una escala.
  static calcular(calc, variables) {
    const reglas = calc.interpretacion || [];
    if (reglas.length < 2) return null;
    const ultima = reglas[reglas.length - 1];
    if (String(ultima.si).trim() !== "true") return null;

    const condiciones = [];
    const textoUmbral = {};
    let variable = null;
    let decimales = 0;
    for (let i = 0; i < reglas.length - 1; i++) {
      const m = RE_UMBRAL.exec(String(reglas[i].si).trim());
      if (!m) return null;
      if (variable === null) variable = m[1];
      else if (variable !== m[1]) return null;
      const umbral = parseFloat(m[3]);
      decimales = Math.max(decimales, decimalesDeTexto(m[3]));
      if (textoUmbral[umbral] === undefined) textoUmbral[umbral] = m[3];
      condiciones.push({ op: m[2], umbral, nivel: reglas[i].nivel || "normal", leyenda: reglas[i].texto || "" });
    }
    const reglaFinal = { nivel: ultima.nivel || "normal", leyenda: ultima.texto || "" };

    const valor = variables[variable];
    if (typeof valor !== "number" || !Number.isFinite(valor)) return null;

    const umbrales = Object.keys(textoUmbral).map(Number).sort((a, b) => a - b);
    const menor = umbrales[0];
    const mayor = umbrales[umbrales.length - 1];
    let min;
    let max;
    if (calc.tipo === "puntuacion") {
      const rango = EscalaDeReferencia.rangoPuntuacion(calc);
      min = rango[0];
      max = rango[1];
      decimales = 0;
    } else {
      const ancho = Math.max(mayor - menor, Math.abs(mayor) * 0.5, Math.abs(menor) * 0.5, 1);
      min = menor - ancho * 0.45;
      max = mayor + ancho * 0.45;
      if (menor >= 0 && min < 0) min = 0;
    }
    const holgura = (max - min) * 0.12;
    if (valor < min) min = valor - holgura;
    if (valor > max) max = valor + holgura;
    if (!(max > min)) return null;

    // Cada tramo entre umbrales toma el nivel de la regla que gana dentro de él
    const cortes = umbrales.filter((u) => u > min && u < max);
    const limites = [min].concat(cortes, [max]);
    const paso = (max - min) * 1e-6;
    const zonas = [];
    for (let i = 0; i < limites.length - 1; i++) {
      const regla = EscalaDeReferencia.reglaEnPunto(limites[i] + paso, condiciones, reglaFinal);
      const desde = ((limites[i] - min) / (max - min)) * 100;
      const hasta = ((limites[i + 1] - min) / (max - min)) * 100;
      const previa = zonas[zonas.length - 1];
      if (previa && previa.nivel === regla.nivel) previa.ancho = hasta - previa.desde;
      else zonas.push({ nivel: regla.nivel, leyenda: regla.leyenda, desde, ancho: hasta - desde });
    }

    const marcas = cortes.map((u) => ({
      texto: textoUmbral[u],
      posicion: ((u - min) / (max - min)) * 100
    }));

    let decimalesValor = decimales;
    const res = /^r(\d+)$/.exec(variable);
    if (variable === "total") decimalesValor = 0;
    else if (res && calc.resultados && calc.resultados[Number(res[1])]) {
      const d = calc.resultados[Number(res[1])].decimales;
      decimalesValor = d !== undefined ? d : 2;
    }

    return {
      zonas,
      marcas,
      etiqueta: EscalaDeReferencia.etiquetaDeVariable(calc, variable),
      valor: Number(valor),
      valorTexto: Number(valor).toFixed(decimalesValor),
      decimales: decimalesValor,
      unidad: EscalaDeReferencia.unidadDeVariable(calc, variable),
      esPuntuacion: calc.tipo === "puntuacion",
      umbrales: umbrales.map((u) => ({ valor: u, texto: textoUmbral[u] })),
      amplitud: max - min,
      nivel: EscalaDeReferencia.reglaEnPunto(valor, condiciones, reglaFinal).nivel,
      posicion: Math.max(0, Math.min(100, ((valor - min) / (max - min)) * 100))
    };
  }

  /*
   * Margen hasta el umbral vecino.
   * Con la escala ya resuelta se sabe qué umbrales quedan por encima y por debajo del resultado, así que se puede decir en palabras cuánto falta para cruzar al tramo siguiente.
   * Es la información que más ayuda cuando el valor cae junto a un corte, porque ahí un milímetro de diferencia en la medición cambia la conducta.
   */

  // Cantidad con su unidad, cuidando el singular de los puntos.
  static cantidadConUnidad(distancia, escala) {
    const texto = distancia.toFixed(escala.decimales);
    if (escala.unidad === "puntos") return Number(texto) === 1 ? "1 punto" : texto + " puntos";
    return escala.unidad ? texto + " " + escala.unidad : texto;
  }

  // Frase con la distancia del resultado a los umbrales de al lado.
  static margen(escala) {
    const arriba = escala.umbrales.find((u) => u.valor > escala.valor);
    const debajo = escala.umbrales.filter((u) => u.valor <= escala.valor).pop();
    /*
     * El aviso de proximidad solo tiene sentido en lo que se mide, porque ahí el error de la medición puede cambiar el tramo.
     * En las escalas de puntos caer justo en un umbral es lo normal y avisarlo sería ruido.
     */
    const holgura = escala.esPuntuacion ? null : escala.amplitud * 0.04;
    const frases = [];
    let cerca = false;

    if (arriba) {
      const d = arriba.valor - escala.valor;
      if (holgura !== null && d <= holgura) cerca = true;
      const singular = Number(d.toFixed(escala.decimales)) === 1 && escala.unidad === "puntos";
      frases.push(`${singular ? "Queda" : "Quedan"} ${EscalaDeReferencia.cantidadConUnidad(d, escala)} hasta el umbral ${arriba.texto}.`);
    }
    if (debajo) {
      const d = escala.valor - debajo.valor;
      if (holgura !== null && d <= holgura) cerca = true;
      frases.push(d === 0
        ? `El valor coincide con el umbral ${debajo.texto}.`
        : `Supera en ${EscalaDeReferencia.cantidadConUnidad(d, escala)} el umbral ${debajo.texto}.`);
    }
    if (cerca) frases.push("El resultado queda pegado al umbral (conviene repetir la medición antes de decidir).");
    return { texto: frases.join(" "), cerca };
  }
}
