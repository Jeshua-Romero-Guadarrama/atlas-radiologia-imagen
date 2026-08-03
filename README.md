# 🩻 Atlas de Radiología e Imagen

## 1. 📚 Qué es y qué incluye

Atlas de Radiología e Imagen es una aplicación web de estudio de imagenología, organizada por sistemas del cuerpo y por modalidades.
Está pensada para estudiar comparando, puesto que quien la usa busca lo que vio en clase o en prácticas, lo confronta con las imágenes del catálogo y lee qué conviene observar en cada estudio.

Todo el contenido vive dentro del repositorio y todas las imágenes están guardadas en el disco.
En consecuencia la aplicación funciona completa sin conexión a internet, ya que no depende de ningún servicio externo ni enlaza a sitios de terceros.

| Sección | Contenido |
|---|---|
| 📚 Catálogo | Fichas de estudios y hallazgos, con imagen real, técnica, qué observar, hallazgos, diagnóstico diferencial, simuladores, protocolo y perla clínica |
| 🔬 Signos | Signos radiológicos con nombre, con su base fisiopatológica, su significado y cómo recordarlos |
| 📐 Clasificaciones | Escalas y sistemas de graduación con sus criterios, su uso y sus limitaciones |
| 🧮 Calculadoras | Fórmulas y escalas con interpretación automática y una frase lista para copiar al informe |
| 📘 Temas | Artículos de estudio en profundidad, con secciones y puntos clave |
| 📖 Glosario | Terminología organizada por categoría |
| 🎯 Modo estudio | Repaso tipo cuestionario que muestra una imagen y pide identificarla, con distractores del mismo sistema |

Los sistemas cubiertos son diez: Óseo y musculoesquelético, respiratorio, cardiovascular, nervioso, digestivo, urinario, reproductor, mama, endocrino, y cabeza y cuello.
Las modalidades son cuatro, que son la radiografía (RX), la tomografía computarizada (TC), la resonancia magnética (RM) y el ultrasonido (US).

## 2. ✨ Las piezas destacadas, una por una

**El buscador que ignora los acentos.**
Escribir `torax` encuentra igualmente «tórax», dado que la consulta y el texto se comparan después de retirarles los acentos.
A ello se suma que la búsqueda recorre toda la ficha y no solo el título, de modo que un hallazgo nombrado en el diferencial también aparece entre los resultados.

**Las fichas del catálogo.**
Cada ficha reúne la técnica del estudio, una lista de qué observar, los hallazgos de esa imagen concreta, el diagnóstico diferencial con el dato que separa cada entidad, los simuladores que se confunden con ella, el protocolo de adquisición, los errores de interpretación frecuentes y una perla clínica.
El apartado por modalidad explica qué aporta cada técnica sobre el mismo problema, razón por la cual sirve para decidir qué estudio pedir y no solo para leer el que ya se tiene.

**Los signos radiológicos.**
Cada signo explica qué es, por qué se produce, qué significa cuando aparece, con qué se confunde y un truco para recordarlo.
La base fisiopatológica va delante del significado a propósito, en razón de que un signo cuya causa se entiende no hace falta memorizarlo.

**Las clasificaciones.**
Recogen las escalas de graduación con sus grados, para qué se usan y, sobre todo, qué no permiten concluir.
El apartado de limitaciones importa tanto como los criterios, puesto que la mayoría de los errores con una escala consisten en aplicarla fuera del escenario para el que se validó.

**Las calculadoras.**
Cada una pide sus medidas, calcula el resultado, lo sitúa sobre una escala de colores y lo interpreta con una frase.
Esa frase se puede copiar al portapapeles ya redactada para el informe, de manera que el paso de calcular a escribir no obliga a rehacer el texto a mano.
Hay dos clases, ya que una calculadora se resuelve con una fórmula sobre las medidas o sumando los puntos de un cuestionario.

**El modo estudio.**
Muestra una imagen del catálogo y ofrece varias opciones para identificarla.
Los distractores se toman del mismo sistema del cuerpo, con el fin de que acertar exija mirar la imagen y no descartar por eliminación.

**La aplicación entera sin conexión.**
El contenido, las imágenes y los iconos están en el repositorio.
De ese modo el atlas se puede consultar en un hospital sin red, que es justamente donde más se necesita.

## 3. 🚀 Cómo levantarlo

