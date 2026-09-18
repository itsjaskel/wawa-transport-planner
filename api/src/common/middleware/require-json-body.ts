// Rechaza con 415 las peticiones con cuerpo que no llegan como JSON. Sin esto, la api aceptaba también
// formularios (`application/x-www-form-urlencoded`), y un formulario de cualquier web ajena puede
// enviarse desde el navegador de otra persona SIN la comprobación previa de CORS, que el navegador
// solo hace con tipos de contenido como JSON.
import { HttpStatus } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { API_ERROR_TYPES, ApiException } from '../errors/api-exception.js';

const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH']);
const JSON_CONTENT_TYPE = 'application/json';

/** Deja pasar las peticiones sin cuerpo o con cuerpo JSON; al resto las rechaza con 415. */
export function requireJsonBody(request: Request, _response: Response, next: NextFunction): void {
  const carriesBody = METHODS_WITH_BODY.has(request.method);
  // `request.is` acepta también variantes como `application/json; charset=utf-8`.
  const isJsonBody = request.is(JSON_CONTENT_TYPE) === JSON_CONTENT_TYPE;

  if (!carriesBody || isJsonBody) {
    next();
    return;
  }

  next(
    new ApiException(
      HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      API_ERROR_TYPES.unsupportedMediaType,
      'El cuerpo de la petición debe enviarse como JSON (Content-Type: application/json).',
    ),
  );
}
