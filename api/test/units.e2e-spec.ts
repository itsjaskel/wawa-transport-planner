// Tests de integración de la edición y el borrado de unidades contra MongoDB real, incluido el borrado
// simultáneo a una asignación, que nunca debe dejar un duty apuntando a una unidad inexistente.
import type { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import request from 'supertest';
import { createEntity, startTestApplication } from './support/test-application.js';

const MISSING_OBJECT_ID = '65f1a2b3c4d5e6f7a8b9c0d1';
// Rondas de asignación y borrado simultáneos: cada una usa una unidad nueva.
const CONCURRENT_ROUND_COUNT = 40;
const CONCURRENCY_TEST_TIMEOUT_MS = 60_000;
const TWO_POINTS = [
  { lat: 19.4326, lng: -99.1332 },
  { lat: 19.4352, lng: -99.1412 },
];
const DUTY_WINDOW = { startAt: '2030-03-15T10:00:00Z', endAt: '2030-03-15T12:00:00Z' };
const NEXT_DAY_WINDOW = { startAt: '2030-03-16T10:00:00Z', endAt: '2030-03-16T12:00:00Z' };

let app: INestApplication;
let apiUrl: string;
let unitModel: Model<unknown>;
let dutyModel: Model<unknown>;
let routeId: string;
let secondRouteId: string;
let unitCodeSequence = 0;

/** Crea una unidad con un código que no se repite entre tests y devuelve su id. */
async function createTestUnit(): Promise<string> {
  unitCodeSequence += 1;
  const code = `UNIT-${String(unitCodeSequence).padStart(3, '0')}`;
  return createEntity(apiUrl, '/units', { code, name: `Unidad ${unitCodeSequence}` });
}

/** Asigna un duty a la unidad y devuelve la respuesta sin interpretarla. */
function postDuty(
  unitId: string,
  targetRouteId: string = routeId,
  dutyWindow: { startAt: string; endAt: string } = DUTY_WINDOW,
): request.Test {
  return request(apiUrl)
    .post('/api/duties')
    .send({ routeId: targetRouteId, unitId, ...dutyWindow });
}

/** Lanza a la vez la asignación de un duty y el borrado de la unidad, alternando cuál sale primero. */
async function raceDutyAgainstDeletion(unitId: string, round: number) {
  const startDutyRequest = () => postDuty(unitId);
  const startDeleteRequest = () => request(apiUrl).delete(`/api/units/${unitId}`);

  // Alternar el orden de salida evita que una de las dos gane siempre por llegar antes.
  const isEvenRound = round % 2 === 0;
  if (isEvenRound) {
    const [dutyResponse, deleteResponse] = await Promise.all([
      startDutyRequest(),
      startDeleteRequest(),
    ]);
    return { dutyResponse, deleteResponse };
  }
  const [deleteResponse, dutyResponse] = await Promise.all([
    startDeleteRequest(),
    startDutyRequest(),
  ]);
  return { dutyResponse, deleteResponse };
}

beforeAll(async () => {
  const testApplication = await startTestApplication();
  app = testApplication.app;
  apiUrl = testApplication.apiUrl;
  unitModel = app.get<Model<unknown>>(getModelToken('Unit'));
  dutyModel = app.get<Model<unknown>>(getModelToken('Duty'));

  routeId = await createEntity(apiUrl, '/routes', { name: 'Ruta A', points: TWO_POINTS });
  secondRouteId = await createEntity(apiUrl, '/routes', { name: 'Ruta B', points: TWO_POINTS });
});

afterAll(async () => {
  await app?.close();
});

describe('edición del nombre de una unidad', () => {
  it('cambia el nombre, recorta espacios y conserva el código', async () => {
    const unitId = await createTestUnit();

    const response = await request(apiUrl)
      .patch(`/api/units/${unitId}`)
      .send({ name: '  Autobús renovado  ' })
      .expect(200);

    expect(response.body.name).toBe('Autobús renovado');
    expect(response.body.code).toMatch(/^UNIT-/);
  });

  it('rechaza con 400 un intento de cambiar el código', async () => {
    const unitId = await createTestUnit();

    const response = await request(apiUrl)
      .patch(`/api/units/${unitId}`)
      .send({ name: 'Otro nombre', code: 'NUEVO-1' })
      .expect(400);

    expect(response.body.details).toEqual([
      { field: 'code', messages: ['Este campo no está permitido.'] },
    ]);
  });

  it('rechaza con 400 un nombre vacío', async () => {
    const unitId = await createTestUnit();
    await request(apiUrl).patch(`/api/units/${unitId}`).send({ name: '   ' }).expect(400);
  });

  it('responde 404 si la unidad no existe', async () => {
    await request(apiUrl).patch(`/api/units/${MISSING_OBJECT_ID}`).send({ name: 'X' }).expect(404);
  });
});

describe('borrado de una unidad', () => {
  it('borra con 204 una unidad sin duties y responde 404 si se intenta borrar de nuevo', async () => {
    const unitId = await createTestUnit();

    await request(apiUrl).delete(`/api/units/${unitId}`).expect(204);
    await request(apiUrl).delete(`/api/units/${unitId}`).expect(404);
    expect(await unitModel.exists({ _id: unitId })).toBeNull();
  });

  it('rechaza con 409 una unidad con duties e indica en qué rutas están', async () => {
    const unitId = await createTestUnit();
    await postDuty(unitId, routeId).expect(201);
    await postDuty(unitId, secondRouteId, NEXT_DAY_WINDOW).expect(201);

    const response = await request(apiUrl).delete(`/api/units/${unitId}`).expect(409);

    expect(response.body.error).toBe('UnitInUse');
    expect(response.body.details.dutyCount).toBe(2);
    const routeNames = response.body.details.routes.map((route: { name: string }) => route.name);
    expect(routeNames.sort()).toEqual(['Ruta A', 'Ruta B']);
    expect(await unitModel.exists({ _id: unitId })).not.toBeNull();
  });

  it('tras borrar sus duties, la unidad ya se puede borrar', async () => {
    const unitId = await createTestUnit();
    const createdDuty = await postDuty(unitId).expect(201);

    await request(apiUrl).delete(`/api/units/${unitId}`).expect(409);
    await request(apiUrl).delete(`/api/duties/${createdDuty.body.id}`).expect(204);
    await request(apiUrl).delete(`/api/units/${unitId}`).expect(204);
  });

  it('responde 400 si el id no es válido', async () => {
    await request(apiUrl).delete('/api/units/abc').expect(400);
  });

  it(
    `en ${CONCURRENT_ROUND_COUNT} rondas de asignación y borrado simultáneos, nunca queda un duty sin unidad`,
    async () => {
      const outcomes: string[] = [];
      let orphanDutyRoundCount = 0;

      for (let round = 0; round < CONCURRENT_ROUND_COUNT; round += 1) {
        const unitId = await createTestUnit();

        const { dutyResponse, deleteResponse } = await raceDutyAgainstDeletion(unitId, round);
        outcomes.push(`duty ${dutyResponse.status} / borrado ${deleteResponse.status}`);

        const unitStillExists = (await unitModel.exists({ _id: unitId })) !== null;
        const unitDutyCount = await dutyModel.countDocuments({ unitId });
        const hasOrphanDuty = !unitStillExists && unitDutyCount > 0;
        if (hasOrphanDuty) {
          orphanDutyRoundCount += 1;
        }
      }

      // El reparto de resultados depende de quién gana cada carrera; se imprime como evidencia.
      console.log('resultados por ronda:', countOutcomes(outcomes));
      expect(orphanDutyRoundCount).toBe(0);
    },
    CONCURRENCY_TEST_TIMEOUT_MS,
  );
});

/** Cuenta cuántas rondas terminaron con cada combinación de respuestas. */
function countOutcomes(outcomes: string[]): Record<string, number> {
  const outcomeCounts: Record<string, number> = {};
  for (const outcome of outcomes) {
    outcomeCounts[outcome] = (outcomeCounts[outcome] ?? 0) + 1;
  }
  return outcomeCounts;
}
