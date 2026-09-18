# Rumb@ — memoria del proyecto

> Este archivo es la **única fuente de verdad** del proyecto. Se actualiza en la misma tarea
> en la que se hace un cambio, no después. Si algo importante no está aquí, no existe.

## Niveles de evidencia

Cada afirmación técnica de este documento lleva una de estas etiquetas:

- `[verificado-en-dispositivo]` — se ejecutó y se observó el resultado.
- `[compila]` — compila y pasa el tipado, pero no se ejecutó.
- `[verificado-contra-la-librería]` — contrastado con la documentación o el código real de la dependencia.
- `[supuesto]` — creencia razonable sin comprobar.

---

## 1. Nombre y propósito

**Rumb@** es un sistema de planificación de transporte. Gestiona **rutas** (listas ordenadas de
puntos geográficos), **unidades** (vehículos) y **duties** (la asignación de una ruta a una unidad
durante una ventana de tiempo). La regla central del negocio: **una misma unidad no puede tener
dos duties cuyas ventanas se solapen.**

### Rumb@ frente a rumbo

| | Valor | Dónde se usa |
|---|---|---|
| Nombre visible | `Rumb@` | Título de la pestaña, encabezado de la interfaz, README, documentación |
| Identificador técnico | `rumbo` | `name` de ambos `package.json`, nombre del proyecto en Compose, prefijo de contenedores, nombre de la base de datos |

El carácter `@` no es válido como identificador técnico: en npm abre un nombre con ámbito, y tanto
Compose como los nombres de contenedor lo rechazan. **No mezclar los dos.** El nombre del proyecto
de Compose se fija explícitamente con `name: rumbo` en `docker-compose.yml`; sin esa línea, Compose
lo derivaría del nombre de la carpeta. `[verificado-en-dispositivo]`

---

## 2. Stack y versiones

Todas las versiones de esta tabla se consultaron en el registro de npm y se instalaron sin un solo
conflicto de peer dependencies. `[verificado-en-dispositivo]`

### Api (`api/`)

| Paquete | Versión |
|---|---|
| `@nestjs/common`, `core`, `platform-express`, `testing`, `cli`, `schematics` | `^12.0.3` |
| `@nestjs/mongoose` | `^12.0.0` |
| `@nestjs/config` | `^12.0.0` |
| `mongoose` | `^9.10.1` |
| `class-validator` / `class-transformer` | `^0.15.1` / `^0.5.1` |
| `helmet` | `^8.3.0` |
| `typescript` | `~6.0.3` |
| `vitest` / `@vitest/coverage-v8` | `^4.1.2` |
| `oxlint` | `^1.58.0` |

### Web (`web/`)

| Paquete | Versión |
|---|---|
| `react` / `react-dom` | `^19.3.0` |
| `react-router` | `^8.4.0` |
| `@tanstack/react-query` | `^5.103.1` |
| `react-leaflet` / `leaflet` | `^5.0.0` / `^1.9.4` |
| `vite` / `@vitejs/plugin-react` | `^8.3.0` / `^6.1.1` |
| `typescript` | `~6.0.3` |

### Imágenes Docker

| Servicio | Imagen |
|---|---|
| mongo, mongo-init | `mongo:8.0.20` |
| api, seed, web | `node:24-bookworm-slim` |

### Compatibilidades comprobadas

- `@nestjs/mongoose@12` declara como peers `@nestjs/core ^11 || ^12` y `mongoose ^7 || ^8 || ^9`.
  La combinación NestJS 12 + Mongoose 9 está soportada explícitamente. `[verificado-contra-la-librería]`
- `react-leaflet@5` declara como peers `react ^19`, `react-dom ^19` y `leaflet ^1.9`.
  **No hay incompatibilidad con React 19.** `[verificado-contra-la-librería]`
- `@nestjs/swagger@12` declara `@fastify/static`, `class-validator` y `class-transformer` como
  peers **opcionales**: no estorban usando Express. `[verificado-contra-la-librería]`

### TypeScript: por qué la 6 y no la 7

El `latest` de TypeScript es la **7.0.2**, pero **NestJS 12 todavía no está en esa línea**:
`@nestjs/cli@12.0.3` trae `typescript ~6.0.2` como dependencia propia y `@nestjs/schematics@12`
exige `typescript >=6.0.0`. Se fija **`~6.0.3`** en la api para que el compilador del proyecto y el
que usa el CLI sean el mismo. `[verificado-contra-la-librería]`

Los decoradores siguen funcionando en esta línea, lo cual era el riesgo real (sin
`emitDecoratorMetadata` no hay inyección de dependencias de Nest, ni `class-validator`, ni Swagger):
se compiló un caso de prueba y se inspeccionó la salida, que emite `__metadata("design:type", ...)`
y `__metadata("design:paramtypes", [Dep])` correctamente. `[verificado-en-dispositivo]`

Trampa de esta línea de TypeScript: **ya no infiere el `rootDir`**. Compilar sin declararlo aborta
con `error TS5011`. Por eso `api/tsconfig.build.json` lo declara explícitamente.
`[verificado-en-dispositivo]`

---

## 3. Arquitectura y decisiones vigentes

- **Monorepo de dos proyectos independientes**, `api/` y `web/`, cada uno con su `package.json` y su
  propio lockfile. No hay workspaces de npm: el MVP no los justifica.
- **La api es ESM.** NestJS 12 genera proyectos como ESM (`"type": "module"`) con Vitest, no como
  CommonJS con Jest. Los imports internos llevan extensión `.js` aunque el archivo sea `.ts`.
  Esto se confirmó generando un proyecto de referencia con el CLI real. `[verificado-en-dispositivo]`
- **El linter es oxlint, no ESLint.** Es lo que genera NestJS 12 y lo que genera Vite.
- **Sin autenticación**, de forma consciente y fuera de alcance.
- **MongoDB sin autenticación en local**, porque un replica set con autenticación exige un archivo de
  clave compartido. Es una decisión de entorno de desarrollo.
- **El seed habla con la api por HTTP**, no escribe en MongoDB directamente. Así pasa por las mismas
  validaciones que un usuario real y no duplica la definición de los esquemas, que es la principal
  fuente de deriva entre el seed y el modelo. Se ejecuta como servicio efímero que depende de que la
  api esté sana.
- **El agente redacta y mantiene `README.md` y `DECISIONS.md`.** Decisión del responsable durante
  el proyecto, que sustituye la regla inicial de no escribirlos. Reglas:
  - Se actualizan **en la misma tarea** en que cambie algo que describen (un comando, el estado de
    una fase, una decisión nueva).
  - El README **solo afirma lo que existe**: la tabla "Estado actual" debe reflejar la verdad, y
    todo comando que aparezca en él se ejecuta antes de escribirlo.
  - El tono del README es **ligeramente coloquial** (decisión del responsable): cercano, pero sin
    perder precisión.
  - **Ambos se escriben en primera persona**, con la voz del responsable (decisión del
    responsable). Las instrucciones de uso del README pueden dirigirse al lector ("abre…").
  - En `DECISIONS.md` no se inventan correcciones ni rechazos que no ocurrieron. Por decisión del
    responsable, **las decisiones que el agente propone y el responsable aprueba se registran como
    suyas** (así se hizo con las de la interfaz en la Fase 3), y solo las más importantes.
  - El responsable revisa ambos antes de entregarlos: los va a defender en la entrevista.
- **Los scripts auxiliares se ejecutan en TypeScript sin compilar.** Node 24 ejecuta archivos `.ts`
  de forma nativa, sin flags. Limitación: el borrado de tipos no admite `enum`, `namespace` ni
  propiedades de parámetro en constructores, así que esos scripts se escriben sin esas construcciones.
  `[verificado-en-dispositivo]`

