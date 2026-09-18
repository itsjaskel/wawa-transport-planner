// Carga datos de ejemplo llamando a la propia api por HTTP, en lugar de escribir en
// MongoDB directamente: así el seed pasa por las mismas validaciones que un usuario
// y no duplica la definición de los esquemas.
// Node 24 ejecuta este archivo TypeScript sin compilarlo previamente, por eso no usa enum,
// namespace ni propiedades de parámetro en constructores.

const API_URL = process.env.API_URL ?? 'http://api:3000/api';

const HTTP_STATUS_CREATED = 201;
const HTTP_STATUS_CONFLICT = 409;

interface SeedUnit {
  code: string;
  name: string;
}

interface SeedPoint {
  lat: number;
  lng: number;
  name: string;
}

interface SeedRoute {
  name: string;
  points: SeedPoint[];
}

interface RouteSummary {
  id: string;
  name: string;
}

interface UnitSummary {
  id: string;
  code: string;
}

/** Duty de ejemplo: unidad y ruta por su nombre legible, y horas UTC del día siguiente. */
interface SeedDuty {
  unitCode: string;
  routeName: string;
  startHourUtc: number;
  endHourUtc: number;
}

const SEED_UNITS: SeedUnit[] = [
  { code: 'BUS-001', name: 'Autobús 1' },
  { code: 'BUS-002', name: 'Autobús 2' },
  { code: 'BUS-003', name: 'Autobús 3' },
];

// Puntos reales de Ciudad de México, en orden de recorrido.
const SEED_ROUTES: SeedRoute[] = [
  {
    name: 'Centro - Polanco',
    points: [
      { lat: 19.4326, lng: -99.1332, name: 'Zócalo' },
      { lat: 19.4352, lng: -99.1412, name: 'Bellas Artes' },
      { lat: 19.427, lng: -99.1677, name: 'Ángel de la Independencia' },
      { lat: 19.426, lng: -99.1863, name: 'Museo Nacional de Antropología' },
      { lat: 19.431, lng: -99.199, name: 'Parque Lincoln' },
    ],
  },
  {
    name: 'Insurgentes Sur',
    points: [
      { lat: 19.423, lng: -99.163, name: 'Glorieta de Insurgentes' },
      { lat: 19.3787, lng: -99.1789, name: 'Parque Hundido' },
      { lat: 19.35, lng: -99.162, name: 'Centro de Coyoacán' },
      { lat: 19.332, lng: -99.187, name: 'Ciudad Universitaria' },
    ],
  },
];

// Duties para mañana (UTC). BUS-003 queda libre a propósito: es la unidad de la demo de
// concurrencia. Al repetir el seed el mismo día, cada duty choca consigo mismo (409) y no se duplica.
const SEED_DUTIES: SeedDuty[] = [
  { unitCode: 'BUS-001', routeName: 'Centro - Polanco', startHourUtc: 8, endHourUtc: 12 },
  { unitCode: 'BUS-001', routeName: 'Insurgentes Sur', startHourUtc: 13, endHourUtc: 17 },
  { unitCode: 'BUS-002', routeName: 'Insurgentes Sur', startHourUtc: 9, endHourUtc: 13 },
];

/** Envía un JSON a la api con el método indicado y devuelve la respuesta sin interpretarla. */
async function sendJson(method: string, path: string, body: unknown): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Da de alta las unidades de ejemplo; un 409 significa que ya existía y no es un error. */
async function seedUnits(): Promise<void> {
  for (const unit of SEED_UNITS) {
    const response = await sendJson('POST', '/units', unit);

    if (response.status === HTTP_STATUS_CREATED) {
      console.log(`[seed] unidad ${unit.code} creada`);
      continue;
    }

    if (response.status === HTTP_STATUS_CONFLICT) {
      console.log(`[seed] unidad ${unit.code} ya existía`);
      continue;
    }

    throw new Error(`No se pudo crear la unidad ${unit.code}: ${await response.text()}`);
  }
}

/** Devuelve los nombres de las rutas que ya existen en la api. */
async function fetchExistingRouteNames(): Promise<Set<string>> {
  const response = await fetch(`${API_URL}/routes`);

  if (!response.ok) {
    throw new Error(`No se pudo leer el listado de rutas: ${await response.text()}`);
  }

  const routeSummaries = (await response.json()) as RouteSummary[];
  return new Set(routeSummaries.map((routeSummary) => routeSummary.name));
}

/** Crea las rutas de ejemplo que falten; las rutas no tienen clave única, así que se comparan por nombre. */
async function seedRoutes(): Promise<void> {
  const existingRouteNames = await fetchExistingRouteNames();

  for (const route of SEED_ROUTES) {
    if (existingRouteNames.has(route.name)) {
      console.log(`[seed] ruta "${route.name}" ya existía`);
      continue;
    }

    const response = await sendJson('POST', '/routes', route);

    if (response.status !== HTTP_STATUS_CREATED) {
      throw new Error(`No se pudo crear la ruta "${route.name}": ${await response.text()}`);
    }

    console.log(`[seed] ruta "${route.name}" creada`);
  }
}

/** Pide un listado a la api y devuelve su cuerpo; falla si la respuesta no es correcta. */
async function fetchList<T>(path: string): Promise<T[]> {
  const response = await fetch(`${API_URL}${path}`);

  if (!response.ok) {
    throw new Error(`No se pudo leer ${path}: ${await response.text()}`);
  }
  return (await response.json()) as T[];
}

/** Devuelve la fecha de mañana a la hora UTC indicada, en ISO 8601 con zona. */
function buildTomorrowAtUtcHour(hourUtc: number): string {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(hourUtc, 0, 0, 0);
  return tomorrow.toISOString();
}

/** Crea los duties de ejemplo; un 409 significa que ya existía ese mismo duty y no es un error. */
async function seedDuties(): Promise<void> {
  const units = await fetchList<UnitSummary>('/units');
  const routes = await fetchList<RouteSummary>('/routes');

  for (const seedDuty of SEED_DUTIES) {
    const unit = units.find((candidate) => candidate.code === seedDuty.unitCode);
    const route = routes.find((candidate) => candidate.name === seedDuty.routeName);

    if (!unit || !route) {
      throw new Error(`Falta la unidad ${seedDuty.unitCode} o la ruta "${seedDuty.routeName}".`);
    }

    const dutyLabel = `${seedDuty.unitCode} en "${seedDuty.routeName}" de ${seedDuty.startHourUtc}:00 a ${seedDuty.endHourUtc}:00 UTC`;
    const response = await sendJson('POST', '/duties', {
      unitId: unit.id,
      routeId: route.id,
      startAt: buildTomorrowAtUtcHour(seedDuty.startHourUtc),
      endAt: buildTomorrowAtUtcHour(seedDuty.endHourUtc),
    });

    if (response.status === HTTP_STATUS_CREATED) {
      console.log(`[seed] duty ${dutyLabel} creado`);
      continue;
    }

    if (response.status === HTTP_STATUS_CONFLICT) {
      console.log(`[seed] duty ${dutyLabel} ya existía`);
      continue;
    }

    throw new Error(`No se pudo crear el duty ${dutyLabel}: ${await response.text()}`);
  }
}

/** Carga las unidades, rutas y duties de ejemplo; es idempotente y se puede repetir sin duplicar. */
async function seed(): Promise<void> {
  console.log(`[seed] apuntando a ${API_URL}`);
  await seedUnits();
  await seedRoutes();
  await seedDuties();
  console.log('[seed] terminado');
}

await seed();
