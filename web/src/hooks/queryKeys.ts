// Claves de TanStack Query en un solo sitio, para que lecturas y mutaciones usen exactamente las mismas.

export const queryKeys = {
  routes: ['routes'] as const,
  route: (routeId: string) => ['routes', routeId] as const,
  routeDuties: (routeId: string) => ['routes', routeId, 'duties'] as const,
  units: ['units'] as const,
  // Todas las consultas de disponibilidad cuelgan de esta raíz, para invalidarlas juntas.
  unitAvailabilityRoot: ['unit-availability'] as const,
  unitAvailability: (startAt: string, endAt: string, excludeDutyId: string | undefined) =>
    ['unit-availability', startAt, endAt, excludeDutyId ?? null] as const,
};
