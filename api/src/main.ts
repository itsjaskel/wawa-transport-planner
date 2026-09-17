// Punto de entrada de la api de Rumb@: crea la aplicación Nest y le aplica
// prefijo global, cabeceras de seguridad, CORS y validación de entrada.
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { createValidationException } from './common/errors/validation-errors.js';
import { ApiExceptionFilter } from './common/filters/api-exception.filter.js';

const GLOBAL_API_PREFIX = 'api';
const MAX_REQUEST_BODY_SIZE = '256kb';
// Dentro de un contenedor hay que escuchar en todas las interfaces: con el valor
// por defecto la api solo sería accesible desde dentro del propio contenedor.
const ALL_NETWORK_INTERFACES = '0.0.0.0';

/** Arranca la api de Rumb@ con toda la configuración global aplicada. */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix(GLOBAL_API_PREFIX);
  app.use(helmet());
  app.useBodyParser('json', { limit: MAX_REQUEST_BODY_SIZE });

  app.enableCors({
    origin: configService.getOrThrow<string>('CORS_ORIGIN'),
  });

  app.useGlobalPipes(
    new ValidationPipe({
      // Descarta lo que no está declarado en el dto y rechaza la petición si viene
      // algo de más, para que no lleguen operadores de Mongo por la puerta de atrás.
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      // Sin esto, class-validator devuelve un texto por campo sin la ruta completa y los
      // errores de los puntos anidados no dirían cuál de ellos falló.
      exceptionFactory: createValidationException,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());

  const apiPort = configService.getOrThrow<number>('API_PORT');
  await app.listen(apiPort, ALL_NETWORK_INTERFACES);
}

await bootstrap();
