import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; // ✅ AÑADIDO
import { InformacionSensorService } from './informacion_sensor.service';
import { InformacionSensorController } from './informacion_sensor.controller';
import { InformacionSensor } from './entities/informacion_sensor.entity'; // ✅ AÑADIDO
import { Sensor } from '../sensores/entities/sensore.entity'; // ✅ AÑADIDO
import { MqttController } from './mqtt.controller'; // ✅ AÑADIDO

@Module({
  // ✅ AÑADIDO: Importar las entidades que usa el servicio
  imports: [TypeOrmModule.forFeature([InformacionSensor, Sensor])],
  
  // ✅ AÑADIDO: El nuevo MqttController
  controllers: [InformacionSensorController, MqttController],
  
  providers: [InformacionSensorService],
  
  // ✅ AÑADIDO: Exportar el servicio si otros módulos lo necesitan
  exports: [InformacionSensorService], 
})
export class InformacionSensorModule {} 