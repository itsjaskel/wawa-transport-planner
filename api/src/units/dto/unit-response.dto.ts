// Descripción para Swagger de una unidad tal como la devuelve la api. Solo documenta: la respuesta
// real es el documento con `toJSON` (sin `_id`, `__v` ni `scheduleVersion`).
import { ApiProperty } from '@nestjs/swagger';

/** Datos de una unidad que aparecen dentro de otras respuestas. */
export class UnitSummaryResponse {
  @ApiProperty({ example: '6aac65212fc7bccc37c0ec81' })
  id: string;

  @ApiProperty({ example: 'BUS-001' })
  code: string;

  @ApiProperty({ example: 'Autobús 1' })
  name: string;
}

/** Una unidad de la flota. */
export class UnitResponse extends UnitSummaryResponse {
  @ApiProperty({ example: '2026-09-17T22:09:37.660Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-09-17T22:09:37.660Z' })
  updatedAt: string;
}
