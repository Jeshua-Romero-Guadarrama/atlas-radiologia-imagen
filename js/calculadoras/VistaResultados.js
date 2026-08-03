/*
 * Filas del resultado con sus cifras animadas.
 * Las filas se reutilizan mientras la calculadora sea la misma, de modo que la cifra puede contar desde el valor anterior hasta el nuevo.
 * Con la preferencia de menos movimiento activa, o cuando el cambio viene de arrastrar un deslizador, el número se escribe de una vez.
 */

import { escapar } from "../nucleo/Texto.js";
import { menosMovimiento } from "../nucleo/util.js";

// Duración de la cuenta de la cifra del resultado, en milisegundos.
const DURACION_CIFRA = 380;

export class VistaResultados {
  constructor(idCaja) {
    this.idCaja = idCaja;
    // Animaciones de las cifras del resultado, una por elemento.
    this.animaciones = new WeakMap();
  }

  get caja() {
    return document.getElementById(this.idCaja);
  }

  // Olvida el resultado anterior para que la primera cifra no cuente desde otra calculadora.
  reiniciar() {
    this.caja.dataset.firma = "";
  }

  // Lleva una cifra del valor que mostraba al valor nuevo.
  actualizarCifra(el, fila, animar) {
    if (el.dataset.texto === fila.texto) return; // nada que cambiar, no se corta la animación en curso
    const previo = parseFloat(el.dataset.valor);
    el.dataset.valor = Number.isFinite(fila.valor) ? String(fila.valor) : "";
    el.dataset.texto = fila.texto;

    const enCurso = this.animaciones.get(el);
    if (enCurso) cancelAnimationFrame(enCurso);

    if (!animar || menosMovimiento() || !Number.isFinite(previo) || !Number.isFinite(fila.valor)) {
      el.textContent = fila.texto;
      return;
    }

    const inicio = performance.now();
    const salto = fila.valor - previo;
    const avanzar = (ahora) => {
      const t = Math.min(1, (ahora - inicio) / DURACION_CIFRA);
      if (t < 1) {
        const suave = 1 - Math.pow(1 - t, 3);
        el.textContent = (previo + salto * suave).toFixed(fila.decimales);
        this.animaciones.set(el, requestAnimationFrame(avanzar));
      } else {
        el.textContent = fila.texto;
        this.animaciones.delete(el);
      }
    };
    this.animaciones.set(el, requestAnimationFrame(avanzar));
  }

  // Pinta las filas del resultado y anima las que cambian de valor.
  pintar(filas, animar) {
    const caja = this.caja;
    const firma = JSON.stringify(filas.map((f) => [f.etiqueta, f.unidad || ""]));

    if (caja.dataset.firma !== firma) {
      caja.dataset.firma = firma;
      caja.innerHTML = filas.map((f) => `
      <div class="calc-resultado">
        <span class="calc-resultado-etiqueta">${escapar(f.etiqueta)}</span>
        <span class="calc-resultado-valor"><span class="calc-resultado-cifra">${escapar(f.texto)}</span>${f.unidad ? ` <small>${escapar(f.unidad)}</small>` : ""}</span>
      </div>`).join("");
      caja.querySelectorAll(".calc-resultado-cifra").forEach((el, i) => {
        el.dataset.valor = Number.isFinite(filas[i].valor) ? String(filas[i].valor) : "";
        el.dataset.texto = filas[i].texto;
      });
      return;
    }

    const cifras = caja.querySelectorAll(".calc-resultado-cifra");
    filas.forEach((f, i) => { if (cifras[i]) this.actualizarCifra(cifras[i], f, animar); });
  }
}
