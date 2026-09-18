// Hook de lectura del detalle de una ruta.
import { useQuery } from '@tanstack/react-query';
import { requestApi } from '../api/client';
import type { Route } from '../api/types';
import { queryKeys } from './queryKeys';

/** Entrega una ruta con sus puntos; no consulta nada mientras no haya id. */
export function useRoute(routeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.route(routeId ?? ''),
    queryFn: () => requestApi<Route>(`/routes/${routeId}`),
    enabled: routeId !== undefined,
  });
}
