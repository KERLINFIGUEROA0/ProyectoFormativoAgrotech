import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, MaxLength } from 'class-validator';
export class CreateMaterialeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  nombre: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  precio: number;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  descripcion?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  tipoMaterial: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  tipoMedida: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  cantidad: number;
}
