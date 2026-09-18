// Cliente HTTP único de la aplicación: concentra la url base de la api y la
// traducción de una respuesta de error a algo que la interfaz pueda mostrar.
import type { ConflictingDuty, InvalidField } from './types';

// Vite incrusta esta variable en tiempo de compilación, no de ejecución.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
const HTTP_STATUS_NO_CONTENT = 204;
const UNREADABLE_ERROR_TYPE = 'UnreadableError';

/** Cuerpo de error uniforme que devuelve la api. */
interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
}

/** Error de una llamada a la api, con código, tipo y detalles para que la interfaz decida qué mostrar. */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly errorType: string;
  readonly details: unknown;

  /** Crea el error con los datos del cuerpo de error de la api. */
  constructor(statusCode: number, errorType: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.details = details;
  }

  /** Devuelve los campos inválidos de un error de validación, o una lista vacía. */
  readInvalidFields(): InvalidField[] {
    const isValidationError = this.errorType === 'ValidationError' && Array.isArray(this.details);
    if (!isValidationError) {
      return [];
    }
    return this.details as InvalidField[];
  }

  /** Devuelve el duty con el que choca un 409 de solapamiento, o null si no es ese error. */
  readConflictingDuty(): ConflictingDuty | null {
    const isOverlapConflict = this.errorType === 'Conflict';
    if (!isOverlapConflict) {
      return null;
    }
    const conflictDetails = this.details as { conflictingDuty?: ConflictingDuty } | undefined;
    return conflictDetails?.conflictingDuty ?? null;
  }
}

/** Convierte una respuesta de error en ApiError, aunque el cuerpo no tenga el formato esperado. */
async function createApiError(response: Response): Promise<ApiError> {
  const fallbackMessage = `La api respondió con el código ${response.status}.`;

  try {
    const body = (await response.json()) as Partial<ApiErrorBody>;
    const message = typeof body.message === 'string' ? body.message : fallbackMessage;
    const errorType = typeof body.error === 'string' ? body.error : UNREADABLE_ERROR_TYPE;
    return new ApiError(response.status, errorType, message, body.details);
  } catch {
    return new ApiError(response.status, UNREADABLE_ERROR_TYPE, fallbackMessage);
  }
}

/** Llama a la api y devuelve el cuerpo ya convertido, o lanza un ApiError si la respuesta no es correcta. */
export async function requestApi<TResponse>(
  path: string,
  options: RequestInit = {},
): Promise<TResponse> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw await createApiError(response);
  }

  // Un 204 (por ejemplo, al borrar) no trae cuerpo: leerlo como JSON fallaría.
  if (response.status === HTTP_STATUS_NO_CONTENT) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

/** Envía un cuerpo JSON con el método indicado. */
export function sendApiJson<TResponse>(
  method: string,
  path: string,
  body: unknown,
): Promise<TResponse> {
  return requestApi<TResponse>(path, { method, body: JSON.stringify(body) });
}
