// Descripción para Swagger de las rutas tal como las devuelve la api. Solo documenta.
import { ApiProperty } from '@nestjs/swagger';
import { RoutePointDto } from './save-route.dto.js';

/** Resumen de una ruta para el listado, sin sus puntos. */
export class RouteSummaryResponse {
  @ApiProperty({ example: '6aac65212fc7bccc37c0ec84' })
  id: string;

  @ApiProperty({ example: 'Centro - Polanco' })
  name: string;

  @ApiProperty({ example: 5 })
  pointCount: number;

  @ApiProperty({ example: '2026-09-17T22:09:37.705Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-09-17T22:09:37.705Z' })
  updatedAt: string;
}

/** Ruta completa con sus puntos en orden. */
export class RouteResponse {
  @ApiProperty({ example: '6aac65212fc7bccc37c0ec84' })
  id: string;

  @ApiProperty({ example: 'Centro - Polanco' })
  name: string;

  @ApiProperty({ type: [RoutePointDto] })
  points: RoutePointDto[];

  @ApiProperty({ example: '2026-09-17T22:09:37.705Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-09-17T22:09:37.705Z' })
  updatedAt: string;
}
