/*
 * Punto de entrada de la aplicación.
 * Se carga con script type module, de modo que se ejecuta una vez analizado el documento y no hace falta esperar a ningún evento adicional.
 */

import { Aplicacion } from "./Aplicacion.js";

/*
 * Registro del service worker, que deja el armazón disponible sin conexión.
 * Solo se intenta bajo HTTPS o en localhost, dado que en otros orígenes el registro falla con un error ruidoso que no aporta nada.
 * La ruta es relativa porque el sitio publicado vive en un subdirectorio de GitHub Pages y una ruta absoluta apuntaría fuera del ámbito.
 */
if ("serviceWorker" in navigator &&
    (location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname))) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

new Aplicacion().iniciar().catch((err) => {
  console.error("No se pudo iniciar la aplicación:", err);
  const estado = document.getElementById("estado-origen");
  if (estado) {
    estado.textContent =
      "No se pudieron cargar los datos. Si abriste el archivo con doble clic, el navegador bloquea la lectura local: " +
      "Sirve la carpeta con npx serve o levanta el servidor con docker compose up.";
  }
});
