// Tipos del dominio tal como los devuelve la api. Las fechas llegan como texto ISO 8601 en UTC.

/** Un punto de una ruta, en el orden en que aparece en la lista. */
export interface RoutePoint {
  lat: number;
  lng: number;
  name?: string;
}

/** Resumen de una ruta para el listado, sin sus puntos. */
export interface RouteSummary {
  id: string;
  name: string;
  pointCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Ruta completa con sus puntos ordenados. */
export interface Route {
  id: string;
  name: string;
  points: RoutePoint[];
  createdAt: string;
  updatedAt: string;
}

/** Datos para crear una ruta o reemplazarla por completo. */
export interface SaveRouteInput {
  name: string;
  points: RoutePoint[];
}

/** Unidad (vehículo) de la flota. */
export interface Unit {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/** Datos para cambiar el nombre de una unidad; el código no se edita. */
export interface UpdateUnitInput {
  unitId: string;
  name: string;
}

/** Ruta donde una unidad tiene duties; viene en el 409 al intentar borrarla. */
export interface UnitDutyRoute {
  id: string;
  name: string;
  dutyCount: number;
}

/** Datos para dar de alta una unidad. */
export interface CreateUnitInput {
  code: string;
  name: string;
}

/** Asignación de una ruta a una unidad durante una ventana de tiempo. */
export interface Duty {
  id: string;
  routeId: string;
  unitId: string;
  startAt: string;
  endAt: string;
  createdAt: string;
  updatedAt: string;
}

/** Duty del listado de una ruta, con los datos de su unidad. */
export interface RouteDuty extends Duty {
  unit: Pick<Unit, 'id' | 'code' | 'name'>;
}

/** Duty que ocupa a una unidad en la ventana consultada. */
export interface OccupyingDuty {
  id: string;
  routeId: string;
  routeName: string;
  startAt: string;
  endAt: string;
}

/** Si una unidad está libre en una ventana; si está ocupada, qué duty la ocupa. */
export interface UnitAvailability {
  unitId: string;
  code: string;
  name: string;
  isAvailable: boolean;
  occupyingDuty?: OccupyingDuty;
}

/** Datos para asignar un duty; las fechas deben llevar zona horaria. */
export interface CreateDutyInput {
  routeId: string;
  unitId: string;
  startAt: string;
  endAt: string;
}

/** Datos para editar un duty: nueva unidad y nueva ventana. La ruta no cambia. */
export interface UpdateDutyInput {
  unitId: string;
  startAt: string;
  endAt: string;
}

/** Un campo que no pasó la validación, con la ruta completa (`points.3.lat`). */
export interface InvalidField {
  field: string;
  messages: string[];
}

/** Duty con el que choca uno nuevo; viene en el 409 de solapamiento. */
export interface ConflictingDuty {
  id: string;
  routeId: string;
  routeName: string;
  unitCode: string;
  startAt: string;
  endAt: string;
}