---

## 4. Concurrencia: la parte más importante

> **Implementado en la Fase 2** en `api/src/duties/duties.service.ts` y verificado contra MongoDB
> real, incluida la contraprueba. `[verificado-en-dispositivo]`

### La regla

Dos ventanas de la misma unidad se solapan si y solo si:

```
existente.startAt < nueva.endAt  Y  existente.endAt > nueva.startAt
```

Intervalos **semiabiertos**: incluyen el inicio y excluyen el fin. Dos duties que solo se tocan en un
extremo (uno termina a las 10:00 y el siguiente empieza a las 10:00) **no** se solapan. La condición
vive en una función pura sin dependencias de Nest ni de Mongo, y **la consulta a la base replica
exactamente esa condición**, porque en ejecución se usa la consulta, no la función.

Las dos viven juntas en `api/src/duties/domain/overlap.ts` (`hasOverlap` y `buildOverlapFilter`), y la
tabla de 9 casos está en `overlap-cases.ts`, compartida por el test unitario y el de integración, para
que la consulta real se pruebe con exactamente los mismos casos que la función.
`[verificado-en-dispositivo]`

### Por qué no basta con validar antes de insertar

Consultar y luego insertar es una condición de carrera: dos solicitudes simultáneas consultan, ambas
ven el horario libre, ambas insertan.

### Por qué no basta con una transacción

Las transacciones de MongoDB dan aislamiento de **snapshot**, no serializabilidad. Como cada
solicitud inserta un documento **distinto**, no hay conflicto de escritura que el motor detecte y
ambas confirman. Es la anomalía conocida como **write skew**.

### El mecanismo

Dentro de una única transacción y **en este orden**:

1. **Incrementar `scheduleVersion`** en el documento de la unidad (`$inc`). Si la unidad no existe, 404.
2. Verificar que la ruta exista (404 si no).
3. Buscar solapamientos de esa unidad con la condición de arriba. Si hay alguno, lanzar conflicto (409).
4. Insertar el duty.
5. Confirmar.

**El `$inc` es todo el mecanismo.** No tiene significado de negocio y nadie lee su valor. Existe
únicamente para que dos transacciones sobre la misma unidad escriban en el **mismo documento** y el
motor detecte el conflicto. Sin él hay write skew. **Esa línea no se toca.**

### Por qué no hay una restricción declarativa

Sería preferible que la base impidiera el solapamiento por definición, sin depender de que el código
de la transacción esté bien escrito. **No se puede.** Un índice único compara valores por igualdad; el
solapamiento es una relación entre rangos, y ningún índice de MongoDB sabe evaluarla. La base que sí
lo permite es PostgreSQL, con `EXCLUDE USING gist (unit_id WITH =, tstzrange(start_at, end_at) WITH &&)`.
MongoDB no tiene equivalente. `[verificado-contra-la-librería]`

**Se descartó deliberadamente** añadir un índice único sobre `unitId + startAt` como defensa parcial.
Solo atrapa el choque exacto: un duty que empiece un milisegundo después pasa el índice y se solapa
igual. Y, sobre todo, **se lee como si garantizara el invariante sin garantizarlo**, lo que invita a
relajar la desconfianza justo donde hace falta. Media defensa es peor que ninguna.

### Detalles obligatorios de implementación

- **Pasar la sesión a todas las operaciones** dentro de la transacción. Una consulta sin sesión corre
  fuera de la transacción y rompe la garantía en silencio.
- La función de la transacción **puede ejecutarse varias veces** por los reintentos: no debe tener
  efectos fuera de la base.
- Crear el duty con `Model.create([documento], { session })`, **no** con `new Model().save()`:
  hay un problema conocido de Mongoose con documentos nuevos en transacciones reintentadas.
- `withTransaction` reintenta **por ventana de tiempo (120 s por defecto), no por número de intentos**.
  El error de "reintentos agotados" es en la práctica un vencimiento. `[verificado-contra-la-librería]`
- El conflicto de negocio **no** es transitorio: se propaga como 409, no se reintenta.
- Si `withTransaction` agota su ventana, propaga el último error **con sus etiquetas**
  (`TransientTransactionError` o `UnknownTransactionCommitResult`); solo lo envuelve en
  `MongoOperationTimeoutError` si se configura `timeoutMS`. El servicio reconoce ambas formas y
  responde **503 `ScheduleBusy`**. En el driver 7.6.0 hay además espera creciente entre reintentos.
  `[verificado-contra-la-librería]`. El 503 en sí **no se ha provocado nunca**: `[compila]`.
- **El borrado de un duty no bloquea la unidad.** Borrar no puede crear solapamientos; en el peor
  caso una creación simultánea todavía ve el duty que se borra y responde 409 de más, que es el
  error seguro.

### Borrar una unidad sin dejar duties huérfanos

Regla: **una unidad solo se borra si no tiene duties** (409 `UnitInUse` con las rutas donde están).
`DutiesService.deleteUnit`, dentro de una transacción y en este orden: la unidad existe (404), no
tiene duties (409), se borra.

**No lleva `$inc` propio, y no le hace falta:** el `deleteOne` escribe en el mismo documento que
`lockUnitSchedule` incrementa al asignar un duty. Si coinciden, MongoDB detecta el conflicto y una
reintenta: o el borrado ve el duty nuevo (409), o la asignación ya no encuentra la unidad (404).

**Verificado** `[verificado-en-dispositivo]`: 40 rondas de asignación y borrado simultáneos, alternando
cuál sale primero, sin ningún duty huérfano (`duty 201 / borrado 409` en las 40). **Contraprueba**:
sin la transacción, tres ejecuciones seguidas con el mismo resultado, `duty 201 / borrado 204` en las
40 rondas, es decir, **40 duties huérfanos de 40**. Con la transacción restaurada (comprobada byte a
byte), vuelve a pasar.

Trampa del test: la primera versión, sin contraprueba, pasaba porque siempre ganaba la asignación (que
escribe primero, mientras el borrado primero lee). Un test de concurrencia en verde no prueba nada
hasta que se ve fallar sin el mecanismo.

### Estado verificado del soporte de transacciones

MongoDB corre como **replica set de un solo nodo** (`rs0`), que es el requisito para que haya
transacciones. Se comprobó dentro del contenedor de la api que `mongoose.startSession()` y
`session.withTransaction()` con un `$inc` dentro funcionan con la cadena de conexión real del
proyecto, incluida la opción `directConnection=true`. `[verificado-en-dispositivo]`

### Contraprueba acordada

Al retirar el `$inc`, el test de concurrencia debe fallar. **Ese fallo es probabilístico, no
determinista**: depende del azar de la temporización. La contraprueba se ejecuta **tres veces
seguidas** y se reportan las tres salidas tal cual. Se descartó introducir una pausa artificial para
forzar la ventana de carrera: demostraría que un sistema con una pausa metida a mano falla, no que
el sistema real falle.

**Resultado de la Fase 2** `[verificado-en-dispositivo]`: se sustituyó el `$inc` por un `findById` con
sesión (conserva el 404 y solo quita el bloqueo). Las tres ejecuciones fallaron igual:
`expected { '201': 3, '409': 7 } to deeply equal { '201': 1, '409': 9 }`, es decir, **tres duties
solapados en la misma unidad**. El test sin solapamiento siguió pasando, como debe. Con el `$inc`
restaurado (comprobado byte a byte contra la copia) el test pasó en 5 de 5 ejecuciones seguidas.

