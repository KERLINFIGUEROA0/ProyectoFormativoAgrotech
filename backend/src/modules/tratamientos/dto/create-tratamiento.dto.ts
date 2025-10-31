import { IsString, IsDateString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateTratamientoDto {
  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsDateString()
  @IsNotEmpty()
  fechaInicio: Date;

  @IsDateString()
  @IsOptional()
  fechaFinal?: Date;

  @IsString()
  @IsNotEmpty()
  tipo: string;
}

