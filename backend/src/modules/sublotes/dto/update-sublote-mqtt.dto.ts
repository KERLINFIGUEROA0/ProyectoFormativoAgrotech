import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateSubloteMqttDto {
  @IsBoolean()
  @IsNotEmpty()
  activo_mqtt: boolean;
}



