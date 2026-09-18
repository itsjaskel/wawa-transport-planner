// Datos que acepta la api para editar una unidad. Solo el nombre: el código es el identificador que
// ve el planificador en los mensajes de conflicto y no se cambia sobre la marcha.
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { TrimString } from '../../common/transforms/trim-string.js';
import { MAX_UNIT_NAME_LENGTH } from '../schemas/unit.schema.js';

/** Cuerpo de `PATCH /units/:id`: el nuevo nombre de la unidad. */
export class UpdateUnitDto {
  @TrimString()
  @IsString({ message: 'El nombre debe ser texto.' })
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  @MaxLength(MAX_UNIT_NAME_LENGTH, {
    message: `El nombre admite como máximo ${MAX_UNIT_NAME_LENGTH} caracteres.`,
  })
  name: string;
}
