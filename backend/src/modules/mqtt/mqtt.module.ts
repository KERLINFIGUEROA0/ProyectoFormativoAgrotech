import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MqttService } from './mqtt.service';
import { MqttGateway } from './mqtt.gateway';
import { BrokerLote } from '../mqtt-config/entities/broker-lote.entity';
import { InformacionSensorModule } from '../informacion_sensor/informacion_sensor.module';
import { MqttConfigModule } from '../mqtt-config/mqtt-config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BrokerLote]),
    forwardRef(() => InformacionSensorModule),
    forwardRef(() => MqttConfigModule),
  ],
  providers: [MqttService, MqttGateway],
  exports: [MqttService, MqttGateway],
})
export class MqttModule {}