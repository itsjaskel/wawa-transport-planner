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
| Interfaz: lista de rutas, detalle con mapa y duties, formularios | **En desarrollo** |
| Documentación Swagger, vista previa de conflictos, edición de duty | Opcional, pendiente |

Por ahora la interfaz en `http://localhost:5173` solo muestra el estado del entorno, pero toda la
funcionalidad ya se puede usar a través de la api.

## Qué construí

### El núcleo

- **Rutas:** crear, consultar y editar. Los puntos se guardan embebidos en la ruta y su orden es su
  posición en la lista, así que no puede haber huecos ni números de orden repetidos. Cada punto
  tiene latitud, longitud y nombre opcional. Una ruta tiene entre 2 y 200 puntos.
- **Unidades:** alta y listado, con código único (`BUS-001`) que no distingue mayúsculas.
- **Duties:** asignar, borrar y listar los duties de una ruta. El duty guarda **inicio y fin
  explícitos**, no inicio más duración: el fin es justo lo que se compara al buscar solapamientos,
  así que preferí que fuera un dato y no un cálculo.
- **Persistencia real** en MongoDB.

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

- La regla está escrita una sola vez como función pura, con una tabla de 9 casos (antes, después,
  tocándose en cada extremo, contenido, contenedor, idéntico, cruzando la medianoche).
- **La misma tabla se ejecuta contra la base real**, porque en ejecución manda la consulta y no la
  función: un error en la consulta pasaría desapercibido si solo se probara la función.
- 10 peticiones simultáneas solapadas sobre la misma unidad: **se crea exactamente 1**. 10 simultáneas
  que no se solapan: **se crean las 10**; el bloqueo ordena, no descarta.
- **Contraprueba:** quité el incremento a propósito y el test falló, que es lo que tenía que pasar.
  En tres ejecuciones seguidas se crearon **3 duties solapados** en la misma unidad. O sea, el test
  de verdad detecta lo que dice probar.

### Integridad y seguridad de la entrada

- Toda entrada se valida antes de tocar la base: rangos de latitud y longitud, longitudes de texto,
  cantidad de puntos, fin posterior al inicio. Las mismas reglas se repiten en el esquema de la base,
  para que ninguna escritura que no pase por la api deje datos inválidos.
- Se rechazan los campos no declarados, lo que impide colar operadores de MongoDB en el cuerpo.
- Las fechas se exigen **con zona horaria**. Sin ella, `2030-03-15T08:00` se interpretaría en la hora
  del servidor y el duty quedaría movido de hora sin que nadie se diera cuenta.
- Todos los errores salen con el mismo formato, en español y diciendo qué campo falló. El 409 de
  solapamiento incluye el duty con el que se choca (ruta, unidad, inicio y fin), para que la interfaz
  pueda decir exactamente por qué no se pudo asignar. Un error inesperado nunca expone detalles
  internos.
- Cabeceras de seguridad, CORS limitado al origen de la interfaz y límite de tamaño de las peticiones.

### Pruebas automatizadas

33 pruebas unitarias y 22 de integración contra MongoDB real, incluidas las de concurrencia. Hay
además un script de demostración que dispara peticiones simultáneas contra la api en marcha.

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
| Borrar rutas y unidades | Obliga a decidir qué pasa con sus duties (¿se borran?, ¿se impide?). Es una decisión de negocio y prefiero no tomarla a ciegas. |
| Editar un duty | Hoy se borra y se crea de nuevo. Editarlo exige la misma garantía de concurrencia; queda como opcional. |
| Consultar qué tiene asignado una unidad | Solo se consultan los duties por ruta, que es lo que pide el brief. |
| Duties recurrentes (todos los lunes…) | Los duties son fechas absolutas. Los recurrentes cambian por completo el modelo de la regla. |
| GraphQL y Prisma | No resuelven ningún problema de este MVP y añadirían una capa más que mantener. |
| Cálculo de trayectos sobre calles | El mapa mostrará los puntos unidos en línea recta, sobre OpenStreetMap. Calcular recorridos reales exige un servicio externo con cuenta, y el proyecto debe levantar sin configurar nada. |
| Paginación | Con los volúmenes de un MVP no hace falta. |
| Despliegue en producción | El entorno está pensado para desarrollo y evaluación local. La api tiene una etapa de producción en su `Dockerfile`, pero no se ha probado; la interfaz no la tiene. |

## Qué haría distinto con más tiempo

- **Evaluar en serio PostgreSQL** con la restricción de exclusión, para que la base garantice la
  regla por sí misma. Si hubiera que quedarse en MongoDB, añadiría una verificación periódica que
  busque solapamientos y avise, como red de seguridad independiente del código.
- **Vista de disponibilidad:** al elegir una ventana, marcar qué unidades están libres. La pregunta
  real del planificador es "¿qué unidad tengo libre para esta ruta en este horario?", no "¿por qué
  falló mi asignación?".
- **Pruebas de extremo a extremo de la interfaz** (por ejemplo con Playwright) y un pipeline de
  integración continua que ejecute todas las pruebas, incluida la contraprueba, en cada cambio.
- **Probar el caso límite de contención extrema:** si las transacciones agotan sus reintentos, la api
  responde 503. Ese camino está programado y contrastado con el código del driver de MongoDB, pero no
  se ha provocado en una prueba.
- **Auditoría de cambios:** quién asignó o borró cada duty y cuándo.

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
| Interfaz | http://localhost:5173 |
| Api | http://localhost:3000/api |
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

Para conectarte a la base de datos con una herramienta como MongoDB Compass:

```
mongodb://localhost:27018/rumbo?directConnection=true
```

El `directConnection=true` es obligatorio desde fuera de Docker.

### Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| Docker Desktop no arranca y menciona WSL2 o `\\wsl$` (Windows) | La virtualización está desactivada en la BIOS/UEFI. Actívala (en procesadores AMD se llama *SVM Mode*). |
| La construcción falla con `Release file ... is not valid yet` | El reloj del equipo está desfasado. Sincroniza la hora del sistema y reinicia Docker Desktop. |
| `port is already allocated` al iniciar | Otro programa usa el puerto 5173, 3000 o 27018. Ciérralo, o copia `.env.example` a `.env` y cambia el puerto allí. Si cambias `API_PORT`, ajusta también `VITE_API_URL`; si cambias `WEB_PORT`, ajusta también `CORS_ORIGIN`. |
| Los cambios en el código de la api no se aplican | Reinicia la api: `docker compose restart api`. |
