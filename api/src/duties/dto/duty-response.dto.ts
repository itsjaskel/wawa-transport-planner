// Descripción para Swagger de los duties tal como los devuelve la api. Solo documenta.
import { ApiProperty } from '@nestjs/swagger';
import { UnitSummaryResponse } from '../../units/dto/unit-response.dto.js';

/** Un duty: una ruta cubierta por una unidad durante una ventana, con las fechas en UTC. */
export class DutyResponse {
  @ApiProperty({ example: '6aac95a364c3ed32f004fed0' })
  id: string;

  @ApiProperty({ example: '6aac65212fc7bccc37c0ec84' })
  routeId: string;

  @ApiProperty({ example: '6aac65212fc7bccc37c0ec81' })
  unitId: string;

  @ApiProperty({ example: '2030-03-15T14:00:00.000Z' })
  startAt: string;

  @ApiProperty({ example: '2030-03-15T18:00:00.000Z' })
  endAt: string;

  @ApiProperty({ example: '2026-09-18T01:36:35.540Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-09-18T01:36:35.540Z' })
  updatedAt: string;
}

/** Duty del listado de una ruta, con los datos de su unidad. */
export class RouteDutyResponse extends DutyResponse {
  @ApiProperty({ type: UnitSummaryResponse })
  unit: UnitSummaryResponse;
}
