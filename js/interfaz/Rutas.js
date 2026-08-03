/*
 * Sincroniza la dirección del navegador con lo que se está viendo, usando el fragmento de la URL.
 * El formato es #/casos para una sección y #/casos/oseo-colles para una ficha concreta dentro de ella.
 * Sirve para tres cosas que sin esto no se pueden hacer: Compartir el enlace de una ficha concreta, guardarla en favoritos, y que el botón de atrás cierre la ficha en lugar de salir de la aplicación.
 * La clase no conoce ninguna sección en concreto: Recibe un mapa de nombre de ruta a sección y solo espera de cada una abrirPorCodigo(codigo) y, cuando existe, cerrar().
 */
export class Rutas {
  /*
   * El mapa usa los nombres públicos de las rutas, que coinciden con las carpetas de páginas estáticas.
   * La pestaña de cada ruta se deduce del nombre interno de la sección, porque el catálogo se llama "catalogo" en las pestañas pero sus páginas viven en la carpeta casos; una ruta sin sección, como estudio, usa su propio nombre.
   */
  constructor(secciones) {
    this.secciones = secciones;
    // Evita que al escribir la dirección se vuelva a interpretar. Se lleva como contador porque cerrar una ficha para abrir otra escribe dos fragmentos seguidos y cada uno trae su propio evento.
    this.propia = 0;
    // Evita que restaurar una dirección la reescriba y pierda el código por el camino.
    this.aplicando = false;
    this.rutaDeVista = {};
    Object.keys(secciones).forEach((ruta) => {
      this.rutaDeVista[Rutas.vistaDe(ruta, secciones[ruta])] = ruta;
    });
  }

  // Nombre de la pestaña que corresponde a una ruta.
  static vistaDe(ruta, seccion) {
    return seccion && seccion.nombre ? seccion.nombre : ruta;
  }

  montar() {
    window.addEventListener("hashchange", () => {
      if (this.propia > 0) {
        this.propia--;
        return;
      }
      this.aplicar();
    });
    this.volcarConsulta();
    this.aplicar();
    return this;
  }

  // Descompone el fragmento actual en ruta y código.
  static leer() {
    const bruto = decodeURIComponent(window.location.hash.replace(/^#\/?/, "")).trim();
    if (!bruto) return { ruta: null, codigo: null };
    const [ruta, codigo] = bruto.split("/");
    return { ruta: ruta || null, codigo: codigo || null };
  }

  // Lleva la aplicación al estado que describe la dirección actual.
  aplicar() {
    const { ruta, codigo } = Rutas.leer();
    if (!ruta || !(ruta in this.secciones)) return;
    const seccion = this.secciones[ruta];
    const vista = Rutas.vistaDe(ruta, seccion);
    const pestana = document.querySelector(`.pestana[data-vista="${vista}"]`);
    // Una pestaña apagada por falta de datos no debe restaurarse: La dirección se ignora y la aplicación queda en su pestaña de arranque.
    if (!pestana || pestana.classList.contains("oculta")) return;

    // Mientras se restaura, cualquier intento de escribir la dirección se descarta, porque el clic en la pestaña también avisa a las rutas y reescribiría el fragmento sin su código.
    this.aplicando = true;
    try {
      if (!pestana.classList.contains("activa")) pestana.click();
      if (!codigo) {
        // Sin código en la dirección no debe quedar ninguna ficha abierta, que es lo que convierte el botón de atrás en un cerrar natural.
        if (seccion && typeof seccion.cerrar === "function") seccion.cerrar();
        return;
      }
      if (seccion && typeof seccion.abrirPorCodigo === "function") seccion.abrirPorCodigo(codigo);
    } finally {
      this.aplicando = false;
    }
  }

  // Escribe la dirección sin provocar una nueva interpretación.
  escribir(vista, codigo) {
    if (this.aplicando) return;
    const ruta = this.rutaDeVista[vista] || vista;
    const destino = "#/" + ruta + (codigo ? "/" + encodeURIComponent(codigo) : "");
    if (window.location.hash === destino) return;
    this.propia++;
    window.location.hash = destino;
  }

  /*
   * Vuelca el parámetro q de la dirección en el buscador del catálogo.
   * Es la mitad que faltaba del SearchAction declarado en el encabezado del documento: Un buscador externo puede enlazar ?q=palabra y la página arranca con esa búsqueda hecha.
   */
  volcarConsulta() {
    let consulta = "";
    try {
      consulta = new URLSearchParams(window.location.search).get("q") || "";
    } catch {
      return;
    }
    const campo = document.getElementById("campo-busqueda");
    if (!campo || !consulta.trim()) return;
    campo.value = consulta.trim();
    // El evento de entrada recorre el mismo camino que una tecla, con lo que el contador y la paginación reaccionan solos.
    campo.dispatchEvent(new Event("input", { bubbles: true }));
  }
}
