import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; // ✅ AÑADIDO
import { ScheduleModule } from '@nestjs/schedule'; // Para cron jobs
import { InformacionSensorService } from './informacion_sensor.service';
import { InformacionSensorController } from './informacion_sensor.controller';
import { InformacionSensor } from './entities/informacion_sensor.entity'; // ✅ AÑADIDO
import { Sensor } from '../sensores/entities/sensore.entity'; // ✅ AÑADIDO
import { MqttController } from './mqtt.controller'; // ✅ AÑADIDO
import { MqttConfigModule } from '../mqtt-config/mqtt-config.module'; // Para MqttClientService

@Module({
  // ✅ AÑADIDO: Importar las entidades que usa el servicio
  imports: [
    TypeOrmModule.forFeature([InformacionSensor, Sensor]),
    ScheduleModule, // Para cron jobs del watchdog
    forwardRef(() => MqttConfigModule), // Para MqttClientService
  ],
  
  // ✅ AÑADIDO: El nuevo MqttController
  controllers: [InformacionSensorController, MqttController],
  
  providers: [InformacionSensorService],
  
  // ✅ AÑADIDO: Exportar el servicio si otros módulos lo necesitan
  exports: [InformacionSensorService], 
})
export class InformacionSensorModule {} 