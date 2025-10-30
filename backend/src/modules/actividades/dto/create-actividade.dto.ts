import { IsString, IsDateString, IsOptional, IsNumber, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateActividadDto {
  @IsString()
  titulo: string;

  @IsDateString()
  fecha: Date;

  @IsString()
  @IsOptional()
  descripcion?: string;

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

