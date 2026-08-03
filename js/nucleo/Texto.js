/*
 * Utilidades de texto que emplean todas las demás piezas.
 * Reúne la normalización para la búsqueda, el escapado del marcado y el realce de coincidencias, que son funciones puras y por eso también las cargan las pruebas.
 */

// Quita acentos y pasa a minúsculas para que la búsqueda encuentre "torax" aunque el término esté escrito "tórax".
export function normalizar(texto) {
  // La eñe se aparta con un centinela antes de descomponer, porque NFD la separa en ene y tilde y en este corpus «año» y «ano» colisionan.
  return (texto || "")
    .toLowerCase()
    .replace(/ñ/g, "\u0001")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0001/g, "ñ");
}

// Convierte en texto inofensivo lo que va a insertarse como marcado, dado que el contenido llega de archivos de datos que pueden traer signos de menor y mayor.
export function escapar(texto) {
  const d = document.createElement("div");
  d.textContent = texto == null ? "" : String(texto);
  return d.innerHTML;
}

// Texto seguro para un atributo entre comillas dobles.
export function atributo(texto) {
  return escapar(texto).replace(/"/g, "&quot;");
}

/*
 * Marcado con las coincidencias de la consulta envueltas en mark, para que la tarjeta muestre por qué apareció en los resultados.
 * La consulta llega ya normalizada, así que el texto se aplana carácter por carácter: De ese modo cada posición del texto llano corresponde a la misma posición del original y el realce cae sobre "tórax" aunque se haya buscado "torax".
 * Todo fragmento pasa por escapar antes de insertarse, dado que el contenido viene de archivos de datos que pueden traer signos de menor y mayor.
 */
export function resaltar(texto, consulta) {
  const original = texto == null ? "" : String(texto);
  if (!consulta) return escapar(original);
  const letras = [...original];
  const llano = letras.map((c) => {
    const n = normalizar(c);
    // Un carácter que se aplana a otra longitud rompería la correspondencia de posiciones, de modo que se conserva en minúscula y simplemente no coincide.
    return n.length === 1 ? n : c.toLowerCase();
  });
  if (llano.length !== letras.length) return escapar(original);
  const plano = llano.join("");

  // La consulta se parte siempre en palabras, porque realzar cada término por separado también sirve a las secciones que buscan la frase entera.
  const marcas = new Array(letras.length).fill(false);
  consulta.split(/\s+/).filter(Boolean).forEach((palabra) => {
    let desde = 0;
    let posicion;
    while ((posicion = plano.indexOf(palabra, desde)) !== -1) {
      for (let k = posicion; k < posicion + palabra.length; k++) marcas[k] = true;
      desde = posicion + palabra.length;
    }
  });

  // El texto se recompone por tramos contiguos, con lo que cada fragmento se escapa una sola vez.
  let html = "";
  let inicio = 0;
  for (let i = 1; i <= letras.length; i++) {
    if (i < letras.length && marcas[i] === marcas[inicio]) continue;
    const tramo = escapar(letras.slice(inicio, i).join(""));
    html += marcas[inicio] ? `<mark>${tramo}</mark>` : tramo;
    inicio = i;
  }
  return html;
}
