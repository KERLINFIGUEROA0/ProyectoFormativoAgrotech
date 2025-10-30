import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateTipoSensorDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del tipo de sensor es obligatorio.' })
  @MaxLength(100)
  nombre: string;
}