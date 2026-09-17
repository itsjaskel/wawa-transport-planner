// Agrupa el esquema, el servicio y los endpoints de rutas.
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoutesController } from './routes.controller.js';
import { RoutesService } from './routes.service.js';
import { Route, RouteSchema } from './schemas/route.schema.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Route.name, schema: RouteSchema }])],
  controllers: [RoutesController],
  providers: [RoutesService],
  // El modelo se exporta porque la transacción de duties (Fase 2) verifica que la ruta exista.
  exports: [MongooseModule],
})
export class RoutesModule {}
