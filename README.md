# Rumb@

Rumb@ es un MVP de planificación de transporte. La idea es sencilla: un planificador de flota da de
alta **rutas** (listas ordenadas de puntos en el mapa) y **unidades** (vehículos), y asigna
**duties**, que no son más que "esta unidad cubre esta ruta de tal hora a tal hora". La regla que lo
sostiene todo es que **una misma unidad nunca puede estar en dos duties a la vez**, ni siquiera
cuando dos personas intentan asignarla en el mismo instante.

Si solo quieres levantarlo y probarlo, salta a [Cómo usar este proyecto](#cómo-usar-este-proyecto).

## Estado actual

| Parte | Estado |
|---|---|
| Rutas y unidades (api) | Terminado y probado |
| Duties, regla de solapamiento y concurrencia (api) | Terminado y probado, con contraprueba |
| Persistencia en MongoDB | Terminado |
| Entorno completo con un solo comando | Terminado |
| Interfaz: lista de rutas, detalle con mapa y duties, formularios | Terminado y probado en móvil, tableta y escritorio |
| Documentación de la api (Swagger) | Terminado |
| Vista previa de disponibilidad y edición de duties | Terminado y probado, con contraprueba |
| Trazado de la ruta por las calles, con distancia y tiempo | Terminado |

## Qué construí

### El núcleo

- **Rutas:** crear, consultar y editar. Los puntos se guardan embebidos en la ruta y su orden es su
  posición en la lista, así que no puede haber huecos ni números de orden repetidos. Cada punto
  tiene latitud, longitud y nombre opcional. Una ruta tiene entre 2 y 200 puntos.
- **Unidades:** alta, listado, edición del nombre y borrado, con código único (`BUS-001`) que no
  distingue mayúsculas. **Una unidad solo se puede borrar si no tiene duties**: así nunca se pierde
  el historial de turnos por un clic. Si tiene alguno, la aplicación dice cuántos y en qué rutas
  están, con enlaces para ir a quitarlos. El código no se edita: es lo que el planificador ve en los
  mensajes de conflicto, y cambiarlo sobre la marcha confunde más de lo que ayuda.
- **Duties:** asignar, editar (unidad y horario), borrar y listar los duties de una ruta. La ruta de
  un duty no se cambia: un duty en otra ruta es otro duty. El duty guarda **inicio y fin
  explícitos**, no inicio más duración: el fin es justo lo que se compara al buscar solapamientos,
  así que preferí que fuera un dato y no un cálculo.
- **Persistencia real** en MongoDB.

### La interfaz

- **Lista de rutas** con su cantidad de puntos y cuándo se actualizó cada una.
- **Detalle de una ruta:** el mapa con los puntos numerados en su orden y unidos **por las calles
  reales**, con la distancia y el tiempo estimado en coche (*"9 km · 17 min"*), la lista de puntos, los duties asignados (unidad, inicio, fin y duración) y un formulario para asignar
  uno nuevo. Si la unidad está ocupada, la pantalla lo explica en concreto: *"La unidad BUS-001 ya
  tiene un duty el 19 sep 2026, 04:00 – 08:00 (UTC−04:00) en la ruta Centro - Polanco"*, con un enlace
  a esa ruta.
- **Qué unidad está libre.** Al asignar un duty, primero se elige el horario y el selector de
  unidades muestra cuáles están libres y cuáles ocupadas, y dónde: *"BUS-001 · ocupada: Centro -
  Polanco, 04:00–08:00"*. Las ocupadas no se pueden elegir. Es la pregunta real de quien planifica
  ("¿qué unidad tengo libre en este horario?") y la contesta antes de fallar, no después. Aun así es
  una ayuda: si otra persona ocupa la unidad un instante después, al guardar salta el conflicto de
  siempre.
- **Editar un duty** desde su fila: se abre el mismo formulario, con la vista previa incluida, en una
  tarjeta encima de la tabla.
- **Crear y editar rutas** haciendo clic en el mapa: cada clic añade un punto al final. Los puntos se
  pueden renombrar, corregir a mano, reordenar y quitar, y la línea se redibuja al instante.
- **Unidades:** alta, listado, edición del nombre en la propia fila y borrado con confirmación.
- Todo cambio se refleja sin recargar la página. Antes de borrar pido confirmación, y cada acción
  termina con un aviso de que salió bien o con el error explicado junto al campo que lo provocó.
- **Las horas se muestran en la zona horaria de quien usa la aplicación, siempre con su desfase UTC
  a la vista** (por ejemplo `UTC−06:00`). La base guarda todo en UTC; así nadie tiene que adivinar en
  qué zona está leyendo o capturando una hora.
- Diseñé la interfaz primero para móvil. La probé a 390, 768 y 1280 px de ancho, y en ninguna pantalla
  la página se desplaza de lado: el mapa y la lista de puntos se apilan en pantallas angostas, y las
  tablas anchas se desplazan dentro de su propia caja.

### La regla de solapamiento y por qué no basta con validarla

Dos ventanas de la misma unidad se solapan si una empieza antes de que la otra termine y termina
después de que la otra empiece. Los intervalos son **semiabiertos**: un duty que termina a las 10:00 y
otro que empieza a las 10:00 no chocan, porque así es como se encadenan los turnos en la vida real.

Lo interesante es que comprobar la regla antes de guardar no alcanza. Si dos peticiones llegan a la
vez, las dos consultan, las dos ven el horario libre y las dos guardan. Y meterlo todo en una
transacción de MongoDB **tampoco alcanza**, aunque suene a que sí: MongoDB aísla las transacciones
por instantánea y, como cada petición inserta un documento distinto, no ve ningún choque y confirma
las dos. Es la anomalía conocida como *write skew*.

La solución: dentro de la transacción, antes de buscar solapamientos, se **incrementa un contador en
el documento de la unidad** (`scheduleVersion`). Ese número no significa nada; está ahí solo para que
dos transacciones sobre la misma unidad escriban en el mismo documento. Así MongoDB sí detecta el
conflicto, obliga a una de ellas a reintentar y, al reintentar, esta ya ve el duty de la otra y
responde **409**. Dos unidades distintas no se estorban entre sí.

El bloqueo vive en la base de datos y no en la memoria del servidor, así que la garantía se mantiene
aunque la api corra en varias instancias.

**¿Cómo sé que funciona?**

- Escribí la regla una sola vez, como función pura, y la probé con una tabla de 9 casos (antes,
  después, tocándose en cada extremo, contenido, contenedor, idéntico, cruzando la medianoche).
- **Ejecuto la misma tabla contra la base real**, porque en ejecución manda la consulta y no la
  función: un error en la consulta pasaría desapercibido si solo probara la función.
- Lancé 10 peticiones simultáneas solapadas sobre la misma unidad: **se crea exactamente 1**. Y 10
  simultáneas que no se solapan: **se crean las 10**; el bloqueo ordena, no descarta.
- **Editar un duty tiene la misma garantía que crearlo:** misma transacción y mismo contador sobre la
  unidad de destino, y la búsqueda de solapamientos no cuenta al propio duty (si no, acortar tu propio
  horario chocaría contigo mismo). Moví 10 duties distintos a la vez a la misma hora de la misma
  unidad: **solo 1 lo consiguió**. Sin el contador, 3 de 10 lo consiguieron, en tres ejecuciones
  seguidas.
- La vista previa de disponibilidad usa **exactamente la misma condición** que la asignación, así que
  no hay dos reglas que puedan contradecirse. La pruebo con la misma tabla de 9 casos.
- El borrado de una unidad sigue la misma lógica: se hace dentro de una transacción que escribe en
  el mismo documento que la asignación de un duty. Lancé 40 rondas de "asignar un duty y borrar su
  unidad a la vez": **nunca quedó un duty apuntando a una unidad borrada**. Y al quitar la
  transacción, las 40 rondas dejaron un duty huérfano: la prueba detecta de verdad el fallo.
- **Contraprueba:** quité el incremento a propósito y el test falló, que es lo que tenía que pasar.
  En tres ejecuciones seguidas se crearon **3 duties solapados** en la misma unidad. O sea, el test
  de verdad detecta lo que dice probar.

### Integridad y seguridad de la entrada

- Valido toda entrada antes de tocar la base: rangos de latitud y longitud, longitudes de texto,
  cantidad de puntos, fin posterior al inicio. Repito las mismas reglas en el esquema de la base,
  para que ninguna escritura que no pase por la api deje datos inválidos.
- Rechazo los campos no declarados, lo que impide colar operadores de MongoDB en el cuerpo.
- Exijo las fechas **con zona horaria**. Sin ella, `2030-03-15T08:00` se interpretaría en la hora
  del servidor y el duty quedaría movido de hora sin que nadie se diera cuenta.
- Todos los errores salen con el mismo formato, en español y diciendo qué campo falló. El 409 de
  solapamiento incluye el duty con el que se choca (ruta, unidad, inicio y fin), que es lo que usa la
  interfaz para explicar el conflicto. Un error inesperado nunca expone detalles internos.
- Añadí cabeceras de seguridad, CORS limitado al origen de la interfaz y un límite de tamaño para las
  peticiones.

### Documentación de la api

La api se documenta sola con Swagger en `http://localhost:3000/api/docs`: cada endpoint con su
cuerpo, sus respuestas (también las de error) y ejemplos, y se puede probar desde el navegador. Escribí
las anotaciones a mano en lugar de dejar que el plugin de Nest las dedujera: son más líneas, pero se
ve exactamente qué se documenta. Una prueba falla si algún endpoint se queda sin documentar.

### Pruebas automatizadas

La api tiene 33 pruebas unitarias y 50 de integración contra MongoDB real, incluidas las de
concurrencia, y un script de demostración que dispara peticiones simultáneas contra la api en marcha.

La interfaz no tiene pruebas automatizadas (lo explico abajo). La recorrí con clics reales en un
navegador: crear una ruta desde el mapa, reordenar sus puntos, provocar el conflicto de horario,
borrar un duty y repetir un código de unidad, comprobando cada resultado contra la api.

## Por qué MongoDB

El brief lo dice claro: el dominio tiene aristas relacionales y de integridad. Y es verdad, la regla
de solapamiento es justo el tipo de cosa que una base relacional puede imponer por sí sola.
PostgreSQL lo resuelve en una línea con una restricción de exclusión sobre rangos de tiempo, y la base
rechaza el solapamiento aunque el código tenga un error. **MongoDB no tiene nada equivalente**: un
índice único compara valores iguales, no rangos.

Aun así me quedé con MongoDB, por ser la preferencia del equipo y porque con una transacción más el
contador de la unidad la garantía es sólida y está demostrada con tests. El precio a pagar es que la
integridad depende de que el código de la transacción esté bien escrito. Por eso está aislado en un
solo método, bien comentado, y protegido por un test que falla si alguien quita el bloqueo.

Algo que descarté a propósito: añadir un índice único sobre `unidad + inicio` "por si acaso". Solo
atrapa el choque exacto; un duty que empiece un minuto después pasa el índice y se solapa igual. Y
encima se lee como si garantizara la regla sin garantizarla, lo que invita a bajar la guardia justo
donde no conviene.

## Qué dejé fuera conscientemente

| Qué | Por qué |
|---|---|
| Autenticación y roles | No aporta a lo que se evalúa, y hacerla bien lleva más tiempo del que justifica un MVP. |
| Borrar rutas | Obliga a decidir qué pasa con sus duties (¿se borran?, ¿se impide?). Para las unidades lo decidí (solo sin duties); para las rutas no lo necesité todavía. |
| Borrar una unidad junto con sus duties, o darla de baja sin borrarla | Consideré las dos opciones. Borrar en cascada hace que un clic se lleve el historial; la baja lógica añade un estado nuevo al modelo. Elegí la más segura: solo se borra si no tiene duties. |
| Consultar qué tiene asignado una unidad | Solo se consultan los duties por ruta, que es lo que pide el brief. |
| Duties recurrentes (todos los lunes…) | Los duties son fechas absolutas. Los recurrentes cambian por completo el modelo de la regla. |
| GraphQL y Prisma | No resuelven ningún problema de este MVP y añadirían una capa más que mantener. |
| Trazado por calles en el editor de rutas | El detalle de una ruta la dibuja por las calles con OSRM, un servicio abierto sin clave ni cuenta. En el editor sigue en línea recta: pedir un trazado en cada clic abusaría de un servidor público de demostración. |
| Pruebas automatizadas de la interfaz | El brief pone el foco en la lógica crítica, que está en la api y está cubierta. Para la interfaz habría que añadir herramientas nuevas; preferí recorrer los flujos a mano en un navegador. |
| Mostrar las horas en la zona de la flota | Muestro cada hora en la zona de quien mira, con su desfase UTC visible. Si la flota operara siempre en una zona concreta, convendría mostrar todo en esa zona; es una constante de configuración que no añadí sin saberlo. |
| Paginación | Con los volúmenes de un MVP no hace falta. |
| Despliegue en producción | El entorno está pensado para desarrollo y evaluación local. La api tiene una etapa de producción en su `Dockerfile`, pero no se ha probado; la interfaz no la tiene. |

## Qué haría distinto con más tiempo

- **Evaluaría en serio PostgreSQL** con la restricción de exclusión, para que la base garantice la
  regla por sí misma. Si hubiera que quedarse en MongoDB, añadiría una verificación periódica que
  busque solapamientos y avise, como red de seguridad independiente del código.
- **Añadiría una vista por unidad:** hoy la disponibilidad responde "¿quién está libre a esta hora?",
  pero no hay una pantalla con la agenda completa de cada vehículo.
- **Automatizaría las pruebas de extremo a extremo de la interfaz** (por ejemplo con Playwright) y
  montaría un pipeline de integración continua que ejecute todas las pruebas, incluida la contraprueba, en cada cambio.
- **Probaría el caso límite de contención extrema:** si las transacciones agotan sus reintentos, la
  api responde 503. Ese camino está programado y contrastado con el código del driver de MongoDB, pero
  no lo he provocado en una prueba.
- **Usaría un servidor de trazado propio o un proveedor con contrato.** Hoy el trazado lo pide el
  navegador al servidor público de demostración de OSRM: no tiene garantías de disponibilidad y recibe
  las coordenadas de las rutas. Si falla, el mapa vuelve a la línea recta y lo dice, así que el núcleo
  no depende de él.
- **Avisaría si un duty es más corto que el recorrido:** con el tiempo estimado por calles, la interfaz
  podría advertir cuando la ventana asignada no alcanza para recorrer la ruta.
- **Guardaría una auditoría de cambios:** quién asignó o borró cada duty y cuándo.
- **Dividiría el código de la interfaz en partes que se carguen por separado.** Hoy el mapa y React
  van en un solo archivo de unos 760 kB (230 kB comprimido); para un MVP es aceptable.

## Cómo usar este proyecto

Todo corre en Docker, así que **no necesitas instalar Node ni MongoDB, ni crear ningún archivo
`.env`.**

### Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (o Docker Engine con el plugin
  Compose) en marcha.
