/*
 * Clasificaciones y escalas, con su tabla de grados.
 */

import { Seccion, filtroDeCampo } from "../nucleo/Seccion.js";
import { Modal } from "../nucleo/Modal.js";
import { escapar } from "../nucleo/Texto.js";
import { claseSistema, claseModalidad } from "../nucleo/Catalogos.js";

export class SeccionClasificaciones extends Seccion {
  constructor(repositorio, paginador) {
    super({
      nombre: "clasificaciones",
      repositorio,
      paginador,
      contenedor: "lista-clasificaciones",
      contador: "contador-clasificaciones",
      busqueda: "busqueda-clasificaciones",
      rotulo: { uno: "1 clasificación encontrada", muchos: "clasificaciones encontradas" },
      vacio: "No encontré esa clasificación.<br>Prueba con otra palabra o quita los filtros."
    });
    this.modal = new Modal("modal-clasificacion", "cerrar-clasificacion", "[data-cierra-clasificacion]");
    this.filtros = [
      filtroDeCampo("filtros-clasificaciones-sistema", "Todos", "sistema"),
      filtroDeCampo("filtros-clasificaciones-modalidad", "Todas", "modalidad"),
      filtroDeCampo("filtros-clasificaciones-tipo", "Todos", "tipo")
    ];
  }

  coleccion() {
    return this.repositorio.clasificaciones;
  }

  textoBusqueda(c) {
    return [c.nombre, c.sistema, c.modalidad, c.paraQue, c.comoUsarla, (c.etiquetas || []).join(" ")].join(" ");
  }

  crearTarjeta(clas) {
    const t = document.createElement("article");
    t.className = "tarjeta-texto " + claseSistema(clas.sistema);
    t.innerHTML = `
      <div class="insignias">
        <span class="insignia sistema">${escapar(clas.sistema)}</span>
        <span class="insignia modalidad ${claseModalidad(clas.modalidad)}">${escapar(clas.modalidad)}</span>
        <span class="insignia nivel">${(clas.grados || []).length} grados</span>
      </div>
      <h3>${this.destacar(clas.nombre)}</h3>
      <p>${this.destacar((clas.paraQue || "").slice(0, 130))}…</p>`;
    return t;
  }

  abrirDetalle(clas) {
    document.getElementById("clas-insignias").innerHTML =
      `<span class="insignia">${escapar(clas.sistema)}</span>
     <span class="insignia modalidad ${claseModalidad(clas.modalidad)}">${escapar(clas.modalidad)}</span>`;
    document.getElementById("clas-nombre").textContent = clas.nombre;
    document.getElementById("clas-paraque").textContent = clas.paraQue || "";
    document.getElementById("clas-comousarla").textContent = clas.comoUsarla || "";
    this.modal.texto("clas-lim-seccion", "clas-limitaciones", clas.limitaciones);
    document.getElementById("clas-grados").innerHTML = (clas.grados || [])
      .map((g) => `<tr><td><strong>${escapar(g.grado)}</strong></td><td>${escapar(g.criterio)}</td><td>${escapar(g.implicacion)}</td></tr>`)
      .join("");
    this.modal.abrir();
  }
}
