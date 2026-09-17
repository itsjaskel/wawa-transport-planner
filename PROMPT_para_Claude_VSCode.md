# Prompt para Claude (VS Code) — MVP de planificación de transporte

## Cómo usar este archivo

Esta sección es para ti, no para Claude.

1. Abre la carpeta vacía del proyecto en VS Code y empieza un chat con Claude.
2. Pega **todo el contenido desde la línea "INICIO DEL PROMPT" hasta el final**. Es largo a propósito: es el contexto completo del proyecto.
3. Claude debe responder con la verificación de versiones, la lista de todas las fases y el detalle de la Fase 0, y **detenerse**. Si empieza a escribir código sin que lo apruebes, recuérdale la regla.
4. Después de cada fase, usa los prompts cortos del apéndice para continuar.
5. En la Fase 0, Claude crea `CLAUDE.md` y `AGENTS.md`. A partir de ahí, `CLAUDE.md` es la memoria del proyecto: si el chat se alarga o abres uno nuevo, basta con pedirle que lo lea.

Dos advertencias importantes:

- **No pegues esto y te vayas.** Revisa cada diff. Lo que evalúan es cómo conduces a la IA, y eso solo existe si efectivamente la conduces.
- **Claude no debe escribir DECISIONS.md.** El prompt se lo prohíbe explícitamente. Ese archivo lo escribes tú a partir del reporte que deja al final de cada fase. Si lo escribe la IA, se nota en la entrevista.

---

# INICIO DEL PROMPT

## 1. Contexto y objetivo

El proyecto se llama **Rumb@**. Ese es el nombre visible: título de la pestaña del navegador, encabezado de la interfaz, título del README y nombre del producto en toda la documentación.

Como el carácter `@` no es válido en varios identificadores técnicos (en npm abre un nombre con ámbito, y tanto Docker Compose como los nombres de contenedor lo rechazan), usa **`rumbo`** como identificador técnico: nombre en ambos `package.json`, nombre del proyecto en Compose, prefijo de contenedores y nombre de la base de datos. Nombre visible `Rumb@`, identificador técnico `rumbo`. Anota esta distinción en `CLAUDE.md` para que no se mezcle más adelante.

Voy a construir un MVP funcional de un sistema de planificación de transporte como prueba técnica. Tengo unas 5 horas de trabajo total. El evaluador valora, en este orden: que el núcleo funcione de forma sólida, que la integridad de datos se sostenga bajo concurrencia, que el proyecto levante sin fricción, y que el código sea legible y mantenible. Prefiere un núcleo sólido a muchas funcionalidades a medias.

El dominio: rutas (listas ordenadas de puntos geográficos), unidades (vehículos) y duties (la asignación de una ruta a una unidad durante una ventana de tiempo). La regla central del negocio es que **una misma unidad no puede tener dos duties cuyas ventanas se solapen**.

## 2. Cómo quiero que trabajes

Estas reglas de proceso son tan importantes como el resultado:

1. **Trabajo estrictamente por fases.** Antes de empezar nada, muéstrame **la lista completa de todas las fases** del proyecto con un resumen de qué se hará en cada una, para que yo tenga el mapa completo desde el principio.
2. **Antes de cada fase**, explícame de qué trata esa fase en concreto, qué archivos vas a tocar y qué quedará funcionando al final. **Espera mi aprobación explícita antes de empezar a trabajar en ella.** No encadenes fases por tu cuenta.
3. **Al terminar cada fase**, si hay algo que yo pueda probar, dame **instrucciones paso a paso para probarlo** (qué comando ejecutar, qué abrir, qué hacer en pantalla y qué debería ocurrir) y espera mi retroalimentación antes de continuar. Si la fase no produce nada probable por mí, dilo claramente en lugar de inventar una prueba.
4. **Pasos pequeños dentro de cada fase**, para que pueda revisar los diffs sin esfuerzo.
5. **Pregunta antes de agregar cualquier dependencia** que no esté en la sección 4.
6. **No crees abstracciones que no pedí** (repositorios genéricos, CQRS, arquitectura hexagonal completa, capas de servicios vacías). El tamaño de este MVP no las justifica.
7. **No ejecutes comandos de git ni hagas commits.** De los commits me encargo yo. Al cerrar cada fase puedes **sugerirme** mensajes en formato de commits convencionales, pero no los apliques ni ejecutes `git add`, `git commit`, `git push` ni ningún comando que altere el repositorio.
8. **No escribas DECISIONS.md ni el README de producto.** Esos los escribo yo. Tu trabajo es dejarme el material (ver sección 16).
9. Si algo de este prompt te parece equivocado o incompleto, **dímelo antes de implementarlo**. Prefiero una objeción temprana a un trabajo rehecho.
10. Si una decisión depende de información que no tienes, **pregunta en lugar de asumir**.

## 3. Reglas no negociables

Si alguna de estas se rompe, el trabajo no sirve:

