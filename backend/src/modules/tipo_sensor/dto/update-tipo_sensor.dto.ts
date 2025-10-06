import { PartialType } from '@nestjs/mapped-types';
import { CreateTipoSensorDto } from './create-tipo_sensor.dto';

export class UpdateTipoSensorDto extends PartialType(CreateTipoSensorDto) {}
