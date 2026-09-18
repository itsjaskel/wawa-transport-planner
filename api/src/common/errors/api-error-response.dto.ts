// Descripción para Swagger del formato de error uniforme. Solo documenta: el cuerpo real lo construye
// `ApiException` y el filtro global.
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { API_ERROR_TYPES } from './api-exception.js';

/** Un campo que no pasó la validación, tal como aparece en `details`. */
export class InvalidFieldResponse {
  @ApiProperty({ example: 'points.3.lat', description: 'Ruta completa del campo.' })
  field: string;

  @ApiProperty({ example: ['La latitud debe estar entre -90 y 90.'] })
  messages: string[];
}

/** Cuerpo de toda respuesta de error de la api. */
export class ApiErrorResponse {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({
    enum: Object.values(API_ERROR_TYPES),
    example: API_ERROR_TYPES.validation,
    description: 'Tipo estable del error, para que el cliente decida qué mostrar.',
  })
  error: string;

  @ApiProperty({ example: 'Los datos enviados no son válidos.' })
  message: string;

  @ApiPropertyOptional({
    description:
      'Depende del tipo: lista de campos en ValidationError, `conflictingDuty` en Conflict, ' +
      '`{ dutyCount, routes }` en UnitInUse, los valores repetidos en DuplicateKey.',
    example: [{ field: 'name', messages: ['El nombre es obligatorio.'] }],
  })
  details?: unknown;
}
