// Descripción para Swagger de la disponibilidad de las unidades en una ventana. Solo documenta.
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Duty que ocupa a una unidad durante la ventana consultada. */
export class OccupyingDutyResponse {
  @ApiProperty({ example: '6aac95a364c3ed32f004fed0' })
  id: string;

  @ApiProperty({ example: '6aac65212fc7bccc37c0ec84' })
  routeId: string;

  @ApiProperty({ example: 'Centro - Polanco' })
  routeName: string;

  @ApiProperty({ example: '2030-03-15T14:00:00.000Z' })
  startAt: string;

  @ApiProperty({ example: '2030-03-15T18:00:00.000Z' })
  endAt: string;
}

/** Una unidad y si está libre en la ventana consultada. */
export class UnitAvailabilityResponse {
  @ApiProperty({ example: '6aac65212fc7bccc37c0ec81' })
  unitId: string;

  @ApiProperty({ example: 'BUS-001' })
  code: string;

  @ApiProperty({ example: 'Autobús 1' })
  name: string;

  @ApiProperty({ example: false })
  isAvailable: boolean;

  @ApiPropertyOptional({
    type: OccupyingDutyResponse,
    description: 'Presente solo si la unidad está ocupada: el primer duty que la ocupa.',
  })
  occupyingDuty?: OccupyingDutyResponse;
}
