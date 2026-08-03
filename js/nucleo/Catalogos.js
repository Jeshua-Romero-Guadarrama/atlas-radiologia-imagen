/*
 * Catálogos compartidos por todas las secciones.
 * Declara el orden único de los sistemas y de las modalidades y las clases de color que se derivan de ellos.
 * El servidor declara estas mismas listas en server/colecciones.js y una prueba comprueba que coinciden, porque las dos copias ya divergieron una vez y el fallo solo se notaba al validar contenido nuevo.
 */

import { normalizar } from "./Texto.js";

/*
 * Orden en que se muestran los sistemas y las modalidades en todas las secciones.
 * Antes cada sección los ordenaba alfabéticamente, con el resultado de que "Cabeza y cuello" encabezaba la fila y "Óseo" la cerraba, de manera que dos pestañas contiguas presentaban la misma lista en un orden que parecía arbitrario.
 * Al fijar aquí una secuencia única, las seis secciones muestran sus chips en el mismo orden y la vista no cambia de criterio al cambiar de pestaña.
 * El orden de los sistemas va de los que más contenido tienen a los que menos, y deja "General" al final por tratarse de un cajón para lo que no pertenece a ningún aparato.
 */
export const ORDEN_SISTEMAS = ["Óseo", "Respiratorio", "Nervioso", "Digestivo", "Cardiovascular",
                               "Urinario", "Reproductor", "Cabeza y cuello", "Mama", "Endocrino", "General"];
export const ORDEN_MODALIDADES = ["RX", "TC", "RM", "US", "Varias"];

/*
 * Valores distintos de un campo, tomados de los datos que se cargaron.
 * Nunca se escriben a mano, así que una categoría nueva en el contenido aparece sola en los chips sin tocar el código.
 * Los sistemas y las modalidades siguen la secuencia fija de arriba, en cambio el resto de campos se ordena alfabéticamente, puesto que no tienen una progresión natural que respetar.
 */
export function valoresDe(lista, campo) {
  const vistos = new Set();
  lista.forEach((d) => { const v = d && d[campo]; if (v) vistos.add(v); });

  const secuencia = campo === "sistema" ? ORDEN_SISTEMAS
                  : campo === "modalidad" ? ORDEN_MODALIDADES
                  : null;
  if (!secuencia) return [...vistos].sort((a, b) => a.localeCompare(b, "es"));

  /* Un valor que no esté en la secuencia se coloca al final, con el fin de que un dato nuevo no desaparezca del filtro sin avisar. */
  const posicion = (valor) => (secuencia.indexOf(valor) === -1 ? secuencia.length : secuencia.indexOf(valor));
  return [...vistos].sort((a, b) => posicion(a) - posicion(b) || a.localeCompare(b, "es"));
}

// Clase de color según la modalidad de imagen.
export function claseModalidad(mod) {
  const m = { RX: "mod-rx", TC: "mod-tc", RM: "mod-rm", US: "mod-us" };
  return m[mod] || "";
}

// Convierte un nombre de sistema en una clase de color de acento.
export function claseSistema(sistema) {
  // Aquí la eñe sí se aplana a ene, porque los nombres de clase de la paleta son ASCII y un sistema con eñe debe seguir cayendo en su clase.
  return "sis-" + normalizar(sistema).replace(/ñ/g, "n").replace(/[^a-z]+/g, "-");
}
