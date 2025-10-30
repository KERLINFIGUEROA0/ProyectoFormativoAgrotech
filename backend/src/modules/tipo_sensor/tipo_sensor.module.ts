import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; // Asegúrate de importar esto
import { TipoSensorService } from './tipo_sensor.service';
import { TipoSensorController } from './tipo_sensor.controller';
import { TipoSensor } from './entities/tipo_sensor.entity'; // Y la entidad

@Module({
  // Añade esta línea para conectar la entidad con el módulo
  imports: [TypeOrmModule.forFeature([TipoSensor])],
  controllers: [TipoSensorController],
  providers: [TipoSensorService],
})
export class TipoSensorModule {}