// Hook de lectura del listado de rutas.
import { useQuery } from '@tanstack/react-query';
import { requestApi } from '../api/client';
import type { RouteSummary } from '../api/types';
import { queryKeys } from './queryKeys';

/** Entrega el resumen de todas las rutas, las actualizadas más recientemente primero. */
export function useRoutes() {
  return useQuery({
    queryKey: queryKeys.routes,
    queryFn: () => requestApi<RouteSummary[]>('/routes'),
  });
}
