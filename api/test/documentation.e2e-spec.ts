// Comprueba que la documentación Swagger se sirve y describe todos los endpoints de la api.
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { startTestApplication } from './support/test-application.js';

// Método y ruta de cada endpoint público: si se añade o se quita uno, este test obliga a documentarlo.
const DOCUMENTED_OPERATIONS = [
  'get /api/health',
  'get /api/routes',
  'post /api/routes',
  'get /api/routes/{id}',
  'put /api/routes/{id}',
  'get /api/routes/{id}/duties',
  'get /api/units',
  'get /api/units/availability',
  'post /api/units',
  'patch /api/units/{id}',
  'delete /api/units/{id}',
  'post /api/duties',
  'put /api/duties/{id}',
  'delete /api/duties/{id}',
];

let app: INestApplication;
let apiUrl: string;

beforeAll(async () => {
  const testApplication = await startTestApplication();
  app = testApplication.app;
  apiUrl = testApplication.apiUrl;
});

afterAll(async () => {
  await app?.close();
});

describe('documentación de la api', () => {
  it('sirve la página interactiva en /api/docs', async () => {
    await request(apiUrl).get('/api/docs').expect(200);
  });

  it('documenta exactamente los endpoints públicos de la api', async () => {
    const response = await request(apiUrl).get('/api/docs-json').expect(200);

    const documentedOperations = Object.entries(response.body.paths).flatMap(([path, operations]) =>
      Object.keys(operations as object).map((method) => `${method} ${path}`),
    );
    expect(documentedOperations.sort()).toEqual([...DOCUMENTED_OPERATIONS].sort());
  });
});
