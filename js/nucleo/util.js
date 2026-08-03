/*
 * Utilidades sueltas que no pertenecen a ninguna clase.
 * Cubren el azar, los íconos, el desplazamiento y los anuncios accesibles, que usan piezas de carpetas distintas.
 */

// Baraja una copia de la lista, de manera que el original conserva su orden para el resto de la aplicación.
export function mezclar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// Devuelve el marcado de un ícono de la biblioteca SVG que vive dentro de index.html.
export function ico(nombre) {
  return `<svg class="ico"><use href="#ico-${nombre}"/></svg>`;
}

// Respeta la preferencia del sistema de reducir el movimiento.
export function menosMovimiento() {
  return typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Cuántos decimales tiene un número escrito como texto.
export function decimalesDeTexto(texto) {
  const punto = texto.indexOf(".");
  return punto === -1 ? 0 : texto.length - punto - 1;
}

/*
 * Desplaza la página o un elemento a la vista respetando la preferencia de menos movimiento.
 * Quien la activa recibe un salto directo en lugar de una animación que puede marear.
 */
export function desplazar(destino) {
  const comportamiento = matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  if (destino instanceof Element) {
    destino.scrollIntoView({ behavior: comportamiento, block: "start" });
    return;
  }
  window.scrollTo({ top: destino, behavior: comportamiento });
}

/*
 * Escribe un mensaje en la región de estado permanente, que es la única región viva que existe desde el primer pintado y por eso no pierde ningún anuncio.
 * La usan el cambio de vista y los avisos generales.
 */
export function anunciar(mensaje) {
  const region = document.getElementById("region-estado");
  if (!region) return;
  // Se vacía antes de escribir para que repetir el mismo texto también se anuncie.
  region.textContent = "";
  region.textContent = mensaje;
}
