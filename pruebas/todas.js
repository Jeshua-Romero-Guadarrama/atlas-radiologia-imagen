/*
 * Orquestador de las pruebas del atlas.
 * Se ejecuta con node pruebas/todas.js desde la raíz, o con npm run probar desde la carpeta server.
 * No usa nada fuera de Node, así que corre en cualquier equipo con el repositorio recién clonado.
 *
 * El servidor no se prueba aquí porque server/index.js abre el puerto al importarse y server/validar.js es un guion completo con su propia salida.
 * La lógica que comparten con el cliente, es decir, la normalización y la evaluación de fórmulas, sí queda cubierta por estas suites.
 */

const soporte = require("./soporte.js");

(async () => {
  const contexto = await soporte.montarNavegador();
  require("./calculadoras.js")(contexto, soporte);
  require("./nucleo.js")(contexto, soporte);
  process.exit(soporte.terminar());
})().catch((error) => {
  console.error("Las pruebas no pudieron ni cargarse:", error);
  process.exit(1);
});
