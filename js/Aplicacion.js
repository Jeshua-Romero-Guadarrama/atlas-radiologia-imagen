/*
 * Aplicación del Atlas de Radiología e Imagen.
 * Es el punto de composición: Aquí se instancian las piezas que viven en los demás archivos y se conectan entre sí, de modo que ninguna sección importa a otra directamente.
 */

import { Repositorio } from "./nucleo/Repositorio.js";
import { Paginador } from "./nucleo/Paginador.js";
import { Modal } from "./nucleo/Modal.js";
import { anunciar } from "./nucleo/util.js";

import { SeccionCatalogo } from "./secciones/SeccionCatalogo.js";
import { SeccionSignos } from "./secciones/SeccionSignos.js";
import { SeccionClasificaciones } from "./secciones/SeccionClasificaciones.js";
import { SeccionTemas } from "./secciones/SeccionTemas.js";
import { SeccionGlosario } from "./secciones/SeccionGlosario.js";
import { VentanaCalculadora } from "./calculadoras/VentanaCalculadora.js";
import { SeccionCalculadoras } from "./calculadoras/SeccionCalculadoras.js";
import { Quiz } from "./estudio/Quiz.js";

import { Rutas } from "./interfaz/Rutas.js";
import { Navegacion } from "./interfaz/Navegacion.js";
import { ConmutadorDeTema } from "./interfaz/ConmutadorDeTema.js";
import { BarraDeProgreso } from "./interfaz/BarraDeProgreso.js";
import { MenuLateral } from "./interfaz/MenuLateral.js";

export class Aplicacion {
  constructor() {
    this.repositorio = new Repositorio();
    this.paginador = new Paginador();

    /*
     * Las secciones se crean en un orden que respeta sus dependencias.
     * Los temas van antes que el catálogo porque una ficha enlaza con su tema de estudio, y la ventana de calculadoras va antes que su sección porque es quien abre el detalle.
     */
    this.seccionTemas = new SeccionTemas(this.repositorio, this.paginador);
    this.seccionCatalogo = new SeccionCatalogo(this.repositorio, this.paginador, this.seccionTemas);
    this.ventanaCalculadora = new VentanaCalculadora();
    this.secciones = [
      this.seccionCatalogo,
      new SeccionSignos(this.repositorio, this.paginador),
      new SeccionClasificaciones(this.repositorio, this.paginador),
      new SeccionCalculadoras(this.repositorio, this.paginador, this.ventanaCalculadora),
      this.seccionTemas,
      new SeccionGlosario(this.repositorio, this.paginador)
    ];
    this.quiz = new Quiz(this.repositorio);

    this.navegacion = new Navegacion().montar();
    this.tema = new ConmutadorDeTema().montar();
    this.barra = new BarraDeProgreso().montar();
    // Menú lateral: Retira la cabecera durante la lectura y ofrece las mismas pestañas en un panel.
    this.menuLateral = new MenuLateral();
    Modal.registrarEscape();

    this.rutas = this.conectarRutas();
  }

  /*
   * Enlaza las secciones con la dirección del navegador, de modo que abrir una ficha cambie la URL y pegar una URL abra esa ficha.
   * Las claves del mapa son los nombres públicos de las rutas, que coinciden con las carpetas de páginas estáticas para que sus enlaces profundos caigan directos en la ficha.
   * El modo estudio va sin sección porque no tiene fichas que abrir, así que su ruta queda en #/estudio a secas.
   */
  conectarRutas() {
    const [catalogo, signos, clasificaciones, calculadoras, temas, glosario] = this.secciones;
    const rutas = new Rutas({
      casos: catalogo,
      signos,
      clasificaciones,
      calculadoras,
      temas,
      glosario,
      estudio: null
    });

    /*
     * Cada sección avisa a las rutas al abrir una ficha por interacción directa, y su ventana devuelve el fragmento a la sección al cerrarse.
     * El manejador de cierre que la ventana ya tuviera se encadena en lugar de sustituirse, porque la ventana de calculadoras limpia ahí su estado.
     */
    this.secciones.forEach((seccion) => {
      seccion.alAbrir = (item) => rutas.escribir(seccion.nombre, item.codigo);
      const modal = seccion.modal || (seccion.ventana && seccion.ventana.modal);
      if (!modal) return;
      const cierrePrevio = modal.alCerrar;
      modal.alCerrar = () => {
        if (cierrePrevio) cierrePrevio();
        rutas.escribir(seccion.nombre);
      };
    });

    // La navegación avisa del cambio de pestaña, y aquí se anuncia y se refleja en la dirección, con lo que recargar o compartir vuelve a esta misma vista.
    this.navegacion.alCambiarVista = (vista) => {
      this.anunciarVista(vista);
      rutas.escribir(vista);
    };
    return rutas;
  }

