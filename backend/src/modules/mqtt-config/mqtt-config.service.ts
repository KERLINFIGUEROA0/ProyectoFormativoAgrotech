import { Injectable, NotFoundException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as mqtt from 'mqtt';
import { Broker } from './entities/broker.entity';
import { Subscripcion } from './entities/subscripcion.entity';
import { Sensor } from '../sensores/entities/sensore.entity';
import { CreateBrokerDto } from './dto/create-broker.dto';
import { CreateSubscripcionDto } from './dto/create-subscripcion.dto';
import { SensoresService } from '../sensores/sensores.service';
import { CreateSensoreDto } from '../sensores/dto/create-sensore.dto';
import { MqttClientService } from './mqtt-client.service';

@Injectable()
export class MqttConfigService {
  private readonly logger = new Logger(MqttConfigService.name);

  constructor(
    @InjectRepository(Broker)
    private readonly brokerRepo: Repository<Broker>,
    @InjectRepository(Subscripcion)
    private readonly subRepo: Repository<Subscripcion>,
    @InjectRepository(Sensor)
    private readonly sensorRepo: Repository<Sensor>,
    @Inject(forwardRef(() => SensoresService))
    private readonly sensoresService: SensoresService,
    private readonly mqttClientService: MqttClientService,
  ) { }

  // --- Lógica de Brokers ---
  async createBroker(dto: CreateBrokerDto): Promise<Broker> {
    const nuevoBroker = this.brokerRepo.create(dto);
    const brokerGuardado = await this.brokerRepo.save(nuevoBroker);

    // Crear sensores automáticamente para los tópicos si hay surcoId
    if (dto.surcoId && dto.topicosAdicionales && dto.topicosAdicionales.length > 0) {
      await this.crearSensoresParaTopicos(brokerGuardado, dto.surcoId, dto.topicosAdicionales);
    }

    // Conectar al broker para recibir datos en tiempo real
    try {
      await this.mqttClientService.connectToBroker(brokerGuardado);
    } catch (error) {
      this.logger.error(`Error conectando al broker ${brokerGuardado.nombre}: ${error.message}`);
    }

    return brokerGuardado;
  }

  async findAllBrokers(): Promise<Broker[]> {
    return this.brokerRepo.find();
  }

  async findOneBroker(id: number): Promise<Broker> {
    const broker = await this.brokerRepo.findOneBy({ id });
    if (!broker) {
      throw new NotFoundException(`Broker con ID ${id} no encontrado.`);
    }
    return broker;
  }

  async updateBroker(id: number, dto: CreateBrokerDto): Promise<Broker> {
    const broker = await this.findOneBroker(id);
    Object.assign(broker, dto);
    const updated = await this.brokerRepo.save(broker);

    // Reconectar al broker con la nueva configuración
    try {
      await this.mqttClientService.connectToBroker(updated);
    } catch (error) {
      this.logger.error(`Error reconectando al broker ${updated.nombre}: ${error.message}`);
    }

    return updated;
  }

  async deleteBroker(id: number): Promise<void> {
    const broker = await this.findOneBroker(id);

    // Eliminar sensores asociados al broker
    const sensores = await this.sensorRepo.find({
      where: { surco: { broker: { id } } },
      relations: ['surco'],
    });

    for (const sensor of sensores) {
      await this.sensoresService.remove(sensor.id);
    }

    await this.brokerRepo.remove(broker);
  }

  async updateBrokerEstado(id: number, estado: 'Activo' | 'Inactivo'): Promise<Broker> {
    const broker = await this.findOneBroker(id);
    broker.estado = estado;
    const updated = await this.brokerRepo.save(broker);

    // Cambiar estado de sensores asociados
    const sensores = await this.sensorRepo.find({
      where: { surco: { broker: { id } } },
      relations: ['surco'],
    });

    for (const sensor of sensores) {
      sensor.estado = estado === 'Activo' ? 'Activo' : 'Inactivo';
      await this.sensorRepo.save(sensor);
    }

    // Activar/desactivar conexión MQTT
    await this.mqttClientService.toggleBrokerEstado(id, estado);

    return updated;
  }

  // --- Lógica de Subscripciones ---
  async createSubscripcion(dto: CreateSubscripcionDto): Promise<Subscripcion> {
    const { brokerId, topic, qos } = dto;
    const broker = await this.findOneBroker(brokerId);
    const nuevaSub = this.subRepo.create({ topic, qos, broker });
    return this.subRepo.save(nuevaSub);
  }

  async deleteSubscripcion(id: number): Promise<void> {
    const sub = await this.subRepo.findOneBy({ id });
    if (!sub) {
      throw new NotFoundException(`Subscripción con ID ${id} no encontrada.`);
    }
    await this.subRepo.remove(sub);
  }

  // --- Prueba de conexión MQTT ---
  async testBrokerConnection(dto: CreateBrokerDto): Promise<{ connected: boolean; message: string }> {
    const { protocolo, host, puerto, usuario, password } = dto;

    if (!protocolo || !host || !puerto) {
      return { connected: false, message: 'Faltan campos requeridos: protocolo, host y puerto.' };
    }

    const brokerUrl = `${protocolo}${host}:${puerto}`;

    this.logger.log(`Probando conexión a broker: ${brokerUrl}`);

    try {
      const options: mqtt.IClientOptions = {
        clientId: `test-client-${Date.now()}`,
        clean: true,
        connectTimeout: 15000, // 15 segundos de timeout
        reconnectPeriod: 0, // No reconectar para prueba
      };

      if (usuario) options.username = usuario;
      if (password) options.password = password;

      const client = mqtt.connect(brokerUrl, options);

      const connectionPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          client.end();
          reject(new Error('Timeout: No se pudo conectar en 15 segundos'));
        }, 15000);

        client.on('connect', () => {
          clearTimeout(timeout);
          client.end();
          resolve();
        });

        client.on('error', (error) => {
          clearTimeout(timeout);
          client.end();
          reject(error);
        });
      });

      await connectionPromise;
      this.logger.log(`✅ Conexión exitosa al broker: ${brokerUrl}`);
      return { connected: true, message: 'Conexión exitosa al broker MQTT.' };

    } catch (error: any) {
      this.logger.error(`❌ Error de conexión al broker ${brokerUrl}: ${error.message}`);
      return { connected: false, message: `Error de conexión: ${error.message}` };
    }
  }

  // --- Método auxiliar para crear sensores ---
  public async crearSensoresParaTopicos(broker: Broker, surcoId: number, topicos: string[]): Promise<void> {
    const topicDefaults = {
      'luz': { nombre: 'Sensor de Luz', min: 15, max: 500 }, // 1500-50000 lux
      'temperatura': { nombre: 'Sensor de Temperatura', min: 10, max: 35 },
      'humedad': { nombre: 'Sensor de Humedad', min: 30, max: 85 },
      'humedad_suelo': { nombre: 'Sensor de Humedad del Suelo', min: 20, max: 90 },
    };

    for (const topic of topicos) {
      const topicName = topic.split('/').pop() || topic; // Última parte del tópico
      const defaults = topicDefaults[topicName] || { nombre: `Sensor ${topicName}`, min: 0, max: 100 };

      const sensorDto: CreateSensoreDto = {
        nombre: defaults.nombre,
        surcoId: surcoId,
        fecha_instalacion: new Date().toISOString().split('T')[0], // Fecha actual en formato YYYY-MM-DD
        valor_minimo_alerta: defaults.min,
        valor_maximo_alerta: defaults.max,
        estado: 'Activo',
        topic: topic,
        broker: {
          nombre: broker.nombre,
          protocolo: broker.protocolo,
          host: broker.host,
          puerto: broker.puerto,
          usuario: broker.usuario,
          password: broker.password,
        },
      };

      try {
        await this.sensoresService.create(sensorDto);
        this.logger.log(`Sensor creado para tópico: ${topic}`);
      } catch (error) {
        this.logger.error(`Error creando sensor para tópico ${topic}:`, error);
      }
    }
  }
}