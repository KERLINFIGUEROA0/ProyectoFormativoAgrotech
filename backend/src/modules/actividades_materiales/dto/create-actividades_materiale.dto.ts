import { IsNumber, IsNotEmpty } from 'class-validator';

export class CreateActividadesMaterialeDto {
  @IsNumber()
  @IsNotEmpty()
  cantidadUsada: number;

  @IsNumber()
  @IsNotEmpty()
  actividad: number;

  @IsNumber()
  @IsNotEmpty()
  material: number;
}

