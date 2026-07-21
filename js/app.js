/* ============================================================
   Atlas de Radiologia e Imagen · Lógica de la aplicación
   Los datos se obtienen de la API (/api/...) que a su vez lee
   MongoDB. Si la app se abre sin servidor, se cargan
   directamente los JSON de la carpeta data/.
   ============================================================ */

const IMAGEN_RESERVA =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'>
      <rect width='400' height='300' fill='#0b1520'/>
      <g fill='none' stroke='#3f5a72' stroke-width='3' stroke-linecap='round' stroke-linejoin='round' transform='translate(176 96) scale(2)'>
        <path d='M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10M12 7v10'/>
      </g>
      <text x='200' y='210' text-anchor='middle' font-size='15' fill='#6f88a0'
        font-family='Segoe UI, sans-serif'>Imagen pendiente</text>
    </svg>`
  );

let FICHAS = [];
let GLOSARIO = [];
let TEMAS = [];
let SIGNOS = [];
let CLASIFICACIONES = [];
let CALCULADORAS = [];
let sistemaActivo = "Todos";
let modalidadActiva = "Todas";

/* ---------- Utilidades ---------- */

// Quita acentos y pasa a minúsculas para que la búsqueda
// encuentre "torax" aunque esté escrito "tórax".
function normalizar(texto) {
  return (texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function mezclar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function escapar(texto) {
  const d = document.createElement("div");
  d.textContent = texto == null ? "" : String(texto);
  return d.innerHTML;
}

/* ---------- Carga de datos ---------- */
async function pedir(url, respaldo) {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error("no disponible");
    return await r.json();
  } catch {
    if (!respaldo) return [];
    try {
      const r = await fetch(respaldo);
      if (!r.ok) throw new Error("no disponible");
      return await r.json();
    } catch {
      return [];
    }
  }
}

async function cargarDatos() {
  const estado = document.getElementById("estado-origen");
  const [fichas, glosario, temas, signos, clasificaciones, calculadoras, info] = await Promise.all([
    pedir("/api/fichas", "data/fichas.json"),
    pedir("/api/glosario", "data/glosario.json"),
    pedir("/api/temas", "data/temas.json"),
    pedir("/api/signos", "data/signos.json"),
    pedir("/api/clasificaciones", "data/clasificaciones.json"),
    pedir("/api/calculadoras", "data/calculadoras.json"),
    fetch("/api/estado").then((r) => r.json()).catch(() => null),
  ]);

  FICHAS = fichas; GLOSARIO = glosario; TEMAS = temas;
  SIGNOS = signos; CLASIFICACIONES = clasificaciones; CALCULADORAS = calculadoras;

  // Sin servidor, el catálogo puede venir repartido en dos archivos
  if (!info) {
    const extra = await pedir("data/fichas-nuevas.json");
    if (extra.length) {
      const yaEstan = new Set(FICHAS.map((f) => f.codigo));
      FICHAS = FICHAS.concat(extra.filter((f) => !yaEstan.has(f.codigo)));
    }
  }

  const origen = info && info.origen === "mongodb" ? "MongoDB" : "archivos locales";
  estado.textContent =
    `${FICHAS.length} fichas · ${SIGNOS.length} signos · ${CLASIFICACIONES.length} clasificaciones · ` +
    `${CALCULADORAS.length} calculadoras · ${GLOSARIO.length} términos · ${TEMAS.length} temas · ` +
    `datos desde ${origen}`;

  // Ocultar las pestañas que aún no tengan contenido
  const ocultarSiVacio = (vista, lista) => {
    const boton = document.querySelector(`.pestana[data-vista="${vista}"]`);
    if (boton) boton.classList.toggle("oculta", lista.length === 0);
  };
  ocultarSiVacio("signos", SIGNOS);
  ocultarSiVacio("clasificaciones", CLASIFICACIONES);
  ocultarSiVacio("calculadoras", CALCULADORAS);

  pintarMetricas();
}

/* Tarjetas-resumen de la portada del catálogo */
function pintarMetricas() {
  const cont = document.getElementById("metricas");
  if (!cont) return;
  const sistemas = new Set(FICHAS.map((f) => f.sistema)).size;
  const datos = [
    ["catalogo", FICHAS.length, "fichas"],
    ["corazon", sistemas, "sistemas"],
    ["signos", SIGNOS.length, "signos"],
    ["clasificaciones", CLASIFICACIONES.length, "clasificaciones"],
    ["calculadoras", CALCULADORAS.length, "calculadoras"],
    ["glosario", GLOSARIO.length, "términos"],
  ];
  cont.innerHTML = datos
    .map(([nombre, n, t]) => `<span class="metrica">${ico(nombre)} <strong>${n}</strong> ${t}</span>`)
    .join("");
}

// Clase de color según la modalidad de imagen
function claseModalidad(mod) {
  const m = { RX: "mod-rx", TC: "mod-tc", RM: "mod-rm", US: "mod-us" };
  return m[mod] || "";
}

// Devuelve el marcado de un ícono del sprite SVG
function ico(nombre) {
  return `<svg class="ico"><use href="#ico-${nombre}"/></svg>`;
}

// Convierte un nombre de sistema en una clase de color de acento
function claseSistema(sistema) {
  return "sis-" + normalizar(sistema).replace(/[^a-z]+/g, "-");
}

/* ============================================================
   Paginación
   ============================================================
   Cada sección recorre su lista por páginas en lugar de
   mostrarlo todo de golpe. Mejora la carga y la lectura.
   ============================================================ */
const POR_PAGINA = { catalogo: 24, signos: 24, clasificaciones: 24, calculadoras: 24, glosario: 30 };
const PAGINA = { catalogo: 1, signos: 1, clasificaciones: 1, calculadoras: 1, glosario: 1 };
const REPINTAR = {}; // se rellena al final con la función de cada sección

// Devuelve el trozo de la lista que corresponde a la página actual
function trozoPagina(vista, lista) {
  const porPag = POR_PAGINA[vista];
  const paginas = Math.max(1, Math.ceil(lista.length / porPag));
  if (PAGINA[vista] > paginas) PAGINA[vista] = paginas;
  const inicio = (PAGINA[vista] - 1) * porPag;
  return { items: lista.slice(inicio, inicio + porPag), paginas, inicio, total: lista.length };
}

// Calcula qué números mostrar, con puntos suspensivos si hay muchas páginas
function numerosVisibles(actual, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const nums = new Set([1, total, actual, actual - 1, actual + 1]);
  const orden = [...nums].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const salida = [];
  orden.forEach((n, i) => {
    if (i > 0 && n - orden[i - 1] > 1) salida.push("…");
    salida.push(n);
  });
  return salida;
}

// Dibuja los controles « ‹ 1 2 … n › » para una sección
function pintarPaginacion(vista, info) {
  const nav = document.getElementById("pag-" + vista);
  if (!nav) return;
  if (info.paginas <= 1) { nav.innerHTML = ""; return; }
  const actual = PAGINA[vista];
  const desde = info.inicio + 1;
  const hasta = info.inicio + info.items.length;

  let html = `<span class="pag-info">${desde} a ${hasta} de ${info.total}</span><div class="pag-botones">`;
  html += `<button class="pag-btn pag-flecha" data-ir="${actual - 1}" ${actual === 1 ? "disabled" : ""} aria-label="Anterior">${ico("anterior")}</button>`;
  numerosVisibles(actual, info.paginas).forEach((n) => {
    if (n === "…") html += `<span class="pag-elipsis">…</span>`;
    else html += `<button class="pag-btn ${n === actual ? "activo" : ""}" data-ir="${n}">${n}</button>`;
  });
  html += `<button class="pag-btn pag-flecha" data-ir="${actual + 1}" ${actual === info.paginas ? "disabled" : ""} aria-label="Siguiente">${ico("siguiente")}</button>`;
  html += `</div>`;
  nav.innerHTML = html;

  nav.querySelectorAll("button[data-ir]").forEach((b) => {
    b.addEventListener("click", () => {
      const destino = Number(b.dataset.ir);
      if (destino < 1 || destino > info.paginas) return;
      PAGINA[vista] = destino;
      REPINTAR[vista]();
      const vistaEl = document.getElementById("vista-" + vista);
      const arriba = vistaEl ? vistaEl.getBoundingClientRect().top + window.scrollY - 80 : 0;
      window.scrollTo({ top: Math.max(0, arriba), behavior: "smooth" });
    });
  });
}

/* ============================================================
   Pestañas
   ============================================================ */
document.querySelectorAll(".pestana").forEach((boton) => {
  boton.addEventListener("click", () => {
    document.querySelectorAll(".pestana").forEach((b) => b.classList.remove("activa"));
    boton.classList.add("activa");
    document.querySelectorAll(".vista").forEach((v) => v.classList.add("oculta"));
    document.getElementById("vista-" + boton.dataset.vista).classList.remove("oculta");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

/* ============================================================
   Catálogo
   ============================================================ */
function crearChips(contenedorId, valores, alHacerClic) {
  const contenedor = document.getElementById(contenedorId);
  contenedor.innerHTML = "";
  valores.forEach((valor, indice) => {
    const chip = document.createElement("button");
    chip.className = "chip" + (indice === 0 ? " activo" : "");
    chip.textContent = valor;
    chip.addEventListener("click", () => {
      contenedor.querySelectorAll(".chip").forEach((c) => c.classList.remove("activo"));
      chip.classList.add("activo");
      alHacerClic(valor);
    });
    contenedor.appendChild(chip);
  });
}

function iniciarFiltros() {
  crearChips("filtros-sistema", ["Todos", ...new Set(FICHAS.map((f) => f.sistema))],
    (v) => { sistemaActivo = v; PAGINA.catalogo = 1; pintarGaleria(); });
  crearChips("filtros-modalidad", ["Todas", ...new Set(FICHAS.map((f) => f.modalidad))],
    (v) => { modalidadActiva = v; PAGINA.catalogo = 1; pintarGaleria(); });
}

function fichasFiltradas() {
  const consulta = normalizar(document.getElementById("campo-busqueda").value);
  return FICHAS.filter((f) => {
    if (sistemaActivo !== "Todos" && f.sistema !== sistemaActivo) return false;
    if (modalidadActiva !== "Todas" && f.modalidad !== modalidadActiva) return false;
    if (!consulta) return true;
    const texto = normalizar(
      [f.titulo, f.sistema, f.modalidad, f.region, f.descripcion, f.tecnica, f.hallazgos,
       f.perlas, (f.observar || []).join(" "), (f.etiquetas || []).join(" ")].join(" ")
    );
    return consulta.split(/\s+/).filter(Boolean).every((p) => texto.includes(p));
  });
}

function pintarGaleria() {
  const galeria = document.getElementById("galeria");
  const fichas = fichasFiltradas();
  document.getElementById("contador-resultados").textContent =
    fichas.length === 1 ? "1 ficha encontrada" : `${fichas.length} fichas encontradas`;

  galeria.innerHTML = "";
  if (fichas.length === 0) {
    galeria.innerHTML =
      `<div class="sin-resultados"><p class="emoji-grande">${ico("buscar")}</p>
       <p>No encontré nada con esa búsqueda.<br>Prueba con otra palabra o quita los filtros.</p></div>`;
    pintarPaginacion("catalogo", { paginas: 1, items: [], inicio: 0, total: 0 });
    return;
  }

  const pág = trozoPagina("catalogo", fichas);
  pág.items.forEach((ficha) => {
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
        <h3>${escapar(ficha.titulo)}</h3>
        <p class="tarjeta-resumen">${escapar(ficha.descripcion.slice(0, 110))}…</p>
      </div>`;
    tarjeta.querySelector("img").addEventListener("error", (e) => { e.target.src = IMAGEN_RESERVA; });
    tarjeta.addEventListener("click", () => abrirFicha(ficha));
    galeria.appendChild(tarjeta);
  });
  pintarPaginacion("catalogo", pág);
}

