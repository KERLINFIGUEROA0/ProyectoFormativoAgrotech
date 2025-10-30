import { Module } from '@nestjs/common';
import { InformacionSensorService } from './informacion_sensor.service';
import { InformacionSensorController } from './informacion_sensor.controller';

@Module({
  controllers: [InformacionSensorController],
  providers: [InformacionSensorService],
})
export class InformacionSensorModule {}
