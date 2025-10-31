import { IsNumber, IsDateString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateInformacionSensorDto {
  @IsDateString()
  @IsNotEmpty()
  fechaRegistro: Date;

  @IsNumber()
  @IsOptional()
  valorMaximo?: number;

  @IsNumber()
  @IsOptional()
  valorMinimo?: number;
  
  @IsNumber()
  @IsNotEmpty()
  sensor: number;
}

