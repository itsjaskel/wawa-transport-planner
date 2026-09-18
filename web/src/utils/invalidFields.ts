// Agrupa los errores de validación de la api por campo, para mostrarlos junto a cada uno.
import { ApiError } from '../api/client';

/** Mensajes de error indexados por la ruta del campo (`name`, `points.3.lat`...). */
export type FieldMessages = Record<string, string[]>;

/** Devuelve los mensajes de error por campo si el error es de validación; si no, un objeto vacío. */
export function groupFieldMessages(error: unknown): FieldMessages {
  if (!(error instanceof ApiError)) {
    return {};
  }

  const fieldMessages: FieldMessages = {};
  for (const invalidField of error.readInvalidFields()) {
    fieldMessages[invalidField.field] = invalidField.messages;
  }
  return fieldMessages;
}

/** Indica si un error es de validación con campos concretos, que ya se muestran junto a cada campo. */
export function hasFieldMessages(error: unknown): boolean {
  return Object.keys(groupFieldMessages(error)).length > 0;
}
