// Ventana de tiempo que aceptan los endpoints de duties: inicio y fin en ISO 8601 con zona horaria
// obligatoria, y fin posterior al inicio. La validación de la ventana vive solo aquí.
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

// Límites de sentido común para una agenda de flota. Un campo de fecha a medio escribir en el navegador
// deja años como 0026 (se tecleó "26"); sin este límite, ese duty se guardaría en el año 26.
// Una fecha ISO completa con zona mide 29 caracteres (`2030-03-15T08:00:00.000-06:00`); el margen cubre
// años de 6 dígitos o más decimales. Sin este límite se aceptaban cadenas de cualquier longitud.
export const MAX_DATE_TEXT_LENGTH = 35;
const DATE_LENGTH_MESSAGE = `La fecha admite como máximo ${MAX_DATE_TEXT_LENGTH} caracteres.`;

export const MIN_SUPPORTED_YEAR = 2000;
export const MAX_SUPPORTED_YEAR = 2100;
const SUPPORTED_YEAR_MESSAGE = `El año debe estar entre ${MIN_SUPPORTED_YEAR} y ${MAX_SUPPORTED_YEAR}.`;
// El año tal como está escrito, al principio de la fecha (ISO 8601 admite años de hasta 6 dígitos).
const LEADING_YEAR_PATTERN = /^[+-]?(\d{4,6})-/;

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

/** Valida que la propiedad sea una fecha posterior a la de la propiedad indicada. */
function IsAfterProperty(startPropertyName: string, message: string): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isAfterProperty',
      target: target.constructor,
      propertyName: String(propertyName),
      constraints: [startPropertyName],
      options: { message },
      validator: {
        /** Indica si la fecha es posterior a la de inicio; si alguna no es válida, lo deja a los otros validadores. */
        validate(endValue: unknown, validationArguments: ValidationArguments): boolean {
          const dto = validationArguments.object as Record<string, unknown>;
          const endTime = Date.parse(String(endValue));
          const startTime = Date.parse(String(dto[startPropertyName]));
          const areBothValidDates = !Number.isNaN(endTime) && !Number.isNaN(startTime);

          if (!areBothValidDates) {
            return true;
          }
          return endTime > startTime;
        },
      },
    });
  };
}

/** Inicio y fin de una ventana semiabierta, con zona horaria explícita y el fin posterior al inicio. */
export class TimeWindowDto {
  @ApiProperty({
    example: '2030-03-15T08:00:00-06:00',
    description: 'ISO 8601 con zona horaria obligatoria (`Z` o `±hh:mm`). Incluido en la ventana.',
  })
  @MaxLength(MAX_DATE_TEXT_LENGTH, { message: DATE_LENGTH_MESSAGE })
  @IsISO8601({ strict: true }, { message: DATE_FORMAT_MESSAGE })
  @Matches(EXPLICIT_TIME_ZONE_PATTERN, { message: TIME_ZONE_MESSAGE })
  @IsWithinSupportedYears()
  startAt: string;

  @ApiProperty({
    example: '2030-03-15T12:00:00-06:00',
    description: 'Posterior a `startAt`. Excluido de la ventana: un duty puede empezar justo aquí.',
  })
  @MaxLength(MAX_DATE_TEXT_LENGTH, { message: DATE_LENGTH_MESSAGE })
  @IsISO8601({ strict: true }, { message: DATE_FORMAT_MESSAGE })
  @Matches(EXPLICIT_TIME_ZONE_PATTERN, { message: TIME_ZONE_MESSAGE })
  @IsWithinSupportedYears()
  @IsAfterProperty('startAt', END_AFTER_START_MESSAGE)
  endAt: string;
}