---

## 5. Cómo se levanta y se prueba

### Requisito único

Docker. Nada más. No hace falta crear ningún `.env`: el compose trae todos los valores por defecto.

### Levantar

```bash
docker compose up --build
```

Levanta en orden: `mongo` → `mongo-init` (inicializa el replica set y termina) → `api` →
`seed` (carga datos y termina) + `web`. Las dependencias se declaran **por condición**
(`service_healthy`, `service_completed_successfully`), nunca solo por orden.

Desde cero, con las imágenes ya construidas, tarda unos **20 segundos** hasta que todo está sano.
`[verificado-en-dispositivo]`

### Puertos

| Servicio | Host | Nota |
|---|---|---|
| web | `http://localhost:5173` | |
| api | `http://localhost:3000/api` | |
| mongo | `localhost:27018` | Deliberadamente distinto de 27017, para no chocar con un MongoDB ya instalado |

### Comprobar

```bash
curl http://localhost:3000/api/health
# {"status":"ok","database":{"isConnected":true,"name":"rumbo","replicaSetName":"rs0"}}
```

El campo `replicaSetName` está a propósito: si sale `null`, no hay replica set y **no habrá
transacciones**, lo que rompería la garantía de concurrencia en silencio.

### Tests dentro del contenedor

```bash
docker compose exec api npm test                   # unitarios (33 tests)
docker compose exec api npm run test:e2e           # integración contra MongoDB real (31 tests)
docker compose exec api npm run demo:concurrency   # demo por HTTP; opcional: -- --requests=30
```

Los tests de integración levantan la app completa dentro del proceso (misma configuración vía
`configureApp`) y le hacen peticiones HTTP reales con `supertest` contra la base **`rumbo_test`**,
que **borran entera** al empezar; se niegan a correr si la base no se llama así. Los datos de la demo
(`rumbo`) no se tocan. `[verificado-en-dispositivo]`

Trampa: `ConfigModule.forRoot` lee el entorno **al importar** `AppModule` (se evalúa en el
decorador). Por eso el test cambia `MONGODB_URI` y después importa `AppModule` de forma dinámica.
`[verificado-en-dispositivo]`

La demo usa la unidad `BUS-003` (el seed la deja sin duties a propósito) en una ventana aleatoria
del próximo año, y termina con código 1 si se crea más de un duty.

### Conectarse a la base desde el host

```
mongodb://localhost:27018/rumbo?directConnection=true
```

`directConnection=true` es **obligatorio desde el host**: sin él, el driver intentaría descubrir la
topología del replica set, recibiría del servidor el nombre del miembro (`mongo:27017`) e intentaría
resolverlo desde Windows, donde ese nombre no existe.

### Detener

```bash
docker compose down      # conserva los datos
```

`[verificado-en-dispositivo]`: tras `down` y `up -d`, la api estuvo sana en 24 s y las 3 unidades
seguían ahí.

### Reiniciar desde cero

```bash
docker compose down -v   # -v borra también el volumen de datos
docker compose up --build
```

`mongo-init` y `seed` son **idempotentes**: se pueden volver a ejecutar sin efectos adversos.
`[verificado-en-dispositivo]`. Los duties del seed se crean para **mañana (UTC)**: repetirlo el mismo
día no duplica (cada duty choca consigo mismo con 409), pero repetirlo otro día añade los del nuevo
"mañana".

---

## 6. Reglas de código

### Comentarios

- **Toda** función, método de clase, componente de React y hook lleva **inmediatamente encima** un
  comentario de **una línea en español** que dice **qué hace**, no cómo. En formato de comentario de
  documentación, para que el editor lo muestre al pasar el cursor.
- Si la función lanza errores de negocio relevantes, se mencionan en esa misma línea.
- Cabecera de una o dos líneas al inicio de **cada archivo** indicando su responsabilidad.
- Comentario breve de **por qué** en las líneas no evidentes.
- **Con tildes.** Tanto los comentarios como cualquier texto visible en la interfaz se escriben en
  español correcto. Los archivos son UTF-8 y admiten acentos y `ñ` sin problema; escribirlos sin
  tilde "por si acaso" es un defecto de calidad, no una precaución.

### Legibilidad por encima de compacidad

El código no tiene que ser corto, tiene que ser **evidente**.

- Variables intermedias explicativas en lugar de condiciones complejas dentro del `if`.
- Sin ternarios anidados. Un `if`/`else` explícito ocupa más y se lee mejor.
- Retornos tempranos para los casos borde en lugar de anidar.
- Sin números ni cadenas mágicas: constantes con nombre.
- Funciones cortas con una sola responsabilidad.
- Líneas de unos 100 caracteres (`printWidth: 100` en Prettier).

### Nombres

| Regla | Sí | No |
|---|---|---|
| Sin abreviaturas inventadas | `overlappingDuty`, `routePoints` | `d`, `res`, `tmp`, `arr` |
| Funciones que empiezan por verbo | `findOverlappingDuty`, `lockUnitSchedule` | `check`, `process` |
| Booleanos como afirmación, en positivo | `hasOverlap`, `isAvailable` | `flag`, `isNotUnavailable` |
| Marcas de tiempo con sufijo | `startAt`, `endAt` | `start`, `date1` |
| Magnitudes con su unidad | `durationMinutes`, `maxPointsPerRoute` | `duration`, `max` |
| Colecciones en plural | `duties` / `duty` | `dutyList` |
| Hooks que dicen qué entregan | `useRouteDuties`, `useCreateDuty` | `useData` |
| Componentes que dicen qué muestran | `RouteDetailMap`, `DutyConflictWarning` | `Container` |

Abreviaturas aceptadas: `id`, `url`, `api`, `dto`, `lat`, `lng`, `ms`.

**Vocabulario único del dominio** en backend, frontend, base de datos, tests, documentación e
interfaz: *route*, *point*, *unit*, *duty*, *window*, *overlap*, *conflict*. Nada de "vehículo" en
una capa y "bus" en otra.

### Estilos

- **Módulos CSS**, decididos frente a CSS plano por aislar el alcance sin romper la regla de un
  archivo por pantalla.
- **Cero estilos en línea.** Ninguna propiedad de estilo en el marcado.
- Cada pantalla y cada componente reutilizable tiene **su propio archivo con su mismo nombre**:
  `RouteDetailPage` → `RouteDetailPage.module.css`. Todos en `web/src/styles/`.
- Variables CSS en `web/src/styles/base.css` para colores, espaciados, tipografía, radios y medidas.
  Nada de valores repetidos a mano.
- Sin `!important` salvo justificación escrita en el propio archivo.

#### La única excepción: Leaflet

Leaflet inyecta nodos en el DOM **fuera de React** y no ve los nombres de clase transformados por los
módulos CSS. Por eso los estilos dirigidos a Leaflet (altura del contenedor del mapa, aspecto de los
marcadores numerados del `divIcon`) viven en una **hoja global acotada**,
`web/src/styles/leaflet-overrides.css`, junto a la importación de `leaflet/dist/leaflet.css`.
**Esa hoja no se convierte en módulo**: hacerlo rompería los marcadores.

### Responsive

- **Diseño primero para móvil**, luego puntos de quiebre hacia arriba.
- Unidades relativas y rejillas flexibles, no anchos fijos en píxeles.
- Contenido ancho con desplazamiento horizontal **contenido**: la página nunca se desplaza de lado.
- El mapa también es responsive: altura adaptable, y en pantallas angostas el mapa y la lista de
  puntos se **apilan** en lugar de convivir lado a lado.
