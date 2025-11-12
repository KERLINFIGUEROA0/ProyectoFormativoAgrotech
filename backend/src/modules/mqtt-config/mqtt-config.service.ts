import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as mqtt from 'mqtt';
import { Broker } from './entities/broker.entity';
import { Subscripcion } from './entities/subscripcion.entity';
import { CreateBrokerDto } from './dto/create-broker.dto';
import { CreateSubscripcionDto } from './dto/create-subscripcion.dto';

@Injectable()
export class MqttConfigService {
  private readonly logger = new Logger(MqttConfigService.name);

  constructor(
    @InjectRepository(Broker)
    private readonly brokerRepo: Repository<Broker>,
    @InjectRepository(Subscripcion)
    private readonly subRepo: Repository<Subscripcion>,
  ) {}

  // --- Lógica de Brokers ---
  async createBroker(dto: CreateBrokerDto): Promise<Broker> {
    const nuevoBroker = this.brokerRepo.create(dto);
    return this.brokerRepo.save(nuevoBroker);
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

  async deleteBroker(id: number): Promise<void> {
    const broker = await this.findOneBroker(id);
    await this.brokerRepo.remove(broker);
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
        connectTimeout: 5000, // 5 segundos de timeout
        reconnectPeriod: 0, // No reconectar para prueba
      };

      if (usuario) options.username = usuario;
      if (password) options.password = password;

      const client = mqtt.connect(brokerUrl, options);

      const connectionPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          client.end();
          reject(new Error('Timeout: No se pudo conectar en 5 segundos'));
        }, 5000);

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
}