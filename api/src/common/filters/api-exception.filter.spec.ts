// Comprueba que el filtro global traduce cada familia de error al formato uniforme.
import type { ArgumentsHost } from '@nestjs/common';
import { BadRequestException, HttpStatus, Logger, NotFoundException } from '@nestjs/common';
import mongoose from 'mongoose';
import { ApiException, type ApiErrorBody } from '../errors/api-exception.js';
import { ApiExceptionFilter } from './api-exception.filter.js';

/** Pasa la excepción por el filtro y devuelve el código y el cuerpo que respondió. */
function runFilter(exception: unknown): { statusCode: number; body: ApiErrorBody } {
  const response = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;

  new ApiExceptionFilter().catch(exception, host);

  return {
    statusCode: response.status.mock.calls[0][0],
    body: response.json.mock.calls[0][0],
  };
}

describe('ApiExceptionFilter', () => {
  it('emite tal cual una ApiException con su tipo y sus detalles', () => {
    const details = [{ field: 'name', messages: ['obligatorio'] }];
    const exception = new ApiException(HttpStatus.BAD_REQUEST, 'ValidationError', 'Mal', details);

    const { statusCode, body } = runFilter(exception);

    expect(statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(body).toEqual({ statusCode: 400, error: 'ValidationError', message: 'Mal', details });
  });

  it('traduce una excepción HTTP de Nest usando el tipo que corresponde a su código', () => {
    const { statusCode, body } = runFilter(new NotFoundException('No está'));

    expect(statusCode).toBe(HttpStatus.NOT_FOUND);
    expect(body.error).toBe('NotFound');
  });

  it('sustituye el mensaje interno en inglés de un 400 ajeno por uno propio en español', () => {
    const { statusCode, body } = runFilter(new BadRequestException('Unexpected end of JSON input'));

    expect(statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(body.error).toBe('BadRequest');
    expect(body.message).not.toContain('Unexpected');
  });

  it('traduce un cuerpo demasiado grande del body parser a 413 y no a 500', () => {
    const payloadTooLargeError = Object.assign(new Error('request entity too large'), {
      status: 413,
      type: 'entity.too.large',
    });

    const { statusCode, body } = runFilter(payloadTooLargeError);

    expect(statusCode).toBe(HttpStatus.PAYLOAD_TOO_LARGE);
    expect(body.error).toBe('PayloadTooLarge');
  });

  it('traduce un CastError de Mongoose a 400 y nunca a 500', () => {
    const castError = new mongoose.Error.CastError('ObjectId', 'abc', '_id');

    const { statusCode, body } = runFilter(castError);

    expect(statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(body.error).toBe('InvalidId');
  });

  it('traduce un error de validación del esquema a 400 con la lista de campos', () => {
    const validationError = new mongoose.Error.ValidationError();
    validationError.addError(
      'endAt',
      new mongoose.Error.ValidatorError({ message: 'endAt debe ser posterior', path: 'endAt' }),
    );

    const { statusCode, body } = runFilter(validationError);

    expect(statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(body.details).toEqual([{ field: 'endAt', messages: ['endAt debe ser posterior'] }]);
  });

  it('traduce una clave duplicada de Mongo a 409 indicando el campo', () => {
    const duplicateKeyError = { code: 11000, keyValue: { code: 'BUS-001' } };

    const { statusCode, body } = runFilter(duplicateKeyError);

    expect(statusCode).toBe(HttpStatus.CONFLICT);
    expect(body.error).toBe('DuplicateKey');
    expect(body.details).toEqual({ code: 'BUS-001' });
  });

  it('responde 500 sin filtrar el mensaje ni el stack del error original', () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const internalError = new Error('contraseña de la base en texto plano');

    const { statusCode, body } = runFilter(internalError);

    expect(statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(body.error).toBe('InternalError');
    expect(JSON.stringify(body)).not.toContain('contraseña');
    expect(body).not.toHaveProperty('stack');
  });
});
