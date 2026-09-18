// Configuración global de la aplicación Nest: prefijo, seguridad, CORS, validación, errores y
// documentación.
// La comparten `main.ts` y los tests de integración, para que los tests prueben la api tal cual corre.
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { setupApiDocumentation } from './common/documentation/api-documentation.js';
import { createValidationException } from './common/errors/validation-errors.js';
import { ApiExceptionFilter } from './common/filters/api-exception.filter.js';
import { requireJsonBody } from './common/middleware/require-json-body.js';

const GLOBAL_API_PREFIX = 'api';
const MAX_REQUEST_BODY_SIZE = '256kb';
const PRODUCTION_ENVIRONMENT = 'production';

/** Aplica a la aplicación toda la configuración global de la api de Rumb@. */
export function configureApp(app: NestExpressApplication): void {
  const configService = app.get(ConfigService);

  app.setGlobalPrefix(GLOBAL_API_PREFIX);
  app.use(helmet());
  app.use(requireJsonBody);
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

  // En producción no se publica la documentación: describir cada endpoint en abierto le ahorra
  // trabajo de reconocimiento a quien quiera atacar la api.
  const isProduction = configService.getOrThrow<string>('NODE_ENV') === PRODUCTION_ENVIRONMENT;
  if (!isProduction) {
    setupApiDocumentation(app);
  }
}
