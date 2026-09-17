// Endpoints HTTP de unidades: `GET /units` y `POST /units`.
import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateUnitDto } from './dto/create-unit.dto.js';
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
}
