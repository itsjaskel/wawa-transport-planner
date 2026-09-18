// Pruebas de seguridad de la api: los intentos de ataque habituales contra una api con MongoDB, y las
// defensas añadidas en la revisión de la Fase 5. Cada prueba dice qué intento bloquea.
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { startTestApplication } from './support/test-application.js';

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

describe('inyección de operadores de MongoDB', () => {
  it('rechaza un operador en lugar de un valor en el cuerpo', async () => {
    await request(apiUrl)
      .post('/api/units')
      .send({ code: { $gt: '' }, name: 'Intento' })
      .expect(400);
  });

  it('rechaza un operador en los parámetros de la query', async () => {
    const response = await request(apiUrl)
      .get('/api/units/availability?startAt[$gt]=a&endAt=2031-01-01T00:00:00Z')
      .expect(400);
    const fields = response.body.details.map(
      (invalidField: { field: string }) => invalidField.field,
    );
    expect(fields).toContain('startAt[$gt]');
  });

  it('rechaza un operador en el id de la url y no repite lo recibido en la respuesta', async () => {
    const response = await request(apiUrl)
      .get(`/api/routes/${encodeURIComponent('{"$gt":""}')}`)
      .expect(400);
    expect(response.body.error).toBe('InvalidId');
    expect(response.body.message).not.toContain('$gt');
  });

  it('rechaza un campo interno como scheduleVersion aunque se envíe', async () => {
    await request(apiUrl)
      .post('/api/units')
      .send({ code: 'SEC-001', name: 'Intento', scheduleVersion: 0 })
      .expect(400);
  });
});

describe('contaminación del prototipo', () => {
  it('ignora __proto__ y constructor en el cuerpo sin contaminar los objetos del proceso', async () => {
    const payload =
      '{"code":"SEC-002","name":"Intento","__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}';

    const response = await request(apiUrl)
      .post('/api/units')
      .set('Content-Type', 'application/json')
      .send(payload)
      .expect(201);

    expect(response.body).not.toHaveProperty('polluted');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe('solo se aceptan cuerpos JSON', () => {
  it('rechaza con 415 un formulario, que un navegador enviaría sin comprobación previa de CORS', async () => {
    const response = await request(apiUrl)
      .post('/api/units')
      .type('form')
      .send('code=SEC-003&name=Intento')
      .expect(415);
    expect(response.body.error).toBe('UnsupportedMediaType');
  });

  it('rechaza con 415 un cuerpo de texto plano', async () => {
    await request(apiUrl)
      .post('/api/units')
      .set('Content-Type', 'text/plain')
      .send('code=SEC-004')
      .expect(415);
  });

  it('acepta JSON aunque el tipo de contenido indique el juego de caracteres', async () => {
    await request(apiUrl)
      .post('/api/units')
      .set('Content-Type', 'application/json; charset=utf-8')
      .send(JSON.stringify({ code: 'SEC-005', name: 'Con charset' }))
      .expect(201);
  });
});

describe('límites de carga', () => {
  it('rechaza una consulta de disponibilidad de más de 366 días', async () => {
    const response = await request(apiUrl)
      .get('/api/units/availability')
      .query({ startAt: '2030-01-01T00:00:00Z', endAt: '2031-01-03T00:00:00Z' })
      .expect(400);
    expect(response.body.details[0].messages).toContain(
      'La ventana consultada no puede durar más de 366 días.',
    );
  });

  it('acepta una consulta de disponibilidad de un año', async () => {
    await request(apiUrl)
      .get('/api/units/availability')
      .query({ startAt: '2030-01-01T00:00:00Z', endAt: '2031-01-01T00:00:00Z' })
      .expect(200);
  });

  it('rechaza con 413 un cuerpo de más de 256 kB', async () => {
    const oversizedName = 'A'.repeat(300 * 1024);
    await request(apiUrl)
      .post('/api/units')
      .send({ code: 'SEC-006', name: oversizedName })
      .expect(413);
  });
});

describe('cabeceras', () => {
  it('solo permite por CORS el origen de la interfaz', async () => {
    const response = await request(apiUrl).get('/api/units').set('Origin', 'http://evil.example');
    expect(response.headers['access-control-allow-origin']).not.toBe('http://evil.example');
  });

  it('no anuncia la tecnología del servidor y envía las cabeceras de seguridad', async () => {
    const response = await request(apiUrl).get('/api/health');
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['content-security-policy']).toBeDefined();
  });
});