Hay tres maneras de ponerlo en marcha, ordenadas de la más completa a la más rápida.

### Opción 1. Con Docker, que incluye la base de datos

```bash
docker compose up -d --build
```

Después se abre `http://localhost:8081`.

La orden levanta dos contenedores, uno con MongoDB y otro con la aplicación.
La base de datos se siembra sola con el contenido de `data/` y se vuelve a sembrar cuando ese contenido cambia, así que no hace falta cargarla a mano.
Los datos de MongoDB persisten en un volumen de Docker, motivo por el cual apagar los contenedores no borra nada.

Para detenerlo se usa `docker compose down`, y añadiendo `-v` se borra además la base de datos.

### Opción 2. Con Node, sin Docker

```bash
cd server
npm install
npm start
```

Después se abre `http://localhost:3000`.

Si no hay ningún MongoDB escuchando, la aplicación lo detecta durante el arranque y sirve el contenido leyendo directamente los archivos de `data/`.
En consecuencia el atlas funciona igual, aunque sin las ventajas de consultar la base.

### Opción 3. Con cualquier servidor estático

```bash
npx serve .
```

El navegador carga los archivos de `data/` por su cuenta y todo funciona salvo la base de datos.
La página necesita servirse por HTTP porque tanto los módulos de JavaScript como `fetch` quedan bloqueados por el navegador cuando el documento se abre directamente desde el disco.

## 4. 🏗️ Arquitectura

El proyecto tiene dos mitades que se pueden usar por separado, ya que el navegador sabe leer el contenido tanto de la API como de los archivos.

```
index.html              La aplicación entera, con sus siete secciones y los iconos vectoriales
css/1-base.css          Los tokens de color y de espacio de los dos temas, sobre los que se apoya todo lo demás
css/2-cabecera.css      La cabecera con la marca, el conmutador de tema y las pestañas
css/3-contenido.css     La portada, las métricas, el buscador y los filtros de chips
css/4-tarjetas.css      Las tarjetas del catálogo y las rejillas de resultados
css/5-modales.css       Las ventanas de detalle y sus bloques interiores
css/6-temas-quiz-calculadoras.css
                        Las vistas con estilo propio: Temas, glosario, modo estudio y calculadoras
css/7-interfaz.css      El pie, el fondo aurora, la paginación, el menú lateral y las reglas responsivas
css/8-impresion.css     La versión imprimible, que se carga solo con media print
css/seo.css             Las páginas estáticas, con todas sus reglas bajo el ámbito seo-pagina
js/main.js              El único punto de entrada, que registra el service worker y arranca la aplicación
js/Aplicacion.js        El punto de composición, donde las piezas se instancian y se conectan
js/nucleo/              Las piezas que usan todas las secciones: Texto, catálogos, repositorio, modal, sección base y paginador
js/secciones/           Las secciones de catálogo, signos, clasificaciones, temas y glosario, una clase por archivo
js/calculadoras/        La sección de calculadoras con su ventana, su formulario, su resolutor y su escala visual
js/estudio/             El modo estudio
js/interfaz/            Las rutas, la navegación en pestañas, el tema, la barra de progreso y el menú lateral
js/menu-estatico.js     El menú autónomo de las páginas estáticas, que no cargan la aplicación
sw.js                   El service worker, que deja el armazón disponible sin conexión
server/index.js         El servidor web y las rutas de la API
server/Almacen.js       El acceso a los datos, con MongoDB delante y los archivos de respaldo detrás
server/colecciones.js   La declaración de colecciones, sistemas, modalidades y campos de búsqueda, sin dependencias
server/validar.js       El orquestador del validador del contenido
server/validaciones/    Los bloques del validador: Reporte, redacción, fichas, calculadoras, documentos y páginas
server/seed.js          La carga manual de la base de datos
data/*.json             El contenido, que es el producto del proyecto
img/                    Las imágenes del catálogo
casos/, signos/, clasificaciones/, calculadoras/, temas/
                        Las páginas estáticas que indexan los buscadores
herramientas/           Las utilidades de mantenimiento del contenido
```

La lógica del navegador se reparte en clases pequeñas, cada una con una responsabilidad reconocible.

