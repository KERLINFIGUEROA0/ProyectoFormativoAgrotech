import { IsString, IsDateString, IsOptional, IsNumber, IsIn,IsArray,IsPositive,ValidateNested } from 'class-validator';
import { Transform , Type} from 'class-transformer';

export class MaterialUsadoDto {
  @IsNumber()
  @IsPositive()
  materialId: number;

  @IsNumber()
  @IsPositive()
  cantidadUsada: number;
}

export class CreateActividadDto {
  @IsString()
  titulo: string;

  @IsDateString()
  fecha: Date;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MaterialUsadoDto)
  materiales?: MaterialUsadoDto[]; // Ej: [{ materialId: 1, cantidadUsada: 5 }, { materialId: 3, cantidadUsada: 10 }]

  @IsString()
  @IsOptional()
  img?: string;

  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @IsOptional()
  usuario?: number;

  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  cultivo: number;

  @IsIn(['pendiente', 'en proceso', 'completado'])
  @IsOptional()
  estado?: 'pendiente' | 'en proceso' | 'completado';
}

