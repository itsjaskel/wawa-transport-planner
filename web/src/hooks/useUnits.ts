// Hook de lectura del listado de unidades.
import { useQuery } from '@tanstack/react-query';
import { requestApi } from '../api/client';
import type { Unit } from '../api/types';
import { queryKeys } from './queryKeys';

/** Entrega todas las unidades ordenadas por código. */
export function useUnits() {
  return useQuery({
    queryKey: queryKeys.units,
    queryFn: () => requestApi<Unit[]>('/units'),
  });
}
