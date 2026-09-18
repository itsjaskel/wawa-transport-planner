# Bitácora de decisiones

Trabajé con Claude Code (Claude) como asistente. El método fue deliberado: antes de escribir código
le entregué un documento de requisitos con las decisiones de arquitectura ya tomadas, y trabajamos
**por fases**, sin que la IA pudiera empezar una fase sin mi aprobación explícita ni ejecutar
comandos de git. Los commits son míos. Toda la memoria del proyecto vive en `CLAUDE.md`, donde cada
afirmación técnica lleva su nivel de evidencia (`verificado-en-dispositivo`, `compila`,
`verificado-contra-la-librería`, `supuesto`), para distinguir lo comprobado de lo que solo parece
correcto.

## Decisiones de arquitectura que tomé yo

- **El mecanismo de concurrencia.** Decidí de antemano cómo garantizar que una unidad no tenga dos
  duties solapados, y prohibí expresamente a la IA las alternativas habituales: mutex o colas en
  memoria (solo protegen dentro de un proceso) y validar antes de insertar (condición de carrera).
  Exigí además explicar por qué una transacción de MongoDB sola no basta (*write skew* bajo
  aislamiento por instantánea) y la solución: **incrementar un contador en el documento de la unidad
  dentro de la transacción**, para forzar un conflicto de escritura entre dos asignaciones a la
  misma unidad. El bloqueo vive en la base porque es lo único que comparten todas las instancias.
- **Exigir una contraprueba.** No me bastaba con un test en verde: pedí que, al quitar el
  incremento, el test de concurrencia fallara, y ver ambas salidas. Un test de concurrencia que
  nunca falla puede estar corriendo en secuencia sin que nadie lo note.
- **Probar la consulta, no solo la función.** La regla de solapamiento vive en una función pura, pero
  en ejecución manda la consulta a la base. Pedí correr la misma tabla de casos contra MongoDB real.
- **El modelo:** intervalos semiabiertos (un turno que termina a las 10:00 no choca con uno que
  empieza a las 10:00), inicio y fin explícitos en lugar de duración, fechas absolutas en UTC, y
  puntos embebidos en la ruta con el orden dado por su posición (sin campo de orden que pueda tener
  huecos o duplicados).
- **MongoDB, sabiendo su límite.** Es la preferencia del equipo, pero no tiene una restricción
  declarativa para rangos como el `EXCLUDE` de PostgreSQL. Lo acepté con la garantía en la
  transacción y la razono en el README.
- **Stack acotado:** NestJS 12, React con Vite (no Next.js: no necesito renderizado en servidor y
  Leaflet depende del navegador) y Leaflet con OpenStreetMap (sin claves ni cuentas, para que el
  proyecto levante sin configurar nada). Sin GraphQL (en el cliente nose personaliza lo que se quiere), Prisma (Mongoose ya cubre todo lo que necesita la capa de datos: esquemas, validación, índices, transacciones y relaciones, y está probado a fondo (78 pruebas de integración, contrapruebas incluidas)) ni Redux. Ninguna dependencia nueva sin
  preguntarme.
- **Todo en Docker con un solo comando**, con MongoDB como replica set de un nodo (requisito para
  tener transacciones) y dependencias entre servicios por condición, no por orden.
- **Nombre visible `Rumb@` e identificador técnico `rumbo`**, porque la `@` no es válida en npm ni en
  Docker Compose.
- **En la interfaz:**
  - **Las horas se guardan en UTC y se muestran en la zona de quien mira, siempre con su desfase
    UTC visible** (`19 sep 2026, 04:00 – 08:00 (UTC−04:00)`). El desfase se calcula para cada fecha,
    porque con horario de verano no es el mismo en julio que en diciembre. Al capturar, el formulario
    envía la hora con su desfase explícito, que es lo que la api exige.
  - **El conflicto de horario se explica en concreto**: qué unidad, en qué ruta y a qué horas, con
    un enlace a esa ruta. Un "no se pudo guardar" genérico no le dice al planificador qué hacer.
  - **El formulario de duty vive en el detalle de la ruta**, porque la ruta ya está elegida y solo
    faltan la unidad y el horario.
  - **Un solo componente de mapa** para el detalle y para el editor, para que los marcadores
    numerados y la línea se vean igual en los dos sitios.
  - **Verificación en tres anchos reales** (390, 768 y 1280 px) y recorrido de los flujos con clics
    en un navegador. Decidí no añadir pruebas automatizadas de la interfaz: la lógica crítica está
    en la api y ya está cubierta.
- **Borrar unidades solo si no tienen duties.** Entre borrar en cascada, dar de baja sin borrar o
  impedir el borrado, elegí impedirlo: nunca se pierde el historial de turnos por un clic. Decidí
  también que el código de la unidad no se edite, solo su nombre, y que esto fuera un paso aparte y
  no parte de las funciones opcionales.
- **Un duty no puede empezar en el pasado.** Añadí esta regla de negocio: al crear y al editar, el
  inicio debe ser del minuto actual o posterior. Se valida en la api, que es la garantía, y en el
  formulario, para avisar antes de enviar.
- **Las instrucciones para arrancar la aplicación, al principio del README**, para que quien lo abra
  pueda ponerla en marcha sin leer antes todo lo demás.