- Formularios en una sola columna en móvil.

Puntos de quiebre del proyecto (declarados en `base.css`; **las variables CSS no funcionan dentro de
una media query**, así que los valores se repiten literalmente en cada hoja):

| Nombre | Desde |
|---|---|
| móvil | diseño base, sin media query |
| tableta | 600px |
| escritorio | 900px |
| escritorio amplio | 1280px |

### Convenciones de la api

- **Errores:** todo error de negocio se lanza como `ApiException` (`api/src/common/errors/api-exception.ts`)
  con un tipo estable de `API_ERROR_TYPES`. El filtro global es la única salida de errores; nunca se
  devuelve un stack trace. Formato: `{ statusCode, error, message, details? }`.
- **Errores de validación:** el `ValidationPipe` global usa `createValidationException`, que conserva la
  ruta completa de los campos anidados. `details` es `[{ field: 'points.3.lat', messages: [...] }]`.
- **Mensajes de validación en español**, escritos en cada decorador del dto con la opción `message`:
  la interfaz los muestra junto al campo. Los que class-validator genera por su cuenta
  (`whitelistValidation`, `nestedValidation`, `unknownValue`) se traducen en `validation-errors.ts`
  **por la clave de la restricción**, no por el texto. `[verificado-en-dispositivo]`
- **Errores HTTP ajenos** (los que generan Nest o Express, no nuestro código) no se emiten con su
  mensaje original en inglés: el filtro los sustituye por tipo y mensaje propios según el código de
  estado (`FOREIGN_HTTP_ERROR_BY_STATUS`). **Los errores del body parser de Express no son
  `HttpException`**: el filtro los reconoce por su `type` `entity.*`. Ver error 7.
  `[verificado-en-dispositivo]`
- **Límites en un solo sitio:** las constantes (`MAX_POINTS_PER_ROUTE`, rangos de `lat`/`lng`…) se
  declaran en el archivo del esquema y el dto las importa. Esquema y dto validan lo mismo a propósito:
  el esquema protege las escrituras que no pasan por el dto.
- **Forma pública de los documentos:** `buildPublicJsonOptions` en el `toJSON` de cada esquema expone
  `id` en texto, quita `_id` y `__v` y oculta campos internos (`scheduleVersion`). **Consecuencia:** una
  consulta con `.lean()` se salta el `toJSON` y devolvería `_id`; si se usa `lean` o `aggregate`, la
  proyección debe construir `id` a mano (como hace `findAllRouteSummaries`).
- **Textos:** los dtos recortan con `@TrimString()` / `@TrimOptionalString()` antes de validar; el
  segundo convierte el texto vacío en ausente.
- **Ids en la url:** siempre con `ParseObjectIdPipe`, que exige 24 dígitos hexadecimales. No se usa
  `Types.ObjectId.isValid` porque acepta cualquier cadena de 12 caracteres. `[verificado-en-dispositivo]`
  (test unitario).
- **Actualizaciones:** siempre con `runValidators: true`; sin esa opción Mongoose no valida el esquema
  en `findByIdAndUpdate`.
- **Fechas en la api:** ISO 8601 **con zona obligatoria** (`Z` o `±hh:mm`); sin zona, 400. Se guardan
  como `Date` y se devuelven en UTC con `Z`.
- **Datos relacionados en la respuesta:** con un campo virtual poblado (`unit` en el duty), no
  poblando el propio campo de referencia: `unitId` sigue siendo el id. Requiere `virtuals: true` en
  el `toJSON` del esquema.
- **Configuración global de la app** en `configureApp` (`app.setup.ts`), compartida por `main.ts` y
  los tests de integración. Cualquier ajuste global nuevo va ahí, no en `main.ts`.
- **Prettier:** `npx prettier --check --end-of-line auto "src/**/*.ts" "test/**/*.ts" "scripts/**/*.ts"`.
  El `--end-of-line auto` es necesario en esta máquina (ver error 11).

### Convenciones del frontend

- **Enrutador:** React Router 8.4 con `createBrowserRouter` (de `react-router`) y `RouterProvider`
  **de `react-router/dom`**, que es la variante para el navegador. Mapa de pantallas en
  `web/src/router.tsx`. `[verificado-contra-la-librería]`
- **Errores de la api:** `ApiError` guarda `statusCode`, `errorType` y `details`, y ofrece
  `readInvalidFields()` y `readConflictingDuty()`. Los errores por campo se muestran junto a cada
  campo con `groupFieldMessages` (`utils/invalidFields.ts`), usando la misma ruta que la api
  (`points.3.lat`). `requestApi` devuelve `undefined` ante un `204` en lugar de leer JSON.
- **TanStack Query:** claves en `hooks/queryKeys.ts`; cada mutación invalida exactamente lo que
  afecta. Las lecturas **no se reintentan ante un 4xx** (`shouldRetryQuery` en `main.tsx`).
- **Fechas:** todo pasa por `utils/dateTime.ts`. Se muestran en la zona del navegador **siempre con
  su desfase UTC** (`UTC−04:00`), calculado para cada fecha. El valor de un
  `<input type="datetime-local">` se envía con `convertLocalInputToIso`, que añade el desfase local.
  Locale de formato: `es-MX`. `[verificado-en-dispositivo]` (máquina en UTC−04:00: un duty guardado
  de 08:00 a 12:00 UTC se muestra de 04:00 a 08:00 con su `UTC−04:00`).
- **Edición de puntos:** borradores con las coordenadas en texto (`utils/routePointDrafts.ts`). Un
  campo vacío se envía como `NaN` (llega a la api como `null` y lo rechaza), **nunca como 0**, que
  mandaría el punto a la latitud 0. Ids de fila con un contador, no `crypto.randomUUID` (solo existe
  en contextos seguros).
- **Componentes compartidos:** `Button`/`ButtonLink`, `StatusMessage` (carga, vacío, error),
  `SuccessNotice`, `FieldErrors`, `ConfirmDialog` (`<dialog>` nativo). Cada uno con su módulo CSS.
- **Campos de formulario** (`input`, `select`, `label`) con estilo global en `base.css`, porque son
  iguales en todas las pantallas. La disposición de cada formulario va en el módulo de su pantalla.
- **Mapa:** un solo componente, `RouteMap`; si recibe `onAddPoint` es editable. En el detalle
  reencuadra cuando cambian los puntos; en el editor solo la primera vez, y **nunca** en una ruta
  nueva (si no, el primer clic haría saltar el zoom). Leaflet escribe el color de la línea como
  atributo SVG, donde una variable CSS no es fiable: el color va en la clase `route-line` de
  `leaflet-overrides.css`. `MARKER_SIZE_PX` (en `config/map.ts`) debe coincidir con
  `--tamaño-marcador`.
- **Contenedores con desplazamiento horizontal** (`overflow-x: auto`): llevan `position: relative`
  si dentro hay algo posicionado en absoluto. Ver error 12.
- **Rejillas: siempre `minmax(0, Nfr)`, nunca `Nfr` a secas.** `1fr` no baja del ancho mínimo del
  contenido, y una tabla ancha ensancha la columna y la página. Ver error 14.

### Convención de imports de Mongoose (importante)

Mongoose es **CommonJS**. En ESM, Node detecta sus exports con nombre mediante análisis estático, y
**el resultado es parcial**: `Model`, `Schema`, `Types`, `connect` y otros 43 nombres **sí** están
disponibles como export con nombre; **`Connection` y `ClientSession` no**.

TypeScript **no avisa**, porque los tipos existen para todos. El fallo aparece solo al ejecutar.

