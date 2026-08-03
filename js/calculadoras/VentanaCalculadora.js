/*
 * Ventana de detalle de una calculadora.
 * Compone la ventana con su formulario, sus resultados y su escala, y ofrece el botón de ejemplo y el de copiar la frase del informe.
 * Los manejadores del formulario y de los dos botones se registran una sola vez y trabajan por delegación, razón por la que reabrir calculadoras no los acumula.
 */

import { Modal } from "../nucleo/Modal.js";
import { escapar } from "../nucleo/Texto.js";
import { claseModalidad } from "../nucleo/Catalogos.js";
import { FormularioCalculadora } from "./FormularioCalculadora.js";
import { SincroniaDeslizador } from "./SincroniaDeslizador.js";
import { ResolutorDeCalculadora } from "./ResolutorDeCalculadora.js";
import { VistaResultados } from "./VistaResultados.js";
import { VistaEscala } from "./VistaEscala.js";

export class VentanaCalculadora {
  constructor() {
    this.actual = null;
    this.resumenInforme = "";
    this.formulario = new FormularioCalculadora("calc-formulario");
    this.resultados = new VistaResultados("calc-resultados");
    this.escala = new VistaEscala("calc-escala");
    this.modal = new Modal("modal-calculadora", "cerrar-calculadora", "[data-cierra-calculadora]", () => {
      this.actual = null;
      this.escala.posicionPrevia = null;
    });
    this.conectar();
  }

  // Deja escuchando el formulario y los dos botones de la ventana, una sola vez en todo el arranque.
  conectar() {
    const formulario = this.formulario.form;
    if (formulario) {
      formulario.addEventListener("input", (ev) => {
        const destino = ev.target;
        let animar = true;
        if (destino.classList && destino.classList.contains("calc-rango")) {
          SincroniaDeslizador.haciaCasilla(destino);
          animar = false; // el arrastre ya mueve la cifra de forma continua
        } else if (destino.classList && destino.classList.contains("calc-input")) {
          SincroniaDeslizador.desdeCasilla(destino);
        }
        if (this.actual) this.calcular(this.actual, { animar });
      });
      formulario.addEventListener("change", (ev) => {
        if (!this.actual) return;
        if (ev.target.classList && ev.target.classList.contains("calc-rango")) return;
        this.calcular(this.actual);
      });
    }

    // Rellenar las casillas con un caso de muestra y resolverlo
    const botonEjemplo = document.getElementById("calc-ejemplo");
    if (botonEjemplo) {
      botonEjemplo.addEventListener("click", () => {
        if (!this.actual || !this.actual.ejemplo) return;
        this.formulario.aplicarEjemplo(this.actual);
        this.calcular(this.actual);
        VentanaCalculadora.avisar(botonEjemplo, "Ejemplo cargado", "cargado");
      });
    }

    // Copiar el resultado como frase lista para el informe
    const botonCopiar = document.getElementById("calc-copiar");
    if (botonCopiar) {
      botonCopiar.addEventListener("click", async () => {
        if (!this.resumenInforme) return;
        try {
          await navigator.clipboard.writeText(this.resumenInforme);
        } catch {
          // El portapapeles nuevo exige un origen seguro, así que sin él se recurre a la copia de toda la vida.
          const ta = document.createElement("textarea");
          ta.value = this.resumenInforme;
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand("copy"); } catch {}
          document.body.removeChild(ta);
        }
        VentanaCalculadora.avisar(botonCopiar, "Copiado", "copiado");
      });
    }
  }

  // Confirma en el propio botón que la acción ocurrió y devuelve su texto pasado un momento.
  static avisar(boton, mensaje, clase) {
    const span = boton.querySelector("span");
    const original = span.textContent;
    span.textContent = mensaje;
    boton.classList.add(clase);
    setTimeout(() => { span.textContent = original; boton.classList.remove(clase); }, 1600);
  }

  abrir(calc) {
    document.getElementById("calc-insignias").innerHTML =
      `<span class="insignia">${escapar(calc.categoria)}</span>
     <span class="insignia modalidad ${claseModalidad(calc.modalidad)}">${escapar(calc.modalidad)}</span>`;
    document.getElementById("calc-nombre").textContent = calc.nombre;
    document.getElementById("calc-descripcion").textContent = calc.descripcion || "";

    this.modal.texto("calc-formula-seccion", "calc-formula", calc.formulaTexto);
    this.modal.texto("calc-notas-seccion", "calc-notas", calc.notas);

    this.formulario.construir(calc);

    this.actual = calc;
    const botonMuestra = document.getElementById("calc-ejemplo");
    if (botonMuestra) botonMuestra.classList.toggle("oculta", !calc.ejemplo);
    document.getElementById("calc-salida").classList.add("oculta");
    this.escala.reiniciar();
    this.resultados.reiniciar();

    this.modal.abrir();
    if (calc.tipo === "puntuacion") this.calcular(calc);
  }

  cerrar() {
    this.modal.cerrar();
  }

  calcular(calc, opciones) {
    const animar = !(opciones && opciones.animar === false);
    const salida = document.getElementById("calc-salida");
    const variables = {};

    if (calc.tipo === "puntuacion") {
      const total = this.formulario.totalPuntuacion(calc);
      variables.total = total;
      this.resultados.pintar([{
        etiqueta: "Puntuación total", unidad: "", texto: String(total), valor: total, decimales: 0
      }], animar);
    } else {
      const lectura = this.formulario.leerCampos();
      Object.assign(variables, lectura.variables);
      if (!lectura.listo) {
        salida.classList.add("oculta");
        this.escala.esconder();
        return;
      }
      this.resultados.pintar(ResolutorDeCalculadora.filasDeResultados(calc, variables), animar);
    }

    // La interpretación gana la primera condición verdadera
    const interp = document.getElementById("calc-interpretacion");
    const regla = ResolutorDeCalculadora.reglaActiva(calc, variables);
    if (regla) {
      interp.textContent = regla.texto;
      interp.className = "calc-interpretacion nivel-" + (regla.nivel || "normal");
      interp.classList.remove("oculta");
    } else {
      interp.classList.add("oculta");
    }

    // Barra con las zonas de interpretación y el punto que ocupa el resultado
    this.escala.pintar(calc, variables);

    // Frase lista para pegar en un informe radiológico
    this.resumenInforme = ResolutorDeCalculadora.fraseInforme(calc, variables, regla);

    salida.classList.remove("oculta");
  }
}
