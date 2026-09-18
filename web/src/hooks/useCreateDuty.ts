// Hook de asignación de duties.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendApiJson } from '../api/client';
import type { CreateDutyInput, Duty } from '../api/types';
import { queryKeys } from './queryKeys';

/** Asigna un duty y refresca los duties de su ruta; un solapamiento llega como ApiError 409. */
export function useCreateDuty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dutyInput: CreateDutyInput) => sendApiJson<Duty>('POST', '/duties', dutyInput),
    onSuccess: (createdDuty) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routeDuties(createdDuty.routeId) });
    },
  });
}
