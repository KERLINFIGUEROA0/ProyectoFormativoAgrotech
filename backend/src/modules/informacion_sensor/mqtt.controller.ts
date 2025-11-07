import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload, Ctx, MqttContext } from '@nestjs/microservices';
import { InformacionSensorService } from './informacion_sensor.service';

@Controller()
export class MqttController {
  private readonly logger = new Logger(MqttController.name);

  constructor(
    private readonly infoSensorService: InformacionSensorService,
  ) {}

  /**
   * Este es el nuevo manejador GENÉRICO.
   * Escucha en 'agrotech/sensores/#' (o el patrón que definas).
   */
  @MessagePattern('agrotech/sensores/#')
  async handleSensorData(@Payload() data: any, @Ctx() context: MqttContext) {
    const topic = context.getTopic();
    const payload = data.toString();

    this.logger.log(`Mensaje recibido en Tópico [${topic}]: ${payload}`);

    try {
      // El servicio se encarga de buscar en la DB a qué sensor
      // le pertenece ese 'topic'.
      await this.infoSensorService.createFromMqtt(topic, payload);
    } catch (error) {
      this.logger.error(`Error procesando [${topic}]: ${error.message}`, error.stack);
    }
  }
}