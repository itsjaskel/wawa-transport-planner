// Hook de borrado de unidades.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { requestApi } from '../api/client';
import { queryKeys } from './queryKeys';

/** Borra una unidad sin duties y refresca el listado; si tiene duties llega un ApiError 409 con sus rutas. */
export function useDeleteUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (unitId: string) => requestApi<void>(`/units/${unitId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.units });
    },
  });
}
