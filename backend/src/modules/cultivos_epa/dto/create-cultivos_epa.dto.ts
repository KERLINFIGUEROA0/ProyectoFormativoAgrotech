import { IsNumber, IsNotEmpty } from 'class-validator';

export class CreateCultivosEpaDto {
  @IsNumber()
  @IsNotEmpty()
  cultivo: number;

  @IsNumber()
  @IsNotEmpty()
  epa: number;
}

