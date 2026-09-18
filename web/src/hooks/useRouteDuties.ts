// Hook de lectura de los duties de una ruta.
import { useQuery } from '@tanstack/react-query';
import { requestApi } from '../api/client';
import type { RouteDuty } from '../api/types';
import { queryKeys } from './queryKeys';

/** Entrega los duties de una ruta con su unidad, ordenados por inicio. */
export function useRouteDuties(routeId: string) {
  return useQuery({
    queryKey: queryKeys.routeDuties(routeId),
    queryFn: () => requestApi<RouteDuty[]>(`/routes/${routeId}/duties`),
  });
}
