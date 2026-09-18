// Comprueba que cada campo de texto que acepta la api tiene un máximo y lo aplica, y que los campos
// opcionales vacíos o `null` no se guardan. Responde con una prueba a la pregunta "¿todos los campos
// están validados y tienen un máximo?": si se añade un campo de texto, debe añadirse aquí.
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createEntity, startTestApplication } from './support/test-application.js';

const MAX_UNIT_CODE_LENGTH = 20;
const MAX_NAME_LENGTH = 100;
const MAX_DATE_TEXT_LENGTH = 35;
const TWO_POINTS = [
  { lat: 19.4326, lng: -99.1332 },
  { lat: 19.4352, lng: -99.1412 },
];

let app: INestApplication;
let apiUrl: string;
let unitId: string;
let routeId: string;

/** Devuelve un texto de la longitud dada, formado por letras válidas en cualquier campo. */
function buildText(length: number): string {
  return 'A'.repeat(length);
}

/** Devuelve los mensajes de error de un campo en el cuerpo de una respuesta 400. */
function readFieldMessages(
  responseBody: { details: { field: string; messages: string[] }[] },
  field: string,
): string[] {
  const invalidField = responseBody.details.find((candidate) => candidate.field === field);
  return invalidField?.messages ?? [];
}

beforeAll(async () => {
  const testApplication = await startTestApplication();
  app = testApplication.app;
  apiUrl = testApplication.apiUrl;
  unitId = await createEntity(apiUrl, '/units', { code: 'LIM-001', name: 'Unidad de límites' });
  routeId = await createEntity(apiUrl, '/routes', { name: 'Ruta de límites', points: TWO_POINTS });
});

afterAll(async () => {
  await app?.close();
});

describe('máximo de cada campo de texto', () => {
  it(`code de unidad: acepta ${MAX_UNIT_CODE_LENGTH} caracteres y rechaza uno más`, async () => {
    await request(apiUrl)
      .post('/api/units')
      .send({ code: buildText(MAX_UNIT_CODE_LENGTH), name: 'Límite exacto' })
      .expect(201);

    const response = await request(apiUrl)
      .post('/api/units')
      .send({ code: buildText(MAX_UNIT_CODE_LENGTH + 1), name: 'Uno de más' })
      .expect(400);

    expect(readFieldMessages(response.body, 'code')).toContain(
      `El código admite como máximo ${MAX_UNIT_CODE_LENGTH} caracteres.`,
    );
  });

  it(`name de unidad, en el alta y en la edición: rechaza ${MAX_NAME_LENGTH + 1} caracteres`, async () => {
    const tooLongName = buildText(MAX_NAME_LENGTH + 1);

    await request(apiUrl)
      .post('/api/units')
      .send({ code: 'LIM-002', name: tooLongName })
      .expect(400);
    await request(apiUrl).patch(`/api/units/${unitId}`).send({ name: tooLongName }).expect(400);
  });

  it(`name de ruta, al crear y al reemplazar: rechaza ${MAX_NAME_LENGTH + 1} caracteres`, async () => {
    const tooLongRoute = { name: buildText(MAX_NAME_LENGTH + 1), points: TWO_POINTS };

    await request(apiUrl).post('/api/routes').send(tooLongRoute).expect(400);
    await request(apiUrl).put(`/api/routes/${routeId}`).send(tooLongRoute).expect(400);
  });

  it(`name de punto: rechaza ${MAX_NAME_LENGTH + 1} caracteres e indica qué punto`, async () => {
    const points = [TWO_POINTS[0], { ...TWO_POINTS[1], name: buildText(MAX_NAME_LENGTH + 1) }];

    const response = await request(apiUrl)
      .post('/api/routes')
      .send({ name: 'Punto largo', points })
      .expect(400);

    expect(readFieldMessages(response.body, 'points.1.name')).toContain(
      `El nombre del punto admite como máximo ${MAX_NAME_LENGTH} caracteres.`,
    );
  });

  it(`fechas de un duty: rechaza más de ${MAX_DATE_TEXT_LENGTH} caracteres aunque sea ISO válido`, async () => {
    // Antes de este límite, una fecha con 500 decimales en los segundos se aceptaba y se guardaba.
    const longFraction = '0'.repeat(500);

    const response = await request(apiUrl)
      .post('/api/duties')
      .send({
        routeId,
        unitId,
        startAt: `2031-06-01T10:00:00.${longFraction}Z`,
        endAt: '2031-06-01T11:00:00Z',
      })
      .expect(400);

    expect(readFieldMessages(response.body, 'startAt')).toContain(
      `La fecha admite como máximo ${MAX_DATE_TEXT_LENGTH} caracteres.`,
    );
  });

  it('parámetros de la disponibilidad: rechaza una fecha demasiado larga', async () => {
    const longFraction = '0'.repeat(500);

    await request(apiUrl)
      .get('/api/units/availability')
      .query({ startAt: `2031-06-01T10:00:00.${longFraction}Z`, endAt: '2031-06-01T11:00:00Z' })
      .expect(400);
  });
});

describe('campos opcionales vacíos', () => {
  it.each([
    ['null', null],
    ['texto vacío', ''],
    ['solo espacios', '   '],
  ])('un nombre de punto %s no se guarda', async (_description, emptyName) => {
    const points = [{ ...TWO_POINTS[0], name: emptyName }, TWO_POINTS[1]];

    const response = await request(apiUrl)
      .post('/api/routes')
      .send({ name: 'Punto sin nombre', points })
      .expect(201);

    expect(response.body.points[0]).not.toHaveProperty('name');
  });
});
