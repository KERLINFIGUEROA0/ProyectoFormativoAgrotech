import { IsNumber, IsNotEmpty } from 'class-validator';

export class CreateEpaTratamientoDto {
  @IsNumber()
  @IsNotEmpty()
  tratamiento: number;

  @IsNumber()
  @IsNotEmpty()
  epa: number;
}

