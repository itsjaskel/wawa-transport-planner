// Datos que acepta la api para crear una ruta o reemplazarla por completo.
// El mismo dto sirve a `POST /routes` y a `PUT /routes/:id`, porque el PUT reemplaza nombre y puntos.
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { TrimOptionalString, TrimString } from '../../common/transforms/trim-string.js';
import {
  MAX_LATITUDE,
  MAX_LONGITUDE,
  MAX_POINT_NAME_LENGTH,
  MAX_POINTS_PER_ROUTE,
  MAX_ROUTE_NAME_LENGTH,
  MIN_LATITUDE,
  MIN_LONGITUDE,
  MIN_POINTS_PER_ROUTE,
} from '../schemas/route.schema.js';

// Rechaza NaN e Infinity, que JSON no produce pero la transformación de tipos sí podría.
const FINITE_NUMBER_OPTIONS = { allowNaN: false, allowInfinity: false };

/** Un punto de la ruta: latitud, longitud y un nombre opcional. */
export class RoutePointDto {
  @ApiProperty({ example: 19.4326, minimum: MIN_LATITUDE, maximum: MAX_LATITUDE })
  @IsNumber(FINITE_NUMBER_OPTIONS, { message: 'La latitud debe ser un número.' })
  @Min(MIN_LATITUDE, { message: `La latitud debe estar entre ${MIN_LATITUDE} y ${MAX_LATITUDE}.` })
  @Max(MAX_LATITUDE, { message: `La latitud debe estar entre ${MIN_LATITUDE} y ${MAX_LATITUDE}.` })
  lat: number;

  @ApiProperty({ example: -99.1332, minimum: MIN_LONGITUDE, maximum: MAX_LONGITUDE })
  @IsNumber(FINITE_NUMBER_OPTIONS, { message: 'La longitud debe ser un número.' })
  @Min(MIN_LONGITUDE, {
    message: `La longitud debe estar entre ${MIN_LONGITUDE} y ${MAX_LONGITUDE}.`,
  })
  @Max(MAX_LONGITUDE, {
    message: `La longitud debe estar entre ${MIN_LONGITUDE} y ${MAX_LONGITUDE}.`,
  })
  lng: number;

  @ApiPropertyOptional({ example: 'Zócalo', maxLength: MAX_POINT_NAME_LENGTH })
  @TrimOptionalString()
  @IsOptional()
  @IsString({ message: 'El nombre del punto debe ser texto.' })
  @MaxLength(MAX_POINT_NAME_LENGTH, {
    message: `El nombre del punto admite como máximo ${MAX_POINT_NAME_LENGTH} caracteres.`,
  })
  name?: string;
}

/** Cuerpo de `POST /routes` y `PUT /routes/:id`: nombre y lista ordenada de puntos. */
export class SaveRouteDto {
  @ApiProperty({ example: 'Centro - Polanco', maxLength: MAX_ROUTE_NAME_LENGTH })
  @TrimString()
  @IsString({ message: 'El nombre debe ser texto.' })
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  @MaxLength(MAX_ROUTE_NAME_LENGTH, {
    message: `El nombre admite como máximo ${MAX_ROUTE_NAME_LENGTH} caracteres.`,
  })
  name: string;

  @ApiProperty({
    type: [RoutePointDto],
    minItems: MIN_POINTS_PER_ROUTE,
    maxItems: MAX_POINTS_PER_ROUTE,
    description: 'Puntos en orden de recorrido: el orden es la posición en la lista.',
  })
  @IsArray({ message: 'Los puntos deben ser una lista.' })
  @ArrayMinSize(MIN_POINTS_PER_ROUTE, {
    message: `Una ruta necesita al menos ${MIN_POINTS_PER_ROUTE} puntos.`,
  })
  @ArrayMaxSize(MAX_POINTS_PER_ROUTE, {
    message: `Una ruta admite como máximo ${MAX_POINTS_PER_ROUTE} puntos.`,
  })
  @ValidateNested({ each: true })
  @Type(() => RoutePointDto)
  points: RoutePointDto[];
}
