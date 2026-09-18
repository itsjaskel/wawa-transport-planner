// Datos que acepta la api para editar un duty: la unidad y la ventana. La ruta no se cambia: un duty
// en otra ruta es otro duty.
import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';
import { DutyWindowDto } from './duty-window.dto.js';

/** Cuerpo de `PUT /duties/:id`: unidad y ventana nuevas, con zona horaria explícita. */
export class UpdateDutyDto extends DutyWindowDto {
  @ApiProperty({ example: '6aac65212fc7bccc37c0ec82' })
  @IsMongoId({ message: 'La unidad debe ser un id válido.' })
  unitId: string;
}
