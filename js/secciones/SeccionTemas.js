/*
 * Temas de estudio, que son los artículos largos del atlas.
 */

import { Seccion, filtroDeCampo } from "../nucleo/Seccion.js";
import { Modal } from "../nucleo/Modal.js";
import { escapar } from "../nucleo/Texto.js";

export class SeccionTemas extends Seccion {
  constructor(repositorio, paginador) {
    super({
      nombre: "temas",
      repositorio,
      paginador,
      contenedor: "lista-temas",
      contador: "contador-temas",
      busqueda: "busqueda-temas",
      rotulo: { uno: "1 tema", muchos: "temas" },
      vacio: "No encontré ningún tema con esa búsqueda. Prueba con otra palabra o quita los filtros.",
      porPalabras: true
    });
    this.modal = new Modal("modal-tema", "cerrar-tema", "[data-cierra-tema]");
    this.filtros = [
      filtroDeCampo("filtros-temas-sistema", "Todos", "sistema"),
      filtroDeCampo("filtros-temas-modalidad", "Todas", "modalidad"),
      filtroDeCampo("filtros-temas-tipo", "Todos", "tipo")
    ];
  }

  coleccion() {
    return this.repositorio.temas;
  }

  /*
   * La búsqueda recorre también los encabezados y los puntos clave de cada artículo, no solo su título y su resumen.
   * De ese modo se encuentra un tema por un concepto que trata en su interior, que es como suele buscarse cuando ya no se recuerda cómo se titulaba.
   */
  textoBusqueda(tema) {
    return [tema.titulo, tema.sistema, tema.resumen,
      (tema.secciones || []).map((s) => s.encabezado).join(" "),
      (tema.puntosClave || []).join(" ")].join(" ");
  }

  crearTarjeta(tema) {
    const tarjeta = document.createElement("article");
    tarjeta.className = "tema-tarjeta";
    tarjeta.innerHTML = `
      <span class="insignia">${escapar(tema.sistema)}</span>
      <h3>${this.destacar(tema.titulo)}</h3>
      <p>${this.destacar(tema.resumen)}</p>
      <p class="tema-meta">${tema.secciones.length} secciones · ${tema.puntosClave.length} puntos clave</p>`;
    return tarjeta;
  }

  abrirDetalle(tema) {
    document.getElementById("tema-sistema").textContent = tema.sistema;
    document.getElementById("tema-titulo").textContent = tema.titulo;
    document.getElementById("tema-resumen").textContent = tema.resumen;
    document.getElementById("tema-secciones").innerHTML = tema.secciones
      .map((s) => `<section class="tema-seccion"><h3>${escapar(s.encabezado)}</h3>
        ${s.parrafos.map((p) => `<p>${escapar(p)}</p>`).join("")}</section>`)
      .join("");
    document.getElementById("tema-puntos").innerHTML =
      tema.puntosClave.map((p) => `<li>${escapar(p)}</li>`).join("");
    this.modal.abrir();
  }
}
