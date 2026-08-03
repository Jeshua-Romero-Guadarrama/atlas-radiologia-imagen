/*
 * Pruebas del motor de las calculadoras: la escala visual, el margen al umbral, el deslizador y la evaluación de fórmulas.
 * Cada valor esperado está razonado en su comentario a partir de las reglas del motor, con la aritmética hecha a mano.
 */

module.exports = function (contexto, s) {
  const { EscalaDeReferencia, RangoDeCampo, ResolutorDeCalculadora } = contexto;

  s.suite("Escala visual de las calculadoras");

  /*
   * Calculadora de fórmula con dos umbrales sobre r0, al estilo del residuo vesical.
   * Con umbrales 100 y 200 el ancho de referencia es 100, así que el eje va de 100 menos 45 a 200 más 45, es decir, de 55 a 245, con una amplitud de 190.
   */
  const calcResiduo = {
    tipo: "formula",
    resultados: [{ etiqueta: "Residuo", unidad: "ml", decimales: 0 }],
    interpretacion: [
      { si: "r0 > 200", nivel: "alto", texto: "Retención franca" },
      { si: "r0 > 100", nivel: "medio", texto: "Residuo elevado" },
      { si: "true", nivel: "normal", texto: "Residuo normal" }
    ]
  };

  const escala = EscalaDeReferencia.calcular(calcResiduo, { r0: 150 });
  s.comprobar("la escala de umbral simple se construye", Boolean(escala), true);
  s.comprobar("el valor 150 cae en la zona media", escala.nivel, "medio");
  s.comprobar("el valor se escribe con los decimales del resultado", escala.valorTexto, "150");
  s.comprobar("no es una escala de puntuación", escala.esPuntuacion, false);
  s.comprobar("la amplitud del eje es 245 menos 55", escala.amplitud, 190);
  // El valor 150 queda a 95 de 190 unidades del inicio, o sea, en el centro exacto.
  s.casi("el marcador queda al 50 por ciento", escala.posicion, 50);
  s.comprobar("hay una zona por tramo entre umbrales", escala.zonas.map((z) => z.nivel), ["normal", "medio", "alto"]);
  // El corte 100 queda a 45 de 190 unidades del inicio y el corte 200 a 145 de 190.
  s.comprobar("las marcas conservan el texto original del umbral", escala.marcas.map((m) => m.texto), ["100", "200"]);
  s.casi("la marca del 100 queda a 45 de 190", escala.marcas[0].posicion, (45 / 190) * 100);
  s.casi("la marca del 200 queda a 145 de 190", escala.marcas[1].posicion, (145 / 190) * 100);

  /*
   * Cuando las reglas combinan dos variables no hay un eje único que dibujar y el motor debe devolver null.
   * Se toma una calculadora real del proyecto cuya primera regla es una disyunción entre r0 y r1.
   */
  const lavado = s.leerDatos("calculadoras.json").find((c) => c.codigo === "lavado-contraste-suprarrenal");
  s.comprobar("existe la calculadora real con reglas combinadas", Boolean(lavado), true);
  s.comprobar("las reglas con dos variables no forman escala", EscalaDeReferencia.calcular(lavado, { r0: 70, r1: 50 }), null);

  /*
   * Escala de puntuación con dos preguntas que suman de 0 a 4 puntos.
   * El eje de una puntuación va del mínimo al máximo sumables, sin holguras.
   */
  const calcPuntos = {
    tipo: "puntuacion",
    base: 0,
    preguntas: [
      { opciones: [{ puntos: 0 }, { puntos: 1 }, { puntos: 2 }] },
      { opciones: [{ puntos: 0 }, { puntos: 2 }] }
    ],
    interpretacion: [
      { si: "total >= 3", nivel: "alto", texto: "Riesgo alto" },
      { si: "true", nivel: "normal", texto: "Riesgo bajo" }
    ]
  };

  const puntos = EscalaDeReferencia.calcular(calcPuntos, { total: 2 });
  s.comprobar("la escala se reconoce como puntuación", puntos.esPuntuacion, true);
  s.comprobar("una puntuación se escribe sin decimales", puntos.valorTexto, "2");
  s.comprobar("dos puntos de cuatro no llegan al tramo alto", puntos.nivel, "normal");
  // El eje va de 0 a 4, de modo que el 2 queda en el centro y el corte 3 al 75 por ciento.
  s.casi("el marcador queda en el centro del eje", puntos.posicion, 50);
  s.comprobar("las zonas parten el eje en el corte 3", puntos.zonas.map((z) => [z.nivel, z.desde]), [["normal", 0], ["alto", 75]]);

  s.suite("Margen hasta el umbral vecino");

  // A mitad de tramo el resultado dista 50 ml de cada umbral y no procede el aviso de cercanía.
  const margenCentro = EscalaDeReferencia.margen(escala);
  s.comprobar("frase con la distancia a los dos umbrales", margenCentro.texto,
    "Quedan 50 ml hasta el umbral 200. Supera en 50 ml el umbral 100.");
  s.comprobar("a mitad de tramo no avisa de cercanía", margenCentro.cerca, false);

  // Justo en el corte la distancia al umbral inferior es cero y sí procede avisar, porque el error de medición puede cambiar el tramo.
  const enCorte = EscalaDeReferencia.margen(EscalaDeReferencia.calcular(calcResiduo, { r0: 200 }));
  s.comprobar("en el corte la frase dice que coincide y pide repetir la medición", enCorte.texto,
    "El valor coincide con el umbral 200. El resultado queda pegado al umbral (conviene repetir la medición antes de decidir).");
  s.comprobar("en el corte avisa de que conviene repetir la medición", enCorte.cerca, true);

  // En las escalas de puntos caer en el umbral es lo normal y el aviso sería ruido, así que nunca se marca cercanía.
  const margenPuntos = EscalaDeReferencia.margen(EscalaDeReferencia.calcular(calcPuntos, { total: 2 }));
  s.comprobar("con puntos usa el singular de punto", margenPuntos.texto, "Queda 1 punto hasta el umbral 3.");
  s.comprobar("las puntuaciones no avisan de cercanía", margenPuntos.cerca, false);

  s.suite("Deslizador de los campos numéricos");

  // El techo bonito sube hasta la cifra redonda siguiente de la misma magnitud.
  s.comprobar("7 sube a 8", RangoDeCampo.techoBonito(7), 8);
  s.comprobar("95 sube a 100", RangoDeCampo.techoBonito(95), 100);
  s.comprobar("0.34 sube a 0.4", RangoDeCampo.techoBonito(0.34), 0.4);
  s.comprobar("1000 ya es redondo y se queda", RangoDeCampo.techoBonito(1000), 1000);
  s.comprobar("cero no tiene magnitud y devuelve 0", RangoDeCampo.techoBonito(0), 0);
  s.comprobar("un negativo devuelve 0", RangoDeCampo.techoBonito(-3), 0);

  // Con min y max declarados el rango los respeta y el paso del campo alcanza.
  s.comprobar("rango con extremos declarados",
    RangoDeCampo.rango({ paso: 1, min: 0, max: 10 }, undefined),
    { min: 0, max: 10, pasoDeslizador: 1, decimales: 0 });

  /*
   * Sin extremos declarados el rango se deriva del ejemplo: con muestra 5 y paso 0.1 la base es 5, el techo se calcula sobre 5 más 6 y sube a 15, y el suelo baja a menos 1.
   */
  s.comprobar("rango derivado del valor de ejemplo",
    RangoDeCampo.rango({ paso: 0.1 }, 5),
    { min: -1, max: 15, pasoDeslizador: 0.1, decimales: 1 });

  // Un recorrido de 2000 con paso 1 exigiría 2000 pulsaciones, así que el paso del deslizador se multiplica hasta 5, que da 400 saltos justos.
  s.comprobar("el paso crece en los recorridos largos",
    RangoDeCampo.rango({ paso: 1, min: 0, max: 2000 }, undefined).pasoDeslizador, 5);

  s.suite("Evaluación de fórmulas con datos reales");

  const calculadoras = s.leerDatos("calculadoras.json");
  const formulaDe = (codigo) => calculadoras.find((c) => c.codigo === codigo).resultados[0].formula;

  // Mosteller con 90 kg y 160 cm: la raíz de 90 por 160 entre 3600 es la raíz de 4, es decir, 2.
  s.comprobar("superficie corporal de Mosteller",
    ResolutorDeCalculadora.evaluarExpresion(formulaDe("superficie-corporal-mosteller"), { peso: 90, talla: 160 }), 2);

  // Volumen ABC entre 2 con diámetros 4, 3 y 2: 24 entre 2 son 12 mL.
  s.comprobar("volumen de hematoma por ABC entre 2",
    ResolutorDeCalculadora.evaluarExpresion(formulaDe("volumen-hematoma-abc2"), { a: 4, b: 3, c: 2 }), 12);

  // Índice cardiotorácico con 12 y 24: la división da exactamente 0.5.
  s.comprobar("índice cardiotorácico",
    ResolutorDeCalculadora.evaluarExpresion(formulaDe("indice-cardiotoracico"), { cardiaco: 12, toracico: 24 }), 0.5);

  // Una expresión rota no debe tumbar la aplicación, sino devolver null.
  s.comprobar("una fórmula malformada devuelve null",
    ResolutorDeCalculadora.evaluarExpresion("peso +", { peso: 1 }), null);

  s.suite("Resolución completa de una calculadora");

  /*
   * Calculadora sintética de fórmula con un solo resultado, para razonar cada valor a mano.
   * Con a 1 y b 2 el cociente es 0.5, que con dos decimales se escribe "0.50" y no supera el umbral de la primera regla, así que gana la regla por defecto.
   */
  const calcPrueba = {
    tipo: "formula",
    nombre: "Prueba",
    resultados: [{ etiqueta: "Índice", formula: "a / b", unidad: "", decimales: 2 }],
    interpretacion: [
      { si: "r0 > 0.5", nivel: "alto", texto: "Alto" },
      { si: "true", nivel: "normal", texto: "Normal" }
    ]
  };

  const variablesPrueba = { a: 1, b: 2 };
  const filas = ResolutorDeCalculadora.filasDeResultados(calcPrueba, variablesPrueba);
  s.comprobar("la fila del resultado escribe el valor con sus decimales",
    filas.map((f) => [f.etiqueta, f.texto]), [["Índice", "0.50"]]);
  s.comprobar("el resultado queda disponible como variable r0", variablesPrueba.r0, 0.5);
  s.comprobar("gana la primera regla cuya condición se cumple",
    ResolutorDeCalculadora.reglaActiva(calcPrueba, variablesPrueba).texto, "Normal");
  s.comprobar("la frase del informe junta nombre, resultados e interpretación",
    ResolutorDeCalculadora.fraseInforme(calcPrueba, variablesPrueba,
      ResolutorDeCalculadora.reglaActiva(calcPrueba, variablesPrueba)),
    "Prueba. Índice 0.50. Normal");

  // Una fórmula rota produce la fila "n/d" en lugar de tumbar la ventana.
  const calcRota = { tipo: "formula", nombre: "Rota", resultados: [{ etiqueta: "Valor", formula: "a +" }] };
  s.comprobar("una fórmula rota pinta n/d en su fila",
    ResolutorDeCalculadora.filasDeResultados(calcRota, { a: 1 })[0].texto, "n/d");

  // En una escala de puntos la frase del informe dice la puntuación total.
  const calcSuma = { tipo: "puntuacion", nombre: "Escala", interpretacion: [{ si: "true", texto: "Riesgo bajo" }] };
  s.comprobar("la frase de una puntuación dice el total",
    ResolutorDeCalculadora.fraseInforme(calcSuma, { total: 3 },
      ResolutorDeCalculadora.reglaActiva(calcSuma, { total: 3 })),
    "Escala. Puntuación total 3. Riesgo bajo");
};
