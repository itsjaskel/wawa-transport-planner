// Transformaciones de texto para los dtos, aplicadas antes de validar.
import { Transform } from 'class-transformer';

/** Recorta los espacios de los extremos si el valor es texto; cualquier otro tipo pasa intacto para que lo rechace la validación. */
export function TrimString(): PropertyDecorator {
  return Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }
    return value.trim();
  });
}

/** Recorta el texto y convierte el texto vacío en ausente, para campos opcionales. */
export function TrimOptionalString(): PropertyDecorator {
  return Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmedValue = value.trim();
    const isBlank = trimmedValue === '';

    if (isBlank) {
      return undefined;
    }
    return trimmedValue;
  });
}
