/*
 * Ventana de detalle con su botón de cierre y su fondo.
 * La usan por igual las secciones y la ventana de calculadoras, motivo por el cual vive en el núcleo.
 * Los manejadores se registran una sola vez, en el arranque, ya que reabrir la misma ventana con manejadores nuevos fue un fallo real del proyecto.
 * Además del abrir y cerrar, la clase lleva la parte accesible completa: Semántica de diálogo, trampa de foco en ambos sentidos, fondo inerte y devolución del foco al origen.
 */

import { escapar } from "./Texto.js";

export class Modal {
  static registro = [];

  constructor(id, idCerrar, selectorFondo, alCerrar) {
    this.el = document.getElementById(id);
    this.alCerrar = alCerrar || null;
    // Elemento que tenía el foco antes de abrir, para devolvérselo al cerrar.
    this.focoPrevio = null;
    // Hermanos marcados inert mientras esta ventana está abierta.
    this.fondoInerte = [];
    const cerrar = () => this.cerrar();
    const boton = document.getElementById(idCerrar);
    if (boton) boton.addEventListener("click", cerrar);
    const fondo = document.querySelector(selectorFondo);
    if (fondo) fondo.addEventListener("click", cerrar);
    Modal.registro.push(this);

    if (!this.el) return;

    // Semántica de ventana de diálogo para lectores de pantalla, con el nombre tomado del encabezado que ya trae el marcado.
    this.el.setAttribute("role", "dialog");
    this.el.setAttribute("aria-modal", "true");
    const titulo = this.el.querySelector(".modal-cuerpo h2");
    if (titulo) {
      if (!titulo.id) titulo.id = `${id}-titulo`;
      this.el.setAttribute("aria-labelledby", titulo.id);
    }

    // El foco no debe escaparse de la ventana mientras está abierta.
    this.el.addEventListener("keydown", (e) => this.atraparFoco(e));
  }

  // Dice si la ventana está abierta en este momento, dato que necesitan las rutas y la navegación entre fichas.
  get abierta() {
    return Boolean(this.el) && !this.el.classList.contains("oculta");
  }

  // Mantiene el recorrido del tabulador dentro de la ventana abierta, en los dos sentidos.
  atraparFoco(e) {
    if (e.key !== "Tab") return;
    const enfocables = this.el.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    // Un botón deshabilitado, como el de ficha anterior en el primer resultado, no recibe foco y no debe contar como extremo del recorrido.
    const visibles = [...enfocables].filter((n) => n.offsetParent !== null && !n.disabled);
    if (!visibles.length) return;

    const primero = visibles[0];
    const ultimo = visibles[visibles.length - 1];
    if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  }

  // Al abrir se bloquea el desplazamiento del cuerpo, con el fin de que la rueda del ratón mueva la ventana y no la página de debajo.
  abrir() {
    // Si ya estaba abierta se trata de un cambio de ficha dentro de la misma ventana, así que el foco previo y el fondo inerte se conservan tal cual.
    if (this.abierta) {
      const tarjeta = this.el.querySelector(".modal-tarjeta");
      if (tarjeta) tarjeta.scrollTop = 0;
      return;
    }
    this.focoPrevio = document.activeElement;
    this.el.classList.remove("oculta");
    this.aislarFondo();
    document.body.style.overflow = "hidden";
    // El contenido empieza arriba aunque la ficha anterior se hubiera quedado desplazada.
    const tarjeta = this.el.querySelector(".modal-tarjeta");
    if (tarjeta) tarjeta.scrollTop = 0;
    const cierre = this.el.querySelector(".cerrar");
    if (cierre) cierre.focus();
  }

  cerrar() {
    // Cerrar una ventana ya cerrada no debe mover el foco ni repetir el aviso.
    if (!this.abierta) return;
    this.el.classList.add("oculta");
    this.liberarFondo();
    // El desplazamiento del cuerpo solo se restaura si no queda otra ventana abierta, porque una ficha puede abrirse encima de otra.
    if (!document.querySelector(".modal:not(.oculta)")) document.body.style.overflow = "";
    // Devolver el foco a la tarjeta desde la que se abrió.
    if (this.focoPrevio && document.contains(this.focoPrevio)) this.focoPrevio.focus();
    this.focoPrevio = null;
    if (this.alCerrar) this.alCerrar();
  }

  /*
   * Marca inert todo lo que no es esta ventana.
   * La trampa de foco retiene el tabulador, pero solo inert saca el fondo del cursor virtual del lector de pantalla y de los toques en el resto de la página.
   */
  aislarFondo() {
    this.fondoInerte = [...document.body.children].filter(
      (n) => n !== this.el && !n.hasAttribute("inert") && !["SCRIPT", "STYLE", "LINK"].includes(n.tagName)
    );
    this.fondoInerte.forEach((n) => n.setAttribute("inert", ""));
  }

  // Devuelve el fondo a la vida al cerrar, solo lo que esta ventana marcó.
  liberarFondo() {
    this.fondoInerte.forEach((n) => n.removeAttribute("inert"));
    this.fondoInerte = [];
  }

  // La tecla de escape cierra cualquiera que esté abierta, y cerrar una ya cerrada no tiene efecto.
  static cerrarTodos() {
    Modal.registro.forEach((m) => m.cerrar());
  }

  // Deja escuchando la tecla de escape una sola vez, en el arranque.
  static registrarEscape() {
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") Modal.cerrarTodos();
    });
  }

  // Rellena un apartado opcional y lo oculta cuando la ficha no trae ese campo.
  texto(idSeccion, idCampo, valor) {
    document.getElementById(idCampo).textContent = valor || "";
    document.getElementById(idSeccion).classList.toggle("oculta", !valor);
  }

  // Misma idea que el método anterior, con una lista de viñetas en lugar de un párrafo.
  lista(idSeccion, idCampo, valores) {
    const items = valores || [];
    document.getElementById(idCampo).innerHTML = items.map((p) => `<li>${escapar(p)}</li>`).join("");
    document.getElementById(idSeccion).classList.toggle("oculta", !items.length);
  }
}