| Clase | Archivo | Responsabilidad |
|---|---|---|
| `Aplicacion` | `js/Aplicacion.js` | Instancia todas las piezas, las conecta entre sí y arranca las secciones con los datos ya cargados |
| `Repositorio` | `js/nucleo/Repositorio.js` | Carga las seis colecciones desde la API y cae a los archivos de `data/` cuando no hay servidor |
| `Paginador` | `js/nucleo/Paginador.js` | Guarda la página en curso de cada sección y pinta los controles de paginación |
| `Modal` | `js/nucleo/Modal.js` | Ventana de detalle con su fondo y su botón de cierre, registrada para que la tecla de escape cierre la que esté abierta |
| `Seccion` | `js/nucleo/Seccion.js` | Ciclo común de las secciones de lista, que filtra por chips, busca sin acentos, cuenta, pagina y pinta |
| `SeccionCatalogo`, `SeccionSignos`, `SeccionClasificaciones`, `SeccionTemas`, `SeccionGlosario` | `js/secciones/` | Cada subclase declara su colección, sus filtros, su tarjeta y su ventana de detalle |
| `SeccionCalculadoras` | `js/calculadoras/SeccionCalculadoras.js` | La misma plantilla de sección aplicada a la lista de calculadoras |
| `VentanaCalculadora` | `js/calculadoras/VentanaCalculadora.js` | Compone la ventana de una calculadora, con el botón de ejemplo y el de copiar la frase para el informe |
| `FormularioCalculadora` | `js/calculadoras/FormularioCalculadora.js` | Construye los campos de cada calculadora y señala junto a cada casilla la validación visible |
| `ResolutorDeCalculadora` | `js/calculadoras/ResolutorDeCalculadora.js` | Evalúa las fórmulas y las reglas de interpretación y redacta la frase del informe, sin tocar el documento |
| `EscalaDeReferencia` | `js/calculadoras/EscalaDeReferencia.js` | Calcula las zonas de la escala de colores con sus umbrales y el margen hasta el umbral vecino, sin tocar el documento |
| `VistaEscala` | `js/calculadoras/VistaEscala.js` | Pinta la escala calculada y desliza el marcador hasta el punto que ocupa el resultado |
| `VistaResultados` | `js/calculadoras/VistaResultados.js` | Pinta las filas del resultado y anima las cifras que cambian de valor |
| `RangoDeCampo` | `js/calculadoras/RangoDeCampo.js` | Calcula extremos y paso razonables para el deslizador de cada campo, sin tocar el documento |
| `SincroniaDeslizador` | `js/calculadoras/SincroniaDeslizador.js` | Mantiene cada casilla numérica y su deslizador diciendo lo mismo |
| `Quiz` | `js/estudio/Quiz.js` | El modo estudio, que pregunta por imágenes del catálogo con distractores del mismo sistema |
| `Rutas` | `js/interfaz/Rutas.js` | Lee y escribe el fragmento de la dirección, de modo que cada ficha tiene un enlace propio y el botón de atrás la cierra |
| `Navegacion` | `js/interfaz/Navegacion.js` | Completa la semántica del patrón de pestañas y conmuta las vistas |
| `ConmutadorDeTema` | `js/interfaz/ConmutadorDeTema.js` | Cicla el tema entre claro, oscuro y el del sistema, y lo guarda para el próximo arranque |
| `BarraDeProgreso` | `js/interfaz/BarraDeProgreso.js` | La barra de avance de lectura y el botón de volver arriba |
| `MenuLateral` | `js/interfaz/MenuLateral.js` | El panel de secciones que aparece cuando la cabecera se retira durante la lectura |

`index.html` carga un único `<script type="module">`, que es `js/main.js`, y cada archivo declara sus dependencias con `import`.
El navegador resuelve el orden de carga a partir del grafo de importaciones, así que ninguna clase se usa antes de definirse y añadir una pieza no obliga a tocar el documento.
Las funciones sueltas del núcleo viven en `js/nucleo/Texto.js` (normalizar, escapar, resaltar), `js/nucleo/Catalogos.js` (el orden único de sistemas y modalidades y las clases de color) y `js/nucleo/util.js` (mezclar, íconos, desplazamiento y anuncios accesibles).

### Direcciones con fragmento

