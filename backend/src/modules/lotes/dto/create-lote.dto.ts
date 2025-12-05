import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray, ValidateNested, IsIn, IsObject, Max } from 'class-validator';
import { Type } from 'class-transformer';

// Clase para validar coordenadas puntuales
export class PointCoordenadaDto {
  @IsNumber({}, { message: 'La latitud debe ser un número.' })
  lat: number;

  @IsNumber({}, { message: 'La longitud debe ser un número.' })
  lng: number;
}

// Clase para validar coordenadas de polígono
export class PolygonCoordenadaDto {
  @IsNumber({}, { message: 'La latitud debe ser un número.' })
  lat: number;

  @IsNumber({}, { message: 'La longitud debe ser un número.' })
  lng: number;
}

// Clase para validar el objeto de coordenadas
export class CoordenadasDto {
  @IsString()
  @IsIn(['point', 'polygon'], { message: 'El tipo debe ser "point" o "polygon".' })
  type: 'point' | 'polygon';

  @IsOptional()
  coordinates?: PointCoordenadaDto | PolygonCoordenadaDto[];
}

export class CreateLoteDto {
  @IsString({ message: 'El nombre del lote debe ser un texto.' })
  @IsNotEmpty({ message: 'El nombre del lote es requerido.' })
  nombre: string;

  @IsNumber({}, { message: 'El área debe ser un valor numérico.' })
  @IsNotEmpty({ message: 'El área es requerida.' })
  @Max(10000, { message: 'El área del lote no puede superar los 10000 m².' })
  area: number;

  @IsString()
  @IsOptional()
  @IsIn(['Activo', 'Inactivo', 'En preparación'])
  estado?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => CoordenadasDto)
  @IsOptional()
  coordenadas?: CoordenadasDto;
}
