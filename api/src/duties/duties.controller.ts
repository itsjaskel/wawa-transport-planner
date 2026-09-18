// Endpoints HTTP de duties: crear, eliminar y listar los duties de una ruta.
// El listado usa la ruta completa `routes/:id/duties` aquí, y no en el controlador de rutas,
// para que los módulos de rutas y de duties no se importen mutuamente.
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe.js';
import { DutiesService } from './duties.service.js';
import { CreateDutyDto } from './dto/create-duty.dto.js';
import type { DutyDocument } from './schemas/duty.schema.js';

@Controller()
export class DutiesController {
  constructor(private readonly dutiesService: DutiesService) {}

  /** Asigna una ruta a una unidad; 400 si los datos no son válidos, 404 si falta la ruta o la unidad y 409 si la ventana se solapa. */
  @Post('duties')
  async createDuty(@Body() createDutyDto: CreateDutyDto): Promise<DutyDocument> {
    return this.dutiesService.createDuty(createDutyDto);
  }

  /** Elimina un duty; responde 204 sin cuerpo, 400 si el id no es válido y 404 si no existe. */
  @Delete('duties/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDuty(@Param('id', ParseObjectIdPipe) dutyId: string): Promise<void> {
    await this.dutiesService.deleteDuty(dutyId);
  }

  /** Lista los duties de una ruta con su unidad, ordenados por inicio; 404 si la ruta no existe. */
  @Get('routes/:id/duties')
  async listRouteDuties(@Param('id', ParseObjectIdPipe) routeId: string): Promise<DutyDocument[]> {
    return this.dutiesService.findRouteDuties(routeId);
  }
}
