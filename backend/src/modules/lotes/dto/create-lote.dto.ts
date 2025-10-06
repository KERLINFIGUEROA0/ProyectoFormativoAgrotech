import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
// Clase para validar cada objeto de coordenada
export class CoordenadaDto {
  @IsNumber({}, { message: 'La latitud debe ser un número.' })
  lat: number;

  @IsNumber({}, { message: 'La longitud debe ser un número.' })
  lng: number;
}

export class CreateLoteDto {
  @IsString({ message: 'El nombre del lote debe ser un texto.' })
  @IsNotEmpty({ message: 'El nombre del lote es requerido.' })
  nombre: string;

  @IsNumber({}, { message: 'El área debe ser un valor numérico.' })
  @IsNotEmpty({ message: 'El área es requerida.' })
  area: number;

  @IsString()
  @IsOptional()
  @IsIn(['Activo', 'Inactivo', 'En preparación'])
  estado?: string;

  @IsArray()
  @ValidateNested({ each: true }) // Valida cada objeto dentro del array
  @Type(() => CoordenadaDto) // Le dice a class-transformer qué clase usar para la validación anidada
  @IsOptional()
  coordenadasPoligono?: CoordenadaDto[];
}
