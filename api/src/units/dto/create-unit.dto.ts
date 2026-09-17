// Datos que acepta la api para dar de alta una unidad.
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { TrimString } from '../../common/transforms/trim-string.js';
import { MAX_UNIT_CODE_LENGTH, MAX_UNIT_NAME_LENGTH } from '../schemas/unit.schema.js';

// Letras, dígitos y guiones, como en `BUS-001`. Evita espacios y símbolos en un identificador.
const UNIT_CODE_PATTERN = /^[A-Za-z0-9-]+$/;

/** Cuerpo de `POST /units`: código único y nombre de la unidad. */
export class CreateUnitDto {
  @TrimString()
  @IsString({ message: 'El código debe ser texto.' })
  @IsNotEmpty({ message: 'El código es obligatorio.' })
  @MaxLength(MAX_UNIT_CODE_LENGTH, {
    message: `El código admite como máximo ${MAX_UNIT_CODE_LENGTH} caracteres.`,
  })
  @Matches(UNIT_CODE_PATTERN, {
    message: 'El código solo admite letras, dígitos y guiones, por ejemplo BUS-001.',
  })
  code: string;

  @TrimString()
  @IsString({ message: 'El nombre debe ser texto.' })
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  @MaxLength(MAX_UNIT_NAME_LENGTH, {
    message: `El nombre admite como máximo ${MAX_UNIT_NAME_LENGTH} caracteres.`,
  })
  name: string;
}