- Los puertos **5173**, **3000** y **27018** libres en tu máquina.

### Iniciar la aplicación

Desde la carpeta raíz del proyecto:

```bash
docker compose up --build
```

La primera vez tarda unos minutos porque construye las imágenes; las siguientes, unos 20-30
segundos. El entorno arranca en este orden, y cada paso espera a que el anterior esté listo:

1. `mongo`: la base de datos.
2. `mongo-init`: prepara la base para admitir transacciones y termina.
3. `api`: el servidor.
4. `seed`: carga datos de ejemplo (3 unidades, 2 rutas de Ciudad de México y 3 duties para mañana)
   y termina. Si ya existen, no los duplica.
5. `web`: la interfaz.

No te asustes si `mongo-init` y `seed` aparecen como terminados (`Exited (0)`): son tareas de un
solo uso y ese es su final feliz.

Si prefieres recuperar la terminal, arráncalo en segundo plano:

```bash
docker compose up --build -d
```

### Abrir la aplicación

| Qué | Dirección |
|---|---|
| Interfaz | http://localhost:5173 (abre el listado de rutas) |
| Api | http://localhost:3000/api |
| Documentación de la api (Swagger) | http://localhost:3000/api/docs |
| Estado de la api | http://localhost:3000/api/health |

La aplicación está lista cuando el estado de la api responde:

