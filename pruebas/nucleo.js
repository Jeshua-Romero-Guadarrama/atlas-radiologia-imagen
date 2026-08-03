/*
 * Pruebas de las utilidades del núcleo y de la paginación.
 * Son las piezas que usan todas las secciones, de modo que un fallo aquí se multiplica por seis pantallas.
 */

module.exports = function (contexto, s) {
  const { normalizar, Paginador, SeccionGlosario } = contexto;

  s.suite("Catálogos compartidos entre cliente y servidor");

  /*
   * El cliente ordena sus chips con las listas de js/nucleo/Catalogos.js y el validador acepta contenido con las de server/colecciones.js.
   * Las dos copias ya divergieron una vez, motivo por el cual aquí se exige que sean la misma lista.
   */
  const colecciones = require("../server/colecciones.js");
  s.comprobar("los sistemas del cliente y del servidor son la misma lista",
    contexto.ORDEN_SISTEMAS, colecciones.SISTEMAS);
  s.comprobar("las modalidades del cliente y del servidor son la misma lista",
    contexto.ORDEN_MODALIDADES, colecciones.MODALIDADES);

  s.suite("Normalización de texto para la búsqueda");

  s.comprobar("pasa a minúsculas y quita las tildes", normalizar("TÓRAX"), "torax");
  s.comprobar("quita la tilde inicial", normalizar("Águila"), "aguila");
  s.comprobar("la diéresis también se retira", normalizar("pingüino"), "pinguino");
  s.comprobar("una entrada vacía devuelve texto vacío", normalizar(""), "");
  s.comprobar("una entrada nula devuelve texto vacío", normalizar(null), "");

  /*
   * La eñe se conserva porque es una letra distinta del alfabeto: sin el centinela que la aparta antes de la descomposición NFD, "año" y "ano" quedaban iguales para la búsqueda.
   */
  s.comprobar("la eñe se conserva y año no iguala a ano", normalizar("año"), "año");
  s.comprobar("la eñe mayúscula también se conserva", normalizar("AÑO"), "año");

  s.suite("Inicial de agrupación del glosario");

  // Las tildes se retiran para agrupar, de modo que ángulo cae bajo la A.
  s.comprobar("ángulo agrupa bajo la A", SeccionGlosario.inicialDe("ángulo"), "A");
  s.comprobar("un término corriente usa su inicial en mayúscula", SeccionGlosario.inicialDe("bazo"), "B");
  // Lo que no empieza por letra, como el fármaco 5-FU, se agrupa bajo el rótulo de cifras.
  s.comprobar("5-FU agrupa bajo cifras y símbolos", SeccionGlosario.inicialDe("5-FU"), "0 a 9");

  s.suite("Números visibles de la paginación");

  // Hasta siete páginas se muestran todas, porque la elipsis solo estorba cuando caben.
  s.comprobar("con cinco páginas salen las cinco", Paginador.numerosVisibles(3, 5), [1, 2, 3, 4, 5]);
  s.comprobar("con siete páginas salen las siete", Paginador.numerosVisibles(1, 7), [1, 2, 3, 4, 5, 6, 7]);

  // A partir de ocho quedan la primera, la última y las vecinas de la actual, con elipsis en los huecos.
  s.comprobar("ocho páginas con la actual en el centro",
    Paginador.numerosVisibles(4, 8), [1, "…", 3, 4, 5, "…", 8]);
  s.comprobar("ocho páginas desde la primera",
    Paginador.numerosVisibles(1, 8), [1, 2, "…", 8]);
  s.comprobar("veinte páginas con la actual en el centro",
    Paginador.numerosVisibles(10, 20), [1, "…", 9, 10, 11, "…", 20]);
  s.comprobar("veinte páginas desde la última",
    Paginador.numerosVisibles(20, 20), [1, "…", 19, 20]);
  s.comprobar("veinte páginas desde la primera",
    Paginador.numerosVisibles(1, 20), [1, 2, "…", 20]);
};