- La regla de no solapamiento se garantiza con el mecanismo de la sección 7, **exactamente** como está descrito. No propongas mutex en memoria, colas de proceso ni validación simple previa a la inserción.
- Todo el entorno corre en Docker y levanta con **un solo comando** (sección 8).
- **`CLAUDE.md` es la única fuente de verdad del proyecto** y se actualiza tras cada cambio (sección 17).
- **Cero estilos en línea.** Cada pantalla tiene su archivo de estilos propio (sección 18).
- **Todo responsive**, sin excepciones (sección 18).
- **Todas las dependencias declaradas en el `package.json` correspondiente** (sección 19).
- **Toda** función, método, componente y hook lleva un comentario de una línea en español que explica qué hace (sección 11).
- El código se optimiza para ser legible, **no** para ser corto (sección 11).
- Todas las operaciones dentro de una transacción reciben la sesión de la transacción.
- No ejecutas commits ni comandos de git.

## 4. Stack exacto

| Capa | Tecnología | Nota |
|---|---|---|
| Lenguaje | TypeScript | En todo el repo |
| Backend | NestJS 12 | Es una versión reciente: los proyectos nuevos se generan como ESM con Vitest en lugar de CommonJS con Jest. No generes código estilo NestJS 11 (imports sin extensión `.js`, configuración de Jest). Si algo del ecosistema no soporta la 12 todavía, avísame y decido |
| Runtime | Node.js 24 LTS | |
| Base de datos | MongoDB 8 con Mongoose | Como replica set de un solo nodo, necesario para transacciones |
| Frontend | React 19 con **Vite** | No Next.js: no necesito renderizado en servidor y Leaflet depende del navegador |
| Navegación | React Router | |
| Datos en frontend | TanStack Query | |
| Mapa | Leaflet con react-leaflet v5 y tiles de OpenStreetMap | Sin API key ni cuenta de facturación, para que el proyecto levante sin configurar nada |
| Validación | class-validator con ValidationPipe global | |
| Configuración | @nestjs/config con validación de variables al arrancar | |
| Documentación API | @nestjs/swagger | |
| Tests | Vitest | |

**No usar:** GraphQL, Prisma, Redux, Zustand, librerías de UI pesadas, ni ninguna dependencia que no esté aquí sin preguntarme antes.

Antes de instalar, verifica las versiones compatibles reales entre `@nestjs/mongoose`, `mongoose` y NestJS 12. No asumas versiones de memoria.

## 5. Dominio y reglas de negocio

### Entidades

**Route (ruta)**
- `name`: obligatorio, texto recortado, 1 a 100 caracteres.
- `points`: arreglo de subdocumentos embebidos, mínimo 2 y máximo 200. **El orden es la posición en el arreglo**, sin campo "order" que pueda tener huecos o duplicados.
- Cada punto: `lat` (de -90 a 90), `lng` (de -180 a 180), `name` opcional de hasta 100 caracteres.
- Marcas de tiempo automáticas.

**Unit (unidad)**
- `code`: obligatorio, con índice único, por ejemplo "BUS-001".
- `name`: obligatorio.
- `scheduleVersion`: número. **Es el mecanismo de bloqueo de la sección 7.** No tiene significado de negocio.

**Duty**
- `routeId`: referencia obligatoria a una ruta existente.
- `unitId`: referencia obligatoria a una unidad existente.
- `startAt` y `endAt`: fechas en UTC, con `endAt` estrictamente mayor que `startAt`. Validado en el DTO **y también** en el esquema.
- Índices: uno por `unitId + startAt + endAt` y otro por `routeId + startAt`.

### Supuestos de negocio

- Los duties son fechas y horas **absolutas**, no horarios recurrentes. Pueden cruzar la medianoche sin tratamiento especial.
- **Intervalos semiabiertos:** incluyen el inicio y excluyen el fin. Dos duties que solo se tocan en un extremo (uno termina 10:00 y el siguiente empieza 10:00) **no** se solapan.
- Una misma ruta sí puede tener varios duties simultáneos con unidades distintas. La regla solo restringe a la unidad.
- Las fechas se guardan en UTC, la API las recibe y devuelve en ISO 8601 con zona, y la interfaz las muestra en hora local.
- Editar una ruta no invalida sus duties, porque los duties referencian la ruta por id y no por sus puntos.

## 6. Contrato de la API (prefijo `/api`)

| Método | Ruta | Qué hace | Respuestas |
|---|---|---|---|
| GET | `/health` | Estado del servicio y de la conexión a la base | 200 |
| GET | `/routes` | Lista de rutas con nombre, cantidad de puntos y fechas | 200 |
| GET | `/routes/:id` | Detalle con sus puntos | 200, 400, 404 |
| POST | `/routes` | Crea ruta | 201, 400 |
| PUT | `/routes/:id` | Reemplaza nombre y puntos completos | 200, 400, 404 |
| GET | `/routes/:id/duties` | Duties de la ruta con datos de la unidad, ordenados por inicio | 200, 404 |
| GET | `/units` | Lista de unidades | 200 |
| POST | `/units` | Crea unidad | 201, 400, 409 |
| POST | `/duties` | Asigna duty con la garantía de la sección 7 | 201, 400, 404, **409** |
| DELETE | `/duties/:id` | Elimina duty | 204, 404 |

