// Hook de escritura de duties: asigna uno nuevo o edita uno existente.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendApiJson } from '../api/client';
import type { CreateDutyInput, Duty } from '../api/types';
import { queryKeys } from './queryKeys';

/** Guarda un duty: lo crea si no hay id y lo edita si lo hay; un solapamiento llega como ApiError 409. */
export function useSaveDuty(dutyId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dutyInput: CreateDutyInput) => {
      if (dutyId === undefined) {
        return sendApiJson<Duty>('POST', '/duties', dutyInput);
      }
      // La ruta no se edita: se envían solo la unidad y la ventana.
      const { unitId, startAt, endAt } = dutyInput;
      return sendApiJson<Duty>('PUT', `/duties/${dutyId}`, { unitId, startAt, endAt });
    },
    onSuccess: (savedDuty) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routeDuties(savedDuty.routeId) });
      // Asignar o mover un duty cambia qué unidades están libres.
      queryClient.invalidateQueries({ queryKey: queryKeys.unitAvailabilityRoot });
    },
  });
}