```json
{"status":"ok","database":{"isConnected":true,"name":"rumbo","replicaSetName":"rs0"}}
```

Si `replicaSetName` sale `null`, la base no admite transacciones y la protección contra duties
solapados no funcionaría: reinicia desde cero (ver más abajo).

### Detener la aplicación

Si la arrancaste en primer plano, pulsa `Ctrl + C` y después:

```bash
docker compose down
```

`docker compose down` apaga y elimina los contenedores, pero **conserva los datos**: cuando vuelvas
a iniciar, seguirán ahí.

### Reiniciar desde cero

Para borrar también todos los datos y empezar como la primera vez:

```bash
docker compose down -v
docker compose up --build
```

Ojo: el `-v` elimina el volumen de la base de datos, así que **todo lo que hayas creado se pierde**.

### Ejecutar las pruebas

Con la aplicación iniciada, en otra terminal:

```bash
# Pruebas unitarias: lógica sin base de datos (reglas, validaciones, errores).
docker compose exec api npm test

# Pruebas de integración: la api completa contra una base de datos real,
# incluida la prueba de peticiones simultáneas sobre la misma unidad.
docker compose exec api npm run test:e2e
```

Las pruebas de integración usan una base de datos aparte (`rumbo_test`) que **borran por completo**
al empezar. Los datos de la aplicación (`rumbo`) no se tocan.

