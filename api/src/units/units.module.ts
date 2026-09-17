// Agrupa el esquema, el servicio y los endpoints de unidades.
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Unit, UnitSchema } from './schemas/unit.schema.js';
import { UnitsController } from './units.controller.js';
import { UnitsService } from './units.service.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Unit.name, schema: UnitSchema }])],
  controllers: [UnitsController],
  providers: [UnitsService],
  // El modelo se exporta porque la transacción de duties (Fase 2) incrementa `scheduleVersion`.
  exports: [MongooseModule],
})
export class UnitsModule {}
