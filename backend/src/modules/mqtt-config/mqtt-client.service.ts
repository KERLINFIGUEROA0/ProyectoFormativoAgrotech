import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as mqtt from 'mqtt';
import { Broker } from './entities/broker.entity';
import { BrokerLote } from './entities/broker-lote.entity';
import { Sensor } from '../sensores/entities/sensore.entity';
import { InformacionSensorService } from '../informacion_sensor/informacion_sensor.service';
import { HttpClientService } from './http-client.service';
import { WebSocketClientService } from './websocket-client.service';

@Injectable()
export class MqttClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttClientService.name);
  private clients: Map<number, mqtt.MqttClient> = new Map(); // Mapa de brokerId -> cliente MQTT

  constructor(
    @InjectRepository(Broker)
    private readonly brokerRepo: Repository<Broker>,
    @InjectRepository(BrokerLote)
    private readonly brokerLoteRepo: Repository<BrokerLote>,
    @InjectRepository(Sensor)
    private readonly sensorRepo: Repository<Sensor>,
    @Inject(forwardRef(() => InformacionSensorService))
    private readonly infoSensorService: InformacionSensorService,
    private readonly httpClientService: HttpClientService,
    private readonly webSocketClientService: WebSocketClientService,
  ) { }
  
  async publishToBroker(brokerId: number, topic: string, payload: string): Promise<void> {
    try {
      // Obtener el broker para saber qué protocolo usa
      const broker = await this.brokerRepo.findOne({ where: { id: brokerId } });
      if (!broker) {
        throw new Error(`Broker ${brokerId} no encontrado`);
      }

      // Delegar según el protocolo
      switch (broker.protocolo) {
        case 'mqtt':
        case 'mqtts':
          await this.publishToMqttBroker(brokerId, topic, payload);
          break;

        case 'http':
        case 'https':
          // Para HTTP, podríamos implementar POST requests
          throw new Error(`Publicación no implementada para protocolo ${broker.protocolo}`);

        case 'ws':
        case 'wss':
          await this.webSocketClientService.sendWebSocketMessage(brokerId, payload);
          break;

        default:
          throw new Error(`Protocolo no soportado para publicación: ${broker.protocolo}`);
      }
    } catch (error) {
      this.logger.error(`Error publicando en broker ${brokerId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Publica mensaje en broker MQTT
   */
  private async publishToMqttBroker(brokerId: number, topic: string, payload: string): Promise<void> {
    const client = this.clients.get(brokerId);

    // 1. Validar que existe el cliente
    if (!client) {
      this.logger.warn(`Intento de publicar en Broker MQTT ID ${brokerId}, pero no hay cliente inicializado.`);
      throw new Error(`No hay conexión activa con el Broker MQTT ID ${brokerId}`);
    }

    // 2. Validar que está conectado
    if (!client.connected) {
      this.logger.warn(`El cliente del Broker MQTT ID ${brokerId} está desconectado. No se pudo enviar el mensaje.`);
      throw new Error(`El Broker MQTT ID ${brokerId} está desconectado.`);
    }

    // 3. Publicar el mensaje (usamos una Promesa para poder usar await)
    return new Promise((resolve, reject) => {
      client.publish(topic, payload, { qos: 1 }, (error) => {
        if (error) {
          this.logger.error(`Error publicando mensaje MQTT en [${topic}]: ${error.message}`);
          reject(error);
        } else {
          this.logger.log(`📤 Mensaje MQTT enviado a [${topic}] en Broker ID ${brokerId}: ${payload}`);
          resolve();
        }
      });
    });
  }

  async publishCommand(topic: string, message: string) {
    // Busca el cliente asociado (asumiendo que manejas brokerId o usas el default)
    // Si tienes un mapa de clientes, úsalo. Si es uno solo:
    const client = this.clients.get(1); // O el ID de broker correspondiente
    if (client && client.connected) {
      client.publish(topic, message);
      this.logger.log(`🚀 Comando enviado a ${topic}: ${message}`);
    } else {
      this.logger.warn(`❌ No se pudo enviar comando a ${topic}: Broker desconectado`);
    }
  }

  async onModuleInit() {
    this.logger.log('Inicializando servicio MQTT...');
    // Cargar todos los brokers y suscribirse a los tópicos de sus sensores
    await this.initializeAllBrokers();
  }

  async onModuleDestroy() {
    this.logger.log('Cerrando conexiones MQTT...');
    // Cerrar todas las conexiones
    for (const [brokerId, client] of this.clients.entries()) {
      client.end();
      this.logger.log(`Conexión MQTT cerrada para broker ID: ${brokerId}`);
    }
    this.clients.clear();
  }

  /**
   * Inicializa todos los brokers y se suscribe a los tópicos de sus sensores
   */
  private async initializeAllBrokers() {
    const brokers = await this.brokerRepo.find({ where: { estado: 'Activo' } });

    for (const broker of brokers) {
      await this.connectToBroker(broker);
    }
  }

  /**
   * Conecta a un broker usando el protocolo apropiado
   */
  async connectToBroker(broker: Broker) {
    try {
      this.logger.log(`🔌 Conectando broker ${broker.nombre} con protocolo ${broker.protocolo}`);

      // Delegar a la implementación específica según el protocolo
      switch (broker.protocolo) {
        case 'mqtt':
        case 'mqtts':
          await this.connectToMqttBroker(broker);
          break;

        case 'http':
        case 'https':
          await this.httpClientService.connectToHttpBroker(broker);
          break;

        case 'ws':
        case 'wss':
          await this.webSocketClientService.connectToWebSocketBroker(broker);
          break;

        default:
          throw new Error(`Protocolo no soportado: ${broker.protocolo}`);
      }

    } catch (error) {
      this.logger.error(`Error conectando a broker ${broker.nombre}: ${error.message}`);
    }
  }

  /**
   * Conecta a un broker MQTT (implementación original)
   */
  private async connectToMqttBroker(broker: Broker) {
    try {
      // Si ya existe un cliente para este broker, cerrarlo primero
      if (this.clients.has(broker.id)) {
        const existingClient = this.clients.get(broker.id);
        existingClient?.end();
      }

      // Construir la URL del broker
      const protocol = broker.protocolo === 'mqtts' ? 'mqtts' : 'mqtt';
      const brokerUrl = `${protocol}://${broker.host}:${broker.puerto}`;

      this.logger.log(`Conectando a broker MQTT: ${brokerUrl}`);

      // Opciones de conexión
      const options: mqtt.IClientOptions = {
        clientId: `agrotech-client-${broker.id}-${Date.now()}`,
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 30000,
      };

      // Agregar credenciales si existen
      if (broker.usuario) {
        options.username = broker.usuario;
      }
      if (broker.password) {
        options.password = broker.password;
      }

      // SSL configuration for MQTTS
      if (broker.protocolo === 'mqtts' && broker.sslConfig?.enabled) {
        if (broker.sslConfig.rejectUnauthorized !== undefined) {
          options.rejectUnauthorized = broker.sslConfig.rejectUnauthorized;
        }
        if (broker.sslConfig.ca) {
          options.ca = broker.sslConfig.ca;
        }
        if (broker.sslConfig.cert) {
          options.cert = broker.sslConfig.cert;
        }
        if (broker.sslConfig.key) {
          options.key = broker.sslConfig.key;
        }
      }

      // Crear cliente MQTT
      const client = mqtt.connect(brokerUrl, options);

      // Eventos del cliente
      client.on('connect', () => {
        this.logger.log(`✅ Conectado al broker MQTT: ${broker.nombre} (${brokerUrl})`);
        // Suscribirse a los tópicos de los sensores de este broker
        this.subscribeToSensorTopics(broker.id, client);
      });

      client.on('error', (error) => {
        this.logger.error(`❌ Error en broker MQTT ${broker.nombre}: ${error.message}`);
      });

      client.on('reconnect', () => {
        this.logger.warn(`🔄 Reconectando a broker MQTT: ${broker.nombre}`);
      });

      client.on('offline', () => {
        this.logger.warn(`⚠️ Broker MQTT ${broker.nombre} desconectado`);
      });

      // Manejar mensajes recibidos
      client.on('message', async (topic, message) => {
        const payload = message.toString();
        this.logger.log(`📨 Mensaje MQTT recibido en [${topic}]: ${payload}`);

        try {
          await this.infoSensorService.createFromMqtt(topic, payload);
        } catch (error) {
          this.logger.error(`Error procesando mensaje MQTT de [${topic}]: ${error.message}`);
        }
      });

      // Guardar el cliente
      this.clients.set(broker.id, client);
    } catch (error) {
      this.logger.error(`Error conectando a broker MQTT ${broker.nombre}: ${error.message}`);
    }
  }

  /**
   * Se suscribe a los tópicos configurados en el broker y de los sensores asociados
   */
  private async subscribeToSensorTopics(brokerId: number, client: mqtt.MqttClient) {
    // Obtener todas las configuraciones BrokerLote para este broker
    const brokerLotes = await this.brokerLoteRepo.find({
      where: { broker: { id: brokerId } },
      relations: ['lote']
    });

    // Recopilar todos los tópicos únicos de las configuraciones
    const topicosUnicos = new Set<string>();
    for (const bl of brokerLotes) {
      if (bl.topicos && bl.topicos.length > 0) {
        bl.topicos.forEach(topic => topicosUnicos.add(topic));
      }
    }

    // Suscribirse a todos los tópicos únicos
    for (const topic of topicosUnicos) {
      client.subscribe(topic, { qos: 0 }, (err) => {
        if (err) {
          this.logger.error(`Error suscribiéndose a tópico del broker [${topic}]: ${err.message}`);
        } else {
          this.logger.log(`✅ Suscrito a tópico del broker: [${topic}]`);
        }
      });
    }

    // También suscribirse a tópicos de sensores existentes que puedan tener tópicos adicionales
    // Buscar sensores en lotes que tengan este broker configurado
    const loteIds = brokerLotes.map(bl => bl.lote.id);
    if (loteIds.length > 0) {
      const sensores = await this.sensorRepo.find({
        where: {
          lote: { id: In(loteIds) },
          estado: 'Activo',
        },
        relations: ['lote', 'sublote'],
      });

      for (const sensor of sensores) {
        if (sensor.topic && !topicosUnicos.has(sensor.topic)) {
          // Solo suscribirse si no está ya en los tópicos configurados
          client.subscribe(sensor.topic, { qos: 0 }, (err) => {
            if (err) {
              this.logger.error(`Error suscribiéndose a [${sensor.topic}]: ${err.message}`);
            } else {
              this.logger.log(`✅ Suscrito a tópico: [${sensor.topic}] (Sensor: ${sensor.nombre})`);
            }
          });
        }
      }
    }
  }

  /**
   * Se suscribe a un nuevo tópico cuando se crea un sensor
   */
  async subscribeToNewSensor(sensor: Sensor) {
    if (!sensor.lote || !sensor.topic || sensor.estado !== 'Activo') {
      return;
    }

    // Buscar brokers asociados al lote del sensor
    const brokerLotes = await this.brokerLoteRepo.find({
      where: { lote: { id: sensor.lote.id } },
      relations: ['broker']
    });

    if (brokerLotes.length === 0) {
      return;
    }

    // Usar el primer broker del lote
    const broker = brokerLotes[0].broker;
    const client = this.clients.get(broker.id);

    if (!client || !client.connected) {
      // Si no hay cliente o no está conectado, reconectar
      if (broker.estado === 'Activo') {
        await this.connectToBroker(broker);
      }
      return;
    }

    // Suscribirse al nuevo tópico
    client.subscribe(sensor.topic, { qos: 0 }, (err) => {
      if (err) {
        this.logger.error(`Error suscribiéndose a [${sensor.topic}]: ${err.message}`);
      } else {
        this.logger.log(`✅ Suscrito a nuevo tópico: [${sensor.topic}] (Sensor: ${sensor.nombre})`);
      }
    });
  }

  /**
   * Desconecta un broker usando el protocolo apropiado
   */
  async disconnectBroker(brokerId: number) {
    try {
      // Obtener el broker para saber qué protocolo usa
      const broker = await this.brokerRepo.findOne({ where: { id: brokerId } });
      if (!broker) {
        this.logger.warn(`Broker ${brokerId} no encontrado para desconectar`);
        return;
      }

      // Delegar según el protocolo
      switch (broker.protocolo) {
        case 'mqtt':
        case 'mqtts':
          const client = this.clients.get(brokerId);
          if (client) {
            client.end();
            this.clients.delete(brokerId);
            this.logger.log(`Desconectado broker MQTT ID: ${brokerId}`);
          }
          break;

        case 'http':
        case 'https':
          await this.httpClientService.disconnectHttpBroker(brokerId);
          break;

        case 'ws':
        case 'wss':
          await this.webSocketClientService.disconnectWebSocketBroker(brokerId);
          break;

        default:
          this.logger.warn(`Protocolo no soportado para desconexión: ${broker.protocolo}`);
      }
    } catch (error) {
      this.logger.error(`Error desconectando broker ${brokerId}: ${error.message}`);
    }
  }

  /**
   * Desuscribe un sensor de su tópico
   */
  async unsubscribeSensor(sensor: Sensor) {
    if (!sensor.lote || !sensor.topic) {
      return;
    }

    // Buscar brokers asociados al lote del sensor
    const brokerLotes = await this.brokerLoteRepo.find({
      where: { lote: { id: sensor.lote.id } },
      relations: ['broker']
    });

    // Desuscribir de todos los brokers del lote
    for (const bl of brokerLotes) {
      const broker = bl.broker;
      const client = this.clients.get(broker.id);

      if (!client || !client.connected) {
        continue;
      }

      client.unsubscribe(sensor.topic, (err) => {
        if (err) {
          this.logger.error(`Error desuscribiéndose de [${sensor.topic}] en broker ${broker.nombre}: ${err.message}`);
        } else {
          this.logger.log(`✅ Desuscrito de tópico: [${sensor.topic}] (Sensor: ${sensor.nombre}, Broker: ${broker.nombre})`);
        }
      });
    }
  }

  /**
   * Activa o desactiva un broker
   */
  async toggleBrokerEstado(brokerId: number, nuevoEstado: 'Activo' | 'Inactivo') {
    if (nuevoEstado === 'Activo') {
      const broker = await this.brokerRepo.findOne({ where: { id: brokerId } });
      if (broker) {
        await this.connectToBroker(broker);
      }
    } else {
      await this.disconnectBroker(brokerId);
    }
  }
}

