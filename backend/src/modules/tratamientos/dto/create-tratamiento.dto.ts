import { IsString, IsDateString, IsOptional, IsNotEmpty, IsIn } from 'class-validator';

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

  // --- ✅ CAMBIO AÑADIDO ---
  @IsString()
  @IsOptional()
  @IsIn(['Planificado', 'En Curso', 'Finalizado'])
  estado?: string;
  // --- FIN DEL CAMBIO ---
}

