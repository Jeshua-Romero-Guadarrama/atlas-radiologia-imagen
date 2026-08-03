/*
 * Conmutador de tema en tres estados: Claro, oscuro y sistema.
 * El estado sistema se representa quitando data-tema y borrando lo guardado, de modo que los tokens vuelven a obedecer a prefers-color-scheme y quien cambió de opinión puede regresar a seguir a su dispositivo.
 * Acompaña al script del encabezado encargado de aplicar el tema guardado antes de pintar.
 */

const TEMA_SIGUIENTE = { claro: "oscuro", oscuro: "sistema", sistema: "claro" };
const TEMA_NOMBRE = { claro: "claro", oscuro: "oscuro", sistema: "el del sistema" };
const COLOR_TEMA = { claro: "#0e7490", oscuro: "#0b1220" };

// El aspecto con el que se ve un estado: Para "sistema" decide la preferencia del dispositivo, porque es la única forma de comparar ese estado con los dos fijos.
function temaEfectivo(estado) {
  if (estado !== "sistema") return estado;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "oscuro" : "claro";
}

// El paso siguiente del ciclo con una salvedad: Si ese paso se viera igual que el estado actual (por ejemplo, de oscuro manual a sistema con el dispositivo en oscuro), el toque no cambiaría nada en pantalla y el botón parecería muerto, así que se salta un paso más para que cada toque produzca siempre un cambio visible.
function temaSiguiente(actual) {
  let siguiente = TEMA_SIGUIENTE[actual] || "claro";
  if (temaEfectivo(siguiente) === temaEfectivo(actual)) siguiente = TEMA_SIGUIENTE[siguiente];
  return siguiente;
}

export class ConmutadorDeTema {
  montar() {
    const boton = document.getElementById("conmutar-tema");
    if (!boton) return this;
    boton.addEventListener("click", () => {
      const actual = document.documentElement.dataset.tema || "sistema";
      ConmutadorDeTema.aplicar(temaSiguiente(actual));
      ConmutadorDeTema.rotular(boton);
    });
    // El rótulo inicial refleja lo que haya dejado el script de arranque.
    ConmutadorDeTema.rotular(boton);
    return this;
  }

  static aplicar(estado) {
    if (estado === "sistema") {
      delete document.documentElement.dataset.tema;
    } else {
      document.documentElement.dataset.tema = estado;
    }
    try {
      // Guardar "sistema" equivale a no guardar nada: Se borra la clave.
      if (estado === "sistema") localStorage.removeItem("tema");
      else localStorage.setItem("tema", estado);
    } catch {}
    // Con tema fijado, los dos theme-color llevan el mismo color; en sistema cada uno recupera el suyo y el navegador elige por su media.
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      const media = meta.getAttribute("media") || "";
      const sistema = media.includes("dark") ? COLOR_TEMA.oscuro : COLOR_TEMA.claro;
      meta.setAttribute("content", estado === "sistema" ? sistema : COLOR_TEMA[estado]);
    });
  }

  // El nombre accesible del botón dice el estado actual y el siguiente, porque un botón que cicla entre tres estados no se explica con un ícono. El siguiente se calcula con el mismo salto que el clic, para que el rótulo anuncie el estado al que de verdad se va a llegar.
  static rotular(boton) {
    const actual = document.documentElement.dataset.tema || "sistema";
    const texto = `Tema: ${TEMA_NOMBRE[actual]}. Cambiar a ${TEMA_NOMBRE[temaSiguiente(actual)]}`;
    boton.setAttribute("aria-label", texto);
    boton.setAttribute("title", texto);
  }
}
