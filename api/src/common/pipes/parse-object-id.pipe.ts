// Valida que un parámetro de la url tenga formato de ObjectId antes de que llegue a Mongoose,
// para responder 400 en lugar de dejar que el CastError termine en un 500.
import { HttpStatus, Injectable, type PipeTransform } from '@nestjs/common';
import { API_ERROR_TYPES, ApiException } from '../errors/api-exception.js';

// Un ObjectId en texto son exactamente 24 dígitos hexadecimales. No se usa
// `Types.ObjectId.isValid` porque también acepta cualquier cadena de 12 caracteres.
const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

/** Deja pasar el parámetro si es un ObjectId válido; si no, responde 400 con tipo InvalidId. */
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  /** Devuelve el id sin cambios si tiene formato de ObjectId; lanza 400 si no lo tiene. */
  transform(value: string): string {
    const isObjectId = OBJECT_ID_PATTERN.test(value);

    if (!isObjectId) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        API_ERROR_TYPES.invalidId,
        `"${value}" no es un id válido.`,
      );
    }

    return value;
  }
}
