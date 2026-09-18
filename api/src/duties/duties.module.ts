// Agrupa el esquema, el servicio y los endpoints de duties.
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoutesModule } from '../routes/routes.module.js';
import { UnitsModule } from '../units/units.module.js';
import { DutiesController } from './duties.controller.js';
import { DutiesService } from './duties.service.js';
import { Duty, DutySchema } from './schemas/duty.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Duty.name, schema: DutySchema }]),
    // La transacción necesita el modelo de unidad (bloqueo) y el de ruta (existencia).
    UnitsModule,
    RoutesModule,
  ],
  controllers: [DutiesController],
  providers: [DutiesService],
})
export class DutiesModule {}
