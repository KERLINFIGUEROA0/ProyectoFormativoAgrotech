import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as mqtt from 'mqtt';
import { BrokerLote } from '../mqtt-config/entities/broker-lote.entity';
import { InformacionSensorService } from '../informacion_sensor/informacion_sensor.service';
import { MqttGateway } from './mqtt.gateway';

interface MqttConnection {
  client: mqtt.MqttClient;
  connected: boolean;
  config: {
    id: string;
    host: string;
    port: number;
    protocol: string;
    username?: string;
    password?: string;
    topics: string[];
  };
}

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private connections = new Map<string, MqttConnection>();
  private readonly SAVE_INTERVAL = 30 * 60 * 1000; // 30 minutos
  private readingBuffers = new Map<string, any[]>();

  constructor(
    @InjectRepository(BrokerLote)
    private readonly brokerLoteRepo: Repository<BrokerLote>,
    private readonly infoSensorService: InformacionSensorService,
    private readonly gateway: MqttGateway,
  ) {}

  async onModuleInit() {
    this.logger.log('Inicializando servicio MQTT...');
    await this.initializeAllConnections();
  }

  async onModuleDestroy() {
    this.logger.log('Cerrando conexiones MQTT...');
    for (const [configId, connection] of this.connections.entries()) {
      connection.client.end();
      this.logger.log(`Conexión MQTT cerrada para config ID: ${configId}`);
    }
    this.connections.clear();
  }

  private async initializeAllConnections() {
    const brokerLotes = await this.brokerLoteRepo.find({
      where: { broker: { estado: 'Activo' } },
      relations: ['broker', 'lote']
    });

    for (const bl of brokerLotes) {
      await this.createConnection(bl);
    }
  }

  private async createConnection(brokerLote: BrokerLote) {
    const configId = `broker-${brokerLote.broker.id}-lote-${brokerLote.lote.id}`;

    // Si ya existe, cerrar primero
    if (this.connections.has(configId)) {
      const existing = this.connections.get(configId);
      existing?.client.end();
    }

    const brokerUrl = `${brokerLote.broker.protocolo}${brokerLote.broker.host}:${brokerLote.broker.puerto}`;

    this.logger.log(`Conectando a broker: ${brokerUrl} para lote ${brokerLote.lote.nombre}`);

    const options: mqtt.IClientOptions = {
      clientId: `agrotech-client-${configId}-${Date.now()}`,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 30000,
    };

    if (brokerLote.broker.usuario) options.username = brokerLote.broker.usuario;
    if (brokerLote.broker.password) options.password = brokerLote.broker.password;

    const client = mqtt.connect(brokerUrl, options);

    const connection: MqttConnection = {
      client,
      connected: false,
      config: {
        id: configId,
        host: brokerLote.broker.host,
        port: brokerLote.broker.puerto,
        protocol: brokerLote.broker.protocolo,
        username: brokerLote.broker.usuario,
        password: brokerLote.broker.password,
        topics: brokerLote.topicos || []
      }
    };

    // Eventos del cliente
    client.on('connect', () => {
      this.logger.log(`✅ Conectado al broker para ${configId}`);
      connection.connected = true;
      this.emitConnectionStatus(brokerLote.lote.id, true, 'Conectado al broker MQTT');

      // Suscribirse a tópicos
      for (const topic of connection.config.topics) {
        client.subscribe(topic, { qos: 0 }, (err) => {
          if (err) {
            this.logger.error(`Error suscribiéndose a [${topic}]: ${err.message}`);
          } else {
            this.logger.log(`✅ Suscrito a tópico: [${topic}]`);
          }
        });
      }
    });

    client.on('disconnect', () => {
      this.logger.warn(`⚠️ Desconectado del broker para ${configId}`);
      connection.connected = false;
      this.emitConnectionStatus(brokerLote.lote.id, false, 'Desconectado del broker MQTT');
    });

    client.on('offline', () => {
      this.logger.warn(`⚠️ Broker offline para ${configId}`);
      connection.connected = false;
      this.emitConnectionStatus(brokerLote.lote.id, false, 'Sin conexión a internet - modo offline');
    });

    client.on('error', (error) => {
      this.logger.error(`❌ Error en broker ${configId}: ${error.message}`);
      connection.connected = false;
      this.emitConnectionStatus(brokerLote.lote.id, false, `Error: ${error.message}`);
    });

    // Manejar mensajes
    client.on('message', async (topic, message) => {
      await this.handleMessage(topic, message.toString(), brokerLote.lote.id);
    });

    this.connections.set(configId, connection);
  }

  private async handleMessage(topic: string, payload: string, loteId: number) {
    this.logger.log(`📨 Mensaje recibido en [${topic}]: ${payload}`);

    try {
      // Parsear y procesar
      const parsedData = this.parseSensorData(payload);
      if (!parsedData) return;

      // Verificar alertas
      const alertTriggered = this.checkThresholdBreach(parsedData, topic);

      // Buffer o guardar directamente
      if (alertTriggered) {
        // Guardar inmediatamente si es alerta
        await this.saveSensorData(topic, parsedData);
      } else {
        // Buffer para guardar cada 30 minutos
        this.bufferReading(topic, parsedData);
      }

      // Emitir a frontend en tiempo real
      this.gateway.emitLecturaNueva({
        topic,
        data: parsedData,
        loteId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error(`Error procesando mensaje de [${topic}]: ${error.message}`);
    }
  }

  private parseSensorData(payload: string): any {
    try {
      return JSON.parse(payload);
    } catch {
      // Si no es JSON, intentar como número
      const num = parseFloat(payload);
      return isNaN(num) ? null : { value: num };
    }
  }

  private checkThresholdBreach(data: any, topic: string): boolean {
    // Lógica simplificada - en producción buscaría los umbrales del sensor
    // Por ahora, asumir que si el valor es extremo, es alerta
    const value = data.value || data.temperature || data.humidity || Object.values(data)[0];
    if (typeof value === 'number') {
      return value < 0 || value > 100; // Umbrales dummy
    }
    return false;
  }

  private bufferReading(topic: string, data: any) {
    if (!this.readingBuffers.has(topic)) {
      this.readingBuffers.set(topic, []);
    }
    this.readingBuffers.get(topic)!.push({
      ...data,
      timestamp: new Date()
    });
  }

  private async saveSensorData(topic: string, data: any) {
    // Lógica para guardar en BD usando el servicio existente
    await this.infoSensorService.createFromMqtt(topic, JSON.stringify(data));
  }

  private emitConnectionStatus(loteId: number, connected: boolean, message: string) {
    this.gateway.emitEstadoConexion({
      loteId,
      connected,
      message,
      timestamp: new Date().toISOString()
    });
  }

  // Método público para conectar manualmente
  async connectSensor(configId: string, config: any) {
    // Implementar si es necesario
  }

  // Método para desconectar una configuración específica
  async disconnectConfig(configId: string) {
    const connection = this.connections.get(configId);
    if (connection) {
      connection.client.end();
      this.connections.delete(configId);
      this.logger.log(`Desconectado config ID: ${configId}`);
    }
  }
}