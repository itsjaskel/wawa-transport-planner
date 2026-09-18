// Longitudes máximas de los campos de texto de los formularios. DEBEN COINCIDIR con las de la api
// (`api/src/*/schemas/*.schema.ts`): aquí solo impiden escribir de más; la api es la que valida.

export const MAX_UNIT_CODE_LENGTH = 20;
export const MAX_UNIT_NAME_LENGTH = 100;
export const MAX_ROUTE_NAME_LENGTH = 100;
export const MAX_POINT_NAME_LENGTH = 100;
// Una coordenada con signo y muchos decimales (`-179.123456789012`) cabe de sobra.
export const MAX_COORDINATE_TEXT_LENGTH = 20;
