import { PartialType } from '@nestjs/mapped-types';
import { CreateInformacionSensorDto } from './create-informacion_sensor.dto';

export class UpdateInformacionSensorDto extends PartialType(CreateInformacionSensorDto) {}
