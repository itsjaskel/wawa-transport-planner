// Hook de borrado de duties.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { requestApi } from '../api/client';
import { queryKeys } from './queryKeys';

/** Elimina un duty de la ruta indicada y refresca los duties de esa ruta. */
export function useDeleteDuty(routeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dutyId: string) => requestApi<void>(`/duties/${dutyId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routeDuties(routeId) });
    },
  });
}
