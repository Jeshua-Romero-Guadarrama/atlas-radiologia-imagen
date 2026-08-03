/*
 * Formulario de una calculadora: Sus campos y su validación visible.
 * Construye los grupos de entrada a partir de la definición de datos, rellena el caso de muestra y señala junto a cada casilla lo que le falta o le sobra.
 */

import { escapar, atributo } from "../nucleo/Texto.js";
import { RangoDeCampo } from "./RangoDeCampo.js";
import { SincroniaDeslizador } from "./SincroniaDeslizador.js";

export class FormularioCalculadora {
  constructor(idFormulario) {
    this.idFormulario = idFormulario;
  }

  get form() {
    return document.getElementById(this.idFormulario);
  }

  // Construye los grupos del formulario según el tipo de la calculadora.
  construir(calc) {
    const form = this.form;
    form.innerHTML = "";

    if (calc.tipo === "puntuacion") {
      (calc.preguntas || []).forEach((preg) => {
        const grupo = document.createElement("div");
        grupo.className = "calc-grupo";
        // La etiqueta se asocia por for e id, porque un select sin nombre accesible se anuncia solo como "cuadro combinado".
        grupo.innerHTML = `<label class="calc-etiqueta" for="campo-${atributo(preg.id)}">${escapar(preg.etiqueta)}</label>`;
        const select = document.createElement("select");
        select.className = "calc-select";
        select.id = `campo-${preg.id}`;
        select.dataset.id = preg.id;
        (preg.opciones || []).forEach((op, i) => {
          const o = document.createElement("option");
          o.value = op.puntos;
          o.textContent = `${op.texto} (${op.puntos > 0 ? "+" : ""}${op.puntos})`;
          if (i === 0) o.selected = true;
          select.appendChild(o);
        });
        grupo.appendChild(select);
        form.appendChild(grupo);
      });
      return;
    }

    (calc.campos || []).forEach((campo) => {
      const grupo = document.createElement("div");
      grupo.className = "calc-grupo";
      const rango = RangoDeCampo.rango(campo, calc.ejemplo ? calc.ejemplo[campo.id] : undefined);
      /*
       * El mensaje de error nace vacío junto al campo y aria-describedby ya apunta a él, de modo que al llenarse el lector de pantalla lo asocia sin más.
       * El mínimo sale solo de los datos de la calculadora: Aquí no se inventa ningún tope clínico.
       */
      grupo.innerHTML = `
      <label class="calc-etiqueta" for="campo-${campo.id}">${escapar(campo.etiqueta)}</label>
      <input class="calc-input" type="number" id="campo-${campo.id}" data-id="${campo.id}"
             inputmode="decimal" step="${campo.paso || 0.1}" ${campo.min !== undefined ? `min="${campo.min}"` : ""}
             placeholder="0" aria-describedby="aviso-campo-${campo.id}">
      <span class="calc-aviso" id="aviso-campo-${campo.id}" hidden></span>
      <input class="calc-rango" type="range" data-id="${campo.id}" data-decimales="${rango.decimales}"
             min="${rango.min}" max="${rango.max}" step="${rango.pasoDeslizador}" value="${rango.min}"
             aria-label="${atributo("Deslizador de " + campo.etiqueta)}">
      ${campo.referencia ? `<span class="calc-referencia">${escapar(campo.referencia)}</span>` : ""}`;
      form.appendChild(grupo);
    });
  }

  // Rellena el formulario con los valores de muestra de la calculadora.
  aplicarEjemplo(calc) {
    const ejemplo = calc && calc.ejemplo;
    if (!ejemplo) return;
    const form = this.form;
    if (calc.tipo === "puntuacion") {
      form.querySelectorAll("select").forEach((select) => {
        const indice = ejemplo[select.dataset.id];
        if (Number.isInteger(indice) && indice >= 0 && indice < select.options.length) {
          select.selectedIndex = indice;
        }
      });
    } else {
      form.querySelectorAll(".calc-input").forEach((input) => {
        const valor = ejemplo[input.dataset.id];
        if (typeof valor === "number" && Number.isFinite(valor)) input.value = String(valor);
        SincroniaDeslizador.desdeCasilla(input);
      });
    }
  }

  /*
   * Describe qué le pasa a un campo, o devuelve cadena vacía si está bien.
   * Solo se avisa de lo comprobable sin juicio clínico, es decir, vacío, no numérico o por debajo del mínimo que traigan los propios datos.
   * Los campos vacíos solo se señalan cuando ya se empezó a escribir, para no recibir con un formulario en rojo a quien apenas lo abre.
   */
  static problemaDe(entrada, empezado) {
    if (entrada.validity.badInput) return "Escribe solo números.";
    if (entrada.value.trim() === "") return empezado ? "Falta este dato." : "";
    if (entrada.min !== "" && parseFloat(entrada.value) < parseFloat(entrada.min)) {
      return `El valor mínimo es ${entrada.min}.`;
    }
    return "";
  }

  // Pinta o retira el estado de error de un campo: Borde de peligro, aria-invalid y el mensaje bajo el campo.
  static marcar(entrada, problema) {
    const aviso = document.getElementById("aviso-" + entrada.id);
    if (aviso) {
      aviso.textContent = problema;
      aviso.hidden = !problema;
    }
    entrada.classList.toggle("invalido", Boolean(problema));
    if (problema) entrada.setAttribute("aria-invalid", "true");
    else entrada.removeAttribute("aria-invalid");
  }

  // Suma de la escala de puntuación con lo elegido en cada pregunta.
  totalPuntuacion(calc) {
    let total = calc.base || 0;
    this.form.querySelectorAll("select").forEach((s) => { total += Number(s.value); });
    return total;
  }

  /*
   * Lee las casillas de una calculadora de fórmula, marca sus problemas y dice si el conjunto está listo para calcular.
   * El aviso de campo vacío espera a que se escriba algo en cualquiera de ellos, porque un formulario recién abierto no tiene todavía ningún error que señalar.
   */
  leerCampos() {
    const entradas = [...this.form.querySelectorAll(".calc-input")];
    const empezado = entradas.some((i) => i.value.trim() !== "" || i.validity.badInput);
    const variables = {};
    let listo = true;
    entradas.forEach((i) => {
      const v = parseFloat(i.value);
      variables[i.dataset.id] = v;
      const problema = FormularioCalculadora.problemaDe(i, empezado);
      FormularioCalculadora.marcar(i, problema);
      if (problema || Number.isNaN(v)) listo = false;
    });
    return { variables, listo };
  }
}
