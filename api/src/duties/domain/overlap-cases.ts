// Tabla de casos de solapamiento acordada. La comparten el test de la función pura y el
// test de integración, para que la consulta real se pruebe exactamente con los mismos casos.

/** Un caso de la tabla: la ventana nueva y si debe chocar con el duty existente. */
export interface OverlapCase {
  description: string;
  startAt: string;
  endAt: string;
  hasOverlap: boolean;
}

// Duty existente de referencia: de 10:00 a 12:00 (UTC) del 15 de marzo.
export const EXISTING_WINDOW = {
  startAt: '2030-03-15T10:00:00Z',
  endAt: '2030-03-15T12:00:00Z',
};

export const OVERLAP_CASES: OverlapCase[] = [
  {
    description: 'de 08:00 a 09:00, antes y sin tocarse',
    startAt: '2030-03-15T08:00:00Z',
    endAt: '2030-03-15T09:00:00Z',
    hasOverlap: false,
  },
  {
    description: 'de 08:00 a 10:00, solo se tocan al inicio',
    startAt: '2030-03-15T08:00:00Z',
    endAt: '2030-03-15T10:00:00Z',
    hasOverlap: false,
  },
  {
    description: 'de 08:00 a 11:00, pisa el inicio',
    startAt: '2030-03-15T08:00:00Z',
    endAt: '2030-03-15T11:00:00Z',
    hasOverlap: true,
  },
  {
    description: 'de 11:00 a 11:30, contenido dentro',
    startAt: '2030-03-15T11:00:00Z',
    endAt: '2030-03-15T11:30:00Z',
    hasOverlap: true,
  },
  {
    description: 'de 09:00 a 13:00, lo contiene',
    startAt: '2030-03-15T09:00:00Z',
    endAt: '2030-03-15T13:00:00Z',
    hasOverlap: true,
  },
  {
    description: 'de 11:00 a 13:00, pisa el fin',
    startAt: '2030-03-15T11:00:00Z',
    endAt: '2030-03-15T13:00:00Z',
    hasOverlap: true,
  },
  {
    description: 'de 10:00 a 12:00, idéntico',
    startAt: '2030-03-15T10:00:00Z',
    endAt: '2030-03-15T12:00:00Z',
    hasOverlap: true,
  },
  {
    description: 'de 12:00 a 14:00, solo se tocan al final',
    startAt: '2030-03-15T12:00:00Z',
    endAt: '2030-03-15T14:00:00Z',
    hasOverlap: false,
  },
  {
    description: 'de 23:00 del día anterior a 10:30, cruza la medianoche',
    startAt: '2030-03-14T23:00:00Z',
    endAt: '2030-03-15T10:30:00Z',
    hasOverlap: true,
  },
];
