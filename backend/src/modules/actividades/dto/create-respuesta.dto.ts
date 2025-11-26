import { IsOptional, IsString, IsIn, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class MaterialDevueltoDto {
  @IsNumber()
  materialId: number;

  @IsNumber()
  cantidadDevuelta: number;
}

export class CreateRespuestaDto {
  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  archivos?: string; // JSON string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialDevueltoDto)
  materialesDevueltos?: MaterialDevueltoDto[];
}

export class UpdateRespuestaDto {
  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  archivos?: string; // JSON string
}

export class CalificarRespuestaDto {
  @IsIn(['aprobado', 'rechazado'])
  estado: 'aprobado' | 'rechazado';

  @IsOptional()
  @IsString()
  comentarioInstructor?: string;
}