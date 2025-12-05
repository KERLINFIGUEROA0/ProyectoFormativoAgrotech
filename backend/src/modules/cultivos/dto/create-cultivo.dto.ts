import { IsString, IsInt, IsOptional, IsNotEmpty, Matches } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateCultivoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsInt()
  @Transform(({ value }) => parseInt(value, 10))
  cantidad: number;

  @IsString()
  @IsOptional()
  img?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsInt()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNotEmpty()
  tipoCultivoId: number;

  // --- NUEVOS CAMPOS ---
  @IsInt({ message: 'El ID del lote debe ser un número entero' })
  @Transform(({ value }) => parseInt(value, 10))
  @IsNotEmpty({ message: 'El Lote es obligatorio' })
  loteId: number;

  @IsInt({ message: 'El ID del sublote debe ser un número entero' })
  @Transform(({ value }) => value ? parseInt(value, 10) : undefined)
  @IsOptional()
  subloteId?: number;
  // ---------------------

  @IsString()
  @IsOptional()
  Estado?: string;

  @IsString()
  @IsOptional()
  @Type(() => String)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha debe tener el formato YYYY-MM-DD' })
  Fecha_Plantado?: string;
}