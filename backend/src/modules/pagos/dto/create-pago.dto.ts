import { IsNumber, IsString, IsDateString, IsOptional, Min, IsNotEmpty } from 'class-validator';

export class CreatePagoDto {
  @IsNumber()
  @IsNotEmpty()
  idUsuario: number;

  @IsNumber()
  @IsNotEmpty()
  idActividad: number;

  @IsNumber()
  @Min(0)
  monto: number;

  @IsNumber()
  @Min(0)
  horasTrabajadas: number;

  @IsNumber()
  @Min(0)
  tarifaHora: number;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsDateString()
  fechaPago: string;
}