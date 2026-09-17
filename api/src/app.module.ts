// Módulo raíz de la api: valida la configuración, abre la conexión con MongoDB
// y registra los módulos de dominio.
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { validateEnvironment } from './config/env.validation.js';
import { HealthModule } from './health/health.module.js';
import { RoutesModule } from './routes/routes.module.js';
import { UnitsModule } from './units/units.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnvironment,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    HealthModule,
    RoutesModule,
    UnitsModule,
  ],
})
export class AppModule {}
