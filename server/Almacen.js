/*
 * Almacén de datos del servidor.
 * Encapsula el acceso al contenido: Lee los JSON del repositorio al arrancar y, si hay MongoDB disponible, los siembra allí y sirve desde la base.
 * Si MongoDB no está o falla, sigue sirviendo desde los archivos sin que las rutas se enteren, de modo que una base caída nunca deja el atlas inservible.
 */

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { MongoClient } = require("mongodb");
const { COLECCIONES } = require("./colecciones");

class Almacen {
  constructor({ raiz, uriMongo, nombreBd }) {
    this.raiz = raiz;
    this.uriMongo = uriMongo;
    this.nombreBd = nombreBd;
    this.bd = null;
    this.cliente = null;
    /*
     * Copia completa del contenido en memoria, leída una sola vez durante el arranque.
     * De ese modo, cuando la base de datos no responde a una consulta, la respuesta se sirve desde esta copia sin volver a tocar el disco.
     */
    this.respaldo = {};
    for (const nombre of COLECCIONES) {
      this.respaldo[nombre] = this.leerJson(`${nombre}.json`);
    }
  }

  // Lee un JSON de data. Devuelve lista vacía si no existe, para que el servidor arranque igual mientras se va añadiendo contenido.
  leerJson(nombre) {
    try {
      const ruta = path.join(this.raiz, "data", nombre);
      return JSON.parse(fs.readFileSync(ruta, "utf8"));
    } catch {
      return [];
    }
  }

  // Indica de dónde se están sirviendo los datos.
  get origen() {
    return this.bd ? "mongodb" : "archivos";
  }

  // Número de documentos de cada colección, tomado de los archivos porque son la fuente de la que se siembra la base.
  get totales() {
    return Object.fromEntries(COLECCIONES.map((c) => [c, this.respaldo[c].length]));
  }

  // Conecta con MongoDB, siembra las colecciones que hayan cambiado y deja creados los índices de consulta.
  async conectar() {
    this.cliente = new MongoClient(this.uriMongo, { serverSelectionTimeoutMS: 5000 });
    await this.cliente.connect();
    this.bd = this.cliente.db(this.nombreBd);

    for (const nombre of COLECCIONES) {
      if (!this.respaldo[nombre].length) continue;
      await this.sembrarSiCambio(nombre);
    }

    /*
     * El índice de texto se declara en español para que MongoDB reconozca las palabras vacías y las raíces del idioma.
     * A ello se suma un índice compuesto por sistema y modalidad, que son los dos filtros de la portada del catálogo.
     */
    await this.bd.collection("fichas").createIndex(
      { titulo: "text", descripcion: "text", hallazgos: "text", perlas: "text", etiquetas: "text" },
      { default_language: "spanish", name: "busqueda_texto" }
    );
    await this.bd.collection("fichas").createIndex({ sistema: 1, modalidad: 1 });
  }

  /*
   * Para decidir si una colección hay que volver a sembrarla se compara una huella del contenido y no el número de documentos.
   * Dicha decisión viene de un fallo real, puesto que al corregir el texto de una ficha sin cambiar cuántas fichas hay la base se quedaba sirviendo la versión anterior.
   * Con la huella, cualquier retoque del archivo, por pequeño que sea, obliga a rehacer la colección.
   */
  async sembrarSiCambio(nombre) {
    const huella = crypto
      .createHash("sha1")
      .update(JSON.stringify(this.respaldo[nombre]))
      .digest("hex");

    const marca = await this.bd.collection("_huellas").findOne({ _id: nombre });
    if (marca && marca.huella === huella) return;

    const coleccion = this.bd.collection(nombre);
    await coleccion.deleteMany({});
    await coleccion.insertMany(this.respaldo[nombre]);
    await this.bd.collection("_huellas").updateOne(
      { _id: nombre },
      { $set: { huella, actualizado: new Date() } },
      { upsert: true }
    );
    console.log(`  Colección "${nombre}": ${this.respaldo[nombre].length} documentos cargados`);
  }

  /*
   * Devuelve los documentos de una colección, desde la base cuando responde y desde el respaldo cuando no.
   * Una colección vacía en la base se trata como si la base no estuviera, porque ese caso ocurre cuando la siembra quedó a medias y conviene servir el archivo antes que devolver una sección en blanco.
   */
  async obtener(nombre) {
    let docs;
    try {
      docs = this.bd
        ? await this.bd.collection(nombre).find({}).project({ _id: 0 }).toArray()
        : this.respaldo[nombre];
    } catch {
      docs = this.respaldo[nombre];
    }
    if (!docs || !docs.length) docs = this.respaldo[nombre];
    return docs;
  }

  /*
   * Documentos del respaldo de una colección, sin tocar la base.
   * Es la respuesta de emergencia de las rutas cuando obtener falla, para que el detalle de dónde viven los datos no se salga de esta clase.
   */
  todo(nombre) {
    return this.respaldo[nombre] || [];
  }

  // Busca un documento por su código, con la misma caída al respaldo que el resto de consultas.
  async porCodigo(nombre, codigo) {
    try {
      if (this.bd) {
        const doc = await this.bd.collection(nombre).findOne({ codigo }, { projection: { _id: 0 } });
        if (doc) return doc;
      }
    } catch {
      // Se cae al respaldo.
    }
    return this.respaldo[nombre].find((d) => d.codigo === codigo) || null;
  }

  /*
   * Deja el texto en minúsculas y sin acentos para poder compararlo, igual que hace el cliente.
   * La razón es que quien busca suele escribir sin acentuar, motivo por el cual "torax" tiene que encontrar igualmente "tórax".
   */
  static normalizar(texto) {
    // La eñe se aparta con un centinela antes de descomponer, porque NFD la separa en ene y tilde y en este corpus «año» y «ano» colisionan.
    return (texto || "")
      .toLowerCase()
      .replace(/ñ/g, "\u0001")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\u0001/g, "ñ");
  }

  // Texto plano de un campo para la búsqueda: Las listas se aplanan y los objetos se vuelcan tal cual.
  static textoDeCampo(valor) {
    if (valor === undefined || valor === null) return "";
    if (typeof valor === "string") return valor;
    if (Array.isArray(valor) && valor.every((v) => typeof v === "string")) return valor.join(" ");
    return JSON.stringify(valor);
  }

  /*
   * Filtra las fichas recorriendo todo su texto y no solo el título.
   * Cada palabra de la consulta debe aparecer en alguna parte de la ficha, de manera que escribir dos términos estrecha el resultado en lugar de ampliarlo.
   */
  static filtrarFichas(fichas, campos, { consulta, sistema, modalidad }) {
    return fichas.filter((ficha) => {
      if (sistema && sistema !== "Todos" && ficha.sistema !== sistema) return false;
      if (modalidad && modalidad !== "Todas" && ficha.modalidad !== modalidad) return false;
      if (!consulta) return true;
      const texto = Almacen.normalizar(campos.map((c) => Almacen.textoDeCampo(ficha[c])).join(" "));
      return Almacen.normalizar(consulta).split(/\s+/).filter(Boolean).every((palabra) => texto.includes(palabra));
    });
  }

  // Búsqueda de frase entera en los campos indicados, que es como consultan el glosario y las colecciones de texto.
  static buscarFrase(docs, campos, consulta) {
    if (!consulta) return docs;
    const normalizada = Almacen.normalizar(consulta);
    return docs.filter((doc) =>
      Almacen.normalizar(campos.map((c) => Almacen.textoDeCampo(doc[c])).join(" ")).includes(normalizada)
    );
  }
}

module.exports = { Almacen };
