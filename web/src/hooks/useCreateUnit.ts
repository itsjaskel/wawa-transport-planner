// Hook de alta de unidades.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendApiJson } from '../api/client';
import type { CreateUnitInput, Unit } from '../api/types';
import { queryKeys } from './queryKeys';

/** Da de alta una unidad y refresca el listado de unidades. */
export function useCreateUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (unitInput: CreateUnitInput) => sendApiJson<Unit>('POST', '/units', unitInput),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.units });
    },
  });
}
