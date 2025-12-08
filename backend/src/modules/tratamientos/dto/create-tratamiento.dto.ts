import { IsString, IsOptional, IsNotEmpty, IsIn, IsNumber ,IsDate} from 'class-validator';
import { Type } from 'class-transformer'; //
import { IsDateOrderValid } from '../../../common/validators/is-date-order-valid.validator';

export class CreateTratamientoDto {
  @IsString()
  @IsOptional()
  descripcion?: string;

  @Type(() => Date)
 @IsDate()     // <-- AÑADIDO/VERIFICADO
  @IsNotEmpty()
  fechaInicio: Date; // <-- TIPO CAMBIADO A string

 @Type(() => Date)
  @IsDate()     // <-- AÑADIDO/VERIFICADO
  @IsOptional()
  @IsDateOrderValid()
  fechaFinal?: Date; // <-- TIPO CAMBIADO A string
  // ... otros campos

  @IsString()
  @IsNotEmpty()
  tipo: string;

  // --- ✅ CAMBIO AÑADIDO ---
  @IsString()
  @IsOptional()
  @IsIn(['Planificado', 'En Curso', 'Finalizado'])
  estado?: string;
  // --- FIN DEL CAMBIO ---

   @IsNumber()
  @IsOptional() // Hacemos que sea opcional por si hay tratamientos generales
  cultivoId?: number;
}

