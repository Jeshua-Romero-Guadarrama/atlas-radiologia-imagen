/*
 * Barra de progreso de lectura y botón de volver arriba.
 * La barra corre pegada al borde superior y el botón aparece pasado medio millar de píxeles, que es cuando volver al principio deja de ser un gesto corto.
 */

import { desplazar } from "../nucleo/util.js";

export class BarraDeProgreso {
  montar() {
    window.addEventListener("scroll", () => this.actualizar(), { passive: true });
    const irArriba = document.getElementById("ir-arriba");
    // El desplazamiento pasa por la utilidad común, que respeta la preferencia de menos movimiento.
    if (irArriba) irArriba.addEventListener("click", () => desplazar(0));
    return this;
  }

  actualizar() {
    const barra = document.getElementById("barra-scroll");
    const irArriba = document.getElementById("ir-arriba");
    const alto = document.documentElement.scrollHeight - window.innerHeight;
    const pct = alto > 0 ? (window.scrollY / alto) * 100 : 0;
    if (barra) barra.style.width = pct + "%";
    if (irArriba) irArriba.classList.toggle("visible", window.scrollY > 500);
  }
}
