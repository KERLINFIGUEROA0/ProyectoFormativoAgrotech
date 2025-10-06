import { IsString, IsDateString, IsOptional, IsNumber } from 'class-validator';

export class CreateActividadeDto {
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

  @IsNumber()
  usuario: number;

  @IsNumber()
  cultivo: number;
}

