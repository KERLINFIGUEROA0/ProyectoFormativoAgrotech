import { IsNumber, IsString, IsDateString, IsOptional, Min } from 'class-validator';

export class UpdatePagoDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  monto?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  horasTrabajadas?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  tarifaHora?: number;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsOptional()
  fechaPago?: string;
}