### Demostración de concurrencia

Esta es la prueba más vistosa: manda muchas peticiones **simultáneas** para asignar la misma unidad
en la misma ventana de tiempo, y te dice cuántas se aceptaron. Solo debería aceptarse una:

```bash
docker compose exec api npm run demo:concurrency

# Con otra cantidad de peticiones:
docker compose exec api npm run demo:concurrency -- --requests=30
```

Resultado esperado:

```
201 creadas:                 1
409 rechazadas por conflicto: 9
...
RESULTADO: exactamente un duty creado; la garantía se cumplió.
```

### Otras tareas útiles

```bash
# Ver los registros de un servicio (api, web, mongo, seed...)
docker compose logs -f api

# Ver el estado de todos los servicios
docker compose ps -a

# Volver a cargar los datos de ejemplo
docker compose run --rm seed
```

### Conectarte a la base de datos

Con la aplicación iniciada, puedes mirar los datos directamente en MongoDB. No hay usuario ni
contraseña: en local la base corre sin autenticación a propósito.

**La cadena de conexión es esta**, y sirve para cualquier cliente de MongoDB:

```
mongodb://localhost:27018/rumbo?directConnection=true
```

Ojo con dos detalles:

- El puerto es **27018**, no el 27017 de siempre, para no chocar con un MongoDB que ya tengas
  instalado.
