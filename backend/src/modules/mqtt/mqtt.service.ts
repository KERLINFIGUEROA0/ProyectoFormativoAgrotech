import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as mqtt from 'mqtt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BrokerLote } from '../mqtt-config/entities/broker-lote.entity';
import { InformacionSensor } from '../informacion_sensor/entities/informacion_sensor.entity';
import { Sensor } from '../sensores/entities/sensore.entity';
import { MqttGateway } from './mqtt.gateway';

@Injectable()
export class MqttService implements OnModuleInit {
  // ✅ CORRECCIÓN: Map usa 'number' como clave (ID del BrokerLote)
  private activeConnections = new Map<number, mqtt.MqttClient>();
  private logger = new Logger('MqttEngine');

  constructor(
    @InjectRepository(BrokerLote)
    private brokerLoteRepo: Repository<BrokerLote>,
    @InjectRepository(InformacionSensor)
    private infoSensorRepo: Repository<InformacionSensor>,
    private mqttGateway: MqttGateway,
  ) {}

  async onModuleInit() {
    this.logger.log('🚀 Iniciando servicio MQTT Multi-Contexto...');
    await this.refreshConnections();
  }

  async refreshConnections() {
    this.activeConnections.forEach(client => client.end());
    this.activeConnections.clear();

    const configs = await this.brokerLoteRepo.find({
      relations: ['broker', 'lote'],
    });

    this.logger.log(`📡 Configuraciones encontradas: ${configs.length}`);

    for (const config of configs) {
      if (config.broker && config.broker.estado === 'Activo') {
        this.connectToBrokerContext(config);
      }
    }
  }

  private connectToBrokerContext(config: BrokerLote) {
    const { broker, lote } = config;

    // ✅ CORRECCIÓN: Usamos 'protocolo' y 'puerto' (del config o del broker)
    const protocol = broker.protocolo || 'mqtt';
    const cleanProtocol = protocol.replace('://', '');
    const puerto = config.puerto || broker.puerto; // Usar puerto del config si existe
    const url = `${cleanProtocol}://${broker.host}:${puerto}`;

    const clientId = `agrotech_lote_${lote.id}_conn_${config.id}_${Date.now()}`;

    this.logger.log(`🔌 Conectando Lote #${lote.id} a ${url}`);

    const options: mqtt.IClientOptions = {
      clientId,
      username: broker.usuario,
      password: broker.password,
      reconnectPeriod: 5000,
    };

    const client = mqtt.connect(url, options);

    client.on('connect', () => {
      this.logger.log(`✅ Lote #${lote.id} CONECTADO`);

      // CORRECCIÓN: Agregamos el tipo explícito : string[]
      let topicsToSubscribe: string[] = [];
      if (config.topicos && Array.isArray(config.topicos) && config.topicos.length > 0) {
        topicsToSubscribe = config.topicos;
      } else if (broker.prefijoTopicos) {
        topicsToSubscribe = [`${broker.prefijoTopicos}/#`];
      }

      if (topicsToSubscribe.length > 0) {
        client.subscribe(topicsToSubscribe, (err) => {
          if (!err) this.logger.log(`👂 Lote #${lote.id} escuchando: ${topicsToSubscribe.join(', ')}`);
        });
      }
    });

    client.on('message', (topic, message) => {
      this.processMessage(topic, message, config);
    });

    client.on('error', (err) => {
      this.logger.error(`❌ Error Lote #${lote.id}: ${err.message}`);
    });

    // ✅ CORRECCIÓN: config.id es number, coincide con el Map<number, ...>
    this.activeConnections.set(config.id, client);
  }

  private async processMessage(topic: string, message: Buffer, config: BrokerLote) {
    try {
      const payloadStr = message.toString();
      const payload = JSON.parse(payloadStr);
      const { broker, lote } = config;

      const lecturasParaGuardar: InformacionSensor[] = [];

      for (const [key, rawValue] of Object.entries(payload)) {
        if (['timestamp', 'dev_id', 'token', 'wifi'].includes(key)) continue;

        const { valor, unidad } = this.parseValue(rawValue);
        if (isNaN(valor)) continue;

        // 🔒 DESHABILITADO: Creación automática de sensores
        // Solo procesar datos para sensores que YA EXISTEN y están configurados manualmente
        let sensor = await this.infoSensorRepo.manager.findOne(Sensor, {
          where: { lote: { id: lote.id }, sensorKey: key }
        });

        if (!sensor) {
          // ❌ NO crear sensor automáticamente - solo loguear y continuar
          this.logger.debug(`Mensaje MQTT ignorado para clave '${key}' - no existe sensor configurado para este lote`);
          continue; // Saltar este dato, no procesar
        } else {
          // ✅ Actualizar último mensaje para sensores existentes
          sensor.ultimo_mqtt_mensaje = new Date();
          await this.infoSensorRepo.manager.save(Sensor, sensor);
        }

        const isAlerta = this.checkThreshold(key, valor, broker.umbrales);

        // ✅ CORRECCIÓN: Usamos 'fechaRegistro' y asignamos propiedades correctas
        const nuevaLectura = this.infoSensorRepo.create({
          sensorKey: key,
          valor,
          unidad,
          lote: lote,
          sensor: sensor,
          tipo: isAlerta ? 'alerta' : 'regular',
          fechaRegistro: new Date() // Nombre correcto
        });

        lecturasParaGuardar.push(nuevaLectura);
      }

      if (lecturasParaGuardar.length > 0) {
        const guardados = await this.infoSensorRepo.save(lecturasParaGuardar);

        this.mqttGateway.emitMeasurement({
          loteId: lote.id,
          loteNombre: lote.nombre,
          datos: guardados.map(g => ({
            id: g.id,
            sensorKey: g.sensorKey,
            valor: g.valor,
            unidad: g.unidad,
            fechaRegistro: g.fechaRegistro,
            sensorId: g.sensor?.id || null
          }))
        });
      }
    } catch (error) {
      // Ignorar errores de parsing
    }
  }

  private parseValue(raw: any): { valor: number, unidad: string } {
    if (typeof raw === 'number') return { valor: raw, unidad: '' };
    const str = String(raw).trim();
    const match = str.match(/^(-?\d+(?:\.\d+)?)\s*(.*)$/);
    if (match) {
      return { valor: parseFloat(match[1]), unidad: match[2] ? match[2].trim() : '' };
    }
    return { valor: NaN, unidad: '' };
  }

  private checkThreshold(key: string, val: number, umbrales: any): boolean {
    if (!umbrales || !umbrales[key]) return false;
    const { minimo, maximo } = umbrales[key];
    return val < minimo || val > maximo;
  }
}