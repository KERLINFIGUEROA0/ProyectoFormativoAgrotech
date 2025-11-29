// src/modules/sublotes/dto/create-sublote.dto.ts
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, ValidateIf, IsObject } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateSubloteDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;


  @IsOptional()
  @IsObject()
  coordenadas?: {
    type: 'point' | 'polygon';
    coordinates: { lat: number; lng: number } | Array<{ lat: number; lng: number }>;
  };

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  loteId: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  })
  @ValidateIf((o) => o.cultivoId !== undefined && o.cultivoId !== null)
  @IsNumber({}, { message: 'cultivoId debe ser un número válido' })
  cultivoId?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  })
  @ValidateIf((o) => o.brokerId !== undefined && o.brokerId !== null)
  @IsNumber({}, { message: 'brokerId debe ser un número válido' })
  brokerId?: number;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  activo_mqtt?: boolean;
}
