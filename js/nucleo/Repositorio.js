/*
 * Almacén de las seis colecciones del atlas.
 * Los datos se piden a la API que sirve MongoDB y, cuando no hay servidor, la lectura cae a los archivos JSON de la carpeta data.
 * De ese modo la misma página funciona con Docker y con Node a secas.
 */
export class Repositorio {
  constructor() {
    this.fichas = [];
    this.glosario = [];
    this.temas = [];
    this.signos = [];
    this.clasificaciones = [];
    this.calculadoras = [];
    this.origen = "archivos locales";
  }

  /*
   * Pide una dirección y, si no responde, vuelve a intentarlo con el archivo de respaldo.
   * Cuando fallan las dos se devuelve una lista vacía, porque una sección sin contenido es preferible a una página que no arranca.
   */
  async pedir(url, respaldo) {
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

  // Carga las seis colecciones a la vez, dado que ninguna depende de las demás.
  async cargar() {
    const [fichas, glosario, temas, signos, clasificaciones, calculadoras, info] = await Promise.all([
      this.pedir("/api/fichas", "data/fichas.json"),
      this.pedir("/api/glosario", "data/glosario.json"),
      this.pedir("/api/temas", "data/temas.json"),
      this.pedir("/api/signos", "data/signos.json"),
      this.pedir("/api/clasificaciones", "data/clasificaciones.json"),
      this.pedir("/api/calculadoras", "data/calculadoras.json"),
      fetch("/api/estado").then((r) => r.json()).catch(() => null),
    ]);

    this.fichas = fichas;
    this.glosario = glosario;
    this.temas = temas;
    this.signos = signos;
    this.clasificaciones = clasificaciones;
    this.calculadoras = calculadoras;
    this.origen = info && info.origen === "mongodb" ? "MongoDB" : "archivos locales";
    return this;
  }

  // Frase del pie que dice cuánto contenido hay cargado y de dónde salió.
  get resumen() {
    return (
      `${this.fichas.length} fichas · ${this.signos.length} signos · ${this.clasificaciones.length} clasificaciones · ` +
      `${this.calculadoras.length} calculadoras · ${this.glosario.length} términos · ${this.temas.length} temas · ` +
      `datos desde ${this.origen}`
    );
  }
}
