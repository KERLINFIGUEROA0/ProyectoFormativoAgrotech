import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, MaxLength, IsDateString, IsEnum } from 'class-validator';
import { UnidadMedida } from '../../../common/enums/unidad-medida.enum';
import { TipoMaterial } from '../../../common/enums/tipo-material.enum'; // 👈 Asegúrate que esta importación esté

export class CreateMaterialeDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del producto es obligatorio.' })
  @MaxLength(50)
  nombre: string;

  // --- ✅ CORRECCIÓN AQUÍ ---
  @IsEnum(TipoMaterial, { message: 'El tipo de material no es válido.' })
  @IsNotEmpty({ message: 'La categoría es obligatoria.' })
  tipoMaterial: TipoMaterial;

  // --- ✅ Y AQUÍ ---
  @IsEnum(UnidadMedida, { message: 'La unidad de medida no es válida.' })
  @IsNotEmpty({ message: 'La unidad de medida es obligatoria.' })
  tipoMedida: UnidadMedida;
  
  @IsNumber()
  @IsNotEmpty({ message: 'La cantidad inicial es obligatoria.' })
  @Min(0)
  cantidad: number;

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