// Reglas de validación de las fechas de una ventana (inicio y fin), agrupadas para que cada dto las
// aplique a SUS PROPIOS campos. No se usa herencia de dtos a propósito: si una subclase añade una
// regla a un campo heredado, class-validator descarta todas las reglas heredadas de ese campo (ver
// CLAUDE.md, error 17), y el campo queda casi sin validar sin que nada avise.
import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsISO8601,
  Matches,
  MaxLength,
  registerDecorator,
  type ValidationArguments,
} from 'class-validator';
import { END_AFTER_START_MESSAGE } from '../schemas/duty.schema.js';

// Exige zona explícita al final (`Z` o `±hh:mm`): sin ella, `2030-03-15T08:00` se
// interpretaría en la hora local del servidor y el duty quedaría desplazado.
const EXPLICIT_TIME_ZONE_PATTERN = /(Z|[+-]\d{2}:\d{2})$/;
const DATE_FORMAT_MESSAGE = 'Debe ser una fecha ISO 8601, por ejemplo 2030-03-15T08:00:00Z.';
const TIME_ZONE_MESSAGE = 'La fecha debe indicar su zona horaria, por ejemplo Z o -06:00.';

// Una fecha ISO completa con zona mide 29 caracteres (`2030-03-15T08:00:00.000-06:00`); el margen cubre
// años de 6 dígitos o más decimales. Sin este límite se aceptaban cadenas de cualquier longitud.
export const MAX_DATE_TEXT_LENGTH = 35;
const DATE_LENGTH_MESSAGE = `La fecha admite como máximo ${MAX_DATE_TEXT_LENGTH} caracteres.`;

// Límites de sentido común para una agenda de flota. Un campo de fecha a medio escribir en el navegador
// deja años como 0026 (se tecleó "26"); sin este límite, ese duty se guardaría en el año 26.
export const MIN_SUPPORTED_YEAR = 2000;
export const MAX_SUPPORTED_YEAR = 2100;
const SUPPORTED_YEAR_MESSAGE = `El año debe estar entre ${MIN_SUPPORTED_YEAR} y ${MAX_SUPPORTED_YEAR}.`;
// El año tal como está escrito, al principio de la fecha (ISO 8601 admite años de hasta 6 dígitos).
const LEADING_YEAR_PATTERN = /^[+-]?(\d{4,6})-/;

const START_IN_PAST_MESSAGE = 'El inicio no puede estar en el pasado.';
const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;

/** Valida que el año escrito al principio de la fecha esté dentro de los límites razonables. */
function IsWithinSupportedYears(): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isWithinSupportedYears',
      target: target.constructor,
      propertyName: String(propertyName),
      options: { message: SUPPORTED_YEAR_MESSAGE },
      validator: {
        /** Indica si el año está en rango; si la fecha no tiene forma de fecha, lo deja a los otros validadores. */
        validate(dateValue: unknown): boolean {
          const match = LEADING_YEAR_PATTERN.exec(String(dateValue));
          if (!match) {
            return true;
          }
          const year = Number(match[1]);
          return year >= MIN_SUPPORTED_YEAR && year <= MAX_SUPPORTED_YEAR;
        },
      },
    });
  };
}

/** Valida que la fecha no sea anterior al comienzo del minuto actual. */
function IsNotBeforeCurrentMinute(): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isNotBeforeCurrentMinute',
      target: target.constructor,
      propertyName: String(propertyName),
      options: { message: START_IN_PAST_MESSAGE },
      validator: {
        /** Indica si la fecha es del minuto actual o posterior; si no es una fecha, lo deja a los otros validadores. */
        validate(dateValue: unknown): boolean {
          const dateTime = Date.parse(String(dateValue));
          if (Number.isNaN(dateTime)) {
            return true;
          }
          // Se compara con el comienzo del minuto: los campos de fecha no tienen segundos, y quien
          // elige "ahora" (10:15) a las 10:15:40 debe poder hacerlo.
          const startOfCurrentMinute = Math.floor(Date.now() / MS_PER_MINUTE) * MS_PER_MINUTE;
          return dateTime >= startOfCurrentMinute;
        },
      },
    });
  };
}

/** Valida que la fecha sea posterior a la de `startAt` y, si se indica, no más de `maxDays` días después. */
function IsAfterStart(maxDays: number | undefined): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isAfterStart',
      target: target.constructor,
      propertyName: String(propertyName),
      validator: {
        /** Indica si la ventana es válida; si alguna fecha no se puede leer, lo deja a los otros validadores. */
        validate(endValue: unknown, validationArguments: ValidationArguments): boolean {
          const dto = validationArguments.object as Record<string, unknown>;
          const endTime = Date.parse(String(endValue));
          const startTime = Date.parse(String(dto.startAt));
          const areBothValidDates = !Number.isNaN(endTime) && !Number.isNaN(startTime);
          if (!areBothValidDates) {
            return true;
          }
          const endsAfterStart = endTime > startTime;
          const fitsMaxDays = maxDays === undefined || endTime - startTime <= maxDays * MS_PER_DAY;
          return endsAfterStart && fitsMaxDays;
        },
        /** Explica cuál de las dos condiciones falló. */
        defaultMessage(validationArguments?: ValidationArguments): string {
          const dto = (validationArguments?.object ?? {}) as Record<string, unknown>;
          const endsAfterStart =
            Date.parse(String(validationArguments?.value)) > Date.parse(String(dto.startAt));
          if (!endsAfterStart) {
            return END_AFTER_START_MESSAGE;
          }
          return `La ventana consultada no puede durar más de ${maxDays} días.`;
        },
      },
    });
  };
}

/** Reglas comunes a cualquier fecha de una ventana: longitud, formato ISO, zona y año razonable. */
function commonDateRules(): PropertyDecorator[] {
  return [
    MaxLength(MAX_DATE_TEXT_LENGTH, { message: DATE_LENGTH_MESSAGE }),
    IsISO8601({ strict: true }, { message: DATE_FORMAT_MESSAGE }),
    Matches(EXPLICIT_TIME_ZONE_PATTERN, { message: TIME_ZONE_MESSAGE }),
    IsWithinSupportedYears(),
  ];
}

/** Reglas del inicio de una ventana que solo se consulta: puede estar en el pasado. */
export function WindowStartAtRules() {
  return applyDecorators(
    ApiProperty({
      example: '2030-03-15T08:00:00-06:00',
      description:
        'ISO 8601 con zona horaria obligatoria (`Z` o `±hh:mm`). Incluido en la ventana.',
    }),
    ...commonDateRules(),
  );
}

/** Reglas del inicio de un duty que se crea o se edita: además, no puede estar en el pasado. */
export function DutyStartAtRules() {
  return applyDecorators(
    ApiProperty({
      example: '2030-03-15T08:00:00-06:00',
      description:
        'ISO 8601 con zona horaria obligatoria (`Z` o `±hh:mm`). Incluido en la ventana. No puede ' +
        'ser anterior al minuto actual.',
    }),
    ...commonDateRules(),
    IsNotBeforeCurrentMinute(),
  );
}

/** Reglas del fin de una ventana: posterior al inicio y, si se indica, como mucho `maxDays` días después. */
export function WindowEndAtRules(maxDays?: number) {
  let description =
    'Posterior a `startAt`. Excluido de la ventana: un duty puede empezar justo aquí.';
  if (maxDays !== undefined) {
    description = `Posterior a \`startAt\` y como mucho ${maxDays} días después.`;
  }
  return applyDecorators(
    ApiProperty({ example: '2030-03-15T12:00:00-06:00', description }),
    ...commonDateRules(),
    IsAfterStart(maxDays),
  );
}
