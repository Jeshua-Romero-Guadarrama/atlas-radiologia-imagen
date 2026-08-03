/*
 * Sincronía entre cada casilla numérica y su deslizador.
 * El deslizador está pensado para quien duda del valor que debe poner, ya que moverlo recalcula en vivo y escribir en la casilla lo coloca solo.
 * Quien prefiera teclear sigue usando la casilla igual que antes.
 */

import { RangoDeCampo } from "./RangoDeCampo.js";

export class SincroniaDeslizador {
  // Coloca el deslizador donde marca la casilla, ampliando el recorrido si hace falta.
  static desdeCasilla(casilla) {
    const grupo = casilla.closest(".calc-grupo");
    const rango = grupo && grupo.querySelector(".calc-rango");
    if (!rango) return;
    const valor = parseFloat(casilla.value);
    if (!Number.isFinite(valor)) return;
    if (valor > Number(rango.max)) rango.max = String(RangoDeCampo.techoBonito(valor) || valor);
    if (valor < Number(rango.min)) rango.min = String(valor < 0 ? -RangoDeCampo.techoBonito(-valor) : 0);
    rango.value = String(valor);
  }

  // Copia a la casilla el valor que marca el deslizador.
  static haciaCasilla(rango) {
    const grupo = rango.closest(".calc-grupo");
    const casilla = grupo && grupo.querySelector(".calc-input");
    if (!casilla) return;
    casilla.value = RangoDeCampo.textoDeCampo(rango.value, Number(rango.dataset.decimales) || 0);
  }
}
