import { IsString, IsInt, IsOptional, IsNotEmpty, IsDateString } from 'class-validator';

export class CreateCultivoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsInt()
  cantidad: number;

  @IsString()
  @IsOptional()
  img?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsInt()
  @IsNotEmpty()
  tipoCultivoId: number;

  @IsString()
  @IsOptional()
  Estado?: string;

  @IsDateString()
  @IsOptional()
  Fecha_Plantado?: string;
}