Swagger en `/api/docs`.

**Formato de error uniforme** mediante un filtro global de excepciones: código de estado, tipo, mensaje legible y detalles opcionales. Mapeos obligatorios: error de validación a 400 con la lista de campos; id con formato inválido a 400 (nunca 500); clave duplicada de Mongo a 409; solapamiento a 409 **incluyendo id, ruta, inicio y fin del duty con el que choca**, porque el frontend lo muestra; cualquier otro error a 500 sin filtrar detalles internos ni stack traces.

## 7. Integridad bajo concurrencia (la parte más importante)

### La regla

Dos ventanas de la misma unidad se solapan si y solo si el inicio de la existente es anterior al fin de la nueva **y** el fin de la existente es posterior al inicio de la nueva. Esa única condición cubre todos los casos. Vive en una **función pura** dentro de `duties/domain`, sin dependencias de Nest ni de Mongo, y la consulta a la base replica exactamente esa condición.

### Por qué la validación simple no basta

Consultar y luego insertar es una condición de carrera: dos solicitudes simultáneas consultan, ambas ven el horario libre, ambas insertan.

### Por qué una transacción sola tampoco basta

Las transacciones de MongoDB dan aislamiento de snapshot, no serializabilidad. Como cada solicitud inserta un documento **distinto**, no hay conflicto de escritura que el motor detecte y ambas confirman. Es la anomalía conocida como *write skew*. Para evitarla, la transacción debe escribir sobre algo que la otra también escriba.

### El mecanismo que quiero

Dentro de una única transacción, **en este orden**:

1. **Incrementar `scheduleVersion`** en el documento de la unidad. Si la unidad no existe, responder 404. Esta escritura es lo que hace chocar a dos transacciones sobre la misma unidad.
2. Verificar que la ruta exista (404 si no).
3. Buscar solapamientos de esa unidad con la condición de arriba. Si hay alguno, lanzar un error de conflicto con los datos del duty que choca, lo que aborta la transacción.
4. Insertar el duty.
5. Confirmar.

Usa el helper de transacciones que reintenta automáticamente ante errores transitorios. El error de conflicto de negocio **no** es transitorio: se propaga como 409.

### Detalles que debes respetar

- Pasar la sesión a **todas** las operaciones dentro de la transacción. Una consulta sin sesión corre fuera de la transacción y rompe la garantía en silencio.
- La función de la transacción puede ejecutarse varias veces por los reintentos, así que **no debe tener efectos fuera de la base** (ni llamadas externas ni emisión de eventos).
- Crear el duty con la forma de creación de modelo que acepta la sesión (creación con arreglo de documentos), **no** instanciando un documento y guardándolo: existe un problema conocido de Mongoose con documentos nuevos en transacciones reintentadas.
- Comenta explícitamente **por qué** existe el incremento de `scheduleVersion`. Sin ese comentario, cualquiera pensaría que la línea sobra.
- Si se agotan los reintentos, devolver un error claro y no un 500 genérico.

### Por qué en el motor y no en la aplicación

El bloqueo vive en la base de datos porque es el único componente que todas las instancias comparten. Si el servicio pasa de una a N instancias detrás de un balanceador, la garantía se mantiene sin cambiar nada. Un mutex o una cola en memoria solo ordenarían lo que pasa dentro de un proceso.

## 8. Entorno completamente dockerizado

**Requisito:** quien evalúe solo necesita Docker. Un único `docker compose up` construye, levanta en orden, inicializa el replica set, carga datos de ejemplo y deja la aplicación usable.

### Servicios y orden

| Orden | Servicio | Base | Qué hace | Espera a que |
|---|---|---|---|---|
| 1 | mongo | `mongo:8` | Base con parámetro de replica set, escuchando en todas las interfaces | — |
| 2 | mongo-init | `mongo:8` | Servicio efímero que inicializa el replica set y termina. **Idempotente** | mongo acepte conexiones |
| 3 | api | `node:24-bookworm-slim` | NestJS en modo desarrollo con recarga en caliente | mongo-init **haya terminado con éxito** |
| 4 | seed | igual que api | Servicio efímero que carga unidades, rutas y algún duty de ejemplo. Idempotente | la api esté sana |
| 5 | web | `node:24-bookworm-slim` | Servidor de desarrollo de Vite expuesto al host | la api esté sana |

Las dependencias se declaran **por condición** (servicio sano o servicio terminado con éxito), nunca solo por orden. Un contenedor puede estar arriba antes de que el proceso interno esté listo.

Chequeos de salud: para mongo, verificar que el replica set tenga un primario elegido, no solo que el proceso responda. Para la api, el endpoint `/api/health` comprobando también la conexión a la base.

### Puertos

