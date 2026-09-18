// Define el formato de error uniforme de la api y la excepción que lo transporta.
// Cualquier error de negocio se lanza como ApiException para que el filtro global lo emita tal cual.
import { HttpException, HttpStatus } from '@nestjs/common';

/** Tipos de error estables que la interfaz puede usar para decidir qué mostrar. */
export const API_ERROR_TYPES = {
  validation: 'ValidationError',
  badRequest: 'BadRequest',
  invalidId: 'InvalidId',
  notFound: 'NotFound',
  duplicateKey: 'DuplicateKey',
  conflict: 'Conflict',
  scheduleBusy: 'ScheduleBusy',
  unitInUse: 'UnitInUse',
  payloadTooLarge: 'PayloadTooLarge',
  internal: 'InternalError',
  http: 'HttpError',
} as const;

export type ApiErrorType = (typeof API_ERROR_TYPES)[keyof typeof API_ERROR_TYPES];

/** Cuerpo de toda respuesta de error de la api. */
export interface ApiErrorBody {
  statusCode: number;
  error: ApiErrorType;
  message: string;
  details?: unknown;
}

/** Excepción HTTP que ya lleva el tipo de error y los detalles del formato uniforme. */
export class ApiException extends HttpException {
  readonly errorType: ApiErrorType;
  readonly details: unknown;

  /** Crea la excepción con su código de estado, tipo, mensaje legible y detalles opcionales. */
  constructor(statusCode: HttpStatus, errorType: ApiErrorType, message: string, details?: unknown) {
    super(message, statusCode);
    this.errorType = errorType;
    this.details = details;
  }

  /** Construye el cuerpo de respuesta en el formato uniforme de la api. */
  toBody(): ApiErrorBody {
    const body: ApiErrorBody = {
      statusCode: this.getStatus(),
      error: this.errorType,
      message: this.message,
    };

    if (this.details !== undefined) {
      body.details = this.details;
    }

    return body;
  }
}

/** Crea el error 404 estándar para un recurso que no existe. */
export function createNotFoundException(message: string): ApiException {
  return new ApiException(HttpStatus.NOT_FOUND, API_ERROR_TYPES.notFound, message);
}
