/*
 * Navegación en pestañas y su semántica accesible.
 * Completa el patrón de pestañas sobre el marcado que ya existe, conmuta las vistas y avisa del cambio a quien la monta, que es donde se enlazan las rutas y el anuncio accesible.
 */

import { desplazar } from "../nucleo/util.js";

export class Navegacion {
  constructor() {
    // Aviso de cambio de vista por interacción directa, que la aplicación usa para anunciar y escribir la dirección.
    this.alCambiarVista = null;
  }

  montar() {
    // aria-selected solo tiene sentido dentro del patrón de pestañas, así que aquí se completa la semántica, y contenedor, botones y vistas quedan enlazados para que un lector de pantalla anuncie qué controla cada una.
    const pestanas = document.getElementById("pestanas");
    if (pestanas) pestanas.setAttribute("role", "tablist");
    document.querySelectorAll(".pestana").forEach((boton) => {
      const vista = document.getElementById("vista-" + boton.dataset.vista);
      boton.id = "pestana-" + boton.dataset.vista;
      boton.setAttribute("role", "tab");
      if (vista) {
        boton.setAttribute("aria-controls", vista.id);
        vista.setAttribute("role", "tabpanel");
        vista.setAttribute("aria-labelledby", boton.id);
      }
      boton.setAttribute("aria-selected", boton.classList.contains("activa") ? "true" : "false");
      boton.addEventListener("click", () => this.activar(boton));
    });

    /*
     * El enlace de salto lleva el foco al contenido de la vista visible en ese momento, no a un ancla fija, porque la vista cambia con la pestaña.
     */
    const salto = document.getElementById("saltar-al-contenido");
    if (salto) {
      salto.addEventListener("click", (e) => {
        e.preventDefault();
        const vista = document.querySelector(".vista:not(.oculta)");
        if (!vista) return;
        vista.setAttribute("tabindex", "-1");
        vista.focus();
        desplazar(vista);
      });
    }
    return this;
  }

  /*
   * Conmuta una pestaña por su nombre sin avisar a nadie. La usa el arranque con enlace profundo: En este atlas el gancho alCambiarVista ya está conectado desde el constructor de la aplicación, así que este camino mudo es la única forma de encender la pestaña sin reescribir el fragmento ni anunciar antes de tener datos.
   * Devuelve si pudo activar, porque una pestaña apagada por falta de datos no debe encenderse.
   */
  preactivar(vista) {
    const boton = document.querySelector(`.pestana[data-vista="${vista}"]`);
    if (!boton || boton.classList.contains("oculta")) return false;
    this.activar(boton, false);
    return true;
  }

  // Deja visible la vista de la pestaña pulsada y sincroniza clases y atributos. El aviso puede callarse, que es lo que necesita la preactivación de arranque.
  activar(boton, avisar = true) {
    document.querySelectorAll(".pestana").forEach((b) => {
      b.classList.remove("activa");
      b.setAttribute("aria-selected", "false");
    });
    boton.classList.add("activa");
    boton.setAttribute("aria-selected", "true");
    // Además de la clase se sincroniza el atributo hidden, porque es lo único que saca a las vistas inactivas del árbol de accesibilidad: Sin él un lector de pantalla anuncia siete regiones principales.
    document.querySelectorAll(".vista").forEach((v) => {
      v.classList.add("oculta");
      v.hidden = true;
    });
    const activa = document.getElementById("vista-" + boton.dataset.vista);
    if (activa) {
      activa.classList.remove("oculta");
      activa.hidden = false;
    }
    desplazar(0);
    if (avisar && this.alCambiarVista) this.alCambiarVista(boton.dataset.vista);
  }

  // Oculta la pestaña de una sección que se quedó sin contenido, dado que una lista vacía no aporta nada.
  ocultarSiVacio(vista, lista) {
    const boton = document.querySelector(`.pestana[data-vista="${vista}"]`);
    if (boton) boton.classList.toggle("oculta", lista.length === 0);
  }
}
