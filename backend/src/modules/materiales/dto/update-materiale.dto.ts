import { IsString, IsOptional, IsNumber, Min, MaxLength, IsDateString, IsEnum } from 'class-validator';
import { UnidadMedida } from '../../../common/enums/unidad-medida.enum';
import { TipoMaterial } from '../../../common/enums/tipo-material.enum';

export class UpdateMaterialeDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  nombre?: string;

  // --- ✅ CORRECCIÓN AQUÍ ---
  @IsEnum(TipoMaterial, { message: 'El tipo de material no es válido.' })
  @IsOptional()
  tipoMaterial?: TipoMaterial;

  @IsEnum(UnidadMedida, { message: 'La unidad de medida no es válida.' })
  @IsOptional()
  tipoMedida?: UnidadMedida;

  // ... (el resto de las propiedades no cambian)
  @IsNumber()
  @IsOptional()
  @Min(0)
  cantidad?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  pesoPorUnidad?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  precio?: number;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  descripcion?: string;

  @IsString()
  @IsOptional()
  ubicacion?: string;

  @IsString()
  @IsOptional()
  proveedor?: string;

  @IsDateString()
  @IsOptional()
  fechaVencimiento?: string;
}