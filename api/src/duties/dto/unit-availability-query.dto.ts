// Parámetros de la consulta de disponibilidad de unidades: la ventana y, al editar un duty, cuál
// ignorar para que la unidad no aparezca ocupada por el propio duty que se está moviendo.
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional } from 'class-validator';
import { WindowEndAtRules, WindowStartAtRules } from './time-window-rules.js';

// Tope de la ventana consultada: sin él, una consulta de 2000 a 2100 devolvería todos los duties
// de la base de una vez. Un año cubre de sobra cualquier planificación.
export const MAX_AVAILABILITY_WINDOW_DAYS = 366;

/** Query de `GET /units/availability`. El inicio puede estar en el pasado: consultar no crea nada. */
export class UnitAvailabilityQueryDto {
  @WindowStartAtRules()
  startAt: string;

  @WindowEndAtRules(MAX_AVAILABILITY_WINDOW_DAYS)
  endAt: string;

  @ApiPropertyOptional({
    example: '6aac95a364c3ed32f004fed0',
    description: 'Duty que no cuenta como ocupación (el que se está editando).',
  })
  @IsOptional()
  @IsMongoId({ message: 'El duty a ignorar debe ser un id válido.' })
  excludeDutyId?: string;
}
