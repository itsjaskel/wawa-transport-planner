// Regla central del negocio: cuándo dos ventanas de tiempo de la misma unidad se solapan.
// La función pura y el filtro de MongoDB viven juntos para que se vea que son la misma condición.

/** Ventana de tiempo semiabierta: incluye el inicio y excluye el fin. */
export interface TimeWindow {
  startAt: Date;
  endAt: Date;
}

/** Indica si dos ventanas se solapan; las que solo se tocan en un extremo no cuentan. */
export function hasOverlap(existingWindow: TimeWindow, newWindow: TimeWindow): boolean {
  const existingStartsBeforeNewEnds = existingWindow.startAt < newWindow.endAt;
  const existingEndsAfterNewStarts = existingWindow.endAt > newWindow.startAt;
  return existingStartsBeforeNewEnds && existingEndsAfterNewStarts;
}

/** Filtro de MongoDB que encuentra los duties cuya ventana se solapa con la dada. */
export function buildOverlapFilter(newWindow: TimeWindow): Record<string, unknown> {
  // Es exactamente la condición de `hasOverlap`, escrita del lado del documento existente.
  // En ejecución se usa este filtro, no la función: si se cambia uno, hay que cambiar el otro.
  return {
    startAt: { $lt: newWindow.endAt },
    endAt: { $gt: newWindow.startAt },
  };
}