Web en 5173, api en 3000, mongo en **27018** en el host (deliberadamente distinto de 27017, para no chocar con un MongoDB que el evaluador ya tenga instalado).

### Trampas que debes evitar

1. **Nombre del miembro del replica set:** usa siempre la opción de conexión directa en la cadena de conexión, para que el driver no intente descubrir la topología con nombres que el host no resuelve.
2. **La api arrancando antes de que exista un primario:** de ahí el servicio `mongo-init` separado, y no un script dentro del arranque de la api.
3. **`node_modules` del host pisando el del contenedor** al montar el código fuente: protege esa carpeta con un volumen propio.
4. **Vite escucha solo en localhost por defecto:** exponlo en todas las interfaces o no será accesible desde el host.
5. **Recarga en caliente muerta en Windows y macOS:** puede hacer falta activar el sondeo periódico del observador de archivos.
6. **Variables de entorno de Vite:** se incrustan en tiempo de compilación, no de ejecución. Tenlo presente si algún día se construye para producción.
7. **Alpine y binarios nativos:** por eso la imagen de Node es la variante slim basada en Debian.
8. **Orden de capas:** copiar primero los archivos de dependencias, instalar, y solo después copiar el código fuente. Agregar `.dockerignore` en ambos proyectos.
9. **Sin autenticación en Mongo** para el entorno local, porque un replica set con autenticación exige archivo de clave. Lo documentaré como decisión de desarrollo.
10. **Valores por defecto en el compose**, para que funcione sin que nadie cree un `.env` a mano. Igual entrega un `.env.example`.

### Calidad de las imágenes

Versiones fijadas (nunca `latest`), Dockerfile multi-etapa en la api (dependencias, desarrollo, producción), proceso ejecutándose con usuario sin privilegios, volumen con nombre para los datos de Mongo, y un comando documentado para correr los tests dentro del contenedor.

## 9. Frontend

### Pantallas

| Ruta | Contenido |
|---|---|
| `/routes` | Lista de rutas con nombre, cantidad de puntos y última actualización. Botón de nueva ruta. Estados de carga, vacío y error |
| `/routes/new` y `/routes/:id/edit` | Formulario de nombre, mapa editor y lista de puntos |
| `/routes/:id` | Detalle: mapa de solo lectura, lista de puntos, lista de duties (unidad, inicio, fin, duración, eliminar) y formulario de asignación |
| `/units` | Lista y alta mínima |

### Mapa

Componente de solo lectura: contenedor con **altura explícita en CSS** (sin ella el mapa no se ve), capa de tiles de OpenStreetMap con su atribución, marcadores **numerados** según el orden del punto dibujados como íconos HTML (así se ve el orden y se evita el problema de los íconos por defecto rotos con bundlers), una polilínea uniendo los puntos, y un componente interno que **ajusta el encuadre** a los puntos cada vez que cambian, usando el hook de acceso al mapa. Esto último es necesario porque en react-leaflet las props del contenedor solo se aplican en el primer render.

Componente editor: clic en el mapa agrega un punto al final, lista lateral con nombre, latitud y longitud editables, botones de subir, bajar y eliminar, y la polilínea redibujándose al instante.

Recordatorios: importar la hoja de estilos de Leaflet, mantener siempre el orden latitud-longitud, y tener centro y zoom por defecto configurables para cuando la ruta aún no tiene puntos.

### Estado

Toda lectura pasa por hooks de TanStack Query con claves claras. Cada mutación exitosa **invalida** las claves afectadas, de modo que las vistas se actualicen solas. Sin estado global adicional.

### Errores en la interfaz

Los 400 se muestran junto al campo correspondiente. El 409 por solapamiento se muestra con un mensaje concreto del estilo "La unidad BUS-001 ya tiene un duty de 08:00 a 12:00 en la ruta Norte", con enlace a esa ruta. Botones deshabilitados mientras la solicitud está en curso.

## 10. Seguridad y validación

- ValidationPipe global con lista blanca, rechazo de propiedades no declaradas y transformación de tipos.
- Rangos de latitud y longitud, longitudes máximas de texto, tamaño mínimo y máximo del arreglo de puntos.
- Pipe que valida el formato de ObjectId en parámetros de URL, devolviendo 400 en lugar de 500.
- DTOs tipados que solo aceptan primitivos, para no dar lugar a inyección de operadores de Mongo.
- CORS restringido al origen del frontend mediante variable de entorno.
- Helmet, límite de tamaño del body, variables de entorno validadas al arrancar.
- Sin autenticación: está fuera de alcance de forma consciente.

## 11. Estilo de código

### Comentarios

**Toda** función, método de clase, componente de React y hook lleva inmediatamente encima **un comentario de una línea en español** que dice qué hace, no cómo lo hace. Formato de comentario de documentación, para que el editor lo muestre al pasar el cursor. Si la función lanza errores de negocio relevantes, se mencionan en esa misma línea.

