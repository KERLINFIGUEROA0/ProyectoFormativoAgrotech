import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as mqtt from 'mqtt';
import { Broker } from './entities/broker.entity';
import { Sensor } from '../sensores/entities/sensore.entity';
import { InformacionSensorService } from '../informacion_sensor/informacion_sensor.service';

@Injectable()
export class MqttClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttClientService.name);
  private clients: Map<number, mqtt.MqttClient> = new Map(); // Mapa de brokerId -> cliente MQTT

  constructor(
    @InjectRepository(Broker)
    private readonly brokerRepo: Repository<Broker>,
    @InjectRepository(Sensor)
    private readonly sensorRepo: Repository<Sensor>,
    private readonly infoSensorService: InformacionSensorService,
  ) {}

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
    const brokers = await this.brokerRepo.find();
    
    for (const broker of brokers) {
      await this.connectToBroker(broker);
    }
  }

  /**
   * Conecta a un broker y se suscribe a los tópicos de sus sensores
   */
  async connectToBroker(broker: Broker) {
    try {
      // Si ya existe un cliente para este broker, cerrarlo primero
      if (this.clients.has(broker.id)) {
        const existingClient = this.clients.get(broker.id);
        existingClient?.end();
      }

      // Construir la URL del broker
      const brokerUrl = `${broker.protocolo}${broker.host}:${broker.puerto}`;
      
      this.logger.log(`Conectando a broker: ${brokerUrl}`);

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

      // Crear cliente MQTT
      const client = mqtt.connect(brokerUrl, options);

      // Eventos del cliente
      client.on('connect', () => {
        this.logger.log(`✅ Conectado al broker: ${broker.nombre} (${brokerUrl})`);
        // Suscribirse a los tópicos de los sensores de este broker
        this.subscribeToSensorTopics(broker.id, client);
      });

      client.on('error', (error) => {
        this.logger.error(`❌ Error en broker ${broker.nombre}: ${error.message}`);
      });

      client.on('reconnect', () => {
        this.logger.warn(`🔄 Reconectando a broker: ${broker.nombre}`);
      });

      client.on('offline', () => {
        this.logger.warn(`⚠️ Broker ${broker.nombre} desconectado`);
      });

      // Manejar mensajes recibidos
      client.on('message', async (topic, message) => {
        const payload = message.toString();
        this.logger.log(`📨 Mensaje recibido en [${topic}]: ${payload}`);
        
        try {
          await this.infoSensorService.createFromMqtt(topic, payload);
        } catch (error) {
          this.logger.error(`Error procesando mensaje de [${topic}]: ${error.message}`);
        }
      });

      // Guardar el cliente
      this.clients.set(broker.id, client);
    } catch (error) {
      this.logger.error(`Error conectando a broker ${broker.nombre}: ${error.message}`);
    }
  }

  /**
   * Se suscribe a los tópicos de los sensores asociados a un broker
   */
  private async subscribeToSensorTopics(brokerId: number, client: mqtt.MqttClient) {
    // Buscar todos los sensores que pertenecen a surcos con este broker
    const sensores = await this.sensorRepo.find({
      where: {
        surco: {
          broker: { id: brokerId },
          activo_mqtt: true,
        },
      },
      relations: ['surco', 'surco.broker'],
    });

    if (sensores.length === 0) {
      this.logger.warn(`No hay sensores activos para el broker ID: ${brokerId}`);
      return;
    }

    // Suscribirse a cada tópico
    for (const sensor of sensores) {
      if (sensor.topic) {
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

  /**
   * Se suscribe a un nuevo tópico cuando se crea un sensor
   */
  async subscribeToNewSensor(sensor: Sensor) {
    if (!sensor.surco?.broker || !sensor.topic) {
      return;
    }

    const brokerId = sensor.surco.broker.id;
    const client = this.clients.get(brokerId);

    if (!client || !client.connected) {
      // Si no hay cliente o no está conectado, reconectar
      const broker = await this.brokerRepo.findOne({ where: { id: brokerId } });
      if (broker) {
        await this.connectToBroker(broker);
      }
      return;
    }

    // Suscribirse al nuevo tópico
    if (sensor.surco.activo_mqtt) {
      client.subscribe(sensor.topic, { qos: 0 }, (err) => {
        if (err) {
          this.logger.error(`Error suscribiéndose a [${sensor.topic}]: ${err.message}`);
        } else {
          this.logger.log(`✅ Suscrito a nuevo tópico: [${sensor.topic}] (Sensor: ${sensor.nombre})`);
        }
      });
    }
  }

  /**
   * Desconecta un broker
   */
  async disconnectBroker(brokerId: number) {
    const client = this.clients.get(brokerId);
    if (client) {
      client.end();
      this.clients.delete(brokerId);
      this.logger.log(`Desconectado broker ID: ${brokerId}`);
    }
  }
}

