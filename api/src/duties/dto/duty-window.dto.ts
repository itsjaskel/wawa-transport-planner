// Ventana de un duty que se crea o se edita: la de `TimeWindowDto` más la regla de que el inicio no
// puede estar en el pasado. La consulta de disponibilidad usa `TimeWindowDto` a secas: consultar un
// horario pasado no crea nada.
import { ApiProperty } from '@nestjs/swagger';
import { registerDecorator } from 'class-validator';
import { TimeWindowDto } from './time-window.dto.js';

const MS_PER_MINUTE = 60_000;
const START_IN_PAST_MESSAGE = 'El inicio no puede estar en el pasado.';

/** Devuelve el comienzo del minuto actual: los campos de fecha no tienen segundos. */
function readStartOfCurrentMinute(): number {
  return Math.floor(Date.now() / MS_PER_MINUTE) * MS_PER_MINUTE;
}

/** Valida que la fecha no sea anterior al minuto actual. */
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
          // Se compara con el comienzo del minuto: si alguien elige "ahora" (10:15) a las 10:15:40,
          // el inicio es válido.
          return dateTime >= readStartOfCurrentMinute();
        },
      },
    });
  };
}

/** Ventana de un duty nuevo o editado: como `TimeWindowDto`, y además con el inicio no en el pasado. */
export class DutyWindowDto extends TimeWindowDto {
  @ApiProperty({
    example: '2030-03-15T08:00:00-06:00',
    description:
      'ISO 8601 con zona horaria obligatoria. Incluido en la ventana. No puede ser anterior al ' +
      'minuto actual.',
  })
  @IsNotBeforeCurrentMinute()
  declare startAt: string;
}
