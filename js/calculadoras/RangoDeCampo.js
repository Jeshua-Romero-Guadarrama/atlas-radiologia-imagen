/*
 * Extremos y paso del deslizador de un campo numérico, solo el cálculo.
 * Los extremos salen de min y de max cuando la calculadora los define y, si no, de un intervalo derivado del valor de ejemplo.
 * No toca el documento, motivo por el cual las pruebas ejecutan estas reglas tal cual.
 */

import { decimalesDeTexto } from "../nucleo/util.js";

const ESCALONES_BONITOS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
const MULTIPLOS_PASO = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500, 1000];

export class RangoDeCampo {
  // Quita el ruido de la aritmética de punto flotante.
  static redondearFlotante(valor) {
    return Number(Number(valor).toPrecision(12));
  }

  // Redondea hacia arriba hasta una cifra redonda de la misma magnitud.
  static techoBonito(valor) {
    if (!Number.isFinite(valor) || valor <= 0) return 0;
    const magnitud = Math.pow(10, Math.floor(Math.log10(valor)));
    for (const e of ESCALONES_BONITOS) {
      if (valor <= e * magnitud * 1.000001) return RangoDeCampo.redondearFlotante(e * magnitud);
    }
    return RangoDeCampo.redondearFlotante(10 * magnitud);
  }

  // Extremos y paso del deslizador de un campo.
  static rango(campo, muestra) {
    const paso = Number(campo.paso) > 0 ? Number(campo.paso) : 0.1;
    const ejemplo = Number.isFinite(Number(muestra)) ? Number(muestra) : null;
    const base = ejemplo !== null && ejemplo !== 0 ? Math.abs(ejemplo) : paso * 100;
    const centro = ejemplo !== null ? ejemplo : base;
    let min = Number.isFinite(Number(campo.min)) ? Number(campo.min) : null;
    let max = Number.isFinite(Number(campo.max)) ? Number(campo.max) : null;

    if (max === null) max = RangoDeCampo.techoBonito(centro + base * 1.2) || RangoDeCampo.redondearFlotante(base * 2);
    if (min === null) {
      const suelo = centro - base * 1.2;
      min = suelo >= 0 ? 0 : -RangoDeCampo.techoBonito(-suelo);
    }
    if (!(max > min)) max = RangoDeCampo.redondearFlotante(min + Math.max(base * 2, paso * 10));

    /*
     * Con recorridos largos el deslizador avanza a saltos mayores que la casilla.
     * De ese modo el teclado lo recorre en un número razonable de pulsaciones.
     */
    let pasoDeslizador = paso;
    for (const m of MULTIPLOS_PASO) {
      pasoDeslizador = RangoDeCampo.redondearFlotante(paso * m);
      if ((max - min) / pasoDeslizador <= 400) break;
    }
    return { min, max, pasoDeslizador, decimales: decimalesDeTexto(String(paso)) };
  }

  // Escribe un número con los decimales del paso y sin ceros de relleno.
  static textoDeCampo(valor, decimales) {
    return String(Number(Number(valor).toFixed(decimales)));
  }
}
