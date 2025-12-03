import { Injectable, NotFoundException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as mqtt from 'mqtt';
import { Broker } from './entities/broker.entity';
import { BrokerLote } from './entities/broker-lote.entity';
import { Subscripcion } from './entities/subscripcion.entity';
import { Sensor } from '../sensores/entities/sensore.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { CreateBrokerDto } from './dto/create-broker.dto';
import { CreateBrokerLoteDto } from './dto/create-broker-lote.dto';
import { CreateSubscripcionDto } from './dto/create-subscripcion.dto';
import { SensoresService } from '../sensores/sensores.service';
import { CreateSensoreDto } from '../sensores/dto/create-sensore.dto';
import { MqttClientService } from './mqtt-client.service';

// Interfaz auxiliar para configuración personalizada de tópicos
interface TopicoConfig {
  topic: string;
  min?: number;
  max?: number;
}

@Injectable()
export class MqttConfigService {
  private readonly logger = new Logger(MqttConfigService.name);

  constructor(
    @InjectRepository(Broker)
    private readonly brokerRepo: Repository<Broker>,
    @InjectRepository(BrokerLote)
    private readonly brokerLoteRepo: Repository<BrokerLote>,
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
    const { loteId, topicosAdicionales, ...brokerData } = dto;

    const nuevoBroker = this.brokerRepo.create(brokerData);
    const brokerGuardado = await this.brokerRepo.save(nuevoBroker);

    // Si se proporciona loteId y tópicos, crear la configuración BrokerLote
    if (loteId && topicosAdicionales && topicosAdicionales.length > 0) {
      const lote = await this.brokerRepo.manager.findOne(Lote, { where: { id: loteId } });
      if (!lote) throw new NotFoundException(`Lote con ID ${loteId} no encontrado.`);

      // Convertir topicosAdicionales a solo strings para guardar en BrokerLote
      const topicosStrings = topicosAdicionales.map(item =>
        typeof item === 'string' ? item : item.topic
      );

      const brokerLote = this.brokerLoteRepo.create({
        broker: brokerGuardado,
        lote: lote,
        topicos: topicosStrings
      });
      await this.brokerLoteRepo.save(brokerLote);

      // Crear sensores automáticamente para los tópicos
      await this.crearSensoresParaTopicos(brokerGuardado, loteId, topicosAdicionales);
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
    const broker = await this.brokerRepo.findOne({
      where: { id },
      relations: ['brokerLotes', 'brokerLotes.lote'],
    });
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
    const broker = await this.brokerRepo.findOne({
      where: { id },
      relations: ['brokerLotes', 'brokerLotes.lote'],
    });
    if (!broker) {
      throw new NotFoundException(`Broker con ID ${id} no encontrado.`);
    }

    // Eliminar sensores asociados a los lotes del broker
    for (const bl of broker.brokerLotes) {
      const sensores = await this.sensorRepo.find({
        where: { lote: { id: bl.lote.id } },
        relations: ['lote'],
      });

      for (const sensor of sensores) {
        await this.sensoresService.remove(sensor.id);
      }
    }

    await this.brokerRepo.remove(broker);
  }

  async updateBrokerEstado(id: number, estado: 'Activo' | 'Inactivo'): Promise<Broker> {
    const broker = await this.brokerRepo.findOne({
      where: { id },
      relations: ['brokerLotes', 'brokerLotes.lote'],
    });
    if (!broker) {
      throw new NotFoundException(`Broker con ID ${id} no encontrado.`);
    }
    broker.estado = estado;
    const updated = await this.brokerRepo.save(broker);

    // Cambiar estado de sensores asociados a los lotes del broker
    for (const bl of broker.brokerLotes) {
      const sensores = await this.sensorRepo.find({
        where: { lote: { id: bl.lote.id } },
        relations: ['lote'],
      });

      for (const sensor of sensores) {
        sensor.estado = estado === 'Activo' ? 'Activo' : 'Inactivo';
        await this.sensorRepo.save(sensor);
      }
    }

    // Activar/desactivar conexión MQTT
    await this.mqttClientService.toggleBrokerEstado(id, estado);

    return updated;
  }

  // --- Lógica de BrokerLote (Configuraciones por Lote) ---

  async createBrokerLote(dto: CreateBrokerLoteDto): Promise<BrokerLote> {
    const { brokerId, loteId, topicos } = dto;

    // Verificar que el broker existe
    const broker = await this.brokerRepo.findOne({ where: { id: brokerId } });
    if (!broker) throw new NotFoundException(`Broker con ID ${brokerId} no encontrado.`);

    // Verificar que el lote existe
    const lote = await this.brokerRepo.manager.findOne(Lote, { where: { id: loteId } });
    if (!lote) throw new NotFoundException(`Lote con ID ${loteId} no encontrado.`);

    // Verificar que no exista ya una configuración para este broker-lote
    const existingConfig = await this.brokerLoteRepo.findOne({
      where: { broker: { id: brokerId }, lote: { id: loteId } }
    });
    if (existingConfig) {
      throw new BadRequestException(`Ya existe una configuración para el Broker ${brokerId} y Lote ${loteId}.`);
    }

    // Crear la configuración
    const brokerLote = this.brokerLoteRepo.create({
      broker,
      lote,
      topicos
    });

    const saved = await this.brokerLoteRepo.save(brokerLote);

    // Crear sensores automáticamente para los tópicos
    await this.crearSensoresParaTopicos(broker, loteId, topicos);

    return saved;
  }

  async findBrokerLotesByLote(loteId: number): Promise<BrokerLote[]> {
    return this.brokerLoteRepo.find({
      where: { lote: { id: loteId } },
      relations: ['broker', 'lote']
    });
  }

  async findBrokerLotesByBroker(brokerId: number): Promise<BrokerLote[]> {
    return this.brokerLoteRepo.find({
      where: { broker: { id: brokerId } },
      relations: ['broker', 'lote']
    });
  }

  async updateBrokerLote(id: number, topicos: string[]): Promise<BrokerLote> {
    const brokerLote = await this.brokerLoteRepo.findOne({
      where: { id },
      relations: ['broker', 'lote']
    });
    if (!brokerLote) throw new NotFoundException(`Configuración BrokerLote con ID ${id} no encontrada.`);

    brokerLote.topicos = topicos;
    return this.brokerLoteRepo.save(brokerLote);
  }

  async deleteBrokerLote(id: number): Promise<void> {
    const brokerLote = await this.brokerLoteRepo.findOne({
      where: { id },
      relations: ['broker', 'lote']
    });
    if (!brokerLote) throw new NotFoundException(`Configuración BrokerLote con ID ${id} no encontrada.`);

    // Eliminar sensores asociados a esta configuración
    const sensores = await this.sensorRepo.find({
      where: { lote: { id: brokerLote.lote.id } },
      relations: ['lote']
    });

    // Filtrar sensores que pertenecen solo a esta configuración
    for (const sensor of sensores) {
      if (sensor.topic && brokerLote.topicos.includes(sensor.topic)) {
        await this.sensoresService.remove(sensor.id);
      }
    }

    await this.brokerLoteRepo.remove(brokerLote);
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

  // --- ✅ MÉTODO ACTUALIZADO: RECONOCIMIENTO DE BOMBA ---
  public async crearSensoresParaTopicos(
    broker: Broker,
    loteId: number,
    topicos: (string | TopicoConfig)[]
  ): Promise<void> {

    const topicDefaults = {
      'luz': { nombre: 'Sensor de Luz', min: 15, max: 500 },
      'temperatura': { nombre: 'Sensor de Temperatura', min: 10, max: 35 },
      'humedad': { nombre: 'Sensor de Humedad', min: 30, max: 85 },
      'humedad_suelo': { nombre: 'Sensor de Humedad del Suelo', min: 20, max: 90 },
      // 👇 AÑADIDO: Configuración para la bomba
      'bomba': { nombre: 'Actuador Bomba Riego', min: 0, max: 1 },
      'riego': { nombre: 'Sistema de Riego', min: 0, max: 1 },
    };

    for (const item of topicos) {
      let topicStr: string;
      let customMin: number | undefined;
      let customMax: number | undefined;

      if (typeof item === 'string') {
        topicStr = item;
      } else {
        topicStr = item.topic;
        customMin = item.min;
        customMax = item.max;
      }

      // Buscar coincidencia parcial (ej: "agrotech/bomba1" detecta "bomba")
      let matchKey = Object.keys(topicDefaults).find(key => topicStr.includes(key));
      const topicName = topicStr.split('/').pop() || topicStr;

      const defaults = matchKey ? topicDefaults[matchKey] : null;

      // Si es bomba, forzamos min 0 y max 1
      const isBomba = topicStr.includes('bomba') || topicStr.includes('riego');

      const minFinal = customMin ?? defaults?.min ?? 0;
      const maxFinal = customMax ?? defaults?.max ?? (isBomba ? 1 : 100);
      const nombreFinal = defaults?.nombre ?? (isBomba ? 'Bomba de Riego' : `Sensor ${topicName}`);

      // Verificar si ya existe
      const existe = await this.sensorRepo.findOne({ where: { topic: topicStr, lote: { id: loteId } }});
      if(existe) continue;

      const sensorDto: CreateSensoreDto = {
        nombre: nombreFinal,
        loteId: loteId,
        fecha_instalacion: new Date().toISOString().split('T')[0],
        valor_minimo_alerta: minFinal,
        valor_maximo_alerta: maxFinal,
        estado: 'Activo',
        topic: topicStr,
        // Si es bomba, sugerimos que la clave json sea 'valor' o 'estado', o null para lectura directa
        json_key: isBomba ? null : undefined,
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
        this.logger.log(`Sensor creado: ${nombreFinal} [${minFinal}-${maxFinal}]`);
      } catch (error) {
        this.logger.error(`Error creando sensor ${topicStr}:`, error);
      }
    }
  }
}