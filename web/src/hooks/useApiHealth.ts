// Hook de lectura del estado de salud de la api.
import { useQuery } from '@tanstack/react-query';
import { requestApi } from '../api/client';

const HEALTH_REFRESH_INTERVAL_MS = 10_000;

/** Estado de salud que devuelve la api. */
export interface ApiHealth {
  status: 'ok';
  database: {
    isConnected: boolean;
    name: string;
    replicaSetName: string | null;
  };
}

/** Entrega el estado de salud de la api, refrescándolo periódicamente. */
export function useApiHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => requestApi<ApiHealth>('/health'),
    refetchInterval: HEALTH_REFRESH_INTERVAL_MS,
    retry: false,
  });
}