- El `directConnection=true` es **obligatorio**. Sin él, el cliente pregunta a la base por el resto
  de sus servidores, recibe el nombre interno `mongo` (que solo existe dentro de Docker) y falla con
  `getaddrinfo ENOTFOUND mongo`.

**Opción 1: MongoDB Compass** (la interfaz gráfica oficial, gratuita):

1. Descárgalo de [mongodb.com/products/tools/compass](https://www.mongodb.com/products/tools/compass)
   e instálalo.
2. Pulsa **Add new connection**, pega la cadena de arriba en **URI** y pulsa **Save & Connect**.
3. Abre la base **`rumbo`**.

**Opción 2: la extensión de MongoDB para VS Code.** Instala *MongoDB for VS Code* desde el panel de
extensiones, pulsa **Add Connection → Connect with Connection String** y pega la misma cadena.

**Opción 3: desde la terminal, sin instalar nada.** La imagen de MongoDB ya trae su consola:

```bash
docker compose exec mongo mongosh rumbo
```

Y dentro, por ejemplo:

```js
db.units.find()                           // todas las unidades
db.duties.find().sort({ startAt: 1 })     // todos los duties, por inicio
```

Lo que vas a encontrar:

| Colección | Qué guarda |
|---|---|
| `routes` | Las rutas, con sus puntos dentro (`points`), en orden. |
| `units` | Las unidades. `scheduleVersion` es el contador del bloqueo de concurrencia: no tiene significado de negocio. |
| `duties` | Las asignaciones, con `routeId`, `unitId`, `startAt` y `endAt`. Las fechas se guardan en **UTC**. |

Las pruebas de integración usan otra base, **`rumbo_test`**, que se borra entera en cada ejecución.

Un consejo: úsalo para **mirar**, no para editar. Lo que cambies a mano no pasa por las
validaciones de la api, y un duty escrito directamente en la base se salta también la protección
contra solapamientos.

### Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| Docker Desktop no arranca y menciona WSL2 o `\\wsl$` (Windows) | La virtualización está desactivada en la BIOS/UEFI. Actívala (en procesadores AMD se llama *SVM Mode*). |
| La construcción falla con `Release file ... is not valid yet` | El reloj del equipo está desfasado. Sincroniza la hora del sistema y reinicia Docker Desktop. |
| `port is already allocated` al iniciar | Otro programa usa el puerto 5173, 3000 o 27018. Ciérralo, o copia `.env.example` a `.env` y cambia el puerto allí. Si cambias `API_PORT`, ajusta también `VITE_API_URL`; si cambias `WEB_PORT`, ajusta también `CORS_ORIGIN`. |
| Los cambios en el código de la api no se aplican | Reinicia la api: `docker compose restart api`. |
| Un cliente de base de datos falla con `getaddrinfo ENOTFOUND mongo` | Falta `directConnection=true` en la cadena de conexión. Usa `mongodb://localhost:27018/rumbo?directConnection=true`. |
