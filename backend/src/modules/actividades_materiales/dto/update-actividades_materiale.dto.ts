import { IsNumber, IsOptional, IsEnum } from 'class-validator';
import { UnidadMedida } from '../../../common/enums/unidad-medida.enum';

export class UpdateActividadesMaterialeDto {
  @IsNumber()
  @IsOptional()
  cantidadUsada?: number;

  @IsEnum(UnidadMedida)
  @IsOptional()
  unidadMedida?: UnidadMedida;
}
