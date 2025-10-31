import { Module } from '@nestjs/common';
import { TipoSensorService } from './tipo_sensor.service';
import { TipoSensorController } from './tipo_sensor.controller';

@Module({
  controllers: [TipoSensorController],
  providers: [TipoSensorService],
})
export class TipoSensorModule {}

