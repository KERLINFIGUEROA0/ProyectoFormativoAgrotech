import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { InformacionSensorService } from './informacion_sensor.service';

@Controller()
export class MqttController {
  private readonly logger = new Logger(MqttController.name);

  constructor(
    private readonly infoSensorService: InformacionSensorService,
  ) {}

  @MessagePattern('mi_casa/sala/temperatura')
  async handleTemperatura(@Payload() data: any) {
    const mensaje = data.toString();
    this.logger.log(`Recibido Tópico [mi_casa/sala/temperatura]: ${mensaje}`);
    
    const valor = parseFloat(mensaje);
    
    if (!isNaN(valor)) {
      try {
        await this.infoSensorService.create({
          sensorId: 1, // ⚠️ Asume que el sensor ID 1 existe
          valor: valor,
        });
        // ✅ AÑADIMOS ESTE LOG DE ÉXITO
        this.logger.log(`[Sensor ID 1] Dato de temperatura ${valor} guardado.`);
      } catch (error: any) { // ✅ Capturamos el error de tipo 'any'
        // ✅ MEJORAMOS EL LOG DE ERROR
        this.logger.error(`[Sensor ID 1] Error al guardar temperatura. Causa: ${error.message}`, error.stack); 
      }
    } else {
      this.logger.warn(`Valor [${mensaje}] no es un número, descartado.`);
    }
  }

  @MessagePattern('mi_casa/sala/humedad')
  async handleHumedad(@Payload() data: any) {
    const mensaje = data.toString();
    this.logger.log(`Recibido Tópico [mi_casa/sala/humedad]: ${mensaje}`);
    
    const valor = parseFloat(mensaje);
    
    if (!isNaN(valor)) {
      try {
        await this.infoSensorService.create({
          sensorId: 2, // ⚠️ Asume que el sensor ID 2 existe
          valor: valor,
        });
         // ✅ AÑADIMOS ESTE LOG DE ÉXITO
        this.logger.log(`[Sensor ID 2] Dato de humedad ${valor} guardado.`);
      } catch (error: any) { // ✅ Capturamos el error de tipo 'any'
        // ✅ MEJORAMOS EL LOG DE ERROR
        this.logger.error(`[Sensor ID 2] Error al guardar humedad. Causa: ${error.message}`, error.stack);
      }
    } else {
      this.logger.warn(`Valor [${mensaje}] no es un número, descartado.`);
    }
  }
}