import { IsNumber, IsNotEmpty } from 'class-validator';

export class CreateInformacionSensorDto {
  @IsNumber()
  @IsNotEmpty()
  valor: number;

  @IsNumber()
  @IsNotEmpty()
  sensorId: number;
}