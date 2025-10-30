import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SensoresService } from './sensores.service';
import { SensoresController } from './sensores.controller';
import { Sensor } from './entities/sensore.entity';
import { Surco } from '../surcos/entities/surco.entity';
import { TipoSensor } from '../tipo_sensor/entities/tipo_sensor.entity';

@Module({
  // Importa todas las entidades que el servicio necesita
  imports: [TypeOrmModule.forFeature([Sensor, Surco, TipoSensor])],
  controllers: [SensoresController],
  providers: [SensoresService],
})
export class SensoresModule {}