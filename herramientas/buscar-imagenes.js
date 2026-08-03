/*
 * Busca figuras de radiología en el subconjunto de acceso abierto de PubMed Central.
 * Descarga las figuras candidatas en una carpeta de trabajo y escribe junto a ellas un manifiesto con la licencia, el primer autor y el pie de figura de cada una.
 * De ese modo las candidatas se revisan una por una antes de decidir cuáles sirven, decisión que no conviene automatizar porque una figura correcta para un artículo puede ilustrar mal una ficha.
 * Solo se aceptan licencias libres, en razón de que el atlas muestra las imágenes y debe poder redistribuirlas (las cláusulas no comercial y sin obra derivada quedan descartadas).
 * Se ejecuta con node herramientas/buscar-imagenes.js "<consulta en inglés>" <carpeta destino> [máximo de artículos].
 */

const fs = require("fs");
const path = require("path");

/*
 * La identificación del programa acompaña a cada petición porque el servicio consultado la exige a quien consulta de forma automática.
 * Sin ella, las peticiones seguidas se responden con un rechazo por exceso de uso.
 */
const CABECERAS = { "User-Agent": "AtlasRadiologiaImagen/1.0 (proyecto educativo)" };
const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/";
const LICENCIAS_LIBRES = ["CC BY", "CC BY-SA", "CC0", "PUBLIC DOMAIN", "NO-CC BY"];

const espera = (milisegundos) => new Promise((terminar) => setTimeout(terminar, milisegundos));

/*
 * Pide una dirección y reintenta cuando el fallo es pasajero.
 * Se reintenta únicamente ante un rechazo por exceso de uso o ante un error del servidor, puesto que un recurso que sencillamente no existe no va a aparecer por insistir.
 * La espera entre intentos crece con cada uno, de manera que un servicio saturado tiene tiempo de recuperarse.
 */
async function pedir(direccion, tipo = "texto", intentos = 3) {
  for (let intento = 0; intento < intentos; intento++) {
    try {
      const respuesta = await fetch(direccion, { headers: CABECERAS, signal: AbortSignal.timeout(45000) });
      if (respuesta.status === 429 || respuesta.status >= 500) throw new Error("HTTP " + respuesta.status);
      if (!respuesta.ok) return null;
      return tipo === "json" ? await respuesta.json()
           : tipo === "binario" ? Buffer.from(await respuesta.arrayBuffer())
           : await respuesta.text();
    } catch (error) {
      if (intento === intentos - 1) return null;
      await espera(3000 * (intento + 1));
    }
  }
  return null;
}

/*
 * Decide si una licencia permite reutilizar la figura dentro del atlas.
 * Las siglas NC y ND se rechazan de entrada, dado que la primera prohíbe el uso comercial y la segunda impide recortar o adaptar la imagen, condiciones que este proyecto no puede garantizar a quien lo reutilice.
 */
function licenciaAceptable(licencia) {
  if (!licencia) return false;
  const enMayusculas = licencia.toUpperCase();
  if (enMayusculas.includes("NC") || enMayusculas.includes("ND")) return false;
  return LICENCIAS_LIBRES.some((aceptada) => enMayusculas.startsWith(aceptada));
}

/*
 * Reúne el pie de cada figura a partir del artículo, emparejándolo con el nombre del archivo de imagen.
 * El emparejamiento se hace dentro del bloque de la figura porque es el único sitio donde el nombre del archivo y su pie aparecen juntos.
 * El pie importa más que la imagen misma, ya que es lo que permite saber qué se está viendo antes de asignarla a una ficha.
 */
