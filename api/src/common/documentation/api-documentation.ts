// Documentación Swagger de la api: montaje de la página en `/api/docs` y un atajo para declarar las
// respuestas de error de cada endpoint con el formato uniforme.
import { applyDecorators, HttpStatus } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ApiResponse, DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ApiErrorResponse } from '../errors/api-error-response.dto.js';

// Ruta absoluta: Swagger no aplica el prefijo global `api`, así que se incluye aquí.
const API_DOCUMENTATION_PATH = 'api/docs';

const ERROR_DESCRIPTIONS: Partial<Record<HttpStatus, string>> = {
  [HttpStatus.BAD_REQUEST]: 'Datos o id con formato inválido (`ValidationError`, `InvalidId`).',
  [HttpStatus.NOT_FOUND]: 'El recurso no existe (`NotFound`).',
  [HttpStatus.CONFLICT]: 'Conflicto con el estado actual (ver `error` y `details`).',
  [HttpStatus.SERVICE_UNAVAILABLE]:
    'La agenda de la unidad está tan disputada que se agotaron los reintentos (`ScheduleBusy`).',
};

/** Monta la documentación interactiva de la api en `/api/docs` (y el JSON en `/api/docs-json`). */
export function setupApiDocumentation(app: INestApplication): void {
  const documentConfig = new DocumentBuilder()
    .setTitle('Rumb@ api')
    .setDescription(
      'Planificación de rutas, unidades y duties. Una misma unidad nunca puede tener dos duties ' +
        'cuyas ventanas se solapen; los intervalos son semiabiertos (un duty que termina a las 10:00 ' +
        'no choca con uno que empieza a las 10:00). Las fechas se envían en ISO 8601 con zona ' +
        'horaria y se devuelven en UTC.',
    )
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, documentConfig, {
    // Por defecto Swagger etiqueta cada endpoint con el nombre de su controlador, además de las
    // etiquetas explícitas; como el controlador de duties sirve también `units/:id`, las mezclaría.
    autoTagControllers: false,
  });
  SwaggerModule.setup(API_DOCUMENTATION_PATH, app, document);
}

/** Documenta las respuestas de error indicadas con el cuerpo de error uniforme de la api. */
export function ApiErrorResponses(...statusCodes: HttpStatus[]): MethodDecorator & ClassDecorator {
  const errorResponseDecorators = statusCodes.map((statusCode) =>
    ApiResponse({
      status: statusCode,
      description: ERROR_DESCRIPTIONS[statusCode],
      type: ApiErrorResponse,
    }),
  );
  return applyDecorators(...errorResponseDecorators);
}