La clase `Rutas` mantiene el fragmento de la dirección sincronizado con lo que se está viendo, con el formato `#/casos` para una sección y `#/casos/oseo-colles` para una ficha concreta.
Gracias a eso cada ficha tiene un enlace que se puede compartir o guardar, el botón de atrás del navegador cierra la ficha en lugar de salir de la aplicación, y las páginas estáticas de `casos/`, `signos/`, `clasificaciones/`, `calculadoras/` y `temas/` enlazan directo a su ficha dentro de la aplicación.
Además, el parámetro `?q=palabra` deja esa búsqueda hecha en el catálogo al arrancar, que es lo que promete el `SearchAction` declarado en el encabezado del documento.

### Funcionamiento sin conexión

El service worker `sw.js` precachea el armazón, es decir, el documento, las hojas de estilo, los módulos de `js/` y el manifiesto, en una caché con nombre versionado, `atlas-rad-v4`.
Los archivos de `data/*.json` y la API se sirven con caché primero y revalidación en segundo plano: La copia guardada responde al instante y en paralelo la red actualiza la caché para la próxima visita, así que una corrección puede tardar una visita en verse, algo aceptable en contenido educativo estable; el resto va con caché primero.
Las imágenes de `img/` no se precargan nunca, dado que la carpeta pesa decenas de megas, y en su lugar cada imagen queda guardada la primera vez que se ve.
El registro ocurre solo bajo HTTPS o en localhost, con ruta relativa para respetar el subdirectorio de GitHub Pages.

Para publicar una versión nueva hay que subir el número de la constante `CACHE` en `sw.js`, por ejemplo de `atlas-rad-v4` a `atlas-rad-v5`, y sumar a la lista de precacheado cualquier archivo del armazón que se haya añadido o renombrado.
El service worker nuevo instala su caché con ese nombre y, al activarse, borra las cachés con nombres anteriores.
Publicar cambios sin cambiar el nombre deja a los visitantes recurrentes con el armazón viejo hasta que el navegador decida revalidar.

En el servidor y las herramientas las piezas son estas.

| Pieza | Responsabilidad |
|---|---|
| `server/index.js` | Sirve los archivos de la aplicación y expone las rutas de la API, que solo hablan con el almacén |
| `server/Almacen.js` | Encapsula el acceso a los datos: Siembra MongoDB al arrancar comparando una huella del contenido, responde desde la base cuando contesta y desde la copia de los archivos cuando no, y resuelve la búsqueda por texto ignorando los acentos |
| `server/colecciones.js` | Declara sin dependencias las colecciones, los sistemas, las modalidades, las dificultades y los campos de búsqueda; el cliente repite las listas en `js/nucleo/Catalogos.js` y una prueba exige que coincidan |
| `server/seed.js` | Vuelca los archivos de `data/` en MongoDB y crea los índices, sin necesidad de reiniciar el servidor |
| `server/validar.js` | Orquesta las validaciones del contenido y devuelve código de salida 1 cuando encuentra errores |
| `server/validaciones/` | Los bloques del validador: El reporte con errores y avisos, las reglas de redacción, las fichas con sus imágenes, las calculadoras con sus fórmulas ejecutadas, las colecciones de texto y las páginas estáticas |
| `herramientas/buscar-imagenes.js` | Busca figuras de licencia libre y las deja en una carpeta de trabajo con su manifiesto, para revisarlas antes de usarlas |
| `herramientas/aplicar-imagenes.js` | Incorpora al catálogo las imágenes de uno o varios manifiestos ya revisados |
| `herramientas/fusionar.js` | Incorpora a su colección definitiva los archivos de preparación, rechazando lo que colisione por código o por nombre |

## 5. 🗄️ Modelo de datos y API

El contenido son seis colecciones de documentos JSON, que se guardan en `data/` y se copian a MongoDB en la base `atlas_radiologia_imagen`.

| Colección | Se identifica por | Campos |
|---|---|---|
| `fichas` | `codigo` | `titulo`, `sistema`, `modalidad`, `region`, `dificultad`, `esNormal`, `descripcion`, `tecnica`, `observar`, `hallazgos`, `perlas`, `diferencial`, `simuladores`, `porModalidad`, `protocolo`, `clasificacion`, `errores`, `imagen`, `credito`, `etiquetas` |
| `signos` | `codigo` | `nombre`, `sistema`, `modalidad`, `queEs`, `porQueOcurre`, `significado`, `diferencial`, `comoRecordarlo`, `etiquetas` |
| `clasificaciones` | `codigo` | `nombre`, `sistema`, `modalidad`, `paraQue`, `grados`, `comoUsarla`, `limitaciones`, `etiquetas` |
| `calculadoras` | `codigo` | `nombre`, `categoria`, `modalidad`, `tipo`, `descripcion`, `campos`, `ejemplo`, `resultados`, `interpretacion`, `formulaTexto`, `notas` |
| `glosario` | `termino` | `categoria`, `definicion` |
| `temas` | `codigo` | `titulo`, `sistema`, `resumen`, `secciones`, `puntosClave` |

