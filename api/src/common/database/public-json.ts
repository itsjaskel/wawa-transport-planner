// Opciones de serialización que dan a todos los documentos la misma forma pública:
// `id` en texto en lugar de `_id`, sin `__v` y sin los campos internos que se indiquen.
import type { ToObjectOptions } from 'mongoose';

/** Construye las opciones de `toJSON` que exponen `id` y ocultan `_id`, `__v` y los campos internos. */
export function buildPublicJsonOptions(hiddenFields: string[] = []): ToObjectOptions {
  return {
    versionKey: false,
    transform: (_document, serializedDocument: Record<string, unknown>) => {
      serializedDocument.id = String(serializedDocument._id);
      delete serializedDocument._id;

      for (const hiddenField of hiddenFields) {
        delete serializedDocument[hiddenField];
      }

      return serializedDocument;
    },
  };
}
