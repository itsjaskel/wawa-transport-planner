// Hook de lectura de la disponibilidad de las unidades en una ventana de tiempo.
import { useQuery } from '@tanstack/react-query';
import { requestApi } from '../api/client';
import type { UnitAvailability } from '../api/types';
import { queryKeys } from './queryKeys';

/** Ventana consultada, con las fechas ya en ISO 8601 con zona. */
export interface AvailabilityWindow {
  startAt: string;
  endAt: string;
}

/** Entrega qué unidades están libres en la ventana; no consulta nada mientras no haya ventana válida. */
export function useUnitAvailability(
  availabilityWindow: AvailabilityWindow | null,
  excludeDutyId?: string,
) {
  const searchParams = new URLSearchParams();
  if (availabilityWindow) {
    // URLSearchParams codifica el `+` de un desfase positivo, que en una url significaría espacio.
    searchParams.set('startAt', availabilityWindow.startAt);
    searchParams.set('endAt', availabilityWindow.endAt);
  }
  if (excludeDutyId) {
    searchParams.set('excludeDutyId', excludeDutyId);
  }

  return useQuery({
    queryKey: queryKeys.unitAvailability(
      availabilityWindow?.startAt ?? '',
      availabilityWindow?.endAt ?? '',
      excludeDutyId,
    ),
    queryFn: () => requestApi<UnitAvailability[]>(`/units/availability?${searchParams}`),
    enabled: availabilityWindow !== null,
  });
}
