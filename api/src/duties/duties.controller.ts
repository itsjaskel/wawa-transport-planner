// Endpoints HTTP de duties: crear, eliminar y listar los duties de una ruta, y borrar unidades.
// `routes/:id/duties` y `units/:id` viven aquí, con su ruta completa, y no en los controladores de
// rutas y unidades, para que esos módulos y el de duties no se importen mutuamente.
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrorResponses } from '../common/documentation/api-documentation.js';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe.js';
import { DutiesService, type UnitAvailability } from './duties.service.js';
import { CreateDutyDto } from './dto/create-duty.dto.js';
import { DutyResponse, RouteDutyResponse } from './dto/duty-response.dto.js';
import { UnitAvailabilityQueryDto } from './dto/unit-availability-query.dto.js';
import { UnitAvailabilityResponse } from './dto/unit-availability-response.dto.js';
import { UpdateDutyDto } from './dto/update-duty.dto.js';
import type { DutyDocument } from './schemas/duty.schema.js';

@Controller()
export class DutiesController {
  constructor(private readonly dutiesService: DutiesService) {}

  /** Asigna una ruta a una unidad; 400 si los datos no son válidos, 404 si falta la ruta o la unidad y 409 si la ventana se solapa. */
  @Post('duties')
  @ApiTags('Duties')
  @ApiOperation({
    summary: 'Asigna una ruta a una unidad durante una ventana',
    description:
      'Rechaza con 409 si la unidad ya tiene un duty que se solapa; `details.conflictingDuty` ' +
      'indica cuál. La garantía se mantiene con peticiones simultáneas.',
  })
  @ApiCreatedResponse({ type: DutyResponse })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
    HttpStatus.SERVICE_UNAVAILABLE,
  )
  async createDuty(@Body() createDutyDto: CreateDutyDto): Promise<DutyDocument> {
    return this.dutiesService.createDuty(createDutyDto);
  }

  /** Cambia la unidad y la ventana de un duty; 400 si los datos no son válidos, 404 si faltan el duty o la unidad y 409 si se solapa. */
  @Put('duties/:id')
  @ApiTags('Duties')
  @ApiOperation({
    summary: 'Cambia la unidad y la ventana de un duty',
    description:
      'Misma garantía que al crear: rechaza con 409 si la unidad de destino ya tiene otro duty que ' +
      'se solapa. La ruta no se cambia.',
  })
  @ApiOkResponse({ type: DutyResponse })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
    HttpStatus.SERVICE_UNAVAILABLE,
  )
  async updateDuty(
    @Param('id', ParseObjectIdPipe) dutyId: string,
    @Body() updateDutyDto: UpdateDutyDto,
  ): Promise<DutyDocument> {
    return this.dutiesService.updateDuty(dutyId, updateDutyDto);
  }

  /** Elimina un duty; responde 204 sin cuerpo, 400 si el id no es válido y 404 si no existe. */
  @Delete('duties/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiTags('Duties')
  @ApiOperation({ summary: 'Elimina un duty' })
  @ApiNoContentResponse({ description: 'Duty eliminado.' })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async deleteDuty(@Param('id', ParseObjectIdPipe) dutyId: string): Promise<void> {
    await this.dutiesService.deleteDuty(dutyId);
  }

  /** Indica qué unidades están libres en una ventana; responde 400 si la ventana no es válida. */
  @Get('units/availability')
  @ApiTags('Unidades')
  @ApiOperation({
    summary: 'Disponibilidad de las unidades en una ventana',
    description:
      'Ayuda para planificar, no una garantía: una unidad libre puede ocuparse un instante después. ' +
      'La garantía la da `POST /duties`, que responde 409 si la ventana ya está ocupada.',
  })
  @ApiOkResponse({ type: [UnitAvailabilityResponse] })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  async listUnitAvailability(
    @Query() availabilityQuery: UnitAvailabilityQueryDto,
  ): Promise<UnitAvailability[]> {
    return this.dutiesService.findUnitAvailability(availabilityQuery);
  }

  /** Borra una unidad sin duties; 204 sin cuerpo, 400 si el id no es válido, 404 si no existe y 409 si tiene duties. */
  @Delete('units/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiTags('Unidades')
  @ApiOperation({
    summary: 'Borra una unidad que no tiene duties',
    description: 'Si tiene duties responde 409 `UnitInUse` con las rutas donde están.',
  })
  @ApiNoContentResponse({ description: 'Unidad eliminada.' })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  async deleteUnit(@Param('id', ParseObjectIdPipe) unitId: string): Promise<void> {
    await this.dutiesService.deleteUnit(unitId);
  }

  /** Lista los duties de una ruta con su unidad, ordenados por inicio; 404 si la ruta no existe. */
  @Get('routes/:id/duties')
  @ApiTags('Duties')
  @ApiOperation({ summary: 'Duties de una ruta con su unidad, ordenados por inicio' })
  @ApiOkResponse({ type: [RouteDutyResponse] })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async listRouteDuties(@Param('id', ParseObjectIdPipe) routeId: string): Promise<DutyDocument[]> {
    return this.dutiesService.findRouteDuties(routeId);
  }
}