**Regla:** todo lo que se use únicamente como **tipo** se importa con `import type`, que desaparece al
compilar y por tanto nunca falla:

```ts
import type { Connection, Model, ClientSession } from 'mongoose';  // tipos
import { Schema, Types } from 'mongoose';                          // valores en ejecución
import mongoose from 'mongoose';  // export por defecto: acceso seguro a mongoose.Error.CastError, etc.
```

`[verificado-en-dispositivo]` — se enumeraron los exports reales dentro del contenedor.

---

## 7. Mapa del código

| Concepto | Archivo |
|---|---|
| Memoria del proyecto (este archivo) | `CLAUDE.md` |
| README de producto e instrucciones de uso | `README.md` |
| Bitácora de decisiones (quién decidió qué) | `DECISIONS.md` |
| Instrucciones para agentes | `AGENTS.md` |
| Orquestación del entorno completo | `docker-compose.yml` |
| Inicialización idempotente del replica set | `docker/mongo-init.js` |
| Valores por defecto de las variables de entorno | `.env.example` |
| Imagen multietapa de la api | `api/Dockerfile` |
| Imagen del servidor de desarrollo de la web | `web/Dockerfile` |
| Sondeo del observador de archivos de la api | `api/tsconfig.json` (`watchOptions`) |
| Punto de entrada de la api | `api/src/main.ts` |
| Configuración global de la app (compartida con los tests) | `api/src/app.setup.ts` |
| Módulo raíz, conexión a MongoDB | `api/src/app.module.ts` |
| Validación de variables de entorno al arrancar | `api/src/config/env.validation.ts` |
| Endpoint de salud y comprobación del replica set | `api/src/health/health.controller.ts` |
| Carga idempotente de datos de ejemplo | `api/scripts/seed.ts` |
| Formato de error uniforme y `ApiException` | `api/src/common/errors/api-exception.ts` |
| Traducción de errores de validación con ruta de campo | `api/src/common/errors/validation-errors.ts` |
| Filtro global de errores (400, 404, 409, 500) | `api/src/common/filters/api-exception.filter.ts` |
| Validación de ObjectId en parámetros de url | `api/src/common/pipes/parse-object-id.pipe.ts` |
| Forma pública de los documentos (`id`, campos ocultos) | `api/src/common/database/public-json.ts` |
| Recorte de textos en los dtos | `api/src/common/transforms/trim-string.ts` |
| Esquema de unidad y `scheduleVersion` | `api/src/units/schemas/unit.schema.ts` |
| Validación del alta de unidad | `api/src/units/dto/create-unit.dto.ts` |
| Endpoints y lógica de unidades | `api/src/units/units.controller.ts`, `api/src/units/units.service.ts` |
| Esquema de ruta y puntos embebidos, límites | `api/src/routes/schemas/route.schema.ts` |
| Validación de crear y reemplazar ruta | `api/src/routes/dto/save-route.dto.ts` |
| Endpoints y lógica de rutas | `api/src/routes/routes.controller.ts`, `api/src/routes/routes.service.ts` |
| Regla de solapamiento (función pura y filtro de Mongo) | `api/src/duties/domain/overlap.ts` |
| Tabla de 9 casos de solapamiento, compartida por los tests | `api/src/duties/domain/overlap-cases.ts` |
| Esquema del duty, validación de ventana, índices, virtual `unit` | `api/src/duties/schemas/duty.schema.ts` |
| Validación de la creación de duty (fechas con zona) | `api/src/duties/dto/create-duty.dto.ts` |
| Transacción, bloqueo de la unidad (`$inc`), 409 y 503 | `api/src/duties/duties.service.ts` |
| Endpoints de duties, incluido `GET /routes/:id/duties` | `api/src/duties/duties.controller.ts` |
| Tests de integración y de concurrencia de duties | `api/test/duties.e2e-spec.ts` |
| Tests de edición y borrado de unidades, incluida la concurrencia | `api/test/units.e2e-spec.ts` |
| Arranque compartido de los tests de integración contra `rumbo_test` | `api/test/support/test-application.ts` |
| Validación de la edición de unidad (solo el nombre) | `api/src/units/dto/update-unit.dto.ts` |
| Borrado de unidad sin duties (transacción) | `api/src/duties/duties.service.ts` (`deleteUnit`) |
| Demo de concurrencia por HTTP | `api/scripts/concurrency-demo.ts` |
| Punto de entrada del frontend, TanStack Query, política de reintentos | `web/src/main.tsx` |
| Mapa de pantallas (rutas de navegación) | `web/src/router.tsx` |
| Armazón de la interfaz: cabecera y navegación | `web/src/App.tsx` |
| Cliente HTTP único y `ApiError` | `web/src/api/client.ts` |
| Tipos del dominio en el frontend | `web/src/api/types.ts` |
| Claves de TanStack Query | `web/src/hooks/queryKeys.ts` |
| Hooks de lectura y escritura | `web/src/hooks/use*.ts` (`useRoutes`, `useRoute`, `useSaveRoute`, `useUnits`, `useCreateUnit`, `useUpdateUnit`, `useDeleteUnit`, `useRouteDuties`, `useCreateDuty`, `useDeleteDuty`, `useApiHealth`) |
| Fechas: formato local con desfase UTC, conversión del formulario | `web/src/utils/dateTime.ts` |
| Errores de validación agrupados por campo | `web/src/utils/invalidFields.ts` |
| Borradores de puntos del editor de rutas | `web/src/utils/routePointDrafts.ts` |
| Centro, zoom y teselas del mapa | `web/src/config/map.ts` |
| Pantalla: listado de rutas | `web/src/pages/RoutesPage.tsx` |
| Pantalla: detalle de ruta (mapa, puntos, duties) | `web/src/pages/RouteDetailPage.tsx` |
| Pantalla: alta y edición de ruta | `web/src/pages/RouteFormPage.tsx` |
| Pantalla: unidades | `web/src/pages/UnitsPage.tsx` |
| Pantalla: dirección inexistente | `web/src/pages/NotFoundPage.tsx` |
| Mapa de una ruta (lectura y editor) | `web/src/components/RouteMap.tsx` |
| Lista editable de puntos | `web/src/components/RoutePointsEditor.tsx` |
| Lista de puntos de solo lectura | `web/src/components/RoutePointList.tsx` |
| Formulario de duty | `web/src/components/DutyForm.tsx` |
| Aviso de conflicto de horario (409) | `web/src/components/DutyConflictWarning.tsx` |
| Tabla de duties con borrado | `web/src/components/DutyList.tsx` |
| Tabla de unidades con edición del nombre y borrado | `web/src/components/UnitsTable.tsx` |
| Aviso de unidad con duties (409 al borrar) | `web/src/components/UnitInUseWarning.tsx` |
| Componentes compartidos | `web/src/components/` (`Button`, `StatusMessage`, `SuccessNotice`, `FieldErrors`, `ConfirmDialog`, `ApiHealthBadge`) |
| Variables CSS, reinicio global y campos de formulario | `web/src/styles/base.css` |
| Estilos dirigidos a Leaflet (hoja global) | `web/src/styles/leaflet-overrides.css` |
| Estilos de cada pantalla y componente | `web/src/styles/<Nombre>.module.css` |
| Configuración del servidor de Vite | `web/vite.config.ts` |

---

## 8. Errores encontrados y su causa raíz

### 1. La api no arrancaba: `mongoose does not provide an export named 'Connection'`

- **Qué falló:** el contenedor de la api quedaba permanentemente `unhealthy` y el arranque de todo el
  entorno abortaba con `dependency failed to start`.
