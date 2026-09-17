// Lectura, creación y reemplazo de rutas.
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { createNotFoundException } from '../common/errors/api-exception.js';
import type { SaveRouteDto } from './dto/save-route.dto.js';
import { Route, type RouteDocument } from './schemas/route.schema.js';

/** Resumen de una ruta para el listado, sin sus puntos. */
export interface RouteSummary {
  id: string;
  name: string;
  pointCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Gestiona las rutas y sus puntos. */
@Injectable()
export class RoutesService {
  constructor(@InjectModel(Route.name) private readonly routeModel: Model<Route>) {}

  /** Devuelve el resumen de todas las rutas, las actualizadas más recientemente primero. */
  async findAllRouteSummaries(): Promise<RouteSummary[]> {
    // Se cuenta en la base con `$size` para no transferir hasta 200 puntos por ruta
    // solo para saber cuántos son.
    return this.routeModel
      .aggregate<RouteSummary>([
        { $sort: { updatedAt: -1 } },
        {
          $project: {
            _id: 0,
            id: { $toString: '$_id' },
            name: 1,
            pointCount: { $size: '$points' },
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ])
      .exec();
  }

  /** Devuelve una ruta con sus puntos; lanza 404 si no existe. */
  async findRouteById(routeId: string): Promise<RouteDocument> {
    const route = await this.routeModel.findById(routeId).exec();

    if (!route) {
      throw createNotFoundException(`No existe una ruta con id ${routeId}.`);
    }

    return route;
  }

  /** Crea una ruta con su nombre y sus puntos en el orden recibido. */
  async createRoute(saveRouteDto: SaveRouteDto): Promise<RouteDocument> {
    return this.routeModel.create({ name: saveRouteDto.name, points: saveRouteDto.points });
  }

  /** Reemplaza el nombre y todos los puntos de una ruta; lanza 404 si no existe. */
  async replaceRoute(routeId: string, saveRouteDto: SaveRouteDto): Promise<RouteDocument> {
    const replacedRoute = await this.routeModel
      .findByIdAndUpdate(
        routeId,
        { name: saveRouteDto.name, points: saveRouteDto.points },
        // Sin `runValidators`, Mongoose no aplica los validadores del esquema en las
        // actualizaciones y una ruta podría quedar con puntos fuera de rango.
        { runValidators: true, returnDocument: 'after' },
      )
      .exec();

    if (!replacedRoute) {
      throw createNotFoundException(`No existe una ruta con id ${routeId}.`);
    }

    return replacedRoute;
  }
}
