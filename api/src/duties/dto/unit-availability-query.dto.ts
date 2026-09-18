// Parámetros de la consulta de disponibilidad de unidades: la ventana y, al editar un duty, cuál
// ignorar para que la unidad no aparezca ocupada por el propio duty que se está moviendo.
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional } from 'class-validator';
import { TimeWindowDto } from './time-window.dto.js';

/** Query de `GET /units/availability`. */
export class UnitAvailabilityQueryDto extends TimeWindowDto {
  @ApiPropertyOptional({
    example: '6aac95a364c3ed32f004fed0',
    description: 'Duty que no cuenta como ocupación (el que se está editando).',
  })
  @IsOptional()
  @IsMongoId({ message: 'El duty a ignorar debe ser un id válido.' })
  excludeDutyId?: string;
}