Ejemplos del tono esperado:
- "Crea un duty bloqueando la unidad y rechaza con 409 si su ventana se solapa con otro duty de la misma unidad."
- "Indica si dos ventanas de tiempo se solapan; las que solo se tocan en un extremo no cuentan."
- "Dibuja los puntos de una ruta numerados y unidos por una línea, ajustando el encuadre a todos ellos."

Además, un comentario breve de "por qué" en las líneas no evidentes, y una cabecera de una o dos líneas al inicio de cada archivo indicando su responsabilidad.

### Legibilidad por encima de compacidad

**El código no tiene que ser corto, tiene que ser evidente.** Entre dos versiones que funcionan igual, gana la que se entiende sin releer.

- Varias líneas con nombres claros antes que una expresión encadenada ingeniosa.
- Variables intermedias explicativas: guarda las condiciones complejas en una variable cuyo nombre diga qué representa, en lugar de meterlas dentro del `if`.
- Sin ternarios anidados ni condiciones encadenadas oscuras. Un `if`/`else` explícito ocupa más y se lee mejor.
- Retornos tempranos para los casos borde en lugar de anidar condicionales.
- Sin números ni cadenas mágicas: constantes con nombre.
- Funciones cortas con una sola responsabilidad. Si una función necesita comentarios internos para separar partes, esas partes son funciones.
- Líneas de unos 100 caracteres, con Prettier configurado.
- Sin trucos: nada de desestructuraciones profundas en la firma ni encadenamientos de una sola línea que ahorran caracteres a costa de claridad.

### Nombres que dicen para qué sirven

| Regla | Sí | No |
|---|---|---|
| Nombres completos, sin abreviaturas inventadas | `overlappingDuty`, `routePoints` | `d`, `res`, `tmp`, `arr` |
| Funciones que empiezan por verbo y dicen qué producen | `findOverlappingDuty`, `lockUnitSchedule` | `check`, `process`, `handleData` |
| Booleanos que se leen como afirmación | `hasOverlap`, `canAssignDuty` | `flag`, `status`, `valid` |
| En positivo, nunca en negativo | `isAvailable` | `isNotUnavailable` |
| Marcas de tiempo con sufijo consistente | `startAt`, `endAt` | `start`, `date1` |
| Magnitudes con su unidad en el nombre | `durationMinutes`, `maxPointsPerRoute` | `duration`, `max` |
| Colecciones en plural, elementos en singular | `duties` / `duty` | `dutyList`, `dataArray` |
| Hooks que dicen qué datos entregan | `useRouteDuties`, `useCreateDuty` | `useData`, `useFetch` |
| Componentes que dicen qué muestran | `RouteDetailMap`, `DutyConflictWarning` | `Container`, `Wrapper2` |
| Tests nombrados como frases de conducta | "rechaza un duty solapado de la misma unidad" | "test1", "works" |

Abreviaturas aceptadas: `id`, `url`, `api`, `dto`, `lat`, `lng`, `ms`.

**Vocabulario único del dominio:** las mismas palabras en backend, frontend, base de datos, tests, documentación y etiquetas de la interfaz (*route*, *point*, *unit*, *duty*, *window*, *overlap*, *conflict*). Nada de "vehículo" en una capa, "unidad" en otra y "bus" en la interfaz.

El nombre debe hacer que el comentario suene redundante. Si el nombre necesita el comentario para entenderse, cambia el nombre.

## 12. Tests

### Función pura de solapamiento

Con un duty existente de 10:00 a 12:00:

| Nuevo duty | Esperado |
|---|---|
| 08:00 a 09:00 | Sin conflicto |
| 08:00 a 10:00 | Sin conflicto (solo se tocan) |
| 08:00 a 11:00 | Conflicto |
| 11:00 a 11:30 | Conflicto (contenido) |
| 09:00 a 13:00 | Conflicto (lo contiene) |
| 11:00 a 13:00 | Conflicto |
| 10:00 a 12:00 | Conflicto (idéntico) |
| 12:00 a 14:00 | Sin conflicto (solo se tocan) |
| 23:00 del día anterior a 10:30 | Conflicto (cruza medianoche) |

### Integración con base real

Corre **la misma tabla** contra la base, no solo contra la función pura: en ejecución se usa la consulta, no la función, así que un error en la consulta pasaría desapercibido. Además:

- Fin igual o anterior al inicio: rechazo de validación.
- Unidad o ruta inexistente: no encontrado.
- Misma ventana con otra unidad: éxito.
- **Diez creaciones simultáneas solapadas sobre la misma unidad: exactamente 1 creada.**
- **Diez creaciones simultáneas sin solapamiento sobre la misma unidad: las 10 creadas** (el bloqueo ordena, no descarta).

Crea colecciones e índices **antes** de lanzar el test de concurrencia, para que los fallos no vengan de la creación simultánea de la colección.

Incluye también un script que dispare N solicitudes HTTP simultáneas contra la api corriendo e imprima cuántos 201 y cuántos 409 obtuvo. Lo usaré en la demo.

## 13. Errores que no quiero ver

Vigila especialmente estos, porque son los que se cometen con más frecuencia en este problema:

