// Claves de TanStack Query en un solo sitio, para que lecturas y mutaciones usen exactamente las mismas.

export const queryKeys = {
  routes: ['routes'] as const,
  route: (routeId: string) => ['routes', routeId] as const,
  routeDuties: (routeId: string) => ['routes', routeId, 'duties'] as const,
  units: ['units'] as const,
};
