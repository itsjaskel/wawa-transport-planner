// Endpoints HTTP de unidades: listado, alta y edición del nombre. `DELETE /units/:id` vive en el
// controlador de duties, porque solo se puede borrar una unidad sin duties.
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe.js';
import { CreateUnitDto } from './dto/create-unit.dto.js';
import { UpdateUnitDto } from './dto/update-unit.dto.js';
import type { UnitDocument } from './schemas/unit.schema.js';
import { UnitsService } from './units.service.js';

@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  /** Lista todas las unidades ordenadas por código. */
  @Get()
  async listUnits(): Promise<UnitDocument[]> {
    return this.unitsService.findAllUnits();
  }

  /** Crea una unidad; responde 400 si los datos no son válidos y 409 si el código ya existe. */
  @Post()
  async createUnit(@Body() createUnitDto: CreateUnitDto): Promise<UnitDocument> {
    return this.unitsService.createUnit(createUnitDto);
  }

  /** Cambia el nombre de una unidad; responde 400 si los datos no son válidos y 404 si no existe. */
  @Patch(':id')
  async updateUnit(
    @Param('id', ParseObjectIdPipe) unitId: string,
    @Body() updateUnitDto: UpdateUnitDto,
  ): Promise<UnitDocument> {
    return this.unitsService.updateUnitName(unitId, updateUnitDto);
  }
}
