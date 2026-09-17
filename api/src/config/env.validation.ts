// Declara las variables de entorno que la api necesita y las valida antes de arrancar,
// para que un despliegue mal configurado falle de inmediato y no a mitad de una petición.
import { plainToInstance, Type } from 'class-transformer';
import { IsIn, IsInt, IsString, Max, Min, MinLength, validateSync } from 'class-validator';

const NODE_ENVIRONMENTS = ['development', 'production', 'test'] as const;
const MIN_TCP_PORT = 1;
const MAX_TCP_PORT = 65535;

/** Describe, con sus reglas de validación, las variables de entorno que la api exige. */
export class EnvironmentVariables {
  @IsIn(NODE_ENVIRONMENTS)
  NODE_ENV: string;

  @Type(() => Number)
  @IsInt()
  @Min(MIN_TCP_PORT)
  @Max(MAX_TCP_PORT)
  API_PORT: number;

  @IsString()
  @MinLength(1)
  MONGODB_URI: string;

  @IsString()
  @MinLength(1)
  CORS_ORIGIN: string;
}

/** Valida las variables de entorno al arrancar y lanza un error legible si falta o sobra alguna. */
export function validateEnvironment(rawEnvironment: Record<string, unknown>): EnvironmentVariables {
  const environment = plainToInstance(EnvironmentVariables, rawEnvironment);
  const validationErrors = validateSync(environment, { skipMissingProperties: false });

  if (validationErrors.length === 0) {
    return environment;
  }

  const readableProblems = validationErrors.map((validationError) => {
    const constraintMessages = Object.values(validationError.constraints ?? {});
    return `${validationError.property}: ${constraintMessages.join(', ')}`;
  });

  throw new Error(`Variables de entorno inválidas:\n- ${readableProblems.join('\n- ')}`);
}
