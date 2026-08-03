/*
 * Ciclo común de las secciones de lista y ventana de detalle.
 * Las seis secciones del atlas repetían el mismo recorrido con nombres distintos, que consiste en filtrar por chips, buscar sin acentos, contar, paginar y pintar tarjetas.
 * Aquí ese recorrido vive una sola vez como método de plantilla, de manera que cada subclase declara únicamente lo suyo, es decir, su colección, sus filtros, cómo se pinta una tarjeta y cómo se abre el detalle.
 */

import { normalizar, resaltar } from "./Texto.js";
import { valoresDe } from "./Catalogos.js";
import { ico } from "./util.js";
import { Paginador } from "./Paginador.js";

/*
 * Sección de lista con búsqueda, chips de filtro y paginación.
 * Una subclase debe declarar en su constructor la configuración que recibe esta clase y su arreglo de filtros, y debe implementar coleccion, textoBusqueda y crearTarjeta.
 * Adicionalmente puede implementar abrirDetalle, y solo entonces las tarjetas responden al clic (el glosario, por ejemplo, no abre nada).
 */
export class Seccion {
  constructor(cfg) {
    this.nombre = cfg.nombre;
    this.repositorio = cfg.repositorio;
    this.paginador = cfg.paginador;
    this.idContenedor = cfg.contenedor;
    this.idContador = cfg.contador;
    this.idBusqueda = cfg.busqueda;
    this.rotulo = cfg.rotulo;
    this.vacio = cfg.vacio;
    /*
     * El catálogo y los temas parten la consulta en palabras y exigen que aparezcan todas, en cualquier orden.
     * Las demás secciones buscan la frase entera, que es como estaban escritas, y con una sola palabra ambas formas coinciden.
     */
    this.porPalabras = cfg.porPalabras === true;
    this.filtros = [];
    // Aviso de apertura por interacción directa, que usan las rutas para escribir la dirección sin que restaurarla produzca un ciclo.
    this.alAbrir = null;
    this.paginador.registrar(this.nombre, () => this.pintar());
    const campo = document.getElementById(this.idBusqueda);
    if (campo) {
      campo.addEventListener("input", () => {
        this.paginador.reiniciar(this.nombre);
        this.pintar();
      });
    }
  }

  /* ---------- Ganchos que declara cada subclase ---------- */

  // Lista sobre la que trabaja la sección, tomada del repositorio.
  coleccion() {
    return [];
  }

  // Todo el texto de un elemento en el que puede buscarse, ya concatenado.
  textoBusqueda() {
    return "";
  }

  // Elemento de la rejilla que representa a un elemento de la colección.
  crearTarjeta() {
    return document.createElement("div");
  }

  /* ---------- Ciclo común ---------- */

  // Consulta escrita en el buscador de la sección, ya normalizada.
  get consulta() {
    const campo = document.getElementById(this.idBusqueda);
    return normalizar(campo ? campo.value : "");
  }

  // Marcado de un texto de tarjeta con las coincidencias de la consulta realzadas, para que el ojo encuentre por qué apareció ese resultado.
  destacar(texto) {
    return resaltar(texto, this.consulta);
  }

  // Un filtro nombra un campo del dato o una función, que es lo que hace falta cuando el valor se deduce, como ocurre con Normal frente a Hallazgo.
  valorDeFiltro(item, filtro) {
    return typeof filtro.campo === "function" ? filtro.campo(item) : item[filtro.campo];
  }

  // Los chips y la búsqueda se combinan entre sí, y basta que uno descarte el elemento para que quede fuera.
  filtrar() {
    const consulta = this.consulta;
    const palabras = this.porPalabras ? consulta.split(/\s+/).filter(Boolean) : null;
    return this.coleccion().filter((item) => {
      for (const f of this.filtros) {
        if (f.valor !== f.todos && this.valorDeFiltro(item, f) !== f.valor) return false;
      }
      if (!consulta) return true;
      const texto = normalizar(this.textoBusqueda(item));
      return palabras ? palabras.every((p) => texto.includes(p)) : texto.includes(consulta);
    });
  }

  /*
   * Construye los chips de todos los filtros de la sección con los datos ya cargados.
   * Cada opción lleva su recuento calculado sobre la colección completa, porque saber cuántos elementos esperan detrás de un chip ayuda a decidir si vale la pena pulsarlo.
   * Cualquier cambio devuelve la paginación a la primera página, dado que la página en la que se estaba deja de tener sentido cuando cambia el conjunto de resultados.
   */
  iniciarFiltros() {
    const lista = this.coleccion();
    this.filtros.forEach((f) => {
      const opciones = f.opciones(lista).map((valor) => ({
        valor,
        cuenta: lista.filter((item) => this.valorDeFiltro(item, f) === valor).length
      }));
      Seccion.crearChips(f.contenedor, [{ valor: f.todos, cuenta: lista.length }, ...opciones], (v) => {
        f.valor = v;
        this.paginador.reiniciar(this.nombre);
        this.pintar();
      });
    });
  }

  /*
   * Dibuja un grupo de chips y deja marcado el primero, que siempre es el que no filtra nada.
   * Cada chip es un conmutador, así que lleva aria-pressed con su estado, que es lo que permite al lector de pantalla decir cuál filtra.
   */
  static crearChips(contenedorId, opciones, alHacerClic) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;
    contenedor.innerHTML = "";
    opciones.forEach((opcion, indice) => {
      const chip = document.createElement("button");
      chip.className = "chip" + (indice === 0 ? " activo" : "");
      chip.type = "button";
      // El recuento va en el texto del botón, de modo que el lector de pantalla también lo anuncia.
      chip.append(opcion.valor + " ");
      const cuenta = document.createElement("span");
      cuenta.className = "chip-cuenta";
      cuenta.textContent = `(${opcion.cuenta})`;
      chip.appendChild(cuenta);
      chip.setAttribute("aria-pressed", indice === 0 ? "true" : "false");
      chip.addEventListener("click", () => {
        contenedor.querySelectorAll(".chip").forEach((c) => {
          c.classList.remove("activo");
          c.setAttribute("aria-pressed", "false");
        });
        chip.classList.add("activo");
        chip.setAttribute("aria-pressed", "true");
        alHacerClic(opcion.valor);
      });
      contenedor.appendChild(chip);
    });
  }

  /*
   * Devuelve el buscador y los chips a su estado inicial y repinta una sola vez.
   * Existe porque el estado vacío ofrece un botón de salida rápida, y ese botón no debe repintar la sección una vez por cada chip que restablece.
   */
  limpiar() {
    const campo = document.getElementById(this.idBusqueda);
    if (campo) campo.value = "";
    this.filtros.forEach((f) => {
      f.valor = f.todos;
      const contenedor = document.getElementById(f.contenedor);
      if (!contenedor) return;
      contenedor.querySelectorAll(".chip").forEach((c, i) => {
        c.classList.toggle("activo", i === 0);
        c.setAttribute("aria-pressed", i === 0 ? "true" : "false");
      });
    });
    this.paginador.reiniciar(this.nombre);
    this.pintar();
    // El foco pasa al buscador limpio, que es donde continúa la tarea de quien no encontró nada.
    if (campo) campo.focus();
  }

  /* ---------- Enlace con las rutas ---------- */

  /*
   * Abre el elemento cuyo código llega en la dirección del navegador.
   * Resuelve el código contra la colección y reutiliza abrirDetalle, que es el mismo camino que recorre un clic en la tarjeta.
   */
  abrirPorCodigo(codigo) {
    if (typeof this.abrirDetalle !== "function") return false;
    const item = this.coleccion().find((d) => d && d.codigo === codigo);
    if (!item) return false;
    this.abrirDetalle(item);
    return true;
  }

  // Cierra la ficha abierta si la hay, que es lo que piden las rutas cuando la dirección pierde el código.
  cerrar() {
    if (this.modal && this.modal.abierta) this.modal.cerrar();
  }

  /*
   * Método de plantilla que recorre el ciclo entero de la sección.
   * En primer lugar se filtra y se cuenta, a continuación se resuelve el caso sin resultados y, por último, se pinta la página que toca con sus controles.
   */
  pintar() {
    const contenedor = document.getElementById(this.idContenedor);
    if (!contenedor) return;
    const items = this.filtrar();

    const contador = document.getElementById(this.idContador);
    if (contador) {
      contador.textContent = items.length === 1 ? this.rotulo.uno : `${items.length} ${this.rotulo.muchos}`;
    }

    contenedor.innerHTML = "";
    if (!items.length) {
      contenedor.innerHTML =
        `<div class="sin-resultados"><p class="emoji-grande">${ico("buscar")}</p><p>${this.vacio}</p>
         <button type="button" class="boton-limpiar">${ico("equis")} Limpiar búsqueda y filtros</button></div>`;
      // El estado vacío ofrece la salida más corta, que es volver a ver todo con un solo gesto.
      contenedor.querySelector(".boton-limpiar").addEventListener("click", () => this.limpiar());
      this.paginador.pintar(this.nombre, Paginador.vacio);
      return;
    }

    const pagina = this.paginador.trozo(this.nombre, items);
    pagina.items.forEach((item) => {
      const tarjeta = this.crearTarjeta(item);
      // Las tarjetas se crean de nuevo en cada pintado, motivo por el cual sus manejadores se van con ellas y no se acumulan.
      if (typeof this.abrirDetalle === "function") {
        // La tarjeta se marca como botón y se hace enfocable, para que quien navegue con teclado pueda recorrer los resultados y abrirlos con Enter o con la barra espaciadora, igual que con el ratón.
        tarjeta.tabIndex = 0;
        tarjeta.setAttribute("role", "button");
        // La apertura por clic avisa a las rutas, a diferencia de abrirPorCodigo, que restaura una dirección ya escrita.
        const abrir = () => {
          this.abrirDetalle(item);
          if (this.alAbrir) this.alAbrir(item);
        };
        tarjeta.addEventListener("click", abrir);
        tarjeta.addEventListener("keydown", (e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault(); // la barra espaciadora no debe desplazar la página
          abrir();
        });
      }
      contenedor.appendChild(tarjeta);
    });
    this.paginador.pintar(this.nombre, pagina);
  }
}

/*
 * Atajo para el caso más frecuente, que es un filtro sobre un campo de texto del propio dato.
 * Las opciones salen de los datos cargados, nunca de una lista escrita a mano.
 */
export function filtroDeCampo(contenedor, todos, campo) {
  return {
    contenedor,
    todos,
    valor: todos,
    campo,
    opciones: (lista) => valoresDe(lista, campo)
  };
}
