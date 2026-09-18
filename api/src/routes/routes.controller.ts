// Endpoints HTTP de rutas: listado, detalle, creación y reemplazo.
import { Body, Controller, Get, HttpStatus, Param, Post, Put } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../common/documentation/api-documentation.js';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe.js';
import { RouteResponse, RouteSummaryResponse } from './dto/route-response.dto.js';
import { SaveRouteDto } from './dto/save-route.dto.js';
import { RoutesService, type RouteSummary } from './routes.service.js';
import type { RouteDocument } from './schemas/route.schema.js';

@ApiTags('Rutas')
@Controller('routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  /** Lista las rutas con su nombre, cantidad de puntos y fechas. */
  @Get()
  @ApiOperation({ summary: 'Lista las rutas, las actualizadas más recientemente primero' })
  @ApiOkResponse({ type: [RouteSummaryResponse] })
  async listRoutes(): Promise<RouteSummary[]> {
    return this.routesService.findAllRouteSummaries();
  }

  /** Devuelve el detalle de una ruta; responde 400 si el id no es válido y 404 si no existe. */
  @Get(':id')
  @ApiOperation({ summary: 'Detalle de una ruta con sus puntos en orden' })
  @ApiOkResponse({ type: RouteResponse })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async getRoute(@Param('id', ParseObjectIdPipe) routeId: string): Promise<RouteDocument> {
    return this.routesService.findRouteById(routeId);
  }

  /** Crea una ruta; responde 400 si los datos no son válidos. */
  @Post()
  @ApiOperation({ summary: 'Crea una ruta' })
  @ApiCreatedResponse({ type: RouteResponse })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  async createRoute(@Body() saveRouteDto: SaveRouteDto): Promise<RouteDocument> {
    return this.routesService.createRoute(saveRouteDto);
  }

  /** Reemplaza nombre y puntos de una ruta; responde 400 si los datos no son válidos y 404 si no existe. */
  @Put(':id')
  @ApiOperation({ summary: 'Reemplaza el nombre y todos los puntos de una ruta' })
  @ApiOkResponse({ type: RouteResponse })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async replaceRoute(
    @Param('id', ParseObjectIdPipe) routeId: string,
    @Body() saveRouteDto: SaveRouteDto,
  ): Promise<RouteDocument> {
    return this.routesService.replaceRoute(routeId, saveRouteDto);
  }
}
