// Convierte los errores de class-validator en la lista de campos del formato uniforme,
// conservando la ruta completa de los campos anidados (por ejemplo `points.3.lat`).
import { HttpStatus } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { API_ERROR_TYPES, ApiException } from './api-exception.js';

/** Un campo inválido y los motivos por los que no pasó la validación. */
export interface InvalidField {
  field: string;
  messages: string[];
}

const VALIDATION_FAILED_MESSAGE = 'Los datos enviados no son válidos.';

// Mensajes que class-validator genera por su cuenta, en inglés y sin opción `message` en un
// decorador. Se traducen por la clave de la restricción, que es estable, y no por el texto.
const SPANISH_MESSAGE_BY_CONSTRAINT: Record<string, string> = {
  whitelistValidation: 'Este campo no está permitido.',
  nestedValidation: 'Debe ser un objeto.',
  unknownValue: 'El cuerpo de la petición debe ser un objeto JSON.',
};

/** Devuelve los mensajes de las restricciones incumplidas, traduciendo los que genera la librería. */
function readConstraintMessages(constraints: Record<string, string>): string[] {
  return Object.entries(constraints).map(([constraintName, originalMessage]) => {
    return SPANISH_MESSAGE_BY_CONSTRAINT[constraintName] ?? originalMessage;
  });
}

/** Aplana el árbol de errores de class-validator en una lista de campos con su ruta completa. */
export function flattenValidationErrors(
  validationErrors: ValidationError[],
  parentPath = '',
): InvalidField[] {
  const invalidFields: InvalidField[] = [];

  for (const validationError of validationErrors) {
    const fieldPath = buildFieldPath(parentPath, validationError.property);
    const constraintMessages = readConstraintMessages(validationError.constraints ?? {});

    if (constraintMessages.length > 0) {
      invalidFields.push({ field: fieldPath, messages: constraintMessages });
    }

    const childErrors = validationError.children ?? [];
    invalidFields.push(...flattenValidationErrors(childErrors, fieldPath));
  }

  return invalidFields;
}

/** Une la ruta del campo padre con el nombre del campo hijo. */
function buildFieldPath(parentPath: string, property: string): string {
  if (parentPath === '') {
    return property;
  }
  return `${parentPath}.${property}`;
}

/** Crea el error 400 que el ValidationPipe global lanza cuando un dto no es válido. */
export function createValidationException(validationErrors: ValidationError[]): ApiException {
  const invalidFields = flattenValidationErrors(validationErrors);
  return new ApiException(
    HttpStatus.BAD_REQUEST,
    API_ERROR_TYPES.validation,
    VALIDATION_FAILED_MESSAGE,
    invalidFields,
  );
}
