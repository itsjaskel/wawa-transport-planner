// Punto de entrada de la api de Rumb@: crea la aplicación Nest, le aplica la configuración
// global de `app.setup.ts` y la pone a escuchar.
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';

// Dentro de un contenedor hay que escuchar en todas las interfaces: con el valor
// por defecto la api solo sería accesible desde dentro del propio contenedor.
const ALL_NETWORK_INTERFACES = '0.0.0.0';

/** Arranca la api de Rumb@ con toda la configuración global aplicada. */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);

  const apiPort = app.get(ConfigService).getOrThrow<number>('API_PORT');
  await app.listen(apiPort, ALL_NETWORK_INTERFACES);
}

await bootstrap();
