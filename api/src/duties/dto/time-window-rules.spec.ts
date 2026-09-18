// Comprueba que los TRES dtos con ventana (crear duty, editar duty, consultar disponibilidad) aplican
// todas las reglas de sus fechas. Existe porque una subclase que añadía una regla a un campo heredado
// hacía perder en silencio todas las demás reglas de ese campo (CLAUDE.md, error 17).
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateDutyDto } from './create-duty.dto.js';
import { UnitAvailabilityQueryDto } from './unit-availability-query.dto.js';
import { UpdateDutyDto } from './update-duty.dto.js';

const VALID_ID = '65f1a2b3c4d5e6f7a8b9c0d1';
const VALID_WINDOW = { startAt: '2030-03-15T10:00:00Z', endAt: '2030-03-15T12:00:00Z' };

// Cualquier clase de dto: basta con que se pueda construir sin argumentos.
type WindowDtoClass = new () => object;

const WINDOW_DTOS: [string, WindowDtoClass, Record<string, string>][] = [
  ['crear duty', CreateDutyDto, { routeId: VALID_ID, unitId: VALID_ID }],
  ['editar duty', UpdateDutyDto, { unitId: VALID_ID }],
  ['consultar disponibilidad', UnitAvailabilityQueryDto, {}],
];

/** Casos que TODO dto con ventana debe rechazar, con el campo que debe señalar. */
const INVALID_WINDOWS: [string, Record<string, string>, string][] = [
  ['inicio sin zona horaria', { startAt: '2030-03-15T10:00:00' }, 'startAt'],
  ['fin sin zona horaria', { endAt: '2030-03-15T12:00:00' }, 'endAt'],
  ['inicio que no es una fecha', { startAt: 'mañana' }, 'startAt'],
  ['fin que no es una fecha', { endAt: 'luego' }, 'endAt'],
  ['inicio demasiado largo', { startAt: `2030-03-15T10:00:00.${'0'.repeat(40)}Z` }, 'startAt'],
  ['fin demasiado largo', { endAt: `2030-03-15T12:00:00.${'0'.repeat(40)}Z` }, 'endAt'],
  [
    'año del inicio fuera de rango',
    { startAt: '2200-03-15T10:00:00Z', endAt: '2200-03-15T12:00:00Z' },
    'startAt',
  ],
  ['año del fin fuera de rango', { endAt: '0030-03-15T12:00:00Z' }, 'endAt'],
  ['fin anterior al inicio', { endAt: '2030-03-15T09:00:00Z' }, 'endAt'],
  ['fin igual al inicio', { endAt: '2030-03-15T10:00:00Z' }, 'endAt'],
];

/** Valida un dto construido a partir de un objeto plano y devuelve los campos con error. */
function readInvalidFields(
  dtoClass: WindowDtoClass,
  plainValues: Record<string, string>,
): string[] {
  const dto = plainToInstance(dtoClass, plainValues);
  return validateSync(dto).map((validationError) => validationError.property);
}

describe.each(WINDOW_DTOS)(
  'reglas de la ventana en el dto de %s',
  (_name, dtoClass, extraFields) => {
    it('acepta una ventana válida', () => {
      expect(readInvalidFields(dtoClass, { ...extraFields, ...VALID_WINDOW })).toEqual([]);
    });

    it.each(INVALID_WINDOWS)('rechaza %s', (_description, windowOverrides, expectedField) => {
      const invalidFields = readInvalidFields(dtoClass, {
        ...extraFields,
        ...VALID_WINDOW,
        ...windowOverrides,
      });
      expect(invalidFields).toContain(expectedField);
    });
  },
);

describe('reglas propias de cada dto', () => {
  const pastWindow = { startAt: '2020-03-15T10:00:00Z', endAt: '2020-03-15T12:00:00Z' };

  it('crear y editar un duty rechazan un inicio en el pasado', () => {
    expect(
      readInvalidFields(CreateDutyDto, { routeId: VALID_ID, unitId: VALID_ID, ...pastWindow }),
    ).toContain('startAt');
    expect(readInvalidFields(UpdateDutyDto, { unitId: VALID_ID, ...pastWindow })).toContain(
      'startAt',
    );
  });

  it('consultar la disponibilidad acepta un horario pasado', () => {
    expect(readInvalidFields(UnitAvailabilityQueryDto, pastWindow)).toEqual([]);
  });

  it('consultar la disponibilidad rechaza una ventana de más de 366 días', () => {
    const tooLongWindow = { startAt: '2030-01-01T00:00:00Z', endAt: '2031-01-03T00:00:00Z' };
    expect(readInvalidFields(UnitAvailabilityQueryDto, tooLongWindow)).toContain('endAt');
  });
});
