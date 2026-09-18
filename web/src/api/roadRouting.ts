// Cliente del servicio de trazado por calles (OSRM). Lo llama el navegador directamente: la api de
// Rumb@ no depende de un servicio externo, y si este falla solo se pierde el trazado, no el núcleo.
import type { LatLngTuple } from 'leaflet';
import { ROAD_ROUTING_TIMEOUT_MS, ROAD_ROUTING_URL } from '../config/map';
import type { RoutePoint } from './types';

/** Recorrido por calles entre los puntos de una ruta, en su orden. */
export interface RoadRoute {
  /** Geometría del recorrido en orden latitud, longitud, lista para Leaflet. */
  positions: LatLngTuple[];
  distanceMeters: number;
  durationSeconds: number;
}

/** Forma mínima de la respuesta de OSRM que se usa aquí. */
interface OsrmRouteResponse {
  code: string;
  routes?: {
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] };
  }[];
}

const OSRM_SUCCESS_CODE = 'Ok';

/** Pide a OSRM el recorrido por calles que une los puntos en orden; falla si no hay recorrido. */
export async function fetchRoadRoute(points: RoutePoint[]): Promise<RoadRoute> {
  // OSRM espera longitud,latitud (al revés que Leaflet), con los puntos separados por `;`.
  const coordinates = points.map((point) => `${point.lng},${point.lat}`).join(';');
  const url = `${ROAD_ROUTING_URL}/${coordinates}?overview=full&geometries=geojson`;

  const response = await fetch(url, { signal: AbortSignal.timeout(ROAD_ROUTING_TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`El servicio de trazado respondió con el código ${response.status}.`);
  }

  const body = (await response.json()) as OsrmRouteResponse;
  const firstRoute = body.routes?.[0];
  if (body.code !== OSRM_SUCCESS_CODE || !firstRoute) {
    throw new Error(`El servicio de trazado no encontró recorrido (${body.code}).`);
  }

  return {
    // Se invierte cada par: OSRM devuelve [lng, lat] y Leaflet espera [lat, lng].
    positions: firstRoute.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distanceMeters: firstRoute.distance,
    durationSeconds: firstRoute.duration,
  };
}
