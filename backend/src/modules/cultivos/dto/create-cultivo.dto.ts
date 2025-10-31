import { IsString, IsInt, IsOptional, IsNotEmpty } from 'class-validator';
export class CreateCultivoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsInt()
  cantidad: number;

  @IsString()
  img: string;

  @IsString()
  tipomedida: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsInt()
  @IsOptional()
  tipoCultivoId?: number;
}