function piesDeFigura(html) {
  const pies = {};
  for (const bloqueEncontrado of html.matchAll(/<figure[\s\S]{0,6000}?<\/figure>/gi)) {
    const bloque = bloqueEncontrado[0];
    const archivo = bloque.match(/blobs\/[^"'\s]*?\/([\w.-]+\.(?:jpg|png|gif))/i);
    if (!archivo) continue;
    const pie = bloque.match(/<figcaption[\s\S]*?<\/figcaption>/i);
    if (pie) {
      pies[archivo[1]] = pie[0].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400);
    }
  }
  return pies;
}

async function main() {
  const consulta = process.argv[2];
  const destino = process.argv[3];
  const maxArticulos = parseInt(process.argv[4] || "5", 10);
  if (!consulta || !destino) {
    console.error('Faltan argumentos. La herramienta necesita al menos la consulta y la carpeta donde dejar las candidatas.');
    console.error('Uso: node herramientas/buscar-imagenes.js "<consulta en inglés>" <carpeta destino> [máximo de artículos]');
    console.error('Ejemplo: node herramientas/buscar-imagenes.js "pneumothorax chest radiograph" trabajo/torax 5');
    process.exit(1);
  }
  fs.mkdirSync(destino, { recursive: true });

  /*
   * La búsqueda se restringe al subconjunto de acceso abierto desde el primer momento.
   * En caso contrario la mayoría de los resultados serían artículos cuyas figuras no se pueden descargar, con lo cual se gastarían peticiones para nada.
   */
  const termino = `${consulta} AND open access[filter]`;
  const busqueda = await pedir(
    `${EUTILS}esearch.fcgi?db=pmc&retmax=${maxArticulos * 3}&retmode=json&term=${encodeURIComponent(termino)}`,
    "json"
  );
  const identificadores = busqueda?.esearchresult?.idlist || [];
  if (!identificadores.length) {
    console.log(JSON.stringify({ consulta, candidatas: [], nota: "La búsqueda no devolvió ningún artículo. Conviene probar con términos en inglés más generales, o con el nombre del signo en lugar del de la enfermedad." }, null, 2));
    return;
  }

  const manifiesto = [];
  let revisados = 0;

  for (const identificador of identificadores) {
    if (revisados >= maxArticulos) break;
    /*
     * Entre peticiones se deja pasar algo más de un segundo.
     * El servicio consultado limita el ritmo de quien lo usa sin credenciales, de modo que ir más deprisa solo consigue que se rechacen las peticiones siguientes.
     */
    await espera(1200);

    const registroAccesoAbierto = await pedir(`https://www.ncbi.nlm.nih.gov/pmc/utils/oa/oa.fcgi?id=PMC${identificador}`);
    if (!registroAccesoAbierto) continue;
    const licencia = (registroAccesoAbierto.match(/license="([^"]+)"/) || [])[1];
    if (!licenciaAceptable(licencia)) continue;
    /*
     * Los artículos retractados se descartan sin mirar sus figuras.
     * La razón es que una imagen procedente de un trabajo retirado puede ilustrar justamente aquello que se demostró incorrecto, lo cual en material de estudio resulta peor que no tener imagen.
     */
    if (/retracted="yes"/.test(registroAccesoAbierto)) continue;
    revisados++;

    await espera(1200);
    const resumen = await pedir(`${EUTILS}esummary.fcgi?db=pmc&retmode=json&id=${identificador}`, "json");
    const informacion = resumen?.result?.[identificador] || {};
    const autor = informacion.authors?.[0]?.name || "Autoría en PubMed Central";
    const tituloArticulo = (informacion.title || "").replace(/<[^>]*>/g, "").slice(0, 160);

    await espera(1200);
    const html = await pedir(`https://pmc.ncbi.nlm.nih.gov/articles/PMC${identificador}/`);
    if (!html) continue;

    const pies = piesDeFigura(html);
    const direccionesDeImagen = [...new Set(
      [...html.matchAll(/https?:\/\/cdn\.ncbi\.nlm\.nih\.gov\/pmc\/blobs\/[^"'\s]+?\.(?:jpg|png)/gi)].map((encontrada) => encontrada[0])
    )];

    /*
     * De cada artículo se toman como mucho tres figuras.
     * Un artículo de revisión puede traer treinta, y descargarlas todas llena la carpeta de material que nadie va a revisar.
     */
    for (const direccion of direccionesDeImagen.slice(0, 3)) {
      await espera(1000);
      const datos = await pedir(direccion, "binario");
      /*
       * Los archivos muy pequeños se descartan sin abrirlos.
       * Por debajo de esos doce mil bytes lo que suele haber son logotipos, flechas y sellos de la revista, en lugar de una figura clínica.
       */
      if (!datos || datos.length < 12000) continue;
      const nombreOriginal = path.basename(direccion);
      const archivo = path.join(destino, `PMC${identificador}-${nombreOriginal}`);
      fs.writeFileSync(archivo, datos);
      manifiesto.push({
        archivo,
        pmcid: `PMC${identificador}`,
        licencia,
        credito: `${autor} · ${licencia} · PubMed Central`,
        tituloArticulo,
        pieDeFigura: pies[nombreOriginal] || "(sin pie recuperado)",
        bytes: datos.length,
      });
    }
  }

  fs.writeFileSync(path.join(destino, "manifiesto.json"), JSON.stringify(manifiesto, null, 2) + "\n");
  console.log(JSON.stringify({ consulta, articulosRevisados: revisados, candidatas: manifiesto.length }, null, 2));
  manifiesto.forEach((candidata) => {
    console.log(`\n${candidata.archivo}\n  ${candidata.pmcid} | ${candidata.licencia}\n  ${candidata.tituloArticulo}\n  ${candidata.pieDeFigura.slice(0, 180)}`);
  });
}

main();
