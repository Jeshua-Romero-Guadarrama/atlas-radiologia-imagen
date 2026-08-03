/*
 * Glosario de terminología, que es la única sección cuyas tarjetas no abren nada.
 * La definición cabe entera en la tarjeta, de manera que una ventana de detalle no añadiría información.
 */

import { Seccion, filtroDeCampo } from "../nucleo/Seccion.js";
import { normalizar, escapar } from "../nucleo/Texto.js";

export class SeccionGlosario extends Seccion {
  constructor(repositorio, paginador) {
    super({
      nombre: "glosario",
      repositorio,
      paginador,
      contenedor: "lista-glosario",
      contador: "contador-glosario",
      busqueda: "busqueda-glosario",
      rotulo: { uno: "1 término", muchos: "términos" },
      vacio: "No encontré ese término. Prueba con otra palabra o quita los filtros."
    });
    this.filtros = [
      filtroDeCampo("filtros-glosario-categoria", "Todas", "categoria"),
      {
        contenedor: "filtros-glosario-inicial",
        todos: "Todas",
        valor: "Todas",
        campo: (t) => SeccionGlosario.inicialDe(t.termino),
        opciones: (lista) => [...new Set(lista.map((t) => SeccionGlosario.inicialDe(t.termino)))].sort()
      }
    ];
  }

  /*
   * Devuelve la letra por la que se ordena un término del glosario.
   * Los acentos se retiran para que "ángulo" quede bajo la A, y todo lo que no empiece por letra se agrupa bajo el rótulo de cifras y símbolos.
   */
  static inicialDe(termino) {
    const letra = normalizar(termino).charAt(0).toUpperCase();
    return /[A-Z]/.test(letra) ? letra : "0 a 9";
  }

  coleccion() {
    return this.repositorio.glosario;
  }

  textoBusqueda(t) {
    return `${t.termino} ${t.definicion} ${t.categoria || ""}`;
  }

  crearTarjeta(t) {
    const caja = document.createElement("div");
    caja.className = "termino";
    caja.innerHTML =
      `${t.categoria ? `<span class="insignia categoria">${escapar(t.categoria)}</span>` : ""}
       <h3>${this.destacar(t.termino)}</h3>
       <p>${this.destacar(t.definicion)}</p>`;
    return caja;
  }
}