Sobre las fichas se crean tres índices: Uno de texto en español sobre el título, la descripción, los hallazgos, las perlas y las etiquetas, otro compuesto por sistema y modalidad, que son los dos filtros del catálogo, y otro único sobre el código, que impide que dos fichas compartan identificador.

Una calculadora de tipo `formula` declara sus `campos` con un identificador cada uno, y ese identificador se convierte en la variable que usan las fórmulas de `resultados`.
Las reglas de `interpretacion` se evalúan en orden y pueden nombrar tanto los campos de entrada como los resultados, que se llaman `r0`, `r1` y sucesivos.
La última regla lleva siempre la condición `true`, de manera que ningún valor se queda sin interpretación.
Una calculadora de tipo `puntuacion` sustituye los campos por `preguntas` con opciones puntuadas, y sus reglas se escriben sobre la variable `total`.

### La API

| Ruta | Qué devuelve |
|---|---|
| `GET /api/fichas` | Las fichas del catálogo, con los parámetros opcionales `q`, `sistema` y `modalidad` |
| `GET /api/fichas/:codigo` | Una ficha concreta, o un error 404 que explica cómo obtener la lista de códigos |
| `GET /api/signos` | Los signos radiológicos, con los parámetros opcionales `q` y `sistema` |
| `GET /api/clasificaciones` | Las clasificaciones, con los parámetros opcionales `q` y `sistema` |
| `GET /api/calculadoras` | Las calculadoras, con los parámetros opcionales `q` y `sistema` |
| `GET /api/glosario` | Los términos del glosario, con el parámetro opcional `q` |
| `GET /api/temas` | Los artículos de estudio |
| `GET /api/filtros` | Las listas de sistemas y de modalidades que existen hoy en el catálogo |
| `GET /api/estado` | Diagnóstico del servidor, que indica si los datos vienen de MongoDB o de los archivos y cuántos documentos hay de cada colección |

Para recargar la base a mano se ejecuta `npm run seed` desde la carpeta `server`.
Para consultarla directamente se ejecuta `docker exec -it atlas-radiologia-imagen-mongo mongosh atlas_radiologia_imagen`.

## 6. ✏️ Cómo agregar contenido

Todo el contenido está en `data/`, en archivos JSON que se editan con cualquier editor de texto.
La forma más segura de añadir algo consiste en copiar un documento existente, es decir, todo lo que va entre `{` y `}`, pegarlo al lado y cambiarle el texto.

Una ficha completa se escribe así:

```json
{
  "codigo": "identificador-unico-sin-espacios",
  "titulo": "Nombre del estudio o del hallazgo",
  "sistema": "Óseo",
  "modalidad": "RX",
  "region": "Mano",
  "dificultad": "Básico",
  "esNormal": true,
  "descripcion": "Qué es el estudio y para qué se pide.",
  "tecnica": "Cómo se realiza y en qué proyección.",
  "observar": ["Primer punto que hay que mirar", "Segundo punto", "Tercer punto"],
  "hallazgos": "Qué se ve en esta imagen concreta.",
  "perlas": "El dato que conviene no olvidar.",
  "diferencial": [{ "entidad": "Otra entidad", "comoDistinguir": "El dato que las separa" }],
  "simuladores": ["Variante normal o artefacto que se confunde con el hallazgo"],
  "porModalidad": { "RX": "Qué aporta la radiografía", "TC": "Qué aporta la tomografía" },
  "protocolo": "Detalle de la adquisición.",
  "clasificacion": "Clasificación aplicable, explicada.",
  "errores": ["Error de interpretación frecuente"],
  "imagen": "img/nombre-del-archivo.jpg",
  "credito": "Autor · Licencia · Origen",
  "etiquetas": ["palabra-clave", "otra-palabra-clave"]
}
```

