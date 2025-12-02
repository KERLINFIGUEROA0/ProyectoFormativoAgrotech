import { IsNumber, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { UnidadMedida } from '../../../common/enums/unidad-medida.enum';

export class CreateActividadesMaterialeDto {
  @IsNumber()
  @IsNotEmpty()
  materialId: number;

  @IsNumber()
  @IsNotEmpty()
  actividadId: number;

  @IsNumber()
  @IsOptional()
  cantidadUsada?: number;

  @IsEnum(UnidadMedida)
  @IsOptional()
  unidadMedida?: UnidadMedida;
}
