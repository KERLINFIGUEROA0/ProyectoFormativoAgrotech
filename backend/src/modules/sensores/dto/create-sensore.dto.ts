import { IsString, IsInt , Min, IsNotEmpty, IsNumber, IsDateString, IsOptional, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

class BrokerDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  protocolo: string;

  @IsString()
  @IsNotEmpty()
  host: string;

  @IsNumber()
  @IsNotEmpty()
  puerto: number;

  @IsString()
  @IsOptional()
  usuario?: string;

  @IsString()
  @IsOptional()
  password?: string;
}

export class CreateSensoreDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsNumber()
  @IsNotEmpty()
  surcoId: number;

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

  @IsString()
  @IsNotEmpty()
  topic: string;

  @IsObject()
  @ValidateNested()
  @Type(() => BrokerDto)
  @IsOptional()
  broker?: BrokerDto;

  @IsInt()
  @Min(5) // Mínimo 5 segundos por ejemplo
  @IsOptional()
  frecuencia_escaneo?: number;
}