- **Causa raíz:** Mongoose es CommonJS. Cuando se importa desde ESM, Node deduce los exports con
  nombre por análisis estático del código, y esa deducción es **parcial**: reconoce `Model`, `Schema`
  y `Types`, pero **no** `Connection`. TypeScript no lo detecta porque los tipos declarados sí
  incluyen `Connection`; la discrepancia solo existe en ejecución.
- **Cómo se detectó:** `docker compose logs api` mostraba el `SyntaxError` al cargar el módulo.
  Después se enumeraron los exports reales dentro del contenedor para saber exactamente cuáles
  funcionan, en lugar de parchear a ciegas.
- **Solución:** `import type` para todo lo que solo se use como tipo. Regla general en la sección 6.

### 2. La corrección del error anterior no surtía efecto

- **Qué falló:** tras corregir el import, el contenedor seguía mostrando el error antiguo.
- **Causa raíz:** los eventos del sistema de archivos **no cruzan** el límite entre Windows y el
  contenedor Linux. `nest start --watch` no veía ningún cambio en el bind mount. Se había previsto
  esta trampa para Vite (`server.watch.usePolling`) pero no para el compilador de la api.
- **Cómo se detectó:** el log de la api seguía citando la línea de código ya corregida.
- **Solución:** `watchOptions` con sondeo periódico en `api/tsconfig.json`.

### 3. `docker compose up` inundado por los logs de MongoDB

- **Qué falló:** la salida de `docker compose up` era una avalancha de mensajes de MongoDB
  (`Connection accepted`, `Connection ended`, `Connection not authenticating`) que tapaba por completo
  los mensajes de los otros cuatro servicios. Medido: **188 líneas cada 45 segundos**.
- **Causa raíz:** el healthcheck lanza `mongosh` dentro del contenedor, y `mongosh` **descubre la
  topología del replica set** al conectar, abriendo entre cinco y siete conexiones por comprobación.
  MongoDB registra cada una. El ruido no venía de la aplicación, sino del propio sondeo de salud.
- **Cómo se detectó:** contando las líneas de log por unidad de tiempo, en lugar de fiarse de la
  impresión visual.
- **Solución:** añadir `directConnection=true` a la cadena de conexión **del healthcheck**, que evita
  el descubrimiento de topología, y subir el intervalo a 15 s. Resultado: **19 líneas cada 45
  segundos**, unas diez veces menos. `[verificado-en-dispositivo]`
- **Intento fallido previo:** `mongod --quiet`. En MongoDB 8 **ya no suprime** estos mensajes; se dejó
  la opción porque sigue reduciendo otro ruido, pero no es la que resolvió el problema.
  `[verificado-en-dispositivo]`
- **Nota:** `Connection not authenticating` es **informativo, no un error**. La base corre sin
  autenticación a propósito en local.

### 4. Textos de la interfaz y comentarios sin tildes

- **Qué falló:** la interfaz mostraba "Planificacion de rutas", "Sin conexion", y los comentarios de
  todo el código estaban igualmente sin acentuar, incumpliendo la regla de comentarios en español.
- **Causa raíz:** los archivos se generaron desde la terminal evitando caracteres no ASCII por miedo
  a un problema de codificación que **no existía**: todos los archivos son UTF-8 y admiten tildes y
  `ñ` sin ningún ajuste. Fue una precaución infundada convertida en defecto.
- **Cómo se detectó:** una captura de pantalla de la interfaz. Ninguna comprobación automática lo
  habría cazado, porque compila y pasa el linter perfectamente.
- **Solución:** normalización de acentos en los archivos fuente y regla explícita en la sección 6.
- **La normalización quedó incompleta.** Al empezar la Fase 1 seguían sin tilde palabras en 11
  archivos (`raiz`, `seria`, `demas`, `valido`, `estara`, `pisaria`, `instalo`, `habra`,
  `integracion`, `instalacion`, `planificacion`, `diseno`, `movil`, `que mostrar`…). La etiqueta
  `[verificado-en-dispositivo]` que tenía esta entrada afirmaba más de lo que se había comprobado.
  Se detectó con una búsqueda por lista de palabras (`grep -w`), que es la comprobación a repetir:
  la revisión visual no basta. Corregido en la Fase 1.

### 5. `docker compose exec` con rutas absolutas del contenedor desde Git Bash

- **Qué falló:** `docker compose exec api node /tmp/script.mjs` buscaba
  `/app/C:/Users/.../script.mjs`.
- **Causa raíz:** Git Bash en Windows convierte automáticamente los argumentos que parecen rutas
  POSIX a rutas de Windows, aunque sean rutas **dentro del contenedor**.
- **Cómo se detectó:** `MODULE_NOT_FOUND` con una ruta mezclada evidente.
- **Solución:** usar rutas relativas, o prefijar con doble barra (`//app`), o `MSYS_NO_PATHCONV=1`.

### 6. Comentario del compose que contradecía lo verificado

- **Qué falló:** `docker-compose.yml` decía que `mongod --quiet` silencia el registro de conexiones,
  cuando la entrada 3 de esta sección ya había comprobado que en MongoDB 8 no lo hace.
- **Causa raíz:** al resolver el error 3 se actualizó `CLAUDE.md` pero no el comentario escrito antes
  de la investigación.
- **Cómo se detectó:** revisando los comentarios del compose al corregir tildes en la Fase 1.
- **Solución:** comentario reescrito para que remita al `directConnection=true` del healthcheck.

### 7. Un cuerpo mayor que el límite respondía 500 en lugar de 413

