// Esquema del duty: la asignación de una ruta a una unidad durante una ventana de tiempo.
// Las fechas se guardan como Date (UTC en MongoDB), nunca como texto.
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import type { HydratedDocument, Types } from 'mongoose';
import { buildPublicJsonOptions } from '../../common/database/public-json.js';
import { Route } from '../../routes/schemas/route.schema.js';
import { Unit } from '../../units/schemas/unit.schema.js';

export const END_AFTER_START_MESSAGE = 'El fin debe ser posterior al inicio.';

// `virtuals` hace que el campo virtual `unit` salga en la respuesta cuando se ha poblado.
@Schema({ timestamps: true, toJSON: { ...buildPublicJsonOptions(), virtuals: true } })
export class Duty {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Route.name, required: true })
  routeId: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Unit.name, required: true })
  unitId: Types.ObjectId;

  @Prop({ type: Date, required: true })
  startAt: Date;

  @Prop({ type: Date, required: true })
  endAt: Date;
}

export type DutyDocument = HydratedDocument<Duty>;

export const DutySchema = SchemaFactory.createForClass(Duty);

// Unidad completa del duty, disponible solo cuando se pide con `populate('unit')`. Se usa un
// campo virtual para que `unitId` siga siendo el id y la unidad llegue aparte, en `unit`.
DutySchema.virtual('unit', {
  ref: Unit.name,
  localField: 'unitId',
  foreignField: '_id',
  justOne: true,
});

// El dto ya lo valida; se repite aquí para que ninguna escritura que no pase por el dto
// pueda guardar una ventana vacía o invertida.
DutySchema.path('endAt').validate(function validateEndAfterStart(this: Duty, endAt: Date) {
  return endAt > this.startAt;
}, END_AFTER_START_MESSAGE);

// Sirve a la búsqueda de solapamientos: todos los duties de una unidad acotados por fecha.
DutySchema.index({ unitId: 1, startAt: 1, endAt: 1 });
// Sirve al listado de duties de una ruta, ordenado por inicio.
DutySchema.index({ routeId: 1, startAt: 1 });
