// Demostración de la garantía de concurrencia contra la api en marcha: dispara N creaciones
// simultáneas del mismo duty sobre la misma unidad y muestra cuántas se aceptaron y cuántas no.
// Uso: `docker compose exec api npm run demo:concurrency` (opcional: `-- --requests=20`).
// Node 24 ejecuta este archivo TypeScript sin compilarlo, por eso no usa enum ni namespace.

const API_URL = process.env.API_URL ?? 'http://localhost:3000/api';
const DEMO_UNIT_CODE = 'BUS-003';
const DEFAULT_REQUEST_COUNT = 10;
const REQUESTS_ARGUMENT_PREFIX = '--requests=';
const WINDOW_DURATION_MS = 2 * 60 * 60 * 1000; // dos horas
const ONE_MINUTE_MS = 60 * 1000;
const ONE_DAY_MS = 24 * 60 * ONE_MINUTE_MS;
// La ventana empieza como tarde a las 20:00 UTC, para que no cruce al día siguiente.
const LATEST_START_MINUTE_OF_DAY = 20 * 60;
// La ventana cae en un día aleatorio del próximo año, para que cada ejecución empiece limpia.
const MAX_DAYS_AHEAD = 365;
const HTTP_STATUS_CREATED = 201;
const HTTP_STATUS_CONFLICT = 409;

interface UnitSummary {
  id: string;
  code: string;
}

interface RouteSummary {
  id: string;
  name: string;
}

interface RouteDuty {
  unitId: string;
  startAt: string;
}

/** Lee la cantidad de peticiones de los argumentos, o usa la de por defecto. */
function readRequestCount(): number {
  const requestsArgument = process.argv.find((argument) =>
    argument.startsWith(REQUESTS_ARGUMENT_PREFIX),
  );

  if (!requestsArgument) {
    return DEFAULT_REQUEST_COUNT;
  }

  const requestCount = Number(requestsArgument.slice(REQUESTS_ARGUMENT_PREFIX.length));
  const isPositiveInteger = Number.isInteger(requestCount) && requestCount > 0;

  if (!isPositiveInteger) {
    throw new Error(`"${requestsArgument}" no es una cantidad válida de peticiones.`);
  }
  return requestCount;
}

/** Pide un recurso a la api y devuelve su cuerpo; falla si la respuesta no es correcta. */
async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);

  if (!response.ok) {
    throw new Error(`GET ${path} respondió ${response.status}: ${await response.text()}`);
  }
  return (await response.json()) as T;
}

/** Elige una ventana de dos horas en un día y minuto aleatorios del próximo año. */
function pickRandomFutureWindow(): { startAt: string; endAt: string } {
  const daysAhead = 1 + Math.floor(Math.random() * MAX_DAYS_AHEAD);
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const minuteOfDay = Math.floor(Math.random() * LATEST_START_MINUTE_OF_DAY);
  const startTime = startOfToday.getTime() + daysAhead * ONE_DAY_MS + minuteOfDay * ONE_MINUTE_MS;

  return {
    startAt: new Date(startTime).toISOString(),
    endAt: new Date(startTime + WINDOW_DURATION_MS).toISOString(),
  };
}

/** Envía la creación de un duty y devuelve solo el código de estado de la respuesta. */
async function postDutyAndReadStatus(duty: object): Promise<number> {
  const response = await fetch(`${API_URL}/duties`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(duty),
  });
  return response.status;
}

/** Cuenta cuántas respuestas hubo de cada tipo. */
function summarizeStatuses(statuses: number[]): {
  created: number;
  conflicts: number;
  others: number[];
} {
  const created = statuses.filter((status) => status === HTTP_STATUS_CREATED).length;
  const conflicts = statuses.filter((status) => status === HTTP_STATUS_CONFLICT).length;
  const others = statuses.filter(
    (status) => status !== HTTP_STATUS_CREATED && status !== HTTP_STATUS_CONFLICT,
  );
  return { created, conflicts, others };
}

/** Ejecuta la demostración e imprime el resultado; termina con error si la garantía no se cumple. */
async function runConcurrencyDemo(): Promise<void> {
  const requestCount = readRequestCount();
  const units = await fetchJson<UnitSummary[]>('/units');
  const routes = await fetchJson<RouteSummary[]>('/routes');

  const demoUnit = units.find((unit) => unit.code === DEMO_UNIT_CODE);
  const demoRoute = routes[0];
  if (!demoUnit || !demoRoute) {
    throw new Error(
      `Faltan datos de ejemplo: ejecuta el seed (unidad ${DEMO_UNIT_CODE} y una ruta).`,
    );
  }

  const demoWindow = pickRandomFutureWindow();
  const duty = { routeId: demoRoute.id, unitId: demoUnit.id, ...demoWindow };

  console.log(`Unidad:   ${demoUnit.code}`);
  console.log(`Ruta:     ${demoRoute.name}`);
  console.log(`Ventana:  ${demoWindow.startAt} → ${demoWindow.endAt}`);
  console.log(`Enviando ${requestCount} peticiones simultáneas con esa misma ventana...\n`);

  const statuses = await Promise.all(
    Array.from({ length: requestCount }, () => postDutyAndReadStatus(duty)),
  );
  const summary = summarizeStatuses(statuses);

  const routeDuties = await fetchJson<RouteDuty[]>(`/routes/${demoRoute.id}/duties`);
  const savedDutyCount = routeDuties.filter(
    (routeDuty) => routeDuty.unitId === demoUnit.id && routeDuty.startAt === duty.startAt,
  ).length;

  console.log(`201 creadas:                 ${summary.created}`);
  console.log(`409 rechazadas por conflicto: ${summary.conflicts}`);
  console.log(
    `Otras respuestas:            ${summary.others.length} ${JSON.stringify(summary.others)}`,
  );
  console.log(`Duties guardados en esa ventana, según la api: ${savedDutyCount}`);

  const isGuaranteeKept = summary.created === 1 && savedDutyCount === 1;
  if (!isGuaranteeKept) {
    console.log('\nRESULTADO: la garantía NO se cumplió.');
    process.exitCode = 1;
    return;
  }
  console.log('\nRESULTADO: exactamente un duty creado; la garantía se cumplió.');
}

await runConcurrencyDemo();
