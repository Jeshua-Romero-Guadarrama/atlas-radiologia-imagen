/*
 * Pintado de la escala visual de referencia.
 * Dibuja en su caja las zonas que calcula EscalaDeReferencia y mueve el marcador, con una firma del contenido para repintar solo cuando las zonas cambian de verdad.
 */

import { EscalaDeReferencia } from "./EscalaDeReferencia.js";
import { escapar, atributo } from "../nucleo/Texto.js";
import { ico } from "../nucleo/util.js";

const NOMBRE_NIVEL = { normal: "normal", medio: "intermedia", alto: "de alerta" };

export class VistaEscala {
  constructor(idCaja) {
    this.idCaja = idCaja;
    // Posición que ocupaba el marcador, guardada para deslizarlo en vez de hacerlo saltar.
    this.posicionPrevia = null;
  }

  get caja() {
    return document.getElementById(this.idCaja);
  }

  // Borra la barra por completo, cosa que hace falta al cambiar de calculadora para que el marcador no venga de la anterior.
  reiniciar() {
    const caja = this.caja;
    if (!caja) return;
    caja.innerHTML = "";
    caja.dataset.firma = "";
    caja.classList.add("oculta");
    this.posicionPrevia = null;
  }

  // Oculta la barra sin borrarla, que es lo que corresponde mientras falta algún dato del formulario.
  esconder() {
    const caja = this.caja;
    if (caja) caja.classList.add("oculta");
  }

  pintar(calc, variables) {
    const caja = this.caja;
    if (!caja) return;
    const escala = EscalaDeReferencia.calcular(calc, variables);
    if (!escala) {
      this.reiniciar();
      return;
    }

    const zonas = escala.zonas.map((z) =>
      `<span class="calc-escala-zona nivel-${z.nivel}" title="${atributo(z.leyenda)}"
           style="left:${z.desde.toFixed(2)}%; width:${Math.max(z.ancho, 0).toFixed(2)}%"></span>`).join("");

    // Se omite una cifra si queda demasiado cerca de la anterior para no amontonarlas
    let anterior = -99;
    const marcas = escala.marcas.map((m) => {
      if (m.posicion - anterior < 9) return "";
      anterior = m.posicion;
      let estilo = `left:${m.posicion.toFixed(2)}%`;
      if (m.posicion < 6) estilo = "left:0; transform:none";
      else if (m.posicion > 94) estilo = "left:auto; right:0; transform:none";
      return `<span class="calc-escala-cifra" style="${estilo}">${escapar(m.texto)}</span>`;
    }).join("");

    const descripcion = `Escala de referencia. El valor ${escala.valorTexto} queda en la zona ` +
      `${NOMBRE_NIVEL[escala.nivel] || "normal"}.`;

    // Si las zonas no cambian basta mover el marcador, y así se desliza al escribir
    const firma = JSON.stringify([escala.zonas, escala.marcas, escala.etiqueta]);
    if (caja.dataset.firma !== firma) {
      caja.dataset.firma = firma;
      // El marcador nace donde estaba antes para que la transición lo lleve
      // hasta su sitio nuevo en vez de aparecer de golpe en otro punto
      const arranque = this.posicionPrevia === null ? escala.posicion : this.posicionPrevia;
      caja.innerHTML = `
      <span class="calc-escala-titulo">Escala de referencia${escala.etiqueta ? ` <small>${escapar(escala.etiqueta)}</small>` : ""}</span>
      <div class="calc-escala-barra" role="img" aria-label="${atributo(descripcion)}">
        <div class="calc-escala-pista">${zonas}</div>
        <span class="calc-escala-marca" style="left:${arranque.toFixed(2)}%"></span>
        <div class="calc-escala-cifras">${marcas}</div>
      </div>
      <p class="calc-escala-margen">${ico("umbral")} <span class="calc-escala-margen-texto"></span></p>`;
      const recien = caja.querySelector(".calc-escala-marca");
      if (recien) void recien.offsetWidth; // fija la posición de partida antes de moverla
    }

    const barra = caja.querySelector(".calc-escala-barra");
    const marcador = caja.querySelector(".calc-escala-marca");
    if (marcador) marcador.style.left = escala.posicion.toFixed(2) + "%";
    if (barra) barra.setAttribute("aria-label", descripcion);

    // Se realza la zona en la que cae el resultado para leer de un vistazo dónde está
    let activa = -1;
    escala.zonas.forEach((z, i) => {
      const dentro = escala.posicion >= z.desde - 0.01 && escala.posicion <= z.desde + z.ancho + 0.01;
      if (dentro && (activa === -1 || z.nivel === escala.nivel)) activa = i;
    });
    caja.querySelectorAll(".calc-escala-zona").forEach((z, i) => {
      z.classList.toggle("activa", i === activa);
    });

    // Cuánto falta para cruzar al tramo siguiente
    const margen = caja.querySelector(".calc-escala-margen");
    if (margen) {
      const info = EscalaDeReferencia.margen(escala);
      margen.querySelector(".calc-escala-margen-texto").textContent = info.texto;
      margen.classList.toggle("cerca", info.cerca);
      margen.classList.toggle("oculta", !info.texto);
    }

    caja.classList.remove("oculta");
    this.posicionPrevia = escala.posicion;
  }
}
