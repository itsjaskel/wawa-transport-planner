// Comprueba la traducción de los errores de una transacción: el agotamiento de reintentos se convierte
// en 503 ScheduleBusy y el resto de errores pasa sin tocar. Se usan errores fabricados con las mismas
// etiquetas que pone el driver de MongoDB, porque provocar 120 s de contención real no es razonable.
import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../../common/errors/api-exception.js';
import { translateTransactionError } from './transaction-errors.js';

/** Crea un error como los del driver de MongoDB, con nombre y etiquetas. */
function createDriverError(name: string, errorLabels: string[]): Error {
  return Object.assign(new Error('fallo del driver'), { name, errorLabels });
}

describe('translateTransactionError', () => {
  it.each([
    [
      'un conflicto transitorio',
      createDriverError('MongoServerError', ['TransientTransactionError']),
    ],
    [
      'un resultado de confirmación desconocido',
      createDriverError('MongoServerError', ['UnknownTransactionCommitResult']),
    ],
    ['el vencimiento con timeoutMS', createDriverError('MongoOperationTimeoutError', [])],
  ])('convierte %s que agotó los reintentos en 503 ScheduleBusy', (_description, driverError) => {
    const translatedError = translateTransactionError(driverError);

    expect(translatedError).toBeInstanceOf(ApiException);
    const apiException = translatedError as ApiException;
    expect(apiException.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    expect(apiException.toBody().error).toBe('ScheduleBusy');
  });

  it('deja pasar sin tocar un error de negocio (por ejemplo, el 409 de solapamiento)', () => {
    const conflict = new ApiException(HttpStatus.CONFLICT, 'Conflict', 'Se solapa');
    expect(translateTransactionError(conflict)).toBe(conflict);
  });

  it('deja pasar sin tocar un error del driver que no es de reintento', () => {
    const otherError = createDriverError('MongoServerError', []);
    expect(translateTransactionError(otherError)).toBe(otherError);
  });
});
