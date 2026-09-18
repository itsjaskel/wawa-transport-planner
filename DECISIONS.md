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
  proyecto levante sin configurar nada). Sin GraphQL, Prisma ni Redux. Ninguna dependencia nueva sin
  preguntarme.
- **Todo en Docker con un solo comando**, con MongoDB como replica set de un nodo (requisito para
  tener transacciones) y dependencias entre servicios por condición, no por orden.
- **Reglas de código:** legibilidad por encima de brevedad, nombres completos, cada función con su
  comentario en español, cero estilos en línea, un archivo de estilos por pantalla y diseño
  responsive.
- **Nombre visible `Rumb@` e identificador técnico `rumbo`**, porque la `@` no es válida en npm ni en
  Docker Compose.
- **Cambio de regla durante el proyecto:** al principio reservé para mí el README y esta bitácora.
  Después de la Fase 2 decidí que la IA mantuviera las instrucciones de uso del README en cada fase,
  y más tarde que redactara también el resto del README y esta bitácora, que yo reviso.

## Dónde acepté lo que propuso la IA

Antes de cada fase, la IA me presentó la lista de decisiones que tomaría. Estas son las que acepté y
por qué me parecieron correctas:

| Propuesta | Por qué la acepté |
|---|---|
| Módulos CSS en lugar de CSS plano | Mantienen un archivo de estilos por pantalla y además aíslan el alcance de las clases. |
| Formato de error único `{ statusCode, error, message, details }`, con la ruta de cada campo inválido (`points.3.lat`) | La interfaz puede marcar el campo exacto sin interpretar mensajes. |
| El 409 de solapamiento incluye ruta, unidad, inicio y fin del duty con el que se choca | La interfaz puede explicar el conflicto sin otra consulta. |
| Exigir zona horaria en las fechas y rechazar las que no la traen | Una fecha sin zona se interpretaría en la hora del servidor y el duty quedaría desplazado en silencio. |
| Código de unidad guardado en mayúsculas | `bus-001` y `BUS-001` no deben poder coexistir. |
| Ocultar `scheduleVersion` en las respuestas | Es un detalle interno del bloqueo; exponerlo invita a que alguien lo use. |
| Responder 503 si la transacción agota sus reintentos | Es un error distinto de "hay solapamiento" y no debe confundirse con un 500 genérico. |
| No bloquear la unidad al borrar un duty | Borrar no puede crear solapamientos; en el peor caso produce un 409 de más, que es el error seguro. |
| Tests de integración contra una base aparte que se niegan a correr en otra | Borran la base al empezar; esa protección evita destruir datos por accidente. |
| Sacar la configuración global a un archivo compartido por la api y los tests | Así los tests prueban la api exactamente como corre. |
| Instalar `procps` en la imagen y añadir `init: true` al contenedor | Resolvían la recarga en caliente y los procesos zombis (ver abajo). La IA no los aplicó hasta que los aprobé, porque eran dependencias nuevas. |

## Dónde corregí a la IA o no di algo por bueno

- **Tildes ausentes (Fase 0).** La IA generó textos de la interfaz y comentarios sin tildes
  ("Planificacion", "Sin conexion") por miedo a un problema de codificación que no existía. Lo
  detecté en una captura de pantalla; ninguna comprobación automática lo habría cazado. Se corrigió y
  se convirtió en regla escrita.
- **Verificar en lugar de suponer.** Al pedir revisar si todas las dependencias estaban declaradas,
  la IA contrastó cada import con el `package.json` en lugar de responder de memoria.
- **Mantener el proceso.** Cuando pregunté si la Fase 2 estaba terminada, la IA confirmó que no la
  había empezado: faltaba mi aprobación, como exigía el proceso.

## Errores que aparecieron al verificar

El registro completo, con causa raíz y cómo se detectó cada uno, está en `CLAUDE.md` (sección 8). Los
que cambiaron el resultado:

- **Un supuesto documentado resultó falso.** Se había escrito que un cuerpo de petición demasiado
  grande sería rechazado con el formato de error correcto. Al convertirlo en una prueba real,
  respondía **500**. Se corrigió y se añadió un test.
- **La recarga en caliente servía código viejo sin avisar.** Un cambio con tests en verde seguía
  fallando contra la api en marcha. La causa: la imagen de Node no traía `ps`, y el CLI de Nest no
  podía cerrar la versión anterior.
- **La memoria del proyecto afirmaba de más.** Una corrección de la Fase 0 figuraba como verificada y
  estaba incompleta. Se rebajó la etiqueta y se corrigió el trabajo.
- **Fallos del entorno, no del código:** virtualización desactivada en la BIOS y el reloj del sistema
  desfasado tres horas, que rompía la construcción de imágenes. Se documentaron para quien levante el
  proyecto en otra máquina.

## Nota sobre las fuentes

Esta bitácora se basa en el documento de requisitos que entregué a la IA, en `CLAUDE.md` y en las
conversaciones de las fases 1 y 2. De la Fase 0 solo se recoge lo que quedó registrado en
`CLAUDE.md`.
