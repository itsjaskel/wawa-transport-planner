// Comprueba que el pipe de ObjectId deja pasar ids válidos y rechaza el resto con 400.
import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../errors/api-exception.js';
import { ParseObjectIdPipe } from './parse-object-id.pipe.js';

const VALID_OBJECT_ID = '65f1a2b3c4d5e6f7a8b9c0d1';

/** Ejecuta el pipe y devuelve la excepción que lanzó, o falla si no lanzó ninguna. */
function captureThrownException(value: string): ApiException {
  const pipe = new ParseObjectIdPipe();
  try {
    pipe.transform(value);
  } catch (error) {
    return error as ApiException;
  }
  throw new Error(`El pipe aceptó "${value}" y debía rechazarlo.`);
}

describe('ParseObjectIdPipe', () => {
  it('deja pasar un ObjectId válido sin modificarlo', () => {
    const pipe = new ParseObjectIdPipe();
    expect(pipe.transform(VALID_OBJECT_ID)).toBe(VALID_OBJECT_ID);
  });

  it.each([
    ['un texto cualquiera', 'abc'],
    ['una cadena de 12 caracteres que Types.ObjectId.isValid aceptaría', 'abcdefghijkl'],
    ['un id con un carácter de menos', VALID_OBJECT_ID.slice(1)],
    ['un id con caracteres no hexadecimales', 'zzf1a2b3c4d5e6f7a8b9c0d1'],
  ])('rechaza con 400 e InvalidId %s', (_description, invalidId) => {
    const exception = captureThrownException(invalidId);

    expect(exception).toBeInstanceOf(ApiException);
    expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    expect(exception.toBody().error).toBe('InvalidId');
  });
});
