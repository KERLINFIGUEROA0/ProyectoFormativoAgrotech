import { IsString, IsNumber, IsDateString, IsNotEmpty, IsOptional } from 'class-validator'; // <-- AÑADIR IsOptional

export class CreateGastosProduccionDto {
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsNumber()
  @IsNotEmpty()
  monto: number;

  @IsDateString()
  @IsNotEmpty()
  fecha: string;

  // --- MODIFICACIONES ---
  @IsNumber()
  @IsOptional() // <-- Hacer opcional
  produccion?: number;

  @IsNumber()
  @IsOptional() // <-- Añadir cultivo como opcional
  cultivo?: number;

  // --- ✅ NUEVOS CAMPOS ---
  @IsNumber()
  @IsOptional()
  cantidad?: number;

  @IsString()
  @IsOptional()
  unidad?: string;

  @IsNumber()
  @IsOptional()
  precioUnitario?: number;
}