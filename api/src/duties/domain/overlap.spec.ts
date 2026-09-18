// Comprueba la regla de solapamiento con la tabla de casos acordada, en la función pura
// y en el filtro de MongoDB evaluado a mano sobre el mismo duty existente.
import { EXISTING_WINDOW, OVERLAP_CASES } from './overlap-cases.js';
import { buildOverlapFilter, hasOverlap, type TimeWindow } from './overlap.js';

/** Convierte las fechas en texto de la tabla a una ventana con fechas reales. */
function toTimeWindow(textWindow: { startAt: string; endAt: string }): TimeWindow {
  return { startAt: new Date(textWindow.startAt), endAt: new Date(textWindow.endAt) };
}

/** Evalúa el filtro de Mongo contra un documento, interpretando solo `$lt` y `$gt`. */
function matchesOverlapFilter(filter: Record<string, unknown>, document: TimeWindow): boolean {
  const startAtCondition = filter.startAt as { $lt: Date };
  const endAtCondition = filter.endAt as { $gt: Date };
  return document.startAt < startAtCondition.$lt && document.endAt > endAtCondition.$gt;
}

const existingWindow = toTimeWindow(EXISTING_WINDOW);

describe('hasOverlap con un duty existente de 10:00 a 12:00', () => {
  it.each(OVERLAP_CASES)('un duty nuevo $description → solapa: $hasOverlap', (overlapCase) => {
    const newWindow = toTimeWindow(overlapCase);
    expect(hasOverlap(existingWindow, newWindow)).toBe(overlapCase.hasOverlap);
  });
});

describe('buildOverlapFilter replica la misma condición que hasOverlap', () => {
  it.each(OVERLAP_CASES)('un duty nuevo $description → solapa: $hasOverlap', (overlapCase) => {
    const overlapFilter = buildOverlapFilter(toTimeWindow(overlapCase));
    expect(matchesOverlapFilter(overlapFilter, existingWindow)).toBe(overlapCase.hasOverlap);
  });
});