- **Qué falló:** `POST /routes` con un cuerpo de más de 256 kb devolvía `500 InternalError`.
- **Causa raíz:** el body parser de Express lanza un `PayloadTooLargeError` del paquete `http-errors`
  (`status: 413`, `type: 'entity.too.large'`), que **no es una `HttpException` de Nest**. El filtro lo
  trataba como error desconocido. El supuesto escrito en la sección 9 ("el filtro lo recibe como
  `HttpException`") era falso.
- **Cómo se detectó:** convirtiendo ese supuesto en una prueba con `curl` al levantar el entorno; el
  log de la api mostraba el `PayloadTooLargeError` con su stack.
- **Solución:** `isBodyParserError` en el filtro, más un test unitario. `[verificado-en-dispositivo]`

### 8. La recarga en caliente de la api dejaba sirviendo el código viejo

- **Qué falló:** tras editar un archivo, la api recompilaba sin errores pero seguía respondiendo con el
  comportamiento anterior. El log mostraba `EADDRINUSE: address already in use 0.0.0.0:3000` en cada
  reinicio.
- **Causa raíz:** para reiniciar, `nest start --watch` mata el proceso anterior con su propio
  `treeKillSync` (`@nestjs/cli/lib/utils/tree-kill.js`), que enumera los procesos hijos con `ps`. La
  imagen `node:24-bookworm-slim` **no trae `ps`** (paquete `procps`), y `treeKillSync` trata ese fallo
  como "sin hijos" **en silencio**. Solo muere el `sh -c` que envuelve a la api; `node dist/main` queda
  huérfano (`ppid=1`), conserva el puerto y sigue sirviendo el código viejo.
  `[verificado-contra-la-librería]` y `[verificado-en-dispositivo]` (se listaron los procesos en
  `/proc` dentro del contenedor).
- **Cómo se detectó:** un cambio corregido y con tests en verde seguía fallando por `curl`; el log de
  la api tenía el `EADDRINUSE`.
- **Relación con el error 2:** es posible que el error 2 de la Fase 0 fuera en parte este mismo
  problema y no solo la falta de sondeo. `[supuesto]`
- **Solución:** `procps` instalado en la etapa `development` de `api/Dockerfile`. Comprobado con dos
  ediciones reales de `main.ts`: en cada una muere la api anterior, arranca la nueva y no aparece
  `EADDRINUSE`. `[verificado-en-dispositivo]`
- **Trampa al comprobarlo:** un `touch` desde Windows **no** dispara la recompilación; hace falta
  cambiar el contenido del archivo. `[verificado-en-dispositivo]`
- **Efecto secundario, resuelto:** cada api reemplazada quedaba como proceso zombi (`<defunct>`),
  porque el PID 1 del contenedor era `npm`, que no recoge huérfanos. Se añadió `init: true` al
  servicio `api` del compose, que pone `docker-init` (tini) como PID 1. Tras dos recargas no queda
  ningún zombi. `[verificado-en-dispositivo]`

### 9. Tildes rotas al probar la api con `curl` desde Git Bash

- **Qué falló:** un `PUT` con `"Coyoacán"` escrito en el argumento `-d` guardó `Coyoac�n`.
- **Causa raíz:** `curl.exe` recibe los argumentos en la página de códigos de Windows y envía la `á`
  como un único byte (0xE1) en lugar de UTF-8 (0xC3 0xA1). **No es un fallo de la api**: el mismo
  cuerpo enviado desde un archivo UTF-8 se guarda correctamente.
- **Cómo se detectó:** comparando el tamaño del cuerpo enviado (12 bytes para `{"code":"á"}`, cuando
  en UTF-8 son 13) y los bytes guardados.
- **Solución:** para enviar texto con tildes, escribir el cuerpo en un archivo y usar
  `curl --data-binary @archivo.json`. `[verificado-en-dispositivo]`

### 10. Docker Desktop no arrancaba: virtualización desactivada en la BIOS

- **Qué falló:** Docker Desktop se quedaba en *deploying WSL2 distributions* con
  `\\wsl$\docker-desktop\... The network name cannot be found`.
- **Causa raíz:** la virtualización del procesador (SVM en AMD) estaba desactivada en la UEFI. WSL2
  no podía crear su máquina virtual (`HCS_E_HYPERV_NOT_INSTALLED`). El mensaje de Docker era un
  síntoma.
- **Cómo se detectó:** `wsl -d docker-desktop` mostró el error real, y `systeminfo` indicaba
  `Virtualization Enabled In Firmware: No`.
- **Solución:** activar *SVM Mode* en la UEFI (ASUS: *Advanced → CPU Configuration*). Es un problema
  de la máquina, no del proyecto. `[verificado-en-dispositivo]`
- **Efecto secundario:** tras tocar la UEFI, el reloj de Windows quedó **3 horas atrasado** (fuente
  `Local CMOS Clock`, sin sincronizar). Síntoma: `docker compose build` falla en `apt-get update` con
  `Release file ... is not valid yet`. Se detectó comparando la hora del host con la cabecera `Date`
  de `deb.debian.org`. Solución: sincronizar la hora de Windows y reiniciar Docker Desktop. **No** se
  usó `Acquire::Check-Date=false` en apt: desactivaría una comprobación de seguridad para tapar un
  problema de la máquina. `[verificado-en-dispositivo]`

### 11. Prettier marcaba como mal formateados archivos que no se habían tocado

- **Qué falló:** `prettier --check` señalaba archivos de la Fase 0 sin cambios.
- **Causa raíz:** con `core.autocrlf=true`, git saca los archivos del repositorio con fin de línea
  CRLF, y Prettier exige LF por defecto. En el repositorio están bien (LF). Los archivos escritos
  después por las herramientas quedan en LF, así que el árbol de trabajo mezcla ambos.
- **Cómo se detectó:** comparando byte a byte un archivo con la salida de Prettier (`od -c`): la
  única diferencia era `\r\n` frente a `\n`. Una comprobación previa con `grep $'\r'` en Git Bash
  había dicho "LF" erróneamente: no es fiable para esto.
- **Solución:** comprobar con `--end-of-line auto`. Con eso, los problemas reales eran 5 archivos
  propios con líneas de más de 100 caracteres, ya formateados. `[verificado-en-dispositivo]`

### 12. En móvil, la pantalla de detalle de ruta se desplazaba de lado

- **Qué falló:** a 390 px de ancho la página medía 530 px.
- **Causa raíz:** la tabla de duties está dentro de una caja con `overflow-x: auto`, pero el texto
  oculto de la cabecera "Acciones" lleva `position: absolute`. Un elemento absoluto **escapa del
  recorte** de un contenedor con `overflow` si ese contenedor no está posicionado, y ensanchaba la
  página.
- **Cómo se detectó:** midiendo `scrollWidth` frente a `clientWidth` de cada pantalla en los tres
  anchos, y listando los elementos que sobresalían fuera del mapa.
- **Solución:** `position: relative` en `.tableScroller`. Tras el cambio, 15 de 15 combinaciones de
  pantalla y ancho sin desbordamiento. `[verificado-en-dispositivo]`

### 13. Las capturas de móvil hechas con Edge sin ventana mentían

- **Qué falló:** todas las capturas a 390 px mostraban el contenido cortado por la derecha, incluso
  en pantallas sin ningún problema.
- **Causa raíz:** `msedge --headless --window-size=390,...` no admite ventanas tan estrechas: pinta
  la página más ancha y después recorta la imagen a 390 px.
- **Cómo se detectó:** midiendo el ancho real con el protocolo de depuración antes de tocar el CSS.
- **Solución:** para verificar anchos de móvil, emular el viewport con
  `Emulation.setDeviceMetricsOverride` por el protocolo de depuración (CDP), no con `--window-size`.
  `[verificado-en-dispositivo]`

### 14. Al editar una unidad en móvil, la página se desplazaba de lado

- **Qué falló:** con una fila de la tabla de unidades en edición, la página medía 398 px en un
  viewport de 390.
- **Causa raíz:** la rejilla de la pantalla usaba `grid-template-columns: 1fr`. `1fr` equivale a
  `minmax(auto, 1fr)`: la columna no baja del ancho mínimo de su contenido, así que la tabla la
  ensanchaba en lugar de desplazarse dentro de su caja.
- **Cómo se detectó:** midiendo el ancho de la página con la edición abierta y listando los elementos
  que sobresalían: el primero fuera de la caja con scroll era la columna de la rejilla.
- **Solución:** `minmax(0, 1fr)` en todas las rejillas del proyecto, también en las que todavía no
  fallaban. `[verificado-en-dispositivo]`

---

## 9. Supuestos pendientes y riesgos conocidos

- **Cómo se verificó la interfaz (Fase 3).** Con Microsoft Edge sin ventana controlado por su
  protocolo de depuración (CDP), desde un script ad hoc con el `WebSocket` nativo de Node, **fuera
  del repositorio** y sin dependencias nuevas:
  - todas las pantallas a 390, 768 y 1280 px, sin desplazamiento lateral;
  - los flujos con clics reales, comprobando cada resultado contra la api: crear una ruta con tres
    clics en el mapa, reordenar un punto, guardar, provocar el 409, asignar y borrar un duty con el
    diálogo, código de unidad repetido y validación del formulario vacío.

  `[verificado-en-dispositivo]` en Edge. **No probado en Firefox ni Safari**, ni en un móvil físico.
- **Los campos de fecha siguen el idioma del navegador** (`mm/dd/yyyy` en un navegador en inglés).
  Es el comportamiento nativo de `datetime-local` y no se puede fijar desde la página.
- **El aviso de éxito tras guardar una ruta viaja en el estado del historial**: si se recarga la
  página de detalle justo después, vuelve a aparecer. Inofensivo. `[supuesto]`
- **El bundle de la interfaz pesa ~760 kB (230 kB comprimido)**, sobre todo por Leaflet y React.
  Vite avisa a partir de 500 kB. Aceptable para el MVP; se resolvería con carga diferida.
  `[verificado-en-dispositivo]`
- **Node del host por debajo del mínimo del CLI de Nest.** `@angular-devkit/schematics`, del que
  depende `@nestjs/cli`, declara `node: ^22.22.3 || ^24.15.0 || >=26.0.0`. El host tiene **24.13.0** y
  emite avisos `EBADENGINE` al instalar. **Dentro de Docker no ocurre**: el contenedor corre Node
  **24.21.0**. Como todo el flujo soportado pasa por Docker, es solo ruido en instalaciones locales.
  `[verificado-en-dispositivo]`
- **La ruta del repositorio contiene `@`** (`C:\p\Rumb@\aplic`). Los bind mounts funcionan en esta
  máquina, pero es una variable que no controlamos. Si fallan en otro entorno, la solución es mover el
  repositorio a una ruta sin `@`. `[verificado-en-dispositivo]` en esta máquina.
- **`app.useBodyParser('json', { limit })`** rechaza un cuerpo de ~300 kb con `413 PayloadTooLarge`.
  `[verificado-en-dispositivo]`
- **El endpoint de disponibilidad de unidades** que necesitaría la vista previa de conflictos de la
  Fase 4 **no está en el contrato de la api** y está pendiente de decisión.
- **Mensajes redundantes en un campo con el tipo equivocado:** si `code` llega como número o lista, se
  devuelven a la vez los cuatro mensajes del campo ("debe ser texto", "es obligatorio"…). Es correcto,
  pero ruidoso; se podría cortar en el primer fallo con `stopAtFirstError`. No se ha cambiado.
  `[verificado-en-dispositivo]`
- **`overlap-cases.ts` es dato de test dentro de `src/`** y por tanto se compila en `dist/`. Está ahí
  porque lo comparten el test unitario (en `src/`) y el de integración (en `test/`). Inofensivo.
- **Duties de una ruta sin paginación.** `GET /routes/:id/duties` devuelve todos. Suficiente para el
  MVP. `[supuesto]`
- **Lecturas de duties solo por ruta.** `GET /routes/:id/duties` es la única lectura prevista; no hay
  forma de preguntar "qué tiene asignado esta unidad". Hueco conocido y aceptado para el MVP.

---

## 10. Contrato de la api

Prefijo global `/api`. Swagger en `/api/docs` (Fase 4).

| Método | Ruta | Respuestas | Estado |
|---|---|---|---|
| GET | `/health` | 200 | **Hecho** |
| GET | `/routes` | 200 | **Hecho** `[verificado-en-dispositivo]` |
| GET | `/routes/:id` | 200, 400, 404 | **Hecho** `[verificado-en-dispositivo]` |
| POST | `/routes` | 201, 400 | **Hecho** `[verificado-en-dispositivo]` |
| PUT | `/routes/:id` | 200, 400, 404 | **Hecho** `[verificado-en-dispositivo]` |
| GET | `/routes/:id/duties` | 200, 400, 404 | **Hecho** `[verificado-en-dispositivo]` |
| GET | `/units` | 200 | **Hecho** `[verificado-en-dispositivo]` |
| PATCH | `/units/:id` | 200, 400, 404 | **Hecho** `[verificado-en-dispositivo]` (solo `name`) |
| DELETE | `/units/:id` | 204, 400, 404, **409** | **Hecho** `[verificado-en-dispositivo]` (solo sin duties) |
| POST | `/units` | 201, 400, 409 | **Hecho** `[verificado-en-dispositivo]` |
| POST | `/duties` | 201, 400, 404, **409**, 503 | **Hecho** `[verificado-en-dispositivo]` (el 503 solo `[compila]`) |
| DELETE | `/duties/:id` | 204, 400, 404 | **Hecho** `[verificado-en-dispositivo]` |

**Formato de error uniforme** mediante filtro global: `{ statusCode, error, message, details? }`.
Tipos de `error`: `ValidationError` (con `details`), `BadRequest` (petición ilegible, por ejemplo
JSON mal formado; sin `details`), `InvalidId`, `NotFound`, `DuplicateKey`, `Conflict` (solapamiento),
`ScheduleBusy` (503, reintentos de transacción agotados), `UnitInUse` (409 al borrar una unidad
con duties; `details = { dutyCount, routes: [{ id, name, dutyCount }] }`), `PayloadTooLarge`, `InternalError`,
`HttpError` (cualquier otro código ajeno). Mapeos obligatorios, cubiertos por tests y comprobados con
`curl` contra la api en Docker `[verificado-en-dispositivo]`:

| Situación | Respuesta |
|---|---|
| Error de validación | 400 con la lista de campos |
| Id con formato inválido | 400, **nunca 500** |
| Clave duplicada de Mongo | 409 |
| Solapamiento | 409 **incluyendo id, ruta, inicio y fin del duty con el que choca** |
| Cualquier otro error | 500 sin filtrar detalles internos ni stack traces |

**Forma de las respuestas:**

- `GET /routes`: `[{ id, name, pointCount, createdAt, updatedAt }]`, ordenado por `updatedAt`
  descendente. No incluye los puntos.
- Un `PUT` actualiza `updatedAt` y conserva `createdAt`. El nombre se recorta y un nombre de punto
  vacío o de solo espacios desaparece de la respuesta.
- `GET/POST/PUT /routes…`: `{ id, name, points: [{ lat, lng, name? }], createdAt, updatedAt }`.
- `POST /duties` recibe `{ routeId, unitId, startAt, endAt }` y devuelve
  `{ id, routeId, unitId, startAt, endAt, createdAt, updatedAt }`.
- `GET /routes/:id/duties`: la misma forma más `unit: { id, code, name }`, ordenado por `startAt`.
- El 409 de solapamiento lleva `details.conflictingDuty = { id, routeId, routeName, unitCode, startAt,
  endAt }`, suficiente para que la interfaz escriba "La unidad BUS-001 ya tiene un duty de 08:00 a
  12:00 en la ruta Centro - Polanco" sin otra consulta. El `message` no incluye horas porque el
  servidor no conoce la zona horaria del usuario.
- `PATCH /units/:id` recibe solo `{ name }`; mandar `code` responde 400 ("Este campo no está
  permitido").
- `GET/POST /units`: `{ id, code, name, createdAt, updatedAt }`, ordenado por `code`. `code` se guarda
  en mayúsculas y solo admite letras, dígitos y guiones; `bus-001` choca con `BUS-001` (409).
  `scheduleVersion` se guarda como `0` y nunca aparece en las respuestas. `[verificado-en-dispositivo]`
  (consultado en MongoDB, que además tiene el índice único `{ code: 1 }`).

---

## 11. Estado por fases

| Fase | Contenido | Estado |
|---|---|---|
| 0 | Entorno dockerizado, salud, memoria del proyecto | **Terminada** |
| 1 | Rutas y unidades, filtro de errores, seed | **Terminada** y verificada en Docker |
| 2 | Duties, regla de solapamiento, concurrencia | **Terminada** y verificada en Docker, con contraprueba |
| 3 | Frontend completo | **Terminada** y verificada en tres anchos, con los flujos recorridos |
| 4 | Swagger, vista previa de conflictos, edición de duty | Opcional |
| 5 | Cierre y revisión | Pendiente |
