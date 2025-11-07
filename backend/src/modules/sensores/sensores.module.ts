import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SensoresService } from './sensores.service';
import { SensoresController } from './sensores.controller';
import { Sensor } from './entities/sensore.entity';
import { Surco } from '../surcos/entities/surco.entity';
import { Broker } from '../mqtt-config/entities/broker.entity';
import { InformacionSensorModule } from '../informacion_sensor/informacion_sensor.module';
import { MqttConfigModule } from '../mqtt-config/mqtt-config.module';

@Module({
  // Importa todas las entidades que el servicio necesita
  imports: [
    TypeOrmModule.forFeature([Sensor, Surco, Broker]),
    forwardRef(() => InformacionSensorModule), // Importar el módulo de información de sensores
    forwardRef(() => MqttConfigModule), // Importar el módulo MQTT para usar MqttClientService
  ],
  controllers: [SensoresController],
  providers: [SensoresService],
  exports: [SensoresService], // Exportar para que otros módulos puedan usarlo
})
export class SensoresModule {}