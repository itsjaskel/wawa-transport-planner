// Hook de escritura de rutas: crea una nueva o reemplaza una existente.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendApiJson } from '../api/client';
import type { Route, SaveRouteInput } from '../api/types';
import { queryKeys } from './queryKeys';

/** Guarda una ruta: la crea si no hay id y la reemplaza si lo hay; al terminar refresca el listado y el detalle. */
export function useSaveRoute(routeId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (routeInput: SaveRouteInput) => {
      if (routeId === undefined) {
        return sendApiJson<Route>('POST', '/routes', routeInput);
      }
      return sendApiJson<Route>('PUT', `/routes/${routeId}`, routeInput);
    },
    onSuccess: (savedRoute) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routes });
      queryClient.setQueryData(queryKeys.route(savedRoute.id), savedRoute);
    },
  });
}
