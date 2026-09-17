// Esquema de la unidad (vehículo). Además de sus datos, guarda `scheduleVersion`,
// el contador que la transacción de duties incrementa para bloquear la agenda de la unidad.
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { buildPublicJsonOptions } from '../../common/database/public-json.js';

export const MAX_UNIT_CODE_LENGTH = 20;
export const MAX_UNIT_NAME_LENGTH = 100;
const INITIAL_SCHEDULE_VERSION = 0;

@Schema({
  timestamps: true,
  // `scheduleVersion` es un detalle interno del bloqueo: no tiene significado para el cliente.
  toJSON: buildPublicJsonOptions(['scheduleVersion']),
})
export class Unit {
  // Se guarda en mayúsculas para que el índice único no distinga `bus-001` de `BUS-001`.
  @Prop({
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: MAX_UNIT_CODE_LENGTH,
  })
  code: string;

  @Prop({ required: true, trim: true, maxlength: MAX_UNIT_NAME_LENGTH })
  name: string;

  // Sin significado de negocio: existe solo para que dos transacciones que asignan duties a la
  // misma unidad escriban en el mismo documento y MongoDB detecte el conflicto. Ver CLAUDE.md §4.
  @Prop({ required: true, default: INITIAL_SCHEDULE_VERSION })
  scheduleVersion: number;
}

export type UnitDocument = HydratedDocument<Unit>;

export const UnitSchema = SchemaFactory.createForClass(Unit);
