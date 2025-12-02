import { IsArray, ValidateNested, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class MaterialDevueltoDto {
  @IsNumber()
  materialId: number;

  @IsNumber()
  @IsOptional()
  cantidadDevuelta: number; // Cantidad en buen estado (Vuelve al inventario)

  @IsNumber()
  @IsOptional()
  cantidadDanada?: number; // Cantidad dañada (Se cobra al cultivo y se da de baja)
}

export class DevolverMaterialesFinalDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialDevueltoDto)
  materialesDevueltos: MaterialDevueltoDto[];
}