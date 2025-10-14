import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, MaxLength, IsDateString } from 'class-validator';

export class CreateMaterialeDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del producto es obligatorio.' })
  @MaxLength(50)
  nombre: string;

  @IsString()
  @IsNotEmpty({ message: 'La categoría es obligatoria.' })
  tipoMaterial: string;

  @IsString()
  @IsNotEmpty({ message: 'La unidad de medida es obligatoria.' })
  tipoMedida: string;

  @IsNumber()
  @IsNotEmpty({ message: 'La cantidad inicial es obligatoria.' })
  @Min(0)
  cantidad: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  precio?: number;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  descripcion?: string;

  // --- ✅ INICIO DE LA CORRECCIÓN ---
  // Añadimos las propiedades que estaban causando el error
  @IsString()
  @IsOptional()
  ubicacion?: string;

  @IsString()
  @IsOptional()
  proveedor?: string;

  @IsDateString()
  @IsOptional()
  fechaVencimiento?: string; // Se usa IsDateString para aceptar el formato "YYYY-MM-DD"

  @IsString()
  @IsOptional()
  @MaxLength(255)
  img?: string;
  // --- FIN DE LA CORRECCIÓN ---
}