/*
 * Sección de lista de las calculadoras, que se comporta como las demás y delega el detalle en la ventana de calculadoras.
 */

import { Seccion, filtroDeCampo } from "../nucleo/Seccion.js";
import { escapar } from "../nucleo/Texto.js";
import { claseModalidad } from "../nucleo/Catalogos.js";

export class SeccionCalculadoras extends Seccion {
  constructor(repositorio, paginador, ventana) {
    super({
      nombre: "calculadoras",
      repositorio,
      paginador,
      contenedor: "lista-calculadoras",
      contador: "contador-calculadoras",
      busqueda: "busqueda-calculadoras",
      rotulo: { uno: "1 calculadora", muchos: "calculadoras" },
      vacio: "No encontré esa calculadora.<br>Prueba con otra palabra o quita los filtros."
    });
    this.ventana = ventana;
    this.filtros = [
      filtroDeCampo("filtros-calculadoras-sistema", "Todos", "sistema"),
      filtroDeCampo("filtros-calculadoras-modalidad", "Todas", "modalidad"),
      /*
       * El tipo separa las que se resuelven con una fórmula de las que suman puntos de una escala.
       * La distinción resulta útil porque quien busca una escala clínica y quien busca un cálculo de volumen llegan a esta sección con intenciones distintas.
       */
      {
        contenedor: "filtros-calculadoras-tipo",
        todos: "Todos",
        valor: "Todos",
        campo: (c) => (c.tipo === "puntuacion" ? "Puntuación" : "Fórmula"),
        opciones: () => ["Fórmula", "Puntuación"]
      }
    ];
  }

  coleccion() {
    return this.repositorio.calculadoras;
  }

  textoBusqueda(c) {
    return [c.nombre, c.categoria, c.modalidad, c.descripcion, c.formulaTexto].join(" ");
  }

  crearTarjeta(calc) {
    const t = document.createElement("article");
    t.className = "tarjeta-texto";
    t.innerHTML = `
      <div class="insignias">
        <span class="insignia categoria">${escapar(calc.categoria)}</span>
        <span class="insignia modalidad ${claseModalidad(calc.modalidad)}">${escapar(calc.modalidad)}</span>
      </div>
      <h3>${this.destacar(calc.nombre)}</h3>
      <p>${this.destacar((calc.descripcion || "").slice(0, 120))}…</p>`;
    return t;
  }

  abrirDetalle(calc) {
    this.ventana.abrir(calc);
  }

  // La ventana vive aparte de la sección, así que el cierre que piden las rutas se delega ahí.
  cerrar() {
    this.ventana.cerrar();
  }
}