Conviene tener presentes cuatro condiciones que el validador comprueba.
En primer lugar, el `codigo` no se puede repetir, puesto que identifica la ficha en la base de datos y en los manifiestos de imágenes.
A continuación, el campo `observar` necesita al menos tres puntos, ya que es el apartado que enseña a mirar la imagen.
Asimismo, cada entrada del `diferencial` lleva la entidad y el dato que la distingue, dado que nombrarla sin explicar cómo separarla no enseña nada.
Por último, una ficha con `imagen` necesita siempre su `credito`, en razón de que las licencias libres obligan a nombrar al autor.

Para usar una imagen propia, como una foto de prácticas o una captura de clase, se guarda en la carpeta `img/` y se escribe `"imagen": "img/nombre-del-archivo.jpg"` en su ficha.
El nombre del archivo va en minúsculas, sin espacios ni acentos, y conviene empezarlo por la modalidad para que la carpeta se ordene sola, por ejemplo `rx-torax-caso1.jpg` o `us-higado-practica2.png`.

Cuando se prepara un lote grande conviene escribirlo en un archivo aparte dentro de `data/`, con un nombre que empiece por `staging`, y volcarlo después de una sola vez:

```bash
node herramientas/fusionar.js signos data/staging-signos.json
node herramientas/fusionar.js signos data/staging-signos.json --aplicar
```

La primera orden solo informa de lo que haría, en cambio la segunda escribe los cambios y borra el archivo de preparación si se incorporó entero.

Después de editar basta con recargar la página.
Con Docker la base se vuelve a sembrar sola al reiniciar el contenedor, y también se puede forzar con `npm run seed`.

## 7. 🧭 Decisiones de diseño

Este apartado explica por qué algunas cosas están hechas de una manera que a primera vista parece extraña.

**La aplicación funciona en tres modos y cae de la base a los archivos.**
El servidor intenta conectarse a MongoDB al arrancar, sin embargo un fallo no le impide escuchar, y cada ruta de la API vuelve a la copia de los archivos si la consulta a la base falla.
A ello se suma que el navegador hace lo mismo por su cuenta, puesto que cuando una llamada a la API no responde pide el archivo JSON equivalente.
La razón de tanta redundancia es el escenario de uso, ya que esto se consulta desde un hospital, desde una sala de prácticas o desde un equipo prestado, y en cualquiera de esos sitios lo que no puede ocurrir es que el atlas no abra.
El precio que se paga son tres caminos que hay que mantener en pie, y a cambio no existe ninguna dependencia cuya caída deje la aplicación inservible.

**La resiembra compara una huella del contenido y no el número de documentos.**
Esta decisión salió de un fallo real.
Al principio la base se resembraba cuando la cantidad de documentos del archivo no coincidía con la de la colección, de modo que corregir el texto de una ficha sin añadir ninguna dejaba la base sirviendo indefinidamente la versión antigua.
El error resultaba especialmente difícil de ver, dado que la aplicación funcionaba y simplemente mostraba lo de antes.
Ahora se guarda una huella del contenido de cada colección y se compara con la del archivo, motivo por el cual cualquier retoque, por pequeño que sea, obliga a rehacer la colección.

**La búsqueda por texto se resuelve en memoria, aunque exista un índice de texto en MongoDB.**
El índice de texto distingue los acentos y quien busca casi nunca los escribe, con lo cual `torax` no encontraría «tórax».
En consecuencia el índice se conserva para las consultas directas a la base, en cambio la búsqueda de la aplicación compara el texto ya normalizado.
Con el tamaño actual del catálogo el coste es imperceptible, así que se prefirió acertar antes que ahorrar.

**Las carpetas de datos e imágenes se montan como volúmenes en Docker.**
Están montadas de solo lectura desde el equipo en lugar de quedar dentro de la imagen del contenedor.
El motivo es la manera de trabajar del proyecto, ya que el contenido se edita todos los días y las imágenes se van añadiendo por lotes.
Si estuvieran dentro de la imagen habría que reconstruirla en cada cambio, en cambio así basta con reiniciar el contenedor, que tarda unos segundos.

**El cliente son módulos de JavaScript con un único punto de entrada.**
`index.html` carga solo `js/main.js` y cada archivo declara sus dependencias con `import`, de modo que el navegador resuelve el orden de carga por su cuenta.
Se descartó mantener el listado manual de etiquetas `<script>` porque el orden era el único mecanismo de dependencia y se rompía en silencio al reordenarlo o al añadir una pieza.
La contrapartida es que la página exige servirse por HTTP, cosa que ya exigía `fetch` para leer el contenido, así que las maneras de levantarlo del apartado 3 no cambian.

**Los iconos son vectoriales y propios, en lugar de emoji.**
Los iconos se definen una sola vez como símbolos dentro del propio documento y después se reutilizan.
Se descartaron los emoji porque cada plataforma los dibuja a su manera y su aspecto cambia entre un teléfono y un equipo de escritorio, lo cual da un resultado desigual dentro de una interfaz que quiere leerse como una sola pieza.
Se descartó igualmente una biblioteca de iconos externa, en razón de que obligaría a descargarla y la aplicación dejaría de funcionar sin conexión.
Los emoji sí se usan en este README, donde ayudan a distinguir los apartados de un vistazo y no forman parte del producto.

**Las imágenes nuevas pasan por un manifiesto intermedio.**
La búsqueda de figuras no escribe en el catálogo, sino que deja las candidatas en una carpeta de trabajo junto con un manifiesto que anota la licencia, el autor y el pie de cada una.
Hay dos razones para esa vuelta.
La primera es que varias búsquedas pueden correr a la vez, y si todas escribieran en `data/fichas.json` se pisarían entre ellas y se perdería trabajo.
La segunda pesa más todavía, ya que una figura correcta dentro de su artículo puede ilustrar mal una ficha, de manera que la decisión de usarla se toma leyendo el pie y mirando la imagen, no de forma automática.

**El contenido nuevo se redacta en archivos de preparación.**
Vale el mismo argumento que con las imágenes, dado que varias tandas de trabajo escriben a la vez y un solo archivo compartido acabaría corrompido.
Al incorporarlos, la herramienta rechaza lo que colisione por código o por nombre, y la comprobación del nombre importa tanto como la del código, puesto que dos tandas pueden describir el mismo signo con identificadores distintos.

**El HTML, el CSS y los datos se sirven sin caché, en cambio las imágenes sí se cachean.**
Quien edita el contenido recarga la página cada pocos minutos y la peor experiencia posible consiste en mirar una versión antigua sin saberlo.
Las imágenes, por su parte, no cambian nunca y pesan bastante más que el texto, razón por la cual ahí sí compensa la caché.

## 8. 📏 Convenciones

**Sobre la redacción del contenido.**
Se escribe en español neutro y la exactitud manda sobre la cantidad, de manera que ante la duda con un dato se escribe algo más general o se omite.
No se usan el guion largo ni el guion corto, y los decimales se escriben con punto siguiendo la convención de México.
Después de los dos puntos, cuando lo que sigue es una oración, esa oración empieza con mayúscula.
Lo que va entre asteriscos se resalta al pintarlo, lo cual permite señalar una palabra exacta sin meter marcado dentro de los datos.

**Sobre lo que no entra en el contenido.**
No hay direcciones web ni emoji dentro de los datos ni del código, aunque este README admite ambas cosas.
Tampoco aparecen nombres de personas en ninguna parte del proyecto.
El validador comprueba estas reglas en cada pasada.

**Sobre el código.**
Los nombres van en español y sin abreviar, ya que el dominio es español y una abreviatura ahorra seis caracteres al escribir y cuesta dos segundos de duda en cada lectura.
Los comentarios explican el porqué de una decisión en lugar de traducir a español la línea que tienen debajo, y cada renglón contiene una oración completa.

**Sobre los mensajes de error.**
Todo mensaje dice tres cosas, que son qué pasó, por qué, y qué puede hacer quien lo lee.
Por ese motivo los mensajes del validador y de las herramientas son largos, decisión deliberada, puesto que se leen cuando algo salió mal y ahí la brevedad no ayuda.

## 9. ✅ Pruebas y validación

La comprobación del proyecto es el validador del contenido, que se ejecuta así:

```bash
node server/validar.js
```

También se puede lanzar con `npm run validar` desde la carpeta `server`.

