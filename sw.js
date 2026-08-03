/*
 * Service worker del atlas, que deja la aplicación utilizable sin conexión.
 * Dos estrategias según lo que se pide: Las lecturas de datos van con caché primero y revalidación en segundo plano, es decir, la copia guardada responde al instante y en paralelo la red refresca la caché para la próxima visita. Una corrección puede tardar así una visita en verse, y aquí es aceptable porque el contenido es educativo y estable, mientras que esperar en cada visita la descarga completa de las fichas se nota siempre. Todo lo demás va con caché primero, porque el armazón está versionado y no cambia entre publicaciones.
 * El precacheado cubre solo el armazón, es decir, el documento, las hojas, los scripts y el manifiesto. La carpeta img pesa decenas de megas, de modo que sus imágenes no se precargan nunca y se guardan una a una según se van viendo.
 * El nombre de la caché lleva la versión: Al publicar cambios se sube el número, el service worker nuevo instala su caché y el paso de activación borra las anteriores. El procedimiento está documentado en el README.
 * Todas las rutas son relativas al propio archivo, porque el sitio vive en un subdirectorio de GitHub Pages y una ruta absoluta apuntaría fuera del ámbito.
 */

const CACHE = "atlas-rad-v4";

// El armazón completo sin datos ni imágenes: Lo justo para que la aplicación arranque sin red.
const ARMAZON = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/1-base.css",
  "css/2-cabecera.css",
  "css/3-contenido.css",
  "css/4-tarjetas.css",
  "css/5-modales.css",
  "css/6-temas-quiz-calculadoras.css",
  "css/7-interfaz.css",
  "css/8-impresion.css",
  "js/main.js",
  "js/Aplicacion.js",
  "js/nucleo/Texto.js",
  "js/nucleo/Catalogos.js",
  "js/nucleo/ImagenReserva.js",
  "js/nucleo/util.js",
  "js/nucleo/Repositorio.js",
  "js/nucleo/Modal.js",
  "js/nucleo/Paginador.js",
  "js/nucleo/Seccion.js",
  "js/secciones/SeccionCatalogo.js",
  "js/secciones/SeccionSignos.js",
  "js/secciones/SeccionClasificaciones.js",
  "js/secciones/SeccionTemas.js",
  "js/secciones/SeccionGlosario.js",
  "js/calculadoras/EscalaDeReferencia.js",
  "js/calculadoras/VistaEscala.js",
  "js/calculadoras/RangoDeCampo.js",
  "js/calculadoras/SincroniaDeslizador.js",
  "js/calculadoras/ResolutorDeCalculadora.js",
  "js/calculadoras/FormularioCalculadora.js",
  "js/calculadoras/VistaResultados.js",
  "js/calculadoras/VentanaCalculadora.js",
  "js/calculadoras/SeccionCalculadoras.js",
  "js/estudio/Quiz.js",
  "js/interfaz/Rutas.js",
  "js/interfaz/Navegacion.js",
  "js/interfaz/ConmutadorDeTema.js",
  "js/interfaz/BarraDeProgreso.js",
  "js/interfaz/MenuLateral.js"
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ARMAZON)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (evento) => {
  // Al activarse la versión nueva se borran las cachés de las anteriores, que ya nadie va a leer y solo ocupan espacio.
  evento.waitUntil(
    caches
      .keys()
      .then((nombres) => Promise.all(nombres.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Caché primero con revalidación en segundo plano: La copia guardada responde al instante y en paralelo se pide a la red y se guarda su respuesta para la próxima visita. Sin copia guardada se espera a la red y se guarda.
function cacheConRevalidacion(evento, peticion) {
  const desdeRed = fetch(peticion).then((respuesta) => {
    const copia = respuesta.clone();
    caches.open(CACHE).then((cache) => cache.put(peticion, copia));
    return respuesta;
  });
  return caches.match(peticion).then((guardada) => {
    if (guardada) {
      // waitUntil deja terminar la revalidación aunque el service worker se fuera a dormir tras responder; el catch evita que un corte de red marque el evento como fallido cuando ya se respondió con la copia.
      evento.waitUntil(desdeRed.catch(() => {}));
      return guardada;
    }
    return desdeRed;
  });
}

// Caché primero: El armazón instalado responde al instante y lo que no esté guardado, incluidas las imágenes que se van abriendo, se pide a la red y queda para la próxima vez.
function cachePrimero(peticion) {
  return caches.match(peticion).then((guardada) => {
    if (guardada) return guardada;
    return fetch(peticion).then((respuesta) => {
      const copia = respuesta.clone();
      caches.open(CACHE).then((cache) => cache.put(peticion, copia));
      return respuesta;
    });
  });
}

self.addEventListener("fetch", (evento) => {
  const peticion = evento.request;
  if (peticion.method !== "GET") return;

  const url = new URL(peticion.url);
  if (url.origin !== self.location.origin) return;

  /*
   * Las lecturas de datos que hace el propio código llegan sin destino de documento ni de recurso, y abarcan tanto los archivos de data como las consultas al servidor cuando lo hay.
   * Van con caché primero y revalidación en segundo plano: La copia guardada evita esperar en cada visita la descarga completa de las fichas y la red refresca la caché, con lo que una corrección llega como mucho una visita después, un retraso aceptable para contenido educativo estable.
   */
  if (peticion.destination === "") {
    evento.respondWith(cacheConRevalidacion(evento, peticion));
    return;
  }

  // Una navegación sin red cae al documento precacheado, que sabe reconstruir cualquier vista a partir del fragmento de la dirección.
  if (peticion.mode === "navigate") {
    evento.respondWith(cachePrimero(peticion).catch(() => caches.match("index.html")));
    return;
  }

  evento.respondWith(cachePrimero(peticion));
});
