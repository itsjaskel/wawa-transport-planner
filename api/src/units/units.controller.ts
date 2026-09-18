// Endpoints HTTP de unidades: listado, alta y edición del nombre. `DELETE /units/:id` vive en el
// controlador de duties, porque solo se puede borrar una unidad sin duties.
import { Body, Controller, Get, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../common/documentation/api-documentation.js';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe.js';
import { CreateUnitDto } from './dto/create-unit.dto.js';
import { UnitResponse } from './dto/unit-response.dto.js';
import { UpdateUnitDto } from './dto/update-unit.dto.js';
import type { UnitDocument } from './schemas/unit.schema.js';
import { UnitsService } from './units.service.js';

@ApiTags('Unidades')
@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  /** Lista todas las unidades ordenadas por código. */
  @Get()
  @ApiOperation({ summary: 'Lista las unidades ordenadas por código' })
  @ApiOkResponse({ type: [UnitResponse] })
  async listUnits(): Promise<UnitDocument[]> {
    return this.unitsService.findAllUnits();
  }

  /** Crea una unidad; responde 400 si los datos no son válidos y 409 si el código ya existe. */
  @Post()
  @ApiOperation({ summary: 'Da de alta una unidad' })
  @ApiCreatedResponse({ type: UnitResponse })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  async createUnit(@Body() createUnitDto: CreateUnitDto): Promise<UnitDocument> {
    return this.unitsService.createUnit(createUnitDto);
  }

  /** Cambia el nombre de una unidad; responde 400 si los datos no son válidos y 404 si no existe. */
  @Patch(':id')
  @ApiOperation({ summary: 'Cambia el nombre de una unidad (el código no se edita)' })
  @ApiOkResponse({ type: UnitResponse })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async updateUnit(
    @Param('id', ParseObjectIdPipe) unitId: string,
    @Body() updateUnitDto: UpdateUnitDto,
  ): Promise<UnitDocument> {
    return this.unitsService.updateUnitName(unitId, updateUnitDto);
  }
}
