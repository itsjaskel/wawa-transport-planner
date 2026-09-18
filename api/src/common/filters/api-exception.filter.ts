// Filtro global que convierte cualquier error en el formato uniforme de la api.
// Es la única salida de errores: nada llega al cliente con stack traces ni detalles internos.
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
// Mongoose es CommonJS: se usa el export por defecto para acceder a sus clases de error
// en ejecución. Ver la convención de imports en CLAUDE.md.
import mongoose from 'mongoose';
import {
  API_ERROR_TYPES,
  ApiException,
  type ApiErrorBody,
  type ApiErrorType,
} from '../errors/api-exception.js';
import type { InvalidField } from '../errors/validation-errors.js';

// Código que MongoDB devuelve al violar un índice único.
const MONGO_DUPLICATE_KEY_CODE = 11000;

const INTERNAL_ERROR_MESSAGE = 'Ocurrió un error inesperado. Inténtalo de nuevo más tarde.';

/** Tipo y mensaje en español con que se responde a un error HTTP que no lanzamos nosotros. */
interface ForeignHttpErrorTranslation {
  errorType: ApiErrorType;
  message: string;
}

// Las excepciones HTTP ajenas (las que genera Nest o Express, no nuestro código) traen mensajes
// internos en inglés, como "Cannot GET /api/nada" o el error del parser de JSON. Se sustituyen
// por un tipo y un mensaje propios según el código de estado.
const FOREIGN_HTTP_ERROR_BY_STATUS: Partial<Record<number, ForeignHttpErrorTranslation>> = {
  [HttpStatus.BAD_REQUEST]: {
    errorType: API_ERROR_TYPES.badRequest,
    message: 'La petición no es válida. Revisa que el cuerpo sea un JSON bien formado.',
  },
  [HttpStatus.NOT_FOUND]: {
    errorType: API_ERROR_TYPES.notFound,
    message: 'El endpoint solicitado no existe.',
  },
  [HttpStatus.PAYLOAD_TOO_LARGE]: {
    errorType: API_ERROR_TYPES.payloadTooLarge,
    message: 'El cuerpo de la petición supera el tamaño máximo permitido.',
  },
};

/** Forma mínima del error de clave duplicada del driver de MongoDB. */
interface MongoDuplicateKeyError {
  code: number;
  keyValue?: Record<string, unknown>;
}

/**
 * Forma mínima de los errores del body parser de Express (paquete `http-errors`). No son
 * `HttpException` de Nest: sin reconocerlos, un cuerpo demasiado grande acababa en 500.
 */
interface BodyParserError {
  status: number;
  type: string;
}

/** Captura todas las excepciones y responde siempre con el formato uniforme de error. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  /** Traduce la excepción al formato uniforme y la envía como respuesta HTTP. */
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const errorBody = this.buildErrorBody(exception);
    response.status(errorBody.statusCode).json(errorBody);
  }

  /** Elige la traducción adecuada según la familia del error. */
  private buildErrorBody(exception: unknown): ApiErrorBody {
    if (exception instanceof ApiException) {
      return exception.toBody();
    }

    if (exception instanceof HttpException) {
      return this.buildForeignHttpErrorBody(exception.getStatus(), exception.message);
    }

    if (isBodyParserError(exception)) {
      return this.buildForeignHttpErrorBody(exception.status, INTERNAL_ERROR_MESSAGE);
    }

    if (exception instanceof mongoose.Error.CastError) {
      return this.buildCastErrorBody(exception);
    }

    if (exception instanceof mongoose.Error.ValidationError) {
      return this.buildSchemaValidationErrorBody(exception);
    }

    if (isMongoDuplicateKeyError(exception)) {
      return this.buildDuplicateKeyErrorBody(exception);
    }

    return this.buildInternalErrorBody(exception);
  }

  /** Traduce un error HTTP que no lanzamos nosotros; si su código no está previsto, conserva el mensaje original. */
  private buildForeignHttpErrorBody(statusCode: number, originalMessage: string): ApiErrorBody {
    const translation = FOREIGN_HTTP_ERROR_BY_STATUS[statusCode];

    if (!translation) {
      return { statusCode, error: API_ERROR_TYPES.http, message: originalMessage };
    }

    return { statusCode, error: translation.errorType, message: translation.message };
  }

  /** Traduce un valor que Mongoose no pudo convertir (normalmente un id mal formado) a 400. */
  private buildCastErrorBody(
    exception: InstanceType<typeof mongoose.Error.CastError>,
  ): ApiErrorBody {
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      error: API_ERROR_TYPES.invalidId,
      message: `El valor del campo "${exception.path}" no tiene un formato válido.`,
    };
  }

  /** Traduce un error de validación del esquema de Mongoose a 400 con la lista de campos. */
  private buildSchemaValidationErrorBody(
    exception: InstanceType<typeof mongoose.Error.ValidationError>,
  ): ApiErrorBody {
    const invalidFields: InvalidField[] = Object.entries(exception.errors).map(
      ([fieldPath, fieldError]) => ({ field: fieldPath, messages: [fieldError.message] }),
    );

    return {
      statusCode: HttpStatus.BAD_REQUEST,
      error: API_ERROR_TYPES.validation,
      message: 'Los datos enviados no son válidos.',
      details: invalidFields,
    };
  }

  /** Traduce la violación de un índice único a 409, indicando qué campos chocaron. */
  private buildDuplicateKeyErrorBody(exception: MongoDuplicateKeyError): ApiErrorBody {
    const duplicatedFields = Object.keys(exception.keyValue ?? {});

    return {
      statusCode: HttpStatus.CONFLICT,
      error: API_ERROR_TYPES.duplicateKey,
      message: `Ya existe un registro con el mismo valor en: ${duplicatedFields.join(', ')}.`,
      details: exception.keyValue,
    };
  }

  /** Registra el error completo en el log y responde 500 sin exponer detalles internos. */
  private buildInternalErrorBody(exception: unknown): ApiErrorBody {
    this.logger.error(exception instanceof Error ? exception.stack : String(exception));

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: API_ERROR_TYPES.internal,
      message: INTERNAL_ERROR_MESSAGE,
    };
  }
}

/** Indica si el error lo lanzó el body parser de Express al leer el cuerpo de la petición. */
function isBodyParserError(exception: unknown): exception is BodyParserError {
  if (typeof exception !== 'object' || exception === null) {
    return false;
  }

  const hasHttpStatus = 'status' in exception && typeof exception.status === 'number';
  // body-parser marca todos sus errores con un `type` que empieza por "entity."
  // (`entity.too.large`, `entity.parse.failed`...).
  const hasBodyParserType =
    'type' in exception &&
    typeof exception.type === 'string' &&
    exception.type.startsWith('entity.');

  return hasHttpStatus && hasBodyParserType;
}

/** Indica si el error es la violación de un índice único de MongoDB. */
function isMongoDuplicateKeyError(exception: unknown): exception is MongoDuplicateKeyError {
  const hasErrorCode = typeof exception === 'object' && exception !== null && 'code' in exception;
  return hasErrorCode && exception.code === MONGO_DUPLICATE_KEY_CODE;
}
