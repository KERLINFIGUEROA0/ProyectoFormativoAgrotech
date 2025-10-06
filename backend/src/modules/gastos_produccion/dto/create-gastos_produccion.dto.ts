import { IsString, IsNumber, IsDateString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class CreateGastosProduccionDto {
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsNumber()
  @IsNotEmpty()
  monto: number;

  @IsDateString()
  @IsNotEmpty()
  fecha: Date;

  @IsString()
  @IsOptional()
  @IsIn(['ingreso', 'egreso']) 
  tipo?: string;

  // --- 👇 INICIO DE LA CORRECCIÓN ---
  // Se cambia el nombre de la propiedad de 'produccion' a 'produccionId'
  // para que coincida con el payload que envía el frontend.
  @IsNumber()
  @IsNotEmpty()
  produccionId: number; 
  // --- 👆 FIN DE LA CORRECCIÓN ---
}