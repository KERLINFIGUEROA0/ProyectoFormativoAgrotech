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
  ) { }
  
  async publishToBroker(brokerId: number, topic: string, payload: string): Promise<void> {
    const client = this.clients.get(brokerId);

    // 1. Validar que existe el cliente
    if (!client) {
      this.logger.warn(`Intento de publicar en Broker ID ${brokerId}, pero no hay cliente inicializado.`);
      throw new Error(`No hay conexión activa con el Broker ID ${brokerId}`);
    }

    // 2. Validar que está conectado
    if (!client.connected) {
      this.logger.warn(`El cliente del Broker ID ${brokerId} está desconectado. No se pudo enviar el mensaje.`);
      throw new Error(`El Broker ID ${brokerId} está desconectado.`);
    }

    // 3. Publicar el mensaje (usamos una Promesa para poder usar await)
    return new Promise((resolve, reject) => {
      client.publish(topic, payload, { qos: 1 }, (error) => {
        if (error) {
          this.logger.error(`Error publicando mensaje en [${topic}]: ${error.message}`);
          reject(error);
        } else {
          this.logger.log(`📤 Mensaje enviado a [${topic}] en Broker ID ${brokerId}: ${payload}`);
          resolve();
        }
      });
    });
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
   * Se suscribe a los tópicos configurados en el broker y de los sensores asociados
   */
  private async subscribeToSensorTopics(brokerId: number, client: mqtt.MqttClient) {
    // Obtener el broker para acceder a topicosAdicionales
    const broker = await this.brokerRepo.findOne({ where: { id: brokerId } });
    if (!broker) {
      this.logger.error(`Broker ID ${brokerId} no encontrado`);
      return;
    }

    // Suscribirse a los tópicos configurados en el broker
    if (broker.topicosAdicionales && broker.topicosAdicionales.length > 0) {
      for (const topic of broker.topicosAdicionales) {
        client.subscribe(topic, { qos: 0 }, (err) => {
          if (err) {
            this.logger.error(`Error suscribiéndose a tópico del broker [${topic}]: ${err.message}`);
          } else {
            this.logger.log(`✅ Suscrito a tópico del broker: [${topic}]`);
          }
        });
      }
    }

    // También suscribirse a tópicos de sensores existentes (por compatibilidad)
    const sensores = await this.sensorRepo.find({
      where: {
        lote: {
          brokers: { id: brokerId },
        },
        estado: 'Activo',
      },
      relations: ['lote', 'surco'],
    });

    for (const sensor of sensores) {
      if (sensor.topic && !broker.topicosAdicionales?.includes(sensor.topic)) {
        // Solo suscribirse si no está ya en topicosAdicionales
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
    if (!sensor.lote?.brokers || sensor.lote.brokers.length === 0 || !sensor.topic || sensor.estado !== 'Activo') {
      return;
    }

    // Usar el primer broker del lote
    const broker = sensor.lote.brokers[0];
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

  /**
   * Desuscribe un sensor de su tópico
   */
  async unsubscribeSensor(sensor: Sensor) {
    if (!sensor.lote?.brokers || sensor.lote.brokers.length === 0 || !sensor.topic) {
      return;
    }

    // Desuscribir de todos los brokers del lote
    for (const broker of sensor.lote.brokers) {
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

