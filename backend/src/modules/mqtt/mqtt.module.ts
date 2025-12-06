import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MqttService } from './mqtt.service';
import { MqttGateway } from './mqtt.gateway';
import { BrokerLote } from '../mqtt-config/entities/broker-lote.entity';
import { InformacionSensor } from '../informacion_sensor/entities/informacion_sensor.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BrokerLote, InformacionSensor])
  ],
  providers: [MqttService, MqttGateway],
  exports: [MqttService],
})
export class MqttModule {}