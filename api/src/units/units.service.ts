// Lectura, alta y edición de unidades. El borrado vive en el módulo de duties, porque depende de
// si la unidad tiene duties y debe coordinarse con su asignación (ver `DutiesService.deleteUnit`).
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { createNotFoundException } from '../common/errors/api-exception.js';
import type { CreateUnitDto } from './dto/create-unit.dto.js';
import type { UpdateUnitDto } from './dto/update-unit.dto.js';
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

  /** Cambia el nombre de una unidad; lanza 404 si no existe. */
  async updateUnitName(unitId: string, updateUnitDto: UpdateUnitDto): Promise<UnitDocument> {
    // Solo se toca `name`: el código y `scheduleVersion` no se modifican desde aquí.
    const updatedUnit = await this.unitModel
      .findByIdAndUpdate(
        unitId,
        { name: updateUnitDto.name },
        { runValidators: true, returnDocument: 'after' },
      )
      .exec();

    if (!updatedUnit) {
      throw createNotFoundException(`No existe una unidad con id ${unitId}.`);
    }
    return updatedUnit;
  }
}
