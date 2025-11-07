import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Broker } from './entities/broker.entity';
import { Subscripcion } from './entities/subscripcion.entity';
import { Sensor } from '../sensores/entities/sensore.entity';
import { MqttConfigService } from './mqtt-config.service';
import { MqttConfigController } from './mqtt-config.controller';
import { MqttClientService } from './mqtt-client.service';
import { InformacionSensorModule } from '../informacion_sensor/informacion_sensor.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Broker, Subscripcion, Sensor]),
    forwardRef(() => InformacionSensorModule), // Para usar InformacionSensorService
  ],
  controllers: [MqttConfigController],
  providers: [MqttConfigService, MqttClientService],
  exports: [MqttClientService], // Exportar para que otros módulos puedan usarlo
})
export class MqttConfigModule {}