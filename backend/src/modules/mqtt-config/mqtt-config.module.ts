import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Broker } from './entities/broker.entity';
import { BrokerLote } from './entities/broker-lote.entity';
import { Subscripcion } from './entities/subscripcion.entity';
import { Sensor } from '../sensores/entities/sensore.entity';
import { MqttConfigService } from './mqtt-config.service';
import { MqttConfigController } from './mqtt-config.controller';
import { MqttClientService } from './mqtt-client.service';
import { HttpClientService } from './http-client.service';
import { WebSocketClientService } from './websocket-client.service';
import { InformacionSensorModule } from '../informacion_sensor/informacion_sensor.module';
import { SensoresModule } from '../sensores/sensores.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Broker, BrokerLote, Subscripcion, Sensor]),
    forwardRef(() => InformacionSensorModule), // Para usar InformacionSensorService
    forwardRef(() => SensoresModule), // Para usar SensoresService
  ],
  controllers: [MqttConfigController],
  providers: [MqttConfigService, MqttClientService, HttpClientService, WebSocketClientService],
  exports: [MqttConfigService, MqttClientService],
})
export class MqttConfigModule {}