  /*
   * Anuncia el cambio de pestaña en la región de estado y sincroniza el título del documento, que es lo que se lee en la pestaña del navegador y lo primero que dice un lector de pantalla al volver a ella.
   * El recuento sale del filtro vivo de la sección, de manera que el anuncio dice cuántos resultados hay en ese momento.
   */
  anunciarVista(vista) {
    const boton = document.getElementById("pestana-" + vista);
    const nombre = boton ? boton.textContent.trim() : vista;
    const seccion = this.secciones.find((s) => s.nombre === vista);
    let mensaje = nombre;
    if (seccion) {
      const n = seccion.filtrar().length;
      mensaje += ", " + (n === 1 ? seccion.rotulo.uno : `${n} ${seccion.rotulo.muchos}`);
    }
    anunciar(mensaje);
    document.title = `${nombre} · Atlas de Radiología e Imagen`;
  }

  /*
   * Activa de inmediato la pestaña que nombra el fragmento, sin esperar a los datos. En este atlas el gancho alCambiarVista ya está conectado cuando arranca iniciar(), porque el constructor monta navegación y rutas, así que la conmutación va por el camino mudo de la navegación, que no escribe la dirección ni anuncia nada.
   * Se guarda la pestaña de arranque para poder volver a ella si la sección pedida llega vacía.
   */
  anticiparRuta() {
    const { ruta } = Rutas.leer();
    if (!ruta || !(ruta in this.rutas.secciones)) return null;
    const vista = Rutas.vistaDe(ruta, this.rutas.secciones[ruta]);
    const activa = document.querySelector(".pestana.activa");
    const arranque = activa ? activa.dataset.vista : null;
    if (vista === arranque) return null;
    if (!this.navegacion.preactivar(vista)) return null;
    return { vista, arranque };
  }

  /*
   * Cierra la preactivación cuando los datos ya están. Si la sección pedida llegó vacía, su pestaña acaba de apagarse y el aplicar() final va a ignorar la dirección: Se devuelve la vista a la pestaña de arranque, en silencio, igual que en un arranque sin fragmento.
   * Si sigue encendida se emite aquí, una sola vez, el anuncio y el título que la preactivación calló, ya con el recuento real de la sección.
   */
  rematarAnticipo({ vista, arranque }) {
    const pestana = document.querySelector(`.pestana[data-vista="${vista}"]`);
    if (!pestana) return;
    if (pestana.classList.contains("oculta")) {
      if (arranque) this.navegacion.preactivar(arranque);
      return;
    }
    if (pestana.classList.contains("activa")) this.anunciarVista(vista);
  }

  // Carga los datos y arranca todas las secciones con ellos.
  async iniciar() {
    // El fragmento se atiende antes de descargar nada: Con conexión lenta, un enlace profundo como #/casos/oseo-colles dejaría en pantalla la pestaña de arranque durante toda la carga y parecería que el enlace no funciona. Aquí solo se conmuta la pestaña; la ficha del fragmento, el anuncio y el título llegan al final, cuando los datos ya están.
    const anticipo = this.anticiparRuta();
    await this.repositorio.cargar();

    const estado = document.getElementById("estado-origen");
    if (estado) estado.textContent = this.repositorio.resumen;

    this.navegacion.ocultarSiVacio("signos", this.repositorio.signos);
    this.navegacion.ocultarSiVacio("clasificaciones", this.repositorio.clasificaciones);
    this.navegacion.ocultarSiVacio("calculadoras", this.repositorio.calculadoras);
    // El modo estudio no vive de una colección propia sino de las fichas que traen imagen, que son las únicas sobre las que puede preguntar.
    this.navegacion.ocultarSiVacio("estudio", this.repositorio.fichas.filter((f) => f.imagen));

    this.seccionCatalogo.pintarMetricas();
    this.secciones.forEach((seccion) => {
      seccion.iniciarFiltros();
      seccion.pintar();
    });
    this.barra.actualizar();
    if (anticipo) this.rematarAnticipo(anticipo);
    // Las rutas se montan con los datos ya cargados, porque restaurar una dirección con código necesita encontrar la ficha en su colección y las pestañas vacías ya están ocultas.
    this.rutas.montar();
    return this;
  }
}
