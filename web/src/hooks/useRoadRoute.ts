// Hook del recorrido por calles de una ruta, calculado por el servicio de trazado externo.
import { useQuery } from '@tanstack/react-query';
import { fetchRoadRoute } from '../api/roadRouting';
import type { RoutePoint } from '../api/types';

const MIN_POINTS_FOR_ROAD_ROUTE = 2;

/** Entrega el recorrido por calles de los puntos; no reintenta: si falla, el mapa usa la línea recta. */
export function useRoadRoute(points: RoutePoint[]) {
  // La clave son las coordenadas: si la ruta no cambia, el recorrido no se vuelve a pedir.
  const coordinatesKey = points.map((point) => `${point.lat},${point.lng}`).join(';');

  return useQuery({
    queryKey: ['road-route', coordinatesKey],
    queryFn: () => fetchRoadRoute(points),
    enabled: points.length >= MIN_POINTS_FOR_ROAD_ROUTE,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
}
