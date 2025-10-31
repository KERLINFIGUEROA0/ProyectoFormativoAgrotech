// src/modules/sensores/dto/create-sensore.dto.ts

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
  fechaInstalacion: Date;

  @IsNumber()
  @IsOptional()
  valorMinimo?: number;

  @IsNumber()
  @IsOptional()
  valorMaximo?: number;
}
