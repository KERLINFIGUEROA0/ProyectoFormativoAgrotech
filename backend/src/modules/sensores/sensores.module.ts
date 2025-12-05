import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { SensoresService } from './sensores.service';
import { SensoresController } from './sensores.controller';
import { Sensor } from './entities/sensore.entity';
import { Sublote } from '../sublotes/entities/sublote.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { Broker } from '../mqtt-config/entities/broker.entity';
import { BrokerLote } from '../mqtt-config/entities/broker-lote.entity';
import { InformacionSensorModule } from '../informacion_sensor/informacion_sensor.module';
import { MqttConfigModule } from '../mqtt-config/mqtt-config.module';
import { PdfModule } from '../pdf/pdf.module';
import { Cultivo } from '../cultivos/entities/cultivo.entity';
import { InformacionSensor } from '../informacion_sensor/entities/informacion_sensor.entity';
import { Produccion } from '../producciones/entities/produccione.entity';
import { Venta } from '../ventas/entities/venta.entity';
import { Gasto } from '../gastos_produccion/entities/gastos_produccion.entity';
import { Actividad } from '../actividades/entities/actividade.entity';
import { ActividadMaterial } from '../actividades_materiales/entities/actividades_materiale.entity';
import { Material } from '../materiales/entities/materiale.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { TipoUsuario } from '../tipo_usuario/entities/tipo_usuario.entity';
import { Pago } from '../pagos/entities/pago.entity';

@Module({
  // Importa todas las entidades que el servicio necesita
  imports: [
    ScheduleModule.forRoot(), // Necesario para los cron jobs
    TypeOrmModule.forFeature([Sensor, Sublote, Lote, Broker, BrokerLote, Cultivo, InformacionSensor, Produccion, Venta, Gasto, Actividad, ActividadMaterial, Material, Usuario, TipoUsuario, Pago]),
    forwardRef(() => InformacionSensorModule), // Importar el módulo de información de sensores
    forwardRef(() => MqttConfigModule), // Importar el módulo MQTT para usar MqttClientService
    PdfModule, // Importar el módulo PDF
  ],
  controllers: [SensoresController],
  providers: [SensoresService],
  exports: [SensoresService], // Exportar para que otros módulos puedan usarlo
})
export class SensoresModule {}