- Validar y luego insertar sin transacción.
- Afirmar que una transacción sola resuelve la concurrencia.
- Mutex o cola en memoria.
- Condición de solapamiento con "menor o igual", que bloquearía intervalos que solo se tocan, o que solo revisa si el inicio cae dentro.
- Olvidar la sesión en alguna consulta dentro de la transacción.
- MongoDB standalone en el compose, sin replica set.
- Código estilo NestJS 11 en un proyecto NestJS 12.
- Invertir latitud y longitud.
- Íconos de Leaflet rotos, mapa sin altura o CSS sin importar.
- Guardar fechas como texto o guardar horas sin fecha.
- Actualizar documentos sin ejecutar los validadores del esquema.
- Sobre-ingeniería.
- Tests que parecen de concurrencia pero corren secuencialmente o usan mocks de la base.
- Código compacto con encadenamientos largos, ternarios anidados o nombres de una letra en callbacks.

## 14. Plan de fases

Recuerda: muéstrame primero la lista completa de fases, explica cada una antes de empezarla, espera mi aprobación y, al cerrarla, dime cómo probarla.

**Fase 0. Preparación y entorno dockerizado.** Generar los dos proyectos con el identificador `rumbo`, construir el compose completo con sus Dockerfiles multi-etapa, `.dockerignore`, healthchecks, dependencias por condición y el endpoint de salud. Crear `CLAUDE.md` con la estructura de la sección 17, `AGENTS.md`, `.env.example`, `.nvmrc`, la base de estilos con variables y puntos de quiebre, y verificar las compatibilidades de versiones. Terminada cuando `docker compose up` en una carpeta limpia levanta todo y la web abre en el navegador mostrando `Rumb@`.

**Fase 1. Rutas y unidades.** Esquemas, DTOs con validación, servicios y controladores. Filtro global de errores y pipe de ObjectId. Seed idempotente con unidades y un par de rutas, como servicio del compose. Terminada cuando se crea, edita y consulta con validación completa y la aplicación abre con datos.

**Fase 2. Duties y la regla de solapamiento.** Primero la función pura con sus tests. Después el esquema con índices, el servicio con transacción y bloqueo, los endpoints y el borrado. Al final el test de concurrencia. Terminada cuando todos los tests pasan y, al retirar el incremento del contador, el test de concurrencia falla (esa contraprueba demuestra que el test prueba lo que dice probar; muéstrame el resultado de ambas corridas).

**Fase 3. Frontend.** Cliente HTTP y hooks, lista de rutas, detalle con mapa y duties, formulario de ruta con mapa editor, formulario de duty con manejo del 409. Cada pantalla con su archivo de estilos y verificada en varios anchos. Terminada cuando el flujo completo funciona en el navegador, se ve bien en móvil y escritorio, y todo cambio se refleja sin recargar.

**Fase 4. Opcionales, solo si las fases anteriores están sólidas.** En este orden: Swagger con DTOs anotados; vista previa de conflictos en el formulario de duty (al elegir unidad y ventana, marcar qué unidades están ocupadas, dejando claro que es ayuda de interfaz y no la garantía); edición de duty con la misma garantía.

**Fase 5. Cierre.** Revisión de legibilidad, comentarios, estilos y responsive; repaso final de `CLAUDE.md` (mapa del código completo, niveles de evidencia correctos, registro de fallos al día); prueba desde clon limpio siguiendo solo el README; y entrega del material para que yo escriba la bitácora.

## 15. Visión de producto

El usuario es un planificador de flota. Su pregunta real es "qué unidad tengo libre para cubrir esta ruta en este horario". Tenlo presente al diseñar la interfaz: la vista previa de conflictos es más útil marcando qué unidades están ocupadas en la ventana elegida que mostrando un aviso genérico después.

## 16. Formato del reporte al terminar cada fase

Al cerrar cada fase, dame exactamente esto:

1. **Qué construí**, en tres o cuatro líneas.
2. **Decisiones que tomé por mi cuenta** y que no estaban en este prompt, con su motivo. Sé explícito: necesito distinguir lo que decidí yo de lo que decidiste tú.
3. **Dónde me aparté de lo que pediste** y por qué, si ocurrió.
4. **Dudas o riesgos** que detectaste.
5. **Cómo probarlo yo**, con instrucciones paso a paso: qué comando ejecutar, qué abrir, qué hacer en pantalla y qué debería ocurrir. Luego espera mi retroalimentación.
6. **Qué actualicé en `CLAUDE.md`** en esta fase (secciones tocadas, filas nuevas del mapa del código, fallos registrados, conocimiento que antes era implícito).
7. **Mensajes de commit sugeridos**, sin ejecutarlos.

Este reporte es mi materia prima para la bitácora de decisiones, así que sé preciso y honesto en el punto 2. No escribas tú la bitácora.

## 17. Memoria del proyecto: CLAUDE.md y AGENTS.md

### CLAUDE.md es la única fuente de verdad

Toda la memoria del proyecto vive en `CLAUDE.md`, en la raíz del repositorio. No en tu contexto de conversación, no en comentarios sueltos, no en tu cabeza: en ese archivo. **Tras cada cambio relevante, actualízalo en la misma tarea**, no al final del día ni cuando te lo recuerde.

Créalo en la Fase 0 y mantenlo vivo. Debe contener, como mínimo: nombre y propósito del proyecto (incluida la distinción entre `Rumb@` y `rumbo`), stack con versiones exactas, arquitectura y decisiones vigentes, reglas de código (comentarios, nombres, legibilidad, estilos, responsive), el mecanismo de concurrencia, cómo se levanta y se prueba el entorno, el mapa del código, el registro de fallos y los supuestos pendientes.

### Mapa de "dónde vive qué"

Mantén en `CLAUDE.md` una sección **"Mapa del código"**: una tabla que asocie cada concepto del dominio con el archivo exacto donde vive. Actualízala cada vez que crees, muevas o renombres un archivo. Ejemplo de fila:

| Concepto | Archivo |
|---|---|
| Regla de solapamiento de ventanas | `api/src/duties/domain/overlap.ts` |
| Bloqueo de la unidad en la transacción | `api/src/duties/duties.service.ts` |
| Estilos de la pantalla de detalle de ruta | `web/src/styles/RouteDetailPage.css` |

### Separar lo verificado de lo que solo compila

Cada afirmación técnica en `CLAUDE.md` debe llevar su nivel de evidencia. Usa exactamente estas etiquetas:

- `[verificado-en-dispositivo]`: lo probé ejecutándolo y observé el resultado.
- `[compila]`: compila y pasa el tipado, pero no se ejecutó ni se observó su comportamiento.
- `[verificado-contra-la-librería]`: contrastado con la documentación o el código fuente real de la dependencia.
- `[supuesto]`: creencia razonable sin comprobar.

**Nunca escribas un supuesto con el mismo tono que un hecho comprobado.** Si no sabes en cuál categoría cae algo, es `[supuesto]`.

### Registro de fallos, no solo de decisiones

Mantén una sección **"Errores encontrados y su causa raíz"** con tres datos por entrada: qué falló, por qué falló (causa raíz, no síntoma) y cómo se detectó. Un fallo resuelto sin documentar se repite.

### Prohibido el conocimiento implícito

Si al terminar una tarea sabes algo que no está en `CLAUDE.md` y que **habría cambiado tu forma de trabajar de haberlo sabido al empezar**, escríbelo antes de dar la tarea por terminada. Aplica a incompatibilidades de versiones, comportamientos inesperados de una librería, trampas del entorno, convenciones que descubriste sobre la marcha y cualquier cosa que le ahorraría tiempo a quien retome el proyecto.

### AGENTS.md

Crea también, en la raíz del repositorio, un archivo `AGENTS.md` con exactamente este contenido:

```markdown
# Instrucciones del Proyecto

**MANDATORY RULE:**
1. Al inicio de cada tarea, **DEBES** leer el archivo `CLAUDE.md` ubicado en la raíz del proyecto para obtener el contexto completo de la arquitectura, patrones y reglas de la aplicación.
2. Si descubres nuevos patrones, resuelves bugs estructurales o si el usuario te pide actualizar las directrices del proyecto, **DEBES** editar y actualizar directamente el archivo `CLAUDE.md` para mantenerlo sincronizado con Claude. No agregues reglas largas aquí, mantén `CLAUDE.md` como la única fuente de la verdad.
```

## 18. Interfaz y estilos

### Usabilidad

La interfaz debe ser **amigable y fácil de usar**, no una demostración técnica en crudo. Eso significa:

- Jerarquía visual clara: se entiende de un vistazo qué es cada cosa y cuál es la acción principal de cada pantalla.
- Estados explícitos para carga, vacío y error. Un listado vacío debe explicar qué hacer, no quedarse en blanco.
- Confirmación antes de acciones destructivas, y aviso visible cuando una acción tuvo éxito.
- Mensajes de error en lenguaje humano, nunca códigos crudos ni el objeto de error tal cual llega.
- Formularios con etiquetas visibles, ayuda contextual donde el dato no sea obvio y errores junto al campo que los provoca.
- Botones deshabilitados con indicación de progreso mientras una operación está en curso.
- Navegación evidente entre listado y detalle, sin callejones sin salida.
- Contraste suficiente, tamaños de toque cómodos y foco de teclado visible.

### Estilos: un archivo por pantalla

- **Prohibidos los estilos en línea.** Ninguna propiedad de estilo escrita directamente en el marcado.
- Cada pantalla tiene **su propio archivo de estilos con el mismo nombre que la pantalla**. Si la pantalla es `RouteDetailPage`, su hoja es `RouteDetailPage.css`.
- Todos los archivos de estilos viven en una **carpeta de estilos** dedicada, con la misma estructura que las pantallas y componentes a los que corresponden.
- Los componentes reutilizables siguen la misma regla: un archivo de estilos por componente, con su mismo nombre.
- Variables CSS en un archivo base para colores, espaciados, tipografía, radios y puntos de quiebre. Nada de valores repetidos a mano por el proyecto.
- Nomenclatura de clases consistente y descriptiva, sin nombres genéricos tipo `box2` o `div-container`.
- Sin `!important` salvo justificación escrita en el propio archivo.