El validador revisa cinco cosas.
En primer lugar, comprueba que todos los archivos JSON se pueden interpretar, y avisa cuando alguno trae la marca de orden de bytes que escriben algunos editores.
A continuación, verifica que cada ficha tenga todos los campos de la plantilla, que su sistema, su modalidad y su dificultad estén entre los admitidos, y que ningún código se repita.
Asimismo, comprueba que cada imagen referenciada exista de verdad en el disco y que ninguna se haya quedado sin crédito.
Por su parte, ejecuta todas las fórmulas de las calculadoras con sus valores de ejemplo, puesto que una fórmula guardada como texto no falla hasta que alguien la usa, y evalúa también sus reglas de interpretación para descubrir las que mencionan una variable inexistente.
Por último, recorre todo el texto de todos los documentos aplicando las reglas de redacción, es decir, busca guiones largos, direcciones web, emoji y comas decimales.

La distinción entre errores y avisos es deliberada.
Los errores terminan el proceso con código de salida 1 y significan que el contenido no está listo para publicar, en cambio los avisos solo señalan algo que conviene mirar y no detienen nada.
La razón es que el contenido crece a lotes, situación en la que una irregularidad menor no debería frenar la incorporación de material correcto.

Además del validador, conviene comprobar que los archivos de JavaScript siguen siendo válidos:

```bash
node --check server/index.js
node --check server/seed.js
node --check server/validar.js
```

### Las pruebas del motor

La lógica pura del cliente, es decir, la escala visual, el margen al umbral, el deslizador, la evaluación de fórmulas, la normalización y la paginación, se prueba en Node sin dependencias:

```bash
cd server
npm run probar
```

Las suites viven en la carpeta `pruebas/`, cargan los módulos de `js/` con `import()` dinámico desde Node y suman 61 comprobaciones cuyos valores esperados están escritos a mano, nunca copiados de lo que imprime el motor.
Entre ellas hay una que compara las listas de sistemas y modalidades de `js/nucleo/Catalogos.js` con las de `server/colecciones.js`, porque las dos copias ya divergieron una vez.

## 10. 📊 Estado y trabajo pendiente

Estas son las cifras del contenido publicado hoy.

| Colección | Documentos |
|---|---|
| Fichas del catálogo | 572 |
| Signos radiológicos | 200 |
| Clasificaciones | 200 |
| Calculadoras | 50 |
| Términos del glosario | 914 |
| Temas de estudio | 23 |
| Imágenes en `img/` | 308 |

De las 572 fichas, 278 tienen imagen y 294 todavía no.

El reparto por sistema queda así: Óseo 117, nervioso 87, digestivo 86, respiratorio 82, cardiovascular 68, urinario 35, reproductor 35, cabeza y cuello 25, mama 21 y endocrino 16.
Por modalidad hay 209 fichas de tomografía, 136 de resonancia, 119 de radiografía y 108 de ultrasonido.
Por dificultad hay 251 intermedias, 228 avanzadas y 93 básicas.
Las 50 calculadoras se reparten en 40 de fórmula y 10 de puntuación.

### Qué falta

**Imágenes para la mitad del catálogo.**
Es el trabajo pendiente más visible, dado que 294 fichas se leen bien pero no se pueden comparar con nada, y comparar es justamente para lo que existe el atlas.
El camino está montado, ya que consiste en buscar candidatas, revisar sus pies de figura y aplicarlas con su manifiesto.

**Equilibrar los sistemas menos cubiertos.**
El sistema endocrino tiene 16 fichas y la mama 21, frente a las 117 del óseo.
Conviene subir los que van por detrás antes de seguir engordando los que ya están bien surtidos, puesto que un atlas desigual se nota enseguida al estudiar.

**La carga manual no incluye las calculadoras.**
La herramienta `server/seed.js` siembra cinco colecciones y deja fuera `calculadoras`, en cambio el servidor sí las carga solo al arrancar.
En consecuencia quien use `npm run seed` sobre una base recién creada se encuentra la sección de calculadoras servida desde los archivos y no desde MongoDB.

**Más pruebas que la validación del contenido.**
Hoy no hay pruebas automatizadas de la API ni de la aplicación del navegador, de modo que lo que se comprueba en cada cambio es el contenido y la sintaxis del código.
Convendría al menos una prueba que levante el servidor y recorra las rutas de la API en sus dos modos, con base de datos y sin ella.

## ⚠️ Aviso

Este atlas es material de estudio.
No sustituye los libros de texto, ni la enseñanza de los profesores, ni la valoración de un profesional de la salud.
