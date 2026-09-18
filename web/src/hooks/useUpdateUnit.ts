// Hook de edición del nombre de una unidad.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendApiJson } from '../api/client';
import type { Unit, UpdateUnitInput } from '../api/types';
import { queryKeys } from './queryKeys';

/** Cambia el nombre de una unidad y refresca las unidades y los duties que la muestran. */
export function useUpdateUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (unitInput: UpdateUnitInput) =>
      sendApiJson<Unit>('PATCH', `/units/${unitInput.unitId}`, { name: unitInput.name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.units });
      // Los duties de cada ruta muestran el nombre de su unidad: también quedan desactualizados.
      queryClient.invalidateQueries({ queryKey: queryKeys.routes });
    },
  });
}