/* ============================================================
   Modal de ficha
   ============================================================ */
function abrirFicha(ficha) {
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

  const ponerTexto = (idSeccion, idCampo, valor) => {
    document.getElementById(idCampo).textContent = valor || "";
    document.getElementById(idSeccion).classList.toggle("oculta", !valor);
  };
  ponerTexto("modal-tecnica-seccion", "modal-tecnica", ficha.tecnica);
  ponerTexto("modal-hallazgos-seccion", "modal-hallazgos", ficha.hallazgos);
  ponerTexto("modal-perlas-seccion", "modal-perlas", ficha.perlas);
  ponerTexto("modal-clasificacion-seccion", "modal-clasificacion", ficha.clasificacion);
  ponerTexto("modal-protocolo-seccion", "modal-protocolo", ficha.protocolo);

  const ponerLista = (idSeccion, idCampo, valores) => {
    const lista = valores || [];
    document.getElementById(idCampo).innerHTML = lista.map((p) => `<li>${escapar(p)}</li>`).join("");
    document.getElementById(idSeccion).classList.toggle("oculta", !lista.length);
  };
  ponerLista("modal-observar-seccion", "modal-observar", ficha.observar);
  ponerLista("modal-simuladores-seccion", "modal-simuladores", ficha.simuladores);
  ponerLista("modal-errores-seccion", "modal-errores", ficha.errores);

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
  const tema = TEMAS.find((t) => t.codigo === ficha.temaRelacionado);
  if (tema) {
    const boton = document.getElementById("modal-tema-boton");
    boton.textContent = `Leer: ${tema.titulo}`;
    boton.onclick = () => { cerrarFicha(); abrirTema(tema); };
    seccionTema.classList.remove("oculta");
  } else {
    seccionTema.classList.add("oculta");
  }

  document.getElementById("modal-credito").textContent = ficha.credito ? `Imagen: ${ficha.credito}` : "";
  document.getElementById("modal").classList.remove("oculta");
  document.body.style.overflow = "hidden";
}

