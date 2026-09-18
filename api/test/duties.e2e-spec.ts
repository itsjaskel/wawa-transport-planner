// Tests de integración de duties contra un MongoDB real (base `rumbo_test`), pasando por HTTP,
// validación y filtro de errores exactamente como en producción. Incluye la prueba de concurrencia.
import type { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import request from 'supertest';
import { EXISTING_WINDOW, OVERLAP_CASES } from '../src/duties/domain/overlap-cases.js';
import { createEntity, startTestApplication } from './support/test-application.js';

const CONCURRENT_REQUEST_COUNT = 10;
// Las peticiones simultáneas provocan reintentos de transacción con espera entre ellos.
const CONCURRENCY_TEST_TIMEOUT_MS = 60_000;
const MISSING_OBJECT_ID = '65f1a2b3c4d5e6f7a8b9c0d1';
const ONE_HOUR_MS = 60 * 60 * 1000;
const TWO_POINTS = [
  { lat: 19.4326, lng: -99.1332 },
  { lat: 19.4352, lng: -99.1412 },
];

let app: INestApplication;
let apiUrl: string;
let dutyModel: Model<unknown>;
let firstUnitId: string;
let secondUnitId: string;
let routeId: string;

/** Envía la creación de un duty para la ruta de prueba y devuelve la respuesta sin interpretarla. */
function postDuty(unitId: string, startAt: string, endAt: string): request.Test {
  return request(apiUrl).post('/api/duties').send({ routeId, unitId, startAt, endAt });
}

/** Cuenta cuántos duties tiene guardados una unidad directamente en la base. */
async function countUnitDuties(unitId: string): Promise<number> {
  return dutyModel.countDocuments({ unitId });
}

/** Devuelve cuántas respuestas hubo de cada código de estado. */
function countByStatus(responses: request.Response[]): Record<number, number> {
  const statusCounts: Record<number, number> = {};
  for (const response of responses) {
    statusCounts[response.status] = (statusCounts[response.status] ?? 0) + 1;
  }
  return statusCounts;
}

beforeAll(async () => {
  const testApplication = await startTestApplication();
  app = testApplication.app;
  apiUrl = testApplication.apiUrl;
  dutyModel = app.get<Model<unknown>>(getModelToken('Duty'));

  firstUnitId = await createEntity(apiUrl, '/units', {
    code: 'TEST-001',
    name: 'Unidad de prueba 1',
  });
  secondUnitId = await createEntity(apiUrl, '/units', {
    code: 'TEST-002',
    name: 'Unidad de prueba 2',
  });
  routeId = await createEntity(apiUrl, '/routes', { name: 'Ruta de prueba', points: TWO_POINTS });
});

afterAll(async () => {
  await app?.close();
});

beforeEach(async () => {
  await dutyModel.deleteMany({});
});

describe('la consulta de solapamiento en la base, con un duty existente de 10:00 a 12:00', () => {
  it.each(OVERLAP_CASES)(
    'un duty nuevo $description → solapa: $hasOverlap',
    async (overlapCase) => {
      await postDuty(firstUnitId, EXISTING_WINDOW.startAt, EXISTING_WINDOW.endAt).expect(201);

      const response = await postDuty(firstUnitId, overlapCase.startAt, overlapCase.endAt);

      let expectedStatus = 201;
      if (overlapCase.hasOverlap) {
        expectedStatus = 409;
      }
      expect(response.status).toBe(expectedStatus);
    },
  );
});

describe('creación de duties', () => {
  it('rechaza con 400 un duty cuyo fin es igual al inicio', async () => {
    const response = await postDuty(firstUnitId, '2030-03-15T10:00:00Z', '2030-03-15T10:00:00Z');

    expect(response.status).toBe(400);
    expect(response.body.details).toEqual([
      { field: 'endAt', messages: ['El fin debe ser posterior al inicio.'] },
    ]);
  });

  it('rechaza con 400 un duty cuyo fin es anterior al inicio', async () => {
    await postDuty(firstUnitId, '2030-03-15T12:00:00Z', '2030-03-15T10:00:00Z').expect(400);
  });

  it('rechaza con 400 una fecha sin zona horaria', async () => {
    await postDuty(firstUnitId, '2030-03-15T10:00:00', '2030-03-15T12:00:00Z').expect(400);
  });

  it('responde 404 si la unidad no existe', async () => {
    const response = await postDuty(
      MISSING_OBJECT_ID,
      EXISTING_WINDOW.startAt,
      EXISTING_WINDOW.endAt,
    );
    expect(response.status).toBe(404);
  });

  it('responde 404 si la ruta no existe', async () => {
    const response = await request(apiUrl).post('/api/duties').send({
      routeId: MISSING_OBJECT_ID,
      unitId: firstUnitId,
      startAt: EXISTING_WINDOW.startAt,
      endAt: EXISTING_WINDOW.endAt,
    });
    expect(response.status).toBe(404);
  });

  it('acepta la misma ventana con otra unidad', async () => {
    await postDuty(firstUnitId, EXISTING_WINDOW.startAt, EXISTING_WINDOW.endAt).expect(201);
    await postDuty(secondUnitId, EXISTING_WINDOW.startAt, EXISTING_WINDOW.endAt).expect(201);
  });

  it('el 409 incluye id, ruta, inicio y fin del duty con el que choca', async () => {
    const existingDuty = await postDuty(
      firstUnitId,
      EXISTING_WINDOW.startAt,
      EXISTING_WINDOW.endAt,
    ).expect(201);

    const response = await postDuty(firstUnitId, '2030-03-15T11:00:00Z', '2030-03-15T13:00:00Z');

    expect(response.status).toBe(409);
    expect(response.body.details.conflictingDuty).toEqual({
      id: existingDuty.body.id,
      routeId,
      routeName: 'Ruta de prueba',
      unitCode: 'TEST-001',
      startAt: '2030-03-15T10:00:00.000Z',
      endAt: '2030-03-15T12:00:00.000Z',
    });
  });
});

describe('concurrencia sobre la misma unidad', () => {
  it(
    `de ${CONCURRENT_REQUEST_COUNT} creaciones simultáneas solapadas, se crea exactamente 1`,
    async () => {
      const simultaneousRequests = Array.from({ length: CONCURRENT_REQUEST_COUNT }, () =>
        postDuty(firstUnitId, EXISTING_WINDOW.startAt, EXISTING_WINDOW.endAt),
      );

      const responses = await Promise.all(simultaneousRequests);

      expect(countByStatus(responses)).toEqual({ 201: 1, 409: CONCURRENT_REQUEST_COUNT - 1 });
      expect(await countUnitDuties(firstUnitId)).toBe(1);
    },
    CONCURRENCY_TEST_TIMEOUT_MS,
  );

  it(
    `de ${CONCURRENT_REQUEST_COUNT} creaciones simultáneas sin solapamiento, se crean todas`,
    async () => {
      const firstStartTime = Date.parse(EXISTING_WINDOW.startAt);
      // Ventanas consecutivas de una hora: cada una empieza cuando termina la anterior.
      const simultaneousRequests = Array.from({ length: CONCURRENT_REQUEST_COUNT }, (_, index) => {
        const startAt = new Date(firstStartTime + index * ONE_HOUR_MS).toISOString();
        const endAt = new Date(firstStartTime + (index + 1) * ONE_HOUR_MS).toISOString();
        return postDuty(firstUnitId, startAt, endAt);
      });

      const responses = await Promise.all(simultaneousRequests);

      expect(countByStatus(responses)).toEqual({ 201: CONCURRENT_REQUEST_COUNT });
      expect(await countUnitDuties(firstUnitId)).toBe(CONCURRENT_REQUEST_COUNT);
    },
    CONCURRENCY_TEST_TIMEOUT_MS,
  );
});

describe('lectura y borrado de duties', () => {
  it('lista los duties de una ruta ordenados por inicio y con los datos de su unidad', async () => {
    await postDuty(secondUnitId, '2030-03-15T14:00:00Z', '2030-03-15T15:00:00Z').expect(201);
    await postDuty(firstUnitId, '2030-03-15T08:00:00Z', '2030-03-15T09:00:00Z').expect(201);

    const response = await request(apiUrl).get(`/api/routes/${routeId}/duties`).expect(200);

    const startTimes = response.body.map((duty: { startAt: string }) => duty.startAt);
    expect(startTimes).toEqual(['2030-03-15T08:00:00.000Z', '2030-03-15T14:00:00.000Z']);
    expect(response.body[0].unit).toEqual({
      id: firstUnitId,
      code: 'TEST-001',
      name: 'Unidad de prueba 1',
    });
  });

  it('responde 404 al listar los duties de una ruta que no existe', async () => {
    await request(apiUrl).get(`/api/routes/${MISSING_OBJECT_ID}/duties`).expect(404);
  });

  it('borra un duty con 204 y responde 404 si se intenta borrar de nuevo', async () => {
    const createdDuty = await postDuty(firstUnitId, EXISTING_WINDOW.startAt, EXISTING_WINDOW.endAt);

    await request(apiUrl).delete(`/api/duties/${createdDuty.body.id}`).expect(204);
    await request(apiUrl).delete(`/api/duties/${createdDuty.body.id}`).expect(404);
  });

  it('tras borrar un duty, su ventana vuelve a quedar libre para la unidad', async () => {
    const createdDuty = await postDuty(firstUnitId, EXISTING_WINDOW.startAt, EXISTING_WINDOW.endAt);
    await request(apiUrl).delete(`/api/duties/${createdDuty.body.id}`).expect(204);

    await postDuty(firstUnitId, EXISTING_WINDOW.startAt, EXISTING_WINDOW.endAt).expect(201);
  });
});

describe('disponibilidad de unidades, con un duty existente de 10:00 a 12:00 en la primera', () => {
  /** Pide la disponibilidad de una ventana y devuelve la de la unidad indicada. */
  async function readUnitAvailability(
    unitId: string,
    startAt: string,
    endAt: string,
    excludeDutyId?: string,
  ) {
    const response = await request(apiUrl)
      .get('/api/units/availability')
      .query({ startAt, endAt, excludeDutyId })
      .expect(200);
    return response.body.find((availability: { unitId: string }) => availability.unitId === unitId);
  }

  it.each(OVERLAP_CASES)(
    'una ventana $description → la unidad aparece ocupada: $hasOverlap',
    async (overlapCase) => {
      await postDuty(firstUnitId, EXISTING_WINDOW.startAt, EXISTING_WINDOW.endAt).expect(201);

      const firstUnitAvailability = await readUnitAvailability(
        firstUnitId,
        overlapCase.startAt,
        overlapCase.endAt,
      );
      const secondUnitAvailability = await readUnitAvailability(
        secondUnitId,
        overlapCase.startAt,
        overlapCase.endAt,
      );

      expect(firstUnitAvailability.isAvailable).toBe(!overlapCase.hasOverlap);
      expect(secondUnitAvailability.isAvailable).toBe(true);
    },
  );

  it('de una unidad ocupada indica el duty y la ruta que la ocupan', async () => {
    const existingDuty = await postDuty(
      firstUnitId,
      EXISTING_WINDOW.startAt,
      EXISTING_WINDOW.endAt,
    ).expect(201);

    const availability = await readUnitAvailability(
      firstUnitId,
      '2030-03-15T11:00:00Z',
      '2030-03-15T13:00:00Z',
    );

    expect(availability.occupyingDuty).toEqual({
      id: existingDuty.body.id,
      routeId,
      routeName: 'Ruta de prueba',
      startAt: '2030-03-15T10:00:00.000Z',
      endAt: '2030-03-15T12:00:00.000Z',
    });
  });

  it('no cuenta como ocupación el duty indicado en excludeDutyId', async () => {
    const existingDuty = await postDuty(
      firstUnitId,
      EXISTING_WINDOW.startAt,
      EXISTING_WINDOW.endAt,
    ).expect(201);

    const availability = await readUnitAvailability(
      firstUnitId,
      EXISTING_WINDOW.startAt,
      EXISTING_WINDOW.endAt,
      existingDuty.body.id,
    );

    expect(availability.isAvailable).toBe(true);
  });

  it('rechaza con 400 una ventana sin zona horaria o con el fin antes del inicio', async () => {
    await request(apiUrl)
      .get('/api/units/availability')
      .query({ startAt: '2030-03-15T10:00:00', endAt: '2030-03-15T12:00:00Z' })
      .expect(400);
    await request(apiUrl)
      .get('/api/units/availability')
      .query({ startAt: '2030-03-15T12:00:00Z', endAt: '2030-03-15T10:00:00Z' })
      .expect(400);
  });
});

describe('edición de duties', () => {
  /** Envía la edición de un duty y devuelve la respuesta sin interpretarla. */
  function putDuty(dutyId: string, unitId: string, startAt: string, endAt: string): request.Test {
    return request(apiUrl).put(`/api/duties/${dutyId}`).send({ unitId, startAt, endAt });
  }

  it('acorta un duty dentro de su propia ventana sin chocar consigo mismo', async () => {
    const duty = await postDuty(firstUnitId, EXISTING_WINDOW.startAt, EXISTING_WINDOW.endAt);

    const response = await putDuty(
      duty.body.id,
      firstUnitId,
      '2030-03-15T10:30:00Z',
      '2030-03-15T11:30:00Z',
    ).expect(200);

    expect(response.body.startAt).toBe('2030-03-15T10:30:00.000Z');
    expect(response.body.routeId).toBe(routeId);
  });

  it('rechaza con 409 moverlo a una ventana ocupada por otro duty de la misma unidad', async () => {
    const occupyingDuty = await postDuty(
      firstUnitId,
      EXISTING_WINDOW.startAt,
      EXISTING_WINDOW.endAt,
    );
    const movedDuty = await postDuty(firstUnitId, '2030-03-15T14:00:00Z', '2030-03-15T15:00:00Z');

    const response = await putDuty(
      movedDuty.body.id,
      firstUnitId,
      '2030-03-15T11:00:00Z',
      '2030-03-15T13:00:00Z',
    ).expect(409);

    expect(response.body.details.conflictingDuty.id).toBe(occupyingDuty.body.id);
  });

  it('lo pasa a otra unidad libre en esa ventana', async () => {
    const duty = await postDuty(firstUnitId, EXISTING_WINDOW.startAt, EXISTING_WINDOW.endAt);

    const response = await putDuty(
      duty.body.id,
      secondUnitId,
      EXISTING_WINDOW.startAt,
      EXISTING_WINDOW.endAt,
    ).expect(200);

    expect(response.body.unitId).toBe(secondUnitId);
    expect(await countUnitDuties(firstUnitId)).toBe(0);
  });

  it('responde 404 si el duty o la unidad no existen, y 400 si se intenta cambiar la ruta', async () => {
    const duty = await postDuty(firstUnitId, EXISTING_WINDOW.startAt, EXISTING_WINDOW.endAt);

    await putDuty(
      MISSING_OBJECT_ID,
      firstUnitId,
      EXISTING_WINDOW.startAt,
      EXISTING_WINDOW.endAt,
    ).expect(404);
    await putDuty(
      duty.body.id,
      MISSING_OBJECT_ID,
      EXISTING_WINDOW.startAt,
      EXISTING_WINDOW.endAt,
    ).expect(404);
    await request(apiUrl)
      .put(`/api/duties/${duty.body.id}`)
      .send({ routeId, unitId: firstUnitId, ...EXISTING_WINDOW })
      .expect(400);
  });

  it(
    `de ${CONCURRENT_REQUEST_COUNT} duties movidos a la vez a la misma ventana de una unidad, solo 1 lo consigue`,
    async () => {
      const firstStartTime = Date.parse('2030-04-01T00:00:00Z');
      const dutyIds: string[] = [];
      // Duties de la segunda unidad, cada uno en su propio día: ninguno choca con otro.
      for (let dutyIndex = 0; dutyIndex < CONCURRENT_REQUEST_COUNT; dutyIndex += 1) {
        const startAt = new Date(firstStartTime + dutyIndex * 24 * ONE_HOUR_MS).toISOString();
        const endAt = new Date(
          firstStartTime + dutyIndex * 24 * ONE_HOUR_MS + ONE_HOUR_MS,
        ).toISOString();
        const duty = await postDuty(secondUnitId, startAt, endAt).expect(201);
        dutyIds.push(duty.body.id);
      }

      const simultaneousEdits = dutyIds.map((dutyId) =>
        putDuty(dutyId, firstUnitId, EXISTING_WINDOW.startAt, EXISTING_WINDOW.endAt),
      );
      const responses = await Promise.all(simultaneousEdits);

      expect(countByStatus(responses)).toEqual({ 200: 1, 409: CONCURRENT_REQUEST_COUNT - 1 });
      expect(await countUnitDuties(firstUnitId)).toBe(1);
    },
    CONCURRENCY_TEST_TIMEOUT_MS,
  );
});
