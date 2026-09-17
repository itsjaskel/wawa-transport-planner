// Cliente HTTP único de la aplicación: concentra la url base de la api y la
// traducción de una respuesta de error a algo que la interfaz pueda mostrar.

// Vite incrusta esta variable en tiempo de compilación, no de ejecución.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

/** Error de una llamada a la api, con el código de estado para que la interfaz decida que mostrar. */
export class ApiError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

/** Lee el mensaje legible que trae el cuerpo de una respuesta de error de la api. */
async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();

    if (typeof body?.message === 'string') {
      return body.message;
    }

    return `La api respondio con el código ${response.status}.`;
  } catch {
    return `La api respondio con el código ${response.status}.`;
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
    const message = await readErrorMessage(response);
    throw new ApiError(response.status, message);
  }

  return (await response.json()) as TResponse;
}