Si crees que otra convención de estilos encaja mejor con Vite y React (por ejemplo módulos CSS, que mantienen la regla de un archivo por pantalla y además aíslan el alcance), **propónmela antes de implementarla** y sigo decidiendo yo.

### Responsive

**Todo debe adaptarse a cualquier tamaño de pantalla**, de móvil pequeño a escritorio ancho. En concreto:

- Diseño primero para móvil, luego los puntos de quiebre hacia arriba.
- Unidades relativas y rejillas flexibles en lugar de anchos fijos en píxeles.
- Contenido ancho (tablas de duties, listas de puntos) con desplazamiento horizontal contenido, para que la página nunca se desplace de lado.
- **El mapa también es responsive:** altura adaptable, y en pantallas angostas el mapa y la lista de puntos se apilan en lugar de convivir lado a lado.
- Formularios en una sola columna en móvil.
- Verifica en al menos tres anchos antes de dar una pantalla por terminada, y dime en cuáles la probaste.

## 19. Dependencias

- **Todas las dependencias deben estar declaradas en el `package.json` correspondiente**, con su versión. Nada de instalaciones globales, nada de paquetes usados sin declarar, nada de asumir que algo "ya viene".
- Distingue correctamente dependencias de producción y de desarrollo.
- **Verifica la compatibilidad real entre las librerías externas antes de instalarlas**, especialmente entre NestJS 12, `@nestjs/mongoose` y `mongoose`, y entre React 19, `react-leaflet` v5 y `leaflet`. Consulta las versiones y los requisitos declarados por cada paquete en lugar de asumirlos de memoria.
- Si detectas una incompatibilidad, **dímela con las opciones reales** (esperar, fijar una versión anterior, cambiar de librería) antes de tomar el camino por tu cuenta.
- Registra en `CLAUDE.md` las versiones elegidas y las incompatibilidades encontradas, con su nivel de evidencia.
- Los archivos de bloqueo de dependencias se versionan en el repositorio.

## 20. Primer paso

No escribas código todavía. Empieza por:

1. Decirme si algo de este prompt te parece equivocado, contradictorio o incompleto.
2. Verificar y confirmarme las versiones exactas compatibles entre sí de todo el stack, señalando cualquier incompatibilidad real del ecosistema de NestJS 12 y de React 19 con react-leaflet.
3. Mostrarme **la lista completa de fases** del proyecto con un resumen de qué se hará en cada una.
4. Explicarme en detalle la Fase 0 y **esperar mi aprobación** antes de tocar un solo archivo.

# FIN DEL PROMPT

---

## Apéndice: prompts cortos para las siguientes fases

Una vez que Claude tenga el contexto, cada fase se abre con algo breve. Si el chat se alarga o abres uno nuevo, pídele que lea `CLAUDE.md` antes de trabajar.

**Para aprobar y arrancar una fase:**
> Aprobado. Implementa la Fase N en pasos pequeños, mostrándome cada cambio. Recuerda las reglas de CLAUDE.md. Al terminar, actualiza CLAUDE.md y dame el reporte con el formato de la sección 16, incluidas las instrucciones para que yo pruebe.

**Si el trabajo se desvía:**
> Detente. Esto se aparta de [la regla X]. Explícame por qué lo hiciste así antes de continuar.

**Para revisar legibilidad antes de cerrar una fase:**
> Revisa el código de esta fase solo desde la legibilidad: funciones sin comentario, nombres genéricos o abreviados, expresiones que obliguen a releer, números mágicos. Lista lo que encontraste antes de corregir nada.

**Para revisar estilos y responsive:**
> Revisa esta fase solo desde la interfaz: estilos en línea que se hayan colado, pantallas sin su archivo de estilos propio, valores repetidos que deberían ser variables, y comportamiento en móvil, tableta y escritorio. Lista los hallazgos antes de corregir.

**Para la contraprueba de concurrencia (Fase 2):**
> Quita temporalmente el incremento de scheduleVersion, corre el test de concurrencia y muéstrame el resultado. Después restitúyelo y vuelve a correrlo. Quiero ver ambas salidas.

**Para auditar la memoria del proyecto:**
> Revisa CLAUDE.md: dime qué afirmaciones están sin etiqueta de evidencia, qué filas faltan en el mapa del código y qué sabes ahora del proyecto que no esté escrito ahí y que te habría cambiado la forma de trabajar.

**Al cerrar (Fase 5):**
> Dame el listado consolidado de todas las decisiones que tomaste tú a lo largo del proyecto y de todos los puntos donde te corregí, indicando en qué fase y archivo ocurrió cada uno. Es para que yo escriba DECISIONS.md.
