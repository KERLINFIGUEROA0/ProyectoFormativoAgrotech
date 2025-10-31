import { IsString, IsNotEmpty } from 'class-validator';

export class CreateTipoSensorDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;
}

