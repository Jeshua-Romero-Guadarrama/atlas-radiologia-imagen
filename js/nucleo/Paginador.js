/*
 * Paginación de las seis secciones de lista.
 * Cada sección recorre su lista por páginas en lugar de mostrarla entera, lo que reduce el trabajo del navegador y hace la lectura más llevadera.
 * Un solo objeto guarda el tamaño de página, la página en curso y la función que repinta cada sección, de manera que los controles no necesitan saber a quién llaman.
 */

import { ico, desplazar } from "./util.js";

export class Paginador {
  constructor() {
    this.porPagina = { catalogo: 24, signos: 24, clasificaciones: 24, calculadoras: 24, glosario: 30, temas: 12 };
    this.pagina = { catalogo: 1, signos: 1, clasificaciones: 1, calculadoras: 1, glosario: 1, temas: 1 };
    this.repintar = {};
  }

  // Cada sección deja aquí su método de pintado al construirse, puesto que los botones de página necesitan volver a llamarlo.
  registrar(vista, fn) {
    this.repintar[vista] = fn;
  }

  // Vuelve a la primera página, cosa que hace falta cada vez que cambia un filtro o la búsqueda, porque la página en la que se estaba deja de tener sentido.
  reiniciar(vista) {
    this.pagina[vista] = 1;
  }

  // Devuelve el trozo de la lista que corresponde a la página actual.
  trozo(vista, lista) {
    const porPag = this.porPagina[vista];
    const paginas = Math.max(1, Math.ceil(lista.length / porPag));
    if (this.pagina[vista] > paginas) this.pagina[vista] = paginas;
    const inicio = (this.pagina[vista] - 1) * porPag;
    return { items: lista.slice(inicio, inicio + porPag), paginas, inicio, total: lista.length };
  }

  // Trozo que se pasa a pintar cuando la búsqueda no encontró nada.
  static get vacio() {
    return { paginas: 1, items: [], inicio: 0, total: 0 };
  }

  /*
   * Calcula qué números mostrar, con puntos suspensivos cuando hay muchas páginas.
   * Con siete páginas o menos salen todas, y a partir de ahí solo la primera, la última y las vecinas de la actual.
   */
  static numerosVisibles(actual, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const nums = new Set([1, total, actual, actual - 1, actual + 1]);
    const orden = [...nums].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
    const salida = [];
    orden.forEach((n, i) => {
      if (i > 0 && n - orden[i - 1] > 1) salida.push("…");
      salida.push(n);
    });
    return salida;
  }

  // Dibuja los controles de página de una sección y los deja conectados.
  pintar(vista, info) {
    const nav = document.getElementById("pag-" + vista);
    if (!nav) return;
    if (info.paginas <= 1) { nav.innerHTML = ""; return; }
    const actual = this.pagina[vista];
    const desde = info.inicio + 1;
    const hasta = info.inicio + info.items.length;

    let html = `<span class="pag-info">${desde} a ${hasta} de ${info.total}</span><div class="pag-botones">`;
    html += `<button class="pag-btn pag-flecha" data-ir="${actual - 1}" ${actual === 1 ? "disabled" : ""} aria-label="Anterior">${ico("anterior")}</button>`;
    Paginador.numerosVisibles(actual, info.paginas).forEach((n) => {
      if (n === "…") html += `<span class="pag-elipsis">…</span>`;
      else html += `<button class="pag-btn ${n === actual ? "activo" : ""}" data-ir="${n}">${n}</button>`;
    });
    html += `<button class="pag-btn pag-flecha" data-ir="${actual + 1}" ${actual === info.paginas ? "disabled" : ""} aria-label="Siguiente">${ico("siguiente")}</button>`;
    html += `</div>`;
    nav.innerHTML = html;

    // Los botones se crean de nuevo en cada pintado, así que sus manejadores desaparecen con ellos y no se acumulan.
    nav.querySelectorAll("button[data-ir]").forEach((b) => {
      b.addEventListener("click", () => {
        const destino = Number(b.dataset.ir);
        if (destino < 1 || destino > info.paginas) return;
        this.pagina[vista] = destino;
        this.repintar[vista]();
        const vistaEl = document.getElementById("vista-" + vista);
        const arriba = vistaEl ? vistaEl.getBoundingClientRect().top + window.scrollY - 80 : 0;
        // El desplazamiento pasa por la utilidad común, que respeta la preferencia de menos movimiento.
        desplazar(Math.max(0, arriba));
      });
    });
  }
}
