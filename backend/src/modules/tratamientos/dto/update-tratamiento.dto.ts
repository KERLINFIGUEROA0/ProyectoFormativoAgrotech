import { IsString, IsOptional, IsIn, IsNumber ,IsDate} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTratamientoDto {
  @IsString()
  @IsOptional()
  descripcion?: string;

    @Type(() => Date)
  @IsDate() // Asegúrate que sea IsString
  @IsOptional()
  fechaInicio?: Date; // Asegúrate que el tipo sea string

    @Type(() => Date)
  @IsDate() // Asegúrate que sea IsString
  @IsOptional()
  fechaFinal?: Date; // Asegúrate que el tipo sea string
  // ... otros campos
  @IsString()
  @IsOptional()
  tipo?: string;

  @IsString()
  @IsOptional()
  @IsIn(['Planificado', 'En Curso', 'Finalizado'])
  estado?: string;

  @IsNumber()
  @IsOptional()
  cultivoId?: number;
}