/*
 * Signos radiológicos, con su base fisiopatológica y su truco para recordarlos.
 */

import { Seccion, filtroDeCampo } from "../nucleo/Seccion.js";
import { Modal } from "../nucleo/Modal.js";
import { escapar } from "../nucleo/Texto.js";
import { claseSistema, claseModalidad } from "../nucleo/Catalogos.js";

export class SeccionSignos extends Seccion {
  constructor(repositorio, paginador) {
    super({
      nombre: "signos",
      repositorio,
      paginador,
      contenedor: "lista-signos",
      contador: "contador-signos",
      busqueda: "busqueda-signos",
      rotulo: { uno: "1 signo encontrado", muchos: "signos encontrados" },
      vacio: "No encontré ese signo.<br>Prueba con otra palabra o quita los filtros."
    });
    this.modal = new Modal("modal-signo", "cerrar-signo", "[data-cierra-signo]");
    this.filtros = [
      filtroDeCampo("filtros-signos-sistema", "Todos", "sistema"),
      filtroDeCampo("filtros-signos-modalidad", "Todas", "modalidad"),
      filtroDeCampo("filtros-signos-tipo", "Todos", "tipo")
    ];
  }

  coleccion() {
    return this.repositorio.signos;
  }

  textoBusqueda(s) {
    return [s.nombre, s.sistema, s.modalidad, s.queEs, s.porQueOcurre, s.significado,
      s.comoRecordarlo, (s.etiquetas || []).join(" ")].join(" ");
  }

  crearTarjeta(signo) {
    const t = document.createElement("article");
    t.className = "tarjeta-texto " + claseSistema(signo.sistema);
    t.innerHTML = `
      <div class="insignias">
        <span class="insignia sistema">${escapar(signo.sistema)}</span>
        <span class="insignia modalidad ${claseModalidad(signo.modalidad)}">${escapar(signo.modalidad)}</span>
      </div>
      <h3>${this.destacar(signo.nombre)}</h3>
      <p>${this.destacar((signo.queEs || "").slice(0, 130))}…</p>`;
    return t;
  }

  abrirDetalle(signo) {
    document.getElementById("signo-insignias").innerHTML =
      `<span class="insignia">${escapar(signo.sistema)}</span>
     <span class="insignia modalidad ${claseModalidad(signo.modalidad)}">${escapar(signo.modalidad)}</span>`;
    document.getElementById("signo-nombre").textContent = signo.nombre;
    document.getElementById("signo-quees").textContent = signo.queEs || "";
    document.getElementById("signo-porque").textContent = signo.porQueOcurre || "";
    document.getElementById("signo-significado").textContent = signo.significado || "";
    document.getElementById("signo-recordar").textContent = signo.comoRecordarlo || "";
    this.modal.lista("signo-dif-seccion", "signo-diferencial", signo.diferencial);
    this.modal.abrir();
  }
}
