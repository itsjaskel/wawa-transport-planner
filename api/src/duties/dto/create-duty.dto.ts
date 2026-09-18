// Datos que acepta la api para asignar una ruta a una unidad durante una ventana de tiempo.
import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';
import { DutyStartAtRules, WindowEndAtRules } from './time-window-rules.js';

/** Cuerpo de `POST /duties`: ruta, unidad y ventana de tiempo con zona horaria explícita. */
export class CreateDutyDto {
  @ApiProperty({ example: '6aac65212fc7bccc37c0ec84' })
  @IsMongoId({ message: 'La ruta debe ser un id válido.' })
  routeId: string;

  @ApiProperty({ example: '6aac65212fc7bccc37c0ec81' })
  @IsMongoId({ message: 'La unidad debe ser un id válido.' })
  unitId: string;

  @DutyStartAtRules()
  startAt: string;

  @WindowEndAtRules()
  endAt: string;
}
