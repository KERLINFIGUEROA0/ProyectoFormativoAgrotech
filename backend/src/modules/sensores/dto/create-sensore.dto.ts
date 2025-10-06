import { IsString, IsNotEmpty, IsNumber, IsDateString, IsOptional } from 'class-validator';

export class CreateSensoreDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsNumber()
  @IsNotEmpty()
  surcoId: number;

  @IsNumber()
  @IsNotEmpty()
  tipoSensorId: number;

  @IsDateString()
  @IsNotEmpty()
  fecha_instalacion: string;

  @IsNumber()
  @IsNotEmpty()
  valor_minimo_alerta: number;

  @IsNumber()
  @IsNotEmpty()
  valor_maximo_alerta: number;

  @IsString()
  @IsOptional()
  estado?: string;
}