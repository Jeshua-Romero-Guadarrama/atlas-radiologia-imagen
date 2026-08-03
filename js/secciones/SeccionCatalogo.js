/*
 * Catálogo de imagen, que es la sección de portada.
 * Además de la rejilla de fichas se ocupa de las cifras que aparecen bajo el título, puesto que resumen el contenido de todas las colecciones.
 */

import { Seccion, filtroDeCampo } from "../nucleo/Seccion.js";
import { Modal } from "../nucleo/Modal.js";
import { escapar } from "../nucleo/Texto.js";
import { claseSistema, claseModalidad } from "../nucleo/Catalogos.js";
import { IMAGEN_RESERVA } from "../nucleo/ImagenReserva.js";
import { ico } from "../nucleo/util.js";

export class SeccionCatalogo extends Seccion {
  constructor(repositorio, paginador, temas) {
    super({
      nombre: "catalogo",
      repositorio,
      paginador,
      contenedor: "galeria",
      contador: "contador-resultados",
      busqueda: "campo-busqueda",
      rotulo: { uno: "1 ficha encontrada", muchos: "fichas encontradas" },
      vacio: "No encontré nada con esa búsqueda.<br>Prueba con otra palabra o quita los filtros.",
      porPalabras: true
    });
    // La ficha enlaza con su tema de estudio, de modo que el catálogo necesita saber quién abre esa otra ventana.
    this.temas = temas;
    this.modal = new Modal("modal", "cerrar-modal", "#modal .modal-fondo");
    // Ficha mostrada en la ventana, que es el punto de partida de la navegación anterior y siguiente.
    this.abierta = null;
    this.conectarNavegacion();
    this.filtros = [
      filtroDeCampo("filtros-sistema", "Todos", "sistema"),
      filtroDeCampo("filtros-modalidad", "Todas", "modalidad"),
      /*
       * El tercer nivel separa el estudio normal de referencia del caso con hallazgo.
       * Se descartó filtrar por región anatómica porque ese eje repite casi punto por punto el de sistema, de manera que las dos filas de chips mostraban lo mismo con otras palabras.
       */
      {
        contenedor: "filtros-tipo-caso",
        todos: "Todos",
        valor: "Todos",
        campo: (f) => (f.esNormal ? "Normal" : "Hallazgo"),
        opciones: () => ["Normal", "Hallazgo"]
      }
    ];
  }

  coleccion() {
    return this.repositorio.fichas;
  }

  textoBusqueda(f) {
    return [f.titulo, f.sistema, f.modalidad, f.region, f.descripcion, f.tecnica, f.hallazgos,
      f.perlas, (f.observar || []).join(" "), (f.etiquetas || []).join(" ")].join(" ");
  }

  crearTarjeta(ficha) {
    const tarjeta = document.createElement("article");
    tarjeta.className = "tarjeta " + claseSistema(ficha.sistema);
    tarjeta.innerHTML = `
      <div class="tarjeta-marco">
        <img class="tarjeta-imagen" loading="lazy" alt="${escapar(ficha.titulo)}"
             src="${escapar(ficha.imagen || IMAGEN_RESERVA)}">
        <span class="etiqueta-estado ${ficha.esNormal ? "normal" : "patologico"}">
          ${ficha.esNormal ? "Normal" : "Hallazgo"}
        </span>
      </div>
      <div class="tarjeta-cuerpo">
        <div class="insignias">
          <span class="insignia sistema">${escapar(ficha.sistema)}</span>
          <span class="insignia modalidad ${claseModalidad(ficha.modalidad)}">${escapar(ficha.modalidad)}</span>
          <span class="insignia nivel ${(ficha.dificultad || "").toLowerCase()}">${escapar(ficha.dificultad || "")}</span>
        </div>
        <h3>${this.destacar(ficha.titulo)}</h3>
        <p class="tarjeta-resumen">${this.destacar(ficha.descripcion.slice(0, 110))}…</p>
      </div>`;
    tarjeta.querySelector("img").addEventListener("error", (e) => { e.target.src = IMAGEN_RESERVA; });
    return tarjeta;
  }

  /* ---------- Navegación entre fichas dentro de la ventana ---------- */

  /*
   * Los botones de anterior y siguiente y las flechas del teclado recorren la lista filtrada que estaba en pantalla, con lo que la ventana permite revisar una tanda de resultados sin cerrarla.
   * Los manejadores se registran una sola vez en el arranque, igual que los del resto de la ventana.
   */
  conectarNavegacion() {
    const anterior = document.getElementById("modal-anterior");
    const siguiente = document.getElementById("modal-siguiente");
    if (anterior) anterior.addEventListener("click", () => this.mover(-1));
    if (siguiente) siguiente.addEventListener("click", () => this.mover(1));
    // Las flechas solo actúan con la ventana abierta, que es cuando no compiten con ningún otro uso del teclado.
    document.addEventListener("keydown", (e) => {
      if (!this.modal.abierta) return;
      if (e.key === "ArrowLeft") this.mover(-1);
      else if (e.key === "ArrowRight") this.mover(1);
    });
  }

  // Pasa a la ficha vecina de la lista filtrada, y avisa a las rutas porque el salto equivale a abrirla desde su tarjeta.
  mover(paso) {
    const lista = this.filtrar();
    const indice = lista.findIndex((f) => this.abierta && f.codigo === this.abierta.codigo);
    if (indice === -1) return;
    const destino = lista[indice + paso];
    if (!destino) return;
    this.abrirDetalle(destino);
    if (this.alAbrir) this.alAbrir(destino);
  }

  /*
   * Ajusta los dos botones a la posición de la ficha dentro de la lista filtrada.
   * El nombre accesible dice a qué ficha lleva cada botón, porque "siguiente" a secas obliga a saltar a ciegas.
   */
  actualizarNavegacion(ficha) {
    const lista = this.filtrar();
    const indice = lista.findIndex((f) => f.codigo === ficha.codigo);
    const rotular = (id, destino, texto) => {
      const boton = document.getElementById(id);
      if (!boton) return;
      // Si el botón se apaga con el foco encima, el foco pasa al cierre para no caer fuera de la ventana.
      if (!destino && document.activeElement === boton) {
        const cierre = this.modal.el && this.modal.el.querySelector(".cerrar");
        if (cierre) cierre.focus();
      }
      boton.disabled = !destino;
      const nombre = destino ? `${texto}: ${destino.titulo}` : texto;
      boton.setAttribute("aria-label", nombre);
      boton.title = nombre;
    };
    // Una ficha abierta por dirección puede no estar en la lista filtrada, y en ese caso no hay vecinos que ofrecer.
    rotular("modal-anterior", indice > 0 ? lista[indice - 1] : null, "Ficha anterior");
    rotular("modal-siguiente", indice !== -1 ? lista[indice + 1] : null, "Ficha siguiente");
  }

  abrirDetalle(ficha) {
    this.abierta = ficha;
    this.actualizarNavegacion(ficha);
    const imagen = document.getElementById("modal-imagen");
    imagen.src = ficha.imagen || IMAGEN_RESERVA;
    imagen.alt = ficha.titulo;
    imagen.onerror = () => { imagen.src = IMAGEN_RESERVA; };

    document.getElementById("modal-insignias").innerHTML =
      `<span class="insignia">${escapar(ficha.sistema)}</span>
     <span class="insignia modalidad ${claseModalidad(ficha.modalidad)}">${escapar(ficha.modalidad)}</span>
     <span class="insignia">${escapar(ficha.region)}</span>
     <span class="insignia nivel ${(ficha.dificultad || "").toLowerCase()}">${escapar(ficha.dificultad || "")}</span>`;
    document.getElementById("modal-titulo").textContent = ficha.titulo;
    document.getElementById("modal-descripcion").textContent = ficha.descripcion;

    this.modal.texto("modal-tecnica-seccion", "modal-tecnica", ficha.tecnica);
    this.modal.texto("modal-hallazgos-seccion", "modal-hallazgos", ficha.hallazgos);
    this.modal.texto("modal-perlas-seccion", "modal-perlas", ficha.perlas);
    this.modal.texto("modal-clasificacion-seccion", "modal-clasificacion", ficha.clasificacion);
    this.modal.texto("modal-protocolo-seccion", "modal-protocolo", ficha.protocolo);
    this.modal.lista("modal-observar-seccion", "modal-observar", ficha.observar);
    this.modal.lista("modal-simuladores-seccion", "modal-simuladores", ficha.simuladores);
    this.modal.lista("modal-errores-seccion", "modal-errores", ficha.errores);

    // Diagnóstico diferencial en tabla
    const dif = ficha.diferencial || [];
    document.getElementById("modal-diferencial").innerHTML = dif
      .map((d) => `<tr><td><strong>${escapar(d.entidad)}</strong></td><td>${escapar(d.comoDistinguir)}</td></tr>`)
      .join("");
    document.getElementById("modal-diferencial-seccion").classList.toggle("oculta", !dif.length);

    // Qué aporta cada modalidad
    const mods = ficha.porModalidad || {};
    const claves = Object.keys(mods);
    document.getElementById("modal-modalidad").innerHTML = claves
      .map((k) => `<dt>${escapar(k)}</dt><dd>${escapar(mods[k])}</dd>`)
      .join("");
    document.getElementById("modal-modalidad-seccion").classList.toggle("oculta", !claves.length);

    const seccionTema = document.getElementById("modal-tema-seccion");
    const tema = this.repositorio.temas.find((t) => t.codigo === ficha.temaRelacionado);
    if (tema) {
      const boton = document.getElementById("modal-tema-boton");
      boton.textContent = `Leer: ${tema.titulo}`;
      // Se asigna el manejador en lugar de añadirlo, dado que el mismo botón sirve para fichas distintas y no debe acumular destinos.
      boton.onclick = () => {
        this.modal.cerrar();
        this.temas.abrirDetalle(tema);
        // El salto cuenta como abrir el tema por interacción, así que también se avisa a las rutas.
        if (this.temas.alAbrir) this.temas.alAbrir(tema);
      };
      seccionTema.classList.remove("oculta");
    } else {
      seccionTema.classList.add("oculta");
    }

    document.getElementById("modal-credito").textContent = ficha.credito ? `Imagen: ${ficha.credito}` : "";
    this.modal.abrir();
  }

  // Tarjetas resumen de la portada del catálogo, que cuentan lo que trae cada colección.
  pintarMetricas() {
    const cont = document.getElementById("metricas");
    if (!cont) return;
    const repo = this.repositorio;
    const sistemas = new Set(repo.fichas.map((f) => f.sistema)).size;
    const datos = [
      ["catalogo", repo.fichas.length, "fichas"],
      ["corazon", sistemas, "sistemas"],
      ["signos", repo.signos.length, "signos"],
      ["clasificaciones", repo.clasificaciones.length, "clasificaciones"],
      ["calculadoras", repo.calculadoras.length, "calculadoras"],
      ["glosario", repo.glosario.length, "términos"],
    ];
    cont.innerHTML = datos
      .map(([nombre, n, t]) => `<span class="metrica">${ico(nombre)} <strong>${n}</strong> ${t}</span>`)
      .join("");
  }
}
