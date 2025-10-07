import { IsString, IsNumber, IsDateString, IsNotEmpty } from 'class-validator';

export class CreateGastosProduccionDto {
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsNumber()
  @IsNotEmpty()
  monto: number;

  @IsDateString()
  @IsNotEmpty()
  fecha: string;

  @IsNumber()
  @IsNotEmpty()
  produccion: number;
}

