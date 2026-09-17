// Lectura y alta de unidades.
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { CreateUnitDto } from './dto/create-unit.dto.js';
import { Unit, type UnitDocument } from './schemas/unit.schema.js';

/** Gestiona las unidades de la flota. */
@Injectable()
export class UnitsService {
  constructor(@InjectModel(Unit.name) private readonly unitModel: Model<Unit>) {}

  /** Devuelve todas las unidades ordenadas por código. */
  async findAllUnits(): Promise<UnitDocument[]> {
    return this.unitModel.find().sort({ code: 1 }).exec();
  }

  /** Da de alta una unidad; si el código ya existe, el índice único provoca un 409. */
  async createUnit(createUnitDto: CreateUnitDto): Promise<UnitDocument> {
    return this.unitModel.create({ code: createUnitDto.code, name: createUnitDto.name });
  }
}
