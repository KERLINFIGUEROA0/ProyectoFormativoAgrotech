import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateSurcoMqttDto {
  @IsBoolean()
  @IsNotEmpty()
  activo_mqtt: boolean;
}



