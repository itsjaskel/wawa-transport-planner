// Ventana de tiempo que aceptan los endpoints de duties: inicio y fin en ISO 8601 con zona horaria
// obligatoria, y fin posterior al inicio. La validación de la ventana vive solo aquí.
import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, Matches, registerDecorator, type ValidationArguments } from 'class-validator';
import { END_AFTER_START_MESSAGE } from '../schemas/duty.schema.js';

// Exige zona explícita al final (`Z` o `±hh:mm`): sin ella, `2030-03-15T08:00` se
// interpretaría en la hora local del servidor y el duty quedaría desplazado.
const EXPLICIT_TIME_ZONE_PATTERN = /(Z|[+-]\d{2}:\d{2})$/;
const DATE_FORMAT_MESSAGE = 'Debe ser una fecha ISO 8601, por ejemplo 2030-03-15T08:00:00Z.';
const TIME_ZONE_MESSAGE = 'La fecha debe indicar su zona horaria, por ejemplo Z o -06:00.';

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
  @IsISO8601({ strict: true }, { message: DATE_FORMAT_MESSAGE })
  @Matches(EXPLICIT_TIME_ZONE_PATTERN, { message: TIME_ZONE_MESSAGE })
  startAt: string;

  @ApiProperty({
    example: '2030-03-15T12:00:00-06:00',
    description: 'Posterior a `startAt`. Excluido de la ventana: un duty puede empezar justo aquí.',
  })
  @IsISO8601({ strict: true }, { message: DATE_FORMAT_MESSAGE })
  @Matches(EXPLICIT_TIME_ZONE_PATTERN, { message: TIME_ZONE_MESSAGE })
  @IsAfterProperty('startAt', END_AFTER_START_MESSAGE)
  endAt: string;
}
