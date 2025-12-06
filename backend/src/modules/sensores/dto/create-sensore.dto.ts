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
  loteId: number;

  @IsNumber()
  @IsOptional()
  subloteId?: number;

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

  @IsString()
  @IsOptional()
  json_key?: string | null; // ✅ Añadir esto

  @IsString()
  @IsOptional()
  sensorKey?: string | null; // Nueva propiedad

  @IsObject()
  @ValidateNested()
  @Type(() => BrokerDto)
  @IsOptional()
  broker?: BrokerDto;

  @IsInt()
  @Min(5) // Mínimo 5 segundos por ejemplo
  @IsOptional()
  frecuencia_escaneo?: number;

  // ✅ CONFIGURACIÓN DE ESTADO DE CONEXIÓN
  @IsString()
  @IsOptional()
  connectionField?: string | null; // Campo del JSON que indica estado

  @IsOptional()
  connectionRequired?: boolean; // Si el campo es obligatorio

  @IsOptional()
  disconnectionValues?: any[]; // Valores que indican desconexión

  @IsOptional()
  connectionValues?: any[]; // Valores que indican conexión
}