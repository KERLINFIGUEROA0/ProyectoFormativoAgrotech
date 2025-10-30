import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTipoCultivoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  nombre: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  descripcion?: string;
}
