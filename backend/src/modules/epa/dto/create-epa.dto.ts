import { IsString, IsDateString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateEpaDto {
  @IsDateString()
  @IsNotEmpty()
  fechaEncuentro: Date;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsString()
  @IsNotEmpty()
  tipoEnfermedad: string;

  @IsString()
  @IsOptional()
  deficiencias?: string;

  @IsString()
  @IsOptional()
  img?: string;

  @IsString()
  @IsOptional()
  complicaciones?: string;
}

