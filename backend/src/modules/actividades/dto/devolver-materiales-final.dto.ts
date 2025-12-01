import { IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class MaterialDevueltoDto {
  @IsNumber()
  materialId: number;

  @IsNumber()
  cantidadDevuelta: number;
}

export class DevolverMaterialesFinalDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialDevueltoDto)
  materialesDevueltos: MaterialDevueltoDto[];
}