function cerrarFicha() {
  document.getElementById("modal").classList.add("oculta");
  document.body.style.overflow = "";
}
document.getElementById("cerrar-modal").addEventListener("click", cerrarFicha);
document.querySelector("#modal .modal-fondo").addEventListener("click", cerrarFicha);

/* ============================================================
   Temas
   ============================================================ */
function pintarTemas() {
  const contenedor = document.getElementById("lista-temas");
  contenedor.innerHTML = "";
  TEMAS.forEach((tema) => {
    const tarjeta = document.createElement("article");
    tarjeta.className = "tema-tarjeta";
    tarjeta.innerHTML = `
      <span class="insignia">${escapar(tema.sistema)}</span>
      <h3>${escapar(tema.titulo)}</h3>
      <p>${escapar(tema.resumen)}</p>
      <p class="tema-meta">${tema.secciones.length} secciones · ${tema.puntosClave.length} puntos clave</p>`;
    tarjeta.addEventListener("click", () => abrirTema(tema));
    contenedor.appendChild(tarjeta);
  });
}

function abrirTema(tema) {
  document.getElementById("tema-sistema").textContent = tema.sistema;
  document.getElementById("tema-titulo").textContent = tema.titulo;
  document.getElementById("tema-resumen").textContent = tema.resumen;
  document.getElementById("tema-secciones").innerHTML = tema.secciones
    .map((s) => `<section class="tema-seccion"><h3>${escapar(s.encabezado)}</h3>
        ${s.parrafos.map((p) => `<p>${escapar(p)}</p>`).join("")}</section>`)
    .join("");
  document.getElementById("tema-puntos").innerHTML =
    tema.puntosClave.map((p) => `<li>${escapar(p)}</li>`).join("");
  document.getElementById("modal-tema").classList.remove("oculta");
  document.body.style.overflow = "hidden";
}

function cerrarTema() {
  document.getElementById("modal-tema").classList.add("oculta");
  document.body.style.overflow = "";
}
document.getElementById("cerrar-tema").addEventListener("click", cerrarTema);
document.querySelector("[data-cierra-tema]").addEventListener("click", cerrarTema);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    cerrarFicha(); cerrarTema(); cerrarSigno(); cerrarClasificacion(); cerrarCalculadora();
  }
});

/* ============================================================
   Signos radiológicos
   ============================================================ */
function pintarSignos() {
  const consulta = normalizar(document.getElementById("busqueda-signos").value);
  const lista = SIGNOS.filter((s) =>
    !consulta || normalizar(
      [s.nombre, s.sistema, s.modalidad, s.queEs, s.porQueOcurre, s.significado,
       s.comoRecordarlo, (s.etiquetas || []).join(" ")].join(" ")
    ).includes(consulta)
  );
  document.getElementById("contador-signos").textContent =
    lista.length === 1 ? "1 signo encontrado" : `${lista.length} signos encontrados`;

  const contenedor = document.getElementById("lista-signos");
  contenedor.innerHTML = "";
  if (!lista.length) {
    contenedor.innerHTML = `<div class="sin-resultados"><p class="emoji-grande">${ico("buscar")}</p><p>No encontré ese signo.</p></div>`;
    pintarPaginacion("signos", { paginas: 1, items: [], inicio: 0, total: 0 });
    return;
  }
  const pág = trozoPagina("signos", lista);
  pág.items.forEach((signo) => {
    const t = document.createElement("article");
    t.className = "tarjeta-texto " + claseSistema(signo.sistema);
    t.innerHTML = `
      <div class="insignias">
        <span class="insignia sistema">${escapar(signo.sistema)}</span>
        <span class="insignia modalidad ${claseModalidad(signo.modalidad)}">${escapar(signo.modalidad)}</span>
      </div>
      <h3>${escapar(signo.nombre)}</h3>
      <p>${escapar((signo.queEs || "").slice(0, 130))}…</p>`;
    t.addEventListener("click", () => abrirSigno(signo));
    contenedor.appendChild(t);
  });
  pintarPaginacion("signos", pág);
}

function abrirSigno(signo) {
  document.getElementById("signo-insignias").innerHTML =
    `<span class="insignia">${escapar(signo.sistema)}</span>
     <span class="insignia modalidad ${claseModalidad(signo.modalidad)}">${escapar(signo.modalidad)}</span>`;
  document.getElementById("signo-nombre").textContent = signo.nombre;
  document.getElementById("signo-quees").textContent = signo.queEs || "";
  document.getElementById("signo-porque").textContent = signo.porQueOcurre || "";
  document.getElementById("signo-significado").textContent = signo.significado || "";
  document.getElementById("signo-recordar").textContent = signo.comoRecordarlo || "";
  const dif = signo.diferencial || [];
  document.getElementById("signo-diferencial").innerHTML = dif.map((d) => `<li>${escapar(d)}</li>`).join("");
  document.getElementById("signo-dif-seccion").classList.toggle("oculta", !dif.length);
  document.getElementById("modal-signo").classList.remove("oculta");
  document.body.style.overflow = "hidden";
}

function cerrarSigno() {
  document.getElementById("modal-signo").classList.add("oculta");
  document.body.style.overflow = "";
}

/* ============================================================
   Clasificaciones
   ============================================================ */
function pintarClasificaciones() {
  const consulta = normalizar(document.getElementById("busqueda-clasificaciones").value);
  const lista = CLASIFICACIONES.filter((c) =>
    !consulta || normalizar(
      [c.nombre, c.sistema, c.modalidad, c.paraQue, c.comoUsarla, (c.etiquetas || []).join(" ")].join(" ")
    ).includes(consulta)
  );
  document.getElementById("contador-clasificaciones").textContent =
    lista.length === 1 ? "1 clasificación encontrada" : `${lista.length} clasificaciones encontradas`;

  const contenedor = document.getElementById("lista-clasificaciones");
  contenedor.innerHTML = "";
  if (!lista.length) {
    contenedor.innerHTML = `<div class="sin-resultados"><p class="emoji-grande">${ico("buscar")}</p><p>No encontré esa clasificación.</p></div>`;
    pintarPaginacion("clasificaciones", { paginas: 1, items: [], inicio: 0, total: 0 });
    return;
  }
  const pág = trozoPagina("clasificaciones", lista);
  pág.items.forEach((clas) => {
    const t = document.createElement("article");
    t.className = "tarjeta-texto " + claseSistema(clas.sistema);
    t.innerHTML = `
      <div class="insignias">
        <span class="insignia sistema">${escapar(clas.sistema)}</span>
        <span class="insignia modalidad ${claseModalidad(clas.modalidad)}">${escapar(clas.modalidad)}</span>
        <span class="insignia nivel">${(clas.grados || []).length} grados</span>
      </div>
      <h3>${escapar(clas.nombre)}</h3>
      <p>${escapar((clas.paraQue || "").slice(0, 130))}…</p>`;
    t.addEventListener("click", () => abrirClasificacion(clas));
    contenedor.appendChild(t);
  });
  pintarPaginacion("clasificaciones", pág);
}

function abrirClasificacion(clas) {
  document.getElementById("clas-insignias").innerHTML =
    `<span class="insignia">${escapar(clas.sistema)}</span>
     <span class="insignia modalidad ${claseModalidad(clas.modalidad)}">${escapar(clas.modalidad)}</span>`;
  document.getElementById("clas-nombre").textContent = clas.nombre;
  document.getElementById("clas-paraque").textContent = clas.paraQue || "";
  document.getElementById("clas-comousarla").textContent = clas.comoUsarla || "";
  document.getElementById("clas-limitaciones").textContent = clas.limitaciones || "";
  document.getElementById("clas-lim-seccion").classList.toggle("oculta", !clas.limitaciones);
  document.getElementById("clas-grados").innerHTML = (clas.grados || [])
    .map((g) => `<tr><td><strong>${escapar(g.grado)}</strong></td><td>${escapar(g.criterio)}</td><td>${escapar(g.implicacion)}</td></tr>`)
    .join("");
  document.getElementById("modal-clasificacion").classList.remove("oculta");
  document.body.style.overflow = "hidden";
}

function cerrarClasificacion() {
  document.getElementById("modal-clasificacion").classList.add("oculta");
  document.body.style.overflow = "";
}

document.getElementById("cerrar-signo").addEventListener("click", cerrarSigno);
document.querySelector("[data-cierra-signo]").addEventListener("click", cerrarSigno);
document.getElementById("cerrar-clasificacion").addEventListener("click", cerrarClasificacion);
document.querySelector("[data-cierra-clasificacion]").addEventListener("click", cerrarClasificacion);
document.getElementById("busqueda-signos").addEventListener("input", () => { PAGINA.signos = 1; pintarSignos(); });
document.getElementById("busqueda-clasificaciones").addEventListener("input", () => { PAGINA.clasificaciones = 1; pintarClasificaciones(); });

/* ============================================================
   Calculadoras
   ============================================================
   Cada calculadora se describe en datos (campos, fórmulas y
   umbrales de interpretación) y este motor la construye y la
   evalúa. Para añadir una nueva basta editar el archivo de
   datos: no hay que tocar este código.
   ============================================================ */

// Evalúa una expresión de la definición con las variables dadas.
// Las expresiones vienen del archivo de datos del propio proyecto,
// nunca de lo que escriba quien usa la aplicación.
function evaluarExpresion(expresion, variables) {
  try {
    const nombres = Object.keys(variables);
    const valores = nombres.map((n) => variables[n]);
    return Function(...nombres, `"use strict"; return (${expresion});`)(...valores);
  } catch {
    return null;
  }
}

// Frase de la última calculadora resuelta, lista para copiar al informe
let ultimoResumenInforme = "";

function pintarCalculadoras() {
  const consulta = normalizar(document.getElementById("busqueda-calculadoras").value);
  const lista = CALCULADORAS.filter((c) =>
    !consulta || normalizar(
      [c.nombre, c.categoria, c.modalidad, c.descripcion, c.formulaTexto].join(" ")
    ).includes(consulta)
  );
  document.getElementById("contador-calculadoras").textContent =
    lista.length === 1 ? "1 calculadora" : `${lista.length} calculadoras`;

  const contenedor = document.getElementById("lista-calculadoras");
  contenedor.innerHTML = "";
  if (!lista.length) {
    contenedor.innerHTML = `<div class="sin-resultados"><p class="emoji-grande">${ico("buscar")}</p><p>No encontré esa calculadora.</p></div>`;
    pintarPaginacion("calculadoras", { paginas: 1, items: [], inicio: 0, total: 0 });
    return;
  }
  const pág = trozoPagina("calculadoras", lista);
  pág.items.forEach((calc) => {
    const t = document.createElement("article");
    t.className = "tarjeta-texto";
    t.innerHTML = `
      <div class="insignias">
        <span class="insignia categoria">${escapar(calc.categoria)}</span>
        <span class="insignia modalidad ${claseModalidad(calc.modalidad)}">${escapar(calc.modalidad)}</span>
      </div>
      <h3>${escapar(calc.nombre)}</h3>
      <p>${escapar((calc.descripcion || "").slice(0, 120))}…</p>`;
    t.addEventListener("click", () => abrirCalculadora(calc));
    contenedor.appendChild(t);
  });
  pintarPaginacion("calculadoras", pág);
}

function abrirCalculadora(calc) {
  document.getElementById("calc-insignias").innerHTML =
    `<span class="insignia">${escapar(calc.categoria)}</span>
     <span class="insignia modalidad ${claseModalidad(calc.modalidad)}">${escapar(calc.modalidad)}</span>`;
  document.getElementById("calc-nombre").textContent = calc.nombre;
  document.getElementById("calc-descripcion").textContent = calc.descripcion || "";

  const ponerOpcional = (idSeccion, idCampo, valor) => {
    document.getElementById(idCampo).textContent = valor || "";
    document.getElementById(idSeccion).classList.toggle("oculta", !valor);
  };
  ponerOpcional("calc-formula-seccion", "calc-formula", calc.formulaTexto);
  ponerOpcional("calc-notas-seccion", "calc-notas", calc.notas);

  const form = document.getElementById("calc-formulario");
  form.innerHTML = "";

  if (calc.tipo === "puntuacion") {
    (calc.preguntas || []).forEach((preg) => {
      const grupo = document.createElement("div");
      grupo.className = "calc-grupo";
      grupo.innerHTML = `<label class="calc-etiqueta">${escapar(preg.etiqueta)}</label>`;
      const select = document.createElement("select");
      select.className = "calc-select";
      select.dataset.id = preg.id;
      (preg.opciones || []).forEach((op, i) => {
        const o = document.createElement("option");
        o.value = op.puntos;
        o.textContent = `${op.texto} (${op.puntos > 0 ? "+" : ""}${op.puntos})`;
        if (i === 0) o.selected = true;
        select.appendChild(o);
      });
      grupo.appendChild(select);
      form.appendChild(grupo);
    });
  } else {
    (calc.campos || []).forEach((campo) => {
      const grupo = document.createElement("div");
      grupo.className = "calc-grupo";
      grupo.innerHTML = `
        <label class="calc-etiqueta" for="campo-${campo.id}">${escapar(campo.etiqueta)}</label>
        <input class="calc-input" type="number" id="campo-${campo.id}" data-id="${campo.id}"
               step="${campo.paso || 0.1}" ${campo.min !== undefined ? `min="${campo.min}"` : ""}
               placeholder="0">`;
      form.appendChild(grupo);
    });
  }

  form.addEventListener("input", () => calcular(calc));
  form.addEventListener("change", () => calcular(calc));
  document.getElementById("calc-salida").classList.add("oculta");

  document.getElementById("modal-calculadora").classList.remove("oculta");
  document.body.style.overflow = "hidden";
  if (calc.tipo === "puntuacion") calcular(calc);
}

function calcular(calc) {
  const form = document.getElementById("calc-formulario");
  const salida = document.getElementById("calc-salida");
  const variables = {};
  let listo = true;

  if (calc.tipo === "puntuacion") {
    let total = calc.base || 0;
    form.querySelectorAll("select").forEach((s) => { total += Number(s.value); });
    variables.total = total;
    document.getElementById("calc-resultados").innerHTML =
      `<div class="calc-resultado"><span class="calc-resultado-etiqueta">Puntuación total</span>
       <span class="calc-resultado-valor">${total}</span></div>`;
  } else {
    form.querySelectorAll("input").forEach((i) => {
      const v = parseFloat(i.value);
      if (Number.isNaN(v)) listo = false;
      variables[i.dataset.id] = v;
    });
    if (!listo) { salida.classList.add("oculta"); return; }

    const filas = (calc.resultados || []).map((res, i) => {
      const valor = evaluarExpresion(res.formula, variables);
      variables["r" + i] = valor;
      const texto = valor === null || Number.isNaN(valor)
        ? "n/d"
        : Number(valor).toFixed(res.decimales !== undefined ? res.decimales : 2);
      return `<div class="calc-resultado">
                <span class="calc-resultado-etiqueta">${escapar(res.etiqueta)}</span>
                <span class="calc-resultado-valor">${texto} <small>${escapar(res.unidad || "")}</small></span>
              </div>`;
    });
    document.getElementById("calc-resultados").innerHTML = filas.join("");
  }

  // La interpretación gana la primera condición verdadera
  const interp = document.getElementById("calc-interpretacion");
  const regla = (calc.interpretacion || []).find((r) => evaluarExpresion(r.si, variables) === true);
  if (regla) {
    interp.textContent = regla.texto;
    interp.className = "calc-interpretacion nivel-" + (regla.nivel || "normal");
    interp.classList.remove("oculta");
  } else {
    interp.classList.add("oculta");
  }

  // Frase lista para pegar en un informe radiológico
  const partes = [];
  if (calc.tipo === "puntuacion") {
    partes.push("Puntuación total " + variables.total);
  } else {
    (calc.resultados || []).forEach((res, i) => {
      const v = variables["r" + i];
      const texto = v === null || Number.isNaN(v)
        ? "n/d"
        : Number(v).toFixed(res.decimales !== undefined ? res.decimales : 2);
      partes.push(res.etiqueta + " " + texto + (res.unidad ? " " + res.unidad : ""));
    });
  }
  ultimoResumenInforme = calc.nombre + ". " + partes.join(", ") + "." + (regla ? " " + regla.texto : "");

  salida.classList.remove("oculta");
}

function cerrarCalculadora() {
  document.getElementById("modal-calculadora").classList.add("oculta");
  document.body.style.overflow = "";
}
document.getElementById("cerrar-calculadora").addEventListener("click", cerrarCalculadora);
document.querySelector("[data-cierra-calculadora]").addEventListener("click", cerrarCalculadora);
document.getElementById("busqueda-calculadoras").addEventListener("input", () => { PAGINA.calculadoras = 1; pintarCalculadoras(); });

// Copiar el resultado como frase lista para el informe
const botonCopiar = document.getElementById("calc-copiar");
if (botonCopiar) {
  botonCopiar.addEventListener("click", async () => {
    if (!ultimoResumenInforme) return;
    try {
      await navigator.clipboard.writeText(ultimoResumenInforme);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = ultimoResumenInforme;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch {}
      document.body.removeChild(ta);
    }
    const span = botonCopiar.querySelector("span");
    const original = span.textContent;
    span.textContent = "Copiado";
    botonCopiar.classList.add("copiado");
    setTimeout(() => { span.textContent = original; botonCopiar.classList.remove("copiado"); }, 1600);
  });
}

/* ============================================================
   Glosario
   ============================================================ */
function pintarGlosario() {
  const consulta = normalizar(document.getElementById("busqueda-glosario").value);
  const lista = document.getElementById("lista-glosario");
  const terminos = GLOSARIO.filter((t) =>
    !consulta || normalizar(`${t.termino} ${t.definicion} ${t.categoria || ""}`).includes(consulta)
  );
  if (!terminos.length) {
    lista.innerHTML = `<div class="sin-resultados"><p class="emoji-grande">${ico("buscar")}</p><p>No encontré ese término.</p></div>`;
    pintarPaginacion("glosario", { paginas: 1, items: [], inicio: 0, total: 0 });
    return;
  }
  const pág = trozoPagina("glosario", terminos);
  lista.innerHTML = pág.items.map((t) =>
    `<div class="termino">
       ${t.categoria ? `<span class="insignia categoria">${escapar(t.categoria)}</span>` : ""}
       <h3>${escapar(t.termino)}</h3>
       <p>${escapar(t.definicion)}</p>
     </div>`).join("");
  pintarPaginacion("glosario", pág);
}

/* ============================================================
   Modo estudio
   ============================================================ */
const TOTAL_PREGUNTAS = 8;
let preguntasQuiz = [], indicePregunta = 0, puntos = 0;

function empezarQuiz() {
  const conImagen = FICHAS.filter((f) => f.imagen);
  preguntasQuiz = mezclar(conImagen).slice(0, Math.min(TOTAL_PREGUNTAS, conImagen.length));
  indicePregunta = 0; puntos = 0;
  document.getElementById("quiz-inicio").classList.add("oculta");
  document.getElementById("quiz-final").classList.add("oculta");
  document.getElementById("quiz-pregunta").classList.remove("oculta");
  mostrarPregunta();
}

function mostrarPregunta() {
  const correcta = preguntasQuiz[indicePregunta];
  document.getElementById("quiz-numero").textContent =
    `Pregunta ${indicePregunta + 1} de ${preguntasQuiz.length}`;
  document.getElementById("quiz-puntos").textContent = puntos;
  const barra = document.getElementById("quiz-barra-relleno");
  if (barra) barra.style.width = `${(indicePregunta / preguntasQuiz.length) * 100}%`;

  const imagen = document.getElementById("quiz-imagen");
  imagen.src = correcta.imagen;
  imagen.onerror = () => { imagen.src = IMAGEN_RESERVA; };

  // Distractores preferentemente del mismo sistema, para que cueste más
  const mismoSistema = FICHAS.filter((f) => f.codigo !== correcta.codigo && f.sistema === correcta.sistema);
  const otros = FICHAS.filter((f) => f.codigo !== correcta.codigo && f.sistema !== correcta.sistema);
  const distractores = [...mezclar(mismoSistema), ...mezclar(otros)].slice(0, 3);
  const opciones = mezclar([correcta, ...distractores]);

  const contenedor = document.getElementById("quiz-opciones");
  contenedor.innerHTML = "";
  opciones.forEach((opcion) => {
    const boton = document.createElement("button");
    boton.className = "quiz-opcion";
    boton.textContent = opcion.titulo;
    boton.addEventListener("click", () => responder(boton, opcion, correcta));
    contenedor.appendChild(boton);
  });

  document.getElementById("quiz-retro").classList.add("oculta");
  document.getElementById("boton-siguiente").classList.add("oculta");
}

function responder(botonElegido, opcion, correcta) {
  document.querySelectorAll(".quiz-opcion").forEach((b) => {
    b.disabled = true;
    if (b.textContent === correcta.titulo) b.classList.add("correcta");
  });
  const retro = document.getElementById("quiz-retro");
  if (opcion.codigo === correcta.codigo) {
    puntos++;
    retro.className = "quiz-retro bien";
    retro.innerHTML = `${ico("check")} <span><strong>¡Correcto!</strong> ${escapar(correcta.hallazgos || "")}</span>`;
  } else {
    botonElegido.classList.add("incorrecta");
    retro.className = "quiz-retro mal";
    retro.innerHTML = `${ico("equis")} <span><strong>Era:</strong> ${escapar(correcta.titulo)}. ${escapar(correcta.hallazgos || "")}</span>`;
  }
  retro.classList.remove("oculta");
  document.getElementById("quiz-puntos").textContent = puntos;
  document.getElementById("boton-siguiente").classList.remove("oculta");
}

function siguientePregunta() {
  indicePregunta++;
  if (indicePregunta < preguntasQuiz.length) {
    mostrarPregunta();
  } else {
    const barra = document.getElementById("quiz-barra-relleno");
    if (barra) barra.style.width = "100%";
    document.getElementById("quiz-pregunta").classList.add("oculta");
    document.getElementById("quiz-final").classList.remove("oculta");
    const mensaje =
      puntos === preguntasQuiz.length ? "🏆 ¡Perfecto! Dominas el tema." :
      puntos >= preguntasQuiz.length * 0.6 ? "💪 ¡Muy bien! Vas por buen camino." :
      "📚 Sigue practicando, ¡tú puedes!";
    document.getElementById("quiz-resultado-final").textContent =
      `Acertaste ${puntos} de ${preguntasQuiz.length}. ${mensaje}`;
  }
}

document.getElementById("boton-empezar").addEventListener("click", empezarQuiz);
document.getElementById("boton-siguiente").addEventListener("click", siguientePregunta);
document.getElementById("boton-reiniciar").addEventListener("click", empezarQuiz);
document.getElementById("campo-busqueda").addEventListener("input", () => { PAGINA.catalogo = 1; pintarGaleria(); });
document.getElementById("busqueda-glosario").addEventListener("input", () => { PAGINA.glosario = 1; pintarGlosario(); });

/* ============================================================
   Interacciones de la interfaz
   ============================================================ */

// Conmutador de tema claro / oscuro
const botonTema = document.getElementById("conmutar-tema");
if (botonTema) {
  botonTema.addEventListener("click", () => {
    const actual = document.documentElement.dataset.tema === "oscuro" ? "claro" : "oscuro";
    document.documentElement.dataset.tema = actual;
    try { localStorage.setItem("tema", actual); } catch {}
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", actual === "oscuro" ? "#0b1220" : "#0e7490");
  });
}

// Barra de progreso de lectura y botón de volver arriba
const barraScroll = document.getElementById("barra-scroll");
const irArriba = document.getElementById("ir-arriba");
function alDesplazar() {
  const alto = document.documentElement.scrollHeight - window.innerHeight;
  const pct = alto > 0 ? (window.scrollY / alto) * 100 : 0;
  if (barraScroll) barraScroll.style.width = pct + "%";
  if (irArriba) irArriba.classList.toggle("visible", window.scrollY > 500);
}
window.addEventListener("scroll", alDesplazar, { passive: true });
if (irArriba) irArriba.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

/* ============================================================
   Arranque
   ============================================================ */
Object.assign(REPINTAR, {
  catalogo: pintarGaleria,
  signos: pintarSignos,
  clasificaciones: pintarClasificaciones,
  calculadoras: pintarCalculadoras,
  glosario: pintarGlosario,
});

(async () => {
  await cargarDatos();
  iniciarFiltros();
  pintarGaleria();
  pintarGlosario();
  pintarTemas();
  pintarSignos();
  pintarClasificaciones();
  pintarCalculadoras();
  alDesplazar();
})();
