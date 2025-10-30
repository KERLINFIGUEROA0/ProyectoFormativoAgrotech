// src/modules/surcos/dto/create-surco.dto.ts
import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
export class CreateSurcoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsNumber()
  @IsNotEmpty()
  loteId: number;

  @IsNumber()
  @IsOptional()
  cultivoId?: number;
}
