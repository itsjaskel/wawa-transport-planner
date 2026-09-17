// Endpoints HTTP de rutas: listado, detalle, creación y reemplazo.
import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe.js';
import { SaveRouteDto } from './dto/save-route.dto.js';
import { RoutesService, type RouteSummary } from './routes.service.js';
import type { RouteDocument } from './schemas/route.schema.js';

@Controller('routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  /** Lista las rutas con su nombre, cantidad de puntos y fechas. */
  @Get()
  async listRoutes(): Promise<RouteSummary[]> {
    return this.routesService.findAllRouteSummaries();
  }

  /** Devuelve el detalle de una ruta; responde 400 si el id no es válido y 404 si no existe. */
  @Get(':id')
  async getRoute(@Param('id', ParseObjectIdPipe) routeId: string): Promise<RouteDocument> {
    return this.routesService.findRouteById(routeId);
  }

  /** Crea una ruta; responde 400 si los datos no son válidos. */
  @Post()
  async createRoute(@Body() saveRouteDto: SaveRouteDto): Promise<RouteDocument> {
    return this.routesService.createRoute(saveRouteDto);
  }

  /** Reemplaza nombre y puntos de una ruta; responde 400 si los datos no son válidos y 404 si no existe. */
  @Put(':id')
  async replaceRoute(
    @Param('id', ParseObjectIdPipe) routeId: string,
    @Body() saveRouteDto: SaveRouteDto,
  ): Promise<RouteDocument> {
    return this.routesService.replaceRoute(routeId, saveRouteDto);
  }
}
