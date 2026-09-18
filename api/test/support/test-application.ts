// Arranque compartido de los tests de integración: la app completa, con la configuración de
// producción, contra la base `rumbo_test`, que se vacía al empezar.
import type { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import type { Connection } from 'mongoose';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { configureApp } from '../../src/app.setup.js';

// Base exclusiva de los tests: se borra entera al empezar. Los tests se niegan a correr en otra.
const TEST_DATABASE_NAME = 'rumbo_test';

/** Aplicación levantada para un archivo de tests. */
export interface TestApplication {
  app: INestApplication;
  apiUrl: string;
  connection: Connection;
}

/** Apunta la cadena de conexión a la base de tests conservando host y opciones. */
function useTestDatabase(): void {
  const databaseUrl = new URL(process.env.MONGODB_URI ?? '');
  databaseUrl.pathname = `/${TEST_DATABASE_NAME}`;
  process.env.MONGODB_URI = databaseUrl.toString();
}

/** Vacía la base de tests y crea colecciones e índices antes de lanzar peticiones simultáneas. */
async function prepareDatabase(connection: Connection): Promise<void> {
  if (connection.name !== TEST_DATABASE_NAME) {
    throw new Error(`Los tests borran la base: se niegan a correr contra "${connection.name}".`);
  }

  await connection.dropDatabase();

  // Si la colección se creara durante las peticiones simultáneas, los fallos vendrían de esa
  // creación concurrente y no del mecanismo que se quiere probar.
  for (const model of Object.values(connection.models)) {
    await model.createCollection();
    await model.syncIndexes();
  }
}

/** Levanta la app en un puerto libre contra una base de tests vacía. */
export async function startTestApplication(): Promise<TestApplication> {
  useTestDatabase();

  // `ConfigModule.forRoot` lee el entorno al importar AppModule: por eso se importa después
  // de cambiar la cadena de conexión, y no arriba con el resto.
  const { AppModule } = await import('../../src/app.module.js');
  const testingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();

  const app = testingModule.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.listen(0, '127.0.0.1');

  const serverAddress = app.getHttpServer().address() as AddressInfo;
  const connection = app.get<Connection>(getConnectionToken());
  await prepareDatabase(connection);

  return { app, apiUrl: `http://127.0.0.1:${serverAddress.port}`, connection };
}

/** Crea una entidad por HTTP y devuelve su id; falla el test si la api no responde 201. */
export async function createEntity(apiUrl: string, path: string, body: object): Promise<string> {
  const response = await request(apiUrl).post(`/api${path}`).send(body).expect(201);
  return response.body.id;
}
