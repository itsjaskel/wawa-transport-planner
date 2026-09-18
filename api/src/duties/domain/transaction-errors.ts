// Traducción de los errores con que termina una transacción de MongoDB: si `withTransaction` agotó sus
// reintentos, se responde 503 con un mensaje claro en lugar de un 500 genérico.
import { HttpStatus } from '@nestjs/common';
import { API_ERROR_TYPES, ApiException } from '../../common/errors/api-exception.js';

// Etiquetas con que MongoDB marca los errores de una transacción que merecería reintentarse.
// Si llegan hasta aquí es que `withTransaction` agotó su ventana de reintentos (120 s).
const RETRYABLE_TRANSACTION_LABELS = [
  'TransientTransactionError',
  'UnknownTransactionCommitResult',
];
// Nombre del error con que el driver envuelve el vencimiento si se configura `timeoutMS`.
const TRANSACTION_TIMEOUT_ERROR_NAME = 'MongoOperationTimeoutError';

/** Forma mínima de un error del driver de MongoDB con etiquetas. */
interface LabeledMongoError {
  name: string;
  errorLabels?: string[];
}

/** Convierte el agotamiento de los reintentos de la transacción en un 503 claro; el resto de errores pasa intacto. */
export function translateTransactionError(error: unknown): unknown {
  if (error instanceof ApiException) {
    return error;
  }

  const isRetryExhausted = isRetryableTransactionError(error);
  if (!isRetryExhausted) {
    return error;
  }

  return new ApiException(
    HttpStatus.SERVICE_UNAVAILABLE,
    API_ERROR_TYPES.scheduleBusy,
    'La agenda de esta unidad está muy solicitada en este momento. Inténtalo de nuevo.',
  );
}

/** Indica si el error es de los que `withTransaction` reintenta, o su vencimiento por tiempo. */
function isRetryableTransactionError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const mongoError = error as LabeledMongoError;
  const isTimeout = mongoError.name === TRANSACTION_TIMEOUT_ERROR_NAME;
  const errorLabels = mongoError.errorLabels ?? [];
  const hasRetryableLabel = errorLabels.some((label) =>
    RETRYABLE_TRANSACTION_LABELS.includes(label),
  );

  return isTimeout || hasRetryableLabel;
}
