// Esquema de la ruta: un nombre y una lista ordenada de puntos embebidos.
// El orden de los puntos es su posición en el arreglo; no hay campo de orden que pueda tener huecos.
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { buildPublicJsonOptions } from '../../common/database/public-json.js';

export const MAX_ROUTE_NAME_LENGTH = 100;
export const MAX_POINT_NAME_LENGTH = 100;
export const MIN_POINTS_PER_ROUTE = 2;
export const MAX_POINTS_PER_ROUTE = 200;
export const MIN_LATITUDE = -90;
export const MAX_LATITUDE = 90;
export const MIN_LONGITUDE = -180;
export const MAX_LONGITUDE = 180;

// Sin `_id` propio: un punto no se referencia desde fuera de su ruta.
@Schema({ _id: false })
export class RoutePoint {
  @Prop({ required: true, min: MIN_LATITUDE, max: MAX_LATITUDE })
  lat: number;

  @Prop({ required: true, min: MIN_LONGITUDE, max: MAX_LONGITUDE })
  lng: number;

  @Prop({ trim: true, maxlength: MAX_POINT_NAME_LENGTH })
  name?: string;
}

export const RoutePointSchema = SchemaFactory.createForClass(RoutePoint);

/** Indica si la ruta tiene una cantidad de puntos dentro de los límites permitidos. */
function hasAllowedPointCount(points: RoutePoint[]): boolean {
  const pointCount = points.length;
  return pointCount >= MIN_POINTS_PER_ROUTE && pointCount <= MAX_POINTS_PER_ROUTE;
}

@Schema({ timestamps: true, toJSON: buildPublicJsonOptions() })
export class Route {
  @Prop({ required: true, trim: true, minlength: 1, maxlength: MAX_ROUTE_NAME_LENGTH })
  name: string;

  // El dto ya valida esto; se repite en el esquema para que ninguna escritura que no pase
  // por el dto (un script, una actualización futura) pueda dejar una ruta inválida.
  @Prop({
    type: [RoutePointSchema],
    required: true,
    validate: {
      validator: hasAllowedPointCount,
      message: `Una ruta debe tener entre ${MIN_POINTS_PER_ROUTE} y ${MAX_POINTS_PER_ROUTE} puntos.`,
    },
  })
  points: RoutePoint[];
}

export type RouteDocument = HydratedDocument<Route>;

export const RouteSchema = SchemaFactory.createForClass(Route);
