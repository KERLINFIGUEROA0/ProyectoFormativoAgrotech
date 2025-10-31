import { IsString, IsNotEmpty, IsNumber, IsDateString, IsOptional, IsInt } from 'class-validator';

export class CreateVentaDto {
  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsNumber()
  @IsNotEmpty({ message: "El monto (precio unitario) es obligatorio." })
  monto: number;

  @IsDateString()
  @IsNotEmpty({ message: "La fecha es obligatoria." })
  fecha: string;

  @IsInt()
  @IsNotEmpty({ message: "La cantidad es obligatoria." })
  cantidad: number;

  @IsInt()
  @IsNotEmpty({ message: "El ID de producción es obligatorio." })
  produccionId: number;
}