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
import { HttpClientService } from './http-client.service';
import { WebSocketClientService } from './websocket-client.service';

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
    private readonly httpClientService: HttpClientService,
    private readonly webSocketClientService: WebSocketClientService,
  ) { }

  // --- Lógica de Brokers ---
  async createBroker(dto: CreateBrokerDto): Promise<Broker> {
    const { loteId, topicosAdicionales, ...brokerData } = dto;

    // Asegurar que protocolo sea del tipo correcto
    const brokerDataWithEnum = {
      ...brokerData,
      protocolo: brokerData.protocolo as 'mqtt' | 'mqtts' | 'http' | 'https' | 'ws' | 'wss'
    };

    const nuevoBroker = this.brokerRepo.create(brokerDataWithEnum);
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
      const customMinMax = topicosAdicionales.reduce((acc, item) => {
        if (typeof item === 'object' && item.topic) {
          acc[item.topic] = { min: item.min, max: item.max };
        }
        return acc;
      }, {} as { [topic: string]: { min?: number; max?: number } });

      await this.crearSensoresParaTopicos(brokerGuardado, loteId, topicosAdicionales, customMinMax);
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

    this.logger.log(`🗑️ Eliminando broker ${broker.nombre} y todas sus dependencias...`);

    // 1. Eliminar configuraciones BrokerLote asociadas (esto eliminará automáticamente las conexiones MQTT)
    for (const bl of broker.brokerLotes) {
      this.logger.log(`Eliminando configuración BrokerLote para lote ${bl.lote.nombre}...`);
      await this.deleteBrokerLote(bl.id);
    }

    // 2. Desconectar del broker si está conectado
    try {
      await this.mqttClientService.disconnectBroker(id);
      this.logger.log(`Desconectado del broker ${broker.nombre}`);
    } catch (error) {
      this.logger.warn(`Error desconectando broker ${broker.nombre}: ${error.message}`);
    }

    // 3. Eliminar el broker (las relaciones en cascada eliminarán subscripciones)
    await this.brokerRepo.remove(broker);
    this.logger.log(`✅ Broker ${broker.nombre} eliminado completamente`);
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
    const { brokerId, loteId, topicos, puerto, topicPrueba } = dto;

    // Verificar que el broker existe
    const broker = await this.brokerRepo.findOne({ where: { id: brokerId } });
    if (!broker) throw new NotFoundException(`Broker con ID ${brokerId} no encontrado.`);

    // Verificar que el lote existe
    const lote = await this.brokerRepo.manager.findOne(Lote, { where: { id: loteId } });
    if (!lote) throw new NotFoundException(`Lote con ID ${loteId} no encontrado.`);

    // Verificar que no exista ya una configuración para este broker-lote con el mismo puerto
    const existingConfig = await this.brokerLoteRepo.findOne({
      where: {
        broker: { id: brokerId },
        lote: { id: loteId },
        puerto: puerto || broker.puerto // Si no se especifica puerto, usar el del broker
      }
    });
    if (existingConfig) {
      throw new BadRequestException(`Ya existe una configuración para el Broker ${brokerId}, Lote ${loteId} y puerto ${puerto || broker.puerto}.`);
    }

    // Convertir tópicos a strings para guardar en BD
    const topicosStrings = topicos.map(item => typeof item === 'string' ? item : item.topic);

    // Crear la configuración
    const brokerLote = this.brokerLoteRepo.create({
      broker,
      lote,
      topicos: topicosStrings,
      puerto: puerto || undefined, // Solo guardar si se especifica
      topicPrueba: topicPrueba || undefined
    });

    const saved = await this.brokerLoteRepo.save(brokerLote);

    // Crear sensores automáticamente para los tópicos
    const customMinMax = topicos.reduce((acc, item) => {
      if (typeof item === 'object' && item.topic) {
        acc[item.topic] = { min: item.min, max: item.max };
      }
      return acc;
    }, {} as { [topic: string]: { min?: number; max?: number } });

    await this.crearSensoresParaTopicos(broker, loteId, topicos, customMinMax);

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

  async updateBrokerLote(id: number, data: { topicos: (string | { topic: string; min?: number; max?: number })[]; puerto?: number; topicPrueba?: string }): Promise<BrokerLote> {
    if (!data.topicos) {
      throw new BadRequestException('El campo topicos es requerido.');
    }

    const brokerLote = await this.brokerLoteRepo.findOne({
      where: { id },
      relations: ['broker', 'lote']
    });
    if (!brokerLote) throw new NotFoundException(`Configuración BrokerLote con ID ${id} no encontrada.`);

    // Convertir tópicos a strings para comparación
    const topicosActuales = brokerLote.topicos || [];
    const topicosNuevosStrings = data.topicos.map(item => typeof item === 'string' ? item : item.topic).filter(topico => !topicosActuales.includes(topico));
    const topicosNuevos = data.topicos.filter(item => {
      const topicStr = typeof item === 'string' ? item : item.topic;
      return !topicosActuales.includes(topicStr);
    });

    // Detectar tópicos eliminados (que existían antes pero ya no)
    const topicosActualesEnData = data.topicos.map(item => typeof item === 'string' ? item : item.topic);
    const topicosEliminados = topicosActuales.filter(topico => !topicosActualesEnData.includes(topico));

    // Actualizar la configuración (guardar solo strings)
    brokerLote.topicos = topicosActualesEnData;
    if (data.puerto !== undefined) brokerLote.puerto = data.puerto;
    if (data.topicPrueba !== undefined) brokerLote.topicPrueba = data.topicPrueba;

    const saved = await this.brokerLoteRepo.save(brokerLote);

    // Crear sensores automáticamente para los tópicos nuevos
    if (topicosNuevos.length > 0) {
      this.logger.log(`🔄 Detectados ${topicosNuevos.length} tópicos nuevos. Creando sensores automáticamente...`);

      // Extraer valores personalizados para los tópicos nuevos
      const customMinMaxNuevos = topicosNuevos.reduce((acc, item) => {
        if (typeof item === 'object' && item.topic) {
          acc[item.topic] = { min: item.min, max: item.max };
        }
        return acc;
      }, {} as { [topic: string]: { min?: number; max?: number } });

      await this.crearSensoresParaTopicos(brokerLote.broker, brokerLote.lote.id, topicosNuevos, customMinMaxNuevos);
      this.logger.log(`✅ Sensores creados para tópicos nuevos: ${topicosNuevosStrings.join(', ')}`);
    }

    // Actualizar umbrales de sensores existentes
    await this.actualizarUmbralesSensores(brokerLote.lote.id, data.topicos);

    // Eliminar sensores para tópicos eliminados, si no están cubiertos por otras configuraciones
    if (topicosEliminados.length > 0) {
      this.logger.log(`🗑️ Detectados ${topicosEliminados.length} tópicos eliminados. Verificando eliminación de sensores...`);
      await this.eliminarSensoresParaTopicosEliminados(brokerLote.lote.id, topicosEliminados, id);
      this.logger.log(`✅ Verificación completada para tópicos eliminados: ${topicosEliminados.join(', ')}`);
    }

    return saved;
  }

  private async actualizarUmbralesSensores(loteId: number, topicos: (string | { topic: string; min?: number; max?: number })[]): Promise<void> {
    // Para cada tópico en la configuración, actualizar los umbrales del sensor correspondiente
    for (const item of topicos) {
      const topicStr = typeof item === 'string' ? item : item.topic;
      const min = typeof item === 'string' ? undefined : item.min;
      const max = typeof item === 'string' ? undefined : item.max;

      // Buscar el sensor correspondiente
      const sensor = await this.sensorRepo.findOne({
        where: { topic: topicStr, lote: { id: loteId } }
      });

      if (sensor && (min !== undefined || max !== undefined)) {
        // Actualizar los umbrales si se proporcionaron
        if (min !== undefined) sensor.valor_minimo_alerta = min;
        if (max !== undefined) sensor.valor_maximo_alerta = max;

        await this.sensorRepo.save(sensor);
        this.logger.log(`📊 Actualizados umbrales para sensor ${sensor.nombre}: min=${min}, max=${max}`);
      }
    }
  }

  private async eliminarSensoresParaTopicosEliminados(loteId: number, topicosEliminados: string[], currentConfigId: number): Promise<void> {
    // Buscamos sensores que fueron creados para esta configuración BrokerLote
    const sensores = await this.sensorRepo.find({
      where: { lote: { id: loteId } },
      relations: ['lote']
    });

    // Verificar qué otras configuraciones BrokerLote existen para este lote (excluyendo la que estamos actualizando)
    const otrasConfiguraciones = await this.brokerLoteRepo.find({
      where: { lote: { id: loteId } },
      relations: ['broker']
    });
    const otrasConfigsActivas = otrasConfiguraciones.filter(config => config.id !== currentConfigId);

    // Crear un conjunto de tópicos que siguen estando activos en otras configuraciones
    const topicosActivos = new Set<string>();
    otrasConfigsActivas.forEach(config => {
      config.topicos.forEach(topico => topicosActivos.add(topico));
    });

    // Para cada tópico eliminado, verificar si hay sensores asociados y si deben eliminarse
    for (const topicoEliminado of topicosEliminados) {
      // Buscar sensores que usen exactamente este tópico
      const sensoresParaTopico = sensores.filter(sensor => sensor.topic === topicoEliminado);

      for (const sensor of sensoresParaTopico) {
        // Verificar si el tópico del sensor está cubierto por alguna configuración activa
        const topicoCubierto = Array.from(topicosActivos).some(topicoActivo =>
          sensor.topic!.startsWith(topicoActivo) || topicoActivo.startsWith(sensor.topic!)
        );

        // Si el tópico ya no está cubierto por ninguna configuración activa, eliminar el sensor
        if (!topicoCubierto) {
          this.logger.log(`Eliminando sensor ${sensor.nombre} (topic: ${sensor.topic}) - tópico eliminado de la configuración y no cubierto por otras`);
          await this.sensoresService.remove(sensor.id);
        } else {
          this.logger.log(`Manteniendo sensor ${sensor.nombre} - tópico eliminado pero cubierto por otras configuraciones activas`);
        }
      }
    }
  }

  async deleteBrokerLote(id: number): Promise<void> {
    const brokerLote = await this.brokerLoteRepo.findOne({
      where: { id },
      relations: ['broker', 'lote']
    });
    if (!brokerLote) throw new NotFoundException(`Configuración BrokerLote con ID ${id} no encontrada.`);

    this.logger.log(`🗑️ Eliminando configuración BrokerLote para lote ${brokerLote.lote.nombre}...`);

    // 2. Eliminar sensores asociados a esta configuración específica
    // Buscamos sensores que fueron creados para esta configuración BrokerLote
    const sensores = await this.sensorRepo.find({
      where: { lote: { id: brokerLote.lote.id } },
      relations: ['lote']
    });

    // Verificar qué otras configuraciones BrokerLote existen para este lote (excluyendo la que estamos eliminando)
    const otrasConfiguraciones = await this.brokerLoteRepo.find({
      where: { lote: { id: brokerLote.lote.id } },
      relations: ['broker']
    });
    const otrasConfigsActivas = otrasConfiguraciones.filter(config => config.id !== id);

    // Crear un conjunto de tópicos que siguen estando activos en otras configuraciones
    const topicosActivos = new Set<string>();
    otrasConfigsActivas.forEach(config => {
      config.topicos.forEach(topico => topicosActivos.add(topico));
    });

    // Para cada sensor del lote, verificar si su tópico ya no está cubierto por ninguna configuración activa
    for (const sensor of sensores) {
      if (!sensor.topic) continue; // Solo sensores MQTT

      // Verificar si el tópico del sensor está cubierto por alguna configuración activa
      const topicoCubierto = Array.from(topicosActivos).some(topicoActivo =>
        sensor.topic!.startsWith(topicoActivo) || topicoActivo.startsWith(sensor.topic!)
      );

      // Si el tópico ya no está cubierto por ninguna configuración activa, eliminar el sensor
      if (!topicoCubierto) {
        this.logger.log(`Eliminando sensor ${sensor.nombre} (topic: ${sensor.topic}) - tópico no cubierto por otras configuraciones`);
        await this.sensoresService.remove(sensor.id);
      } else {
        this.logger.log(`Manteniendo sensor ${sensor.nombre} - tópico cubierto por otras configuraciones activas`);
      }
    }

    // 3. Eliminar la configuración BrokerLote
    await this.brokerLoteRepo.remove(brokerLote);
    this.logger.log(`✅ Configuración BrokerLote eliminada`);
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

  // --- Prueba de conexión para cualquier protocolo ---
  async testBrokerLoteConnection(dto: { brokerId: number; puerto?: number; topicos: string[]; topicPrueba?: string }): Promise<{ connected: boolean; message: string; topicsAvailable?: string[]; jsonReceived?: string[]; activeTopicsCount?: number; topicPruebaReceived?: boolean }> {
    const { brokerId, puerto, topicos, topicPrueba } = dto;

    // Obtener broker
    const broker = await this.brokerRepo.findOne({ where: { id: brokerId } });
    if (!broker) throw new NotFoundException(`Broker con ID ${brokerId} no encontrado.`);

    this.logger.log(`Probando conexión ${broker.protocolo.toUpperCase()}: ${broker.host}:${puerto || broker.puerto}`);

    // Delegar según el protocolo
    switch (broker.protocolo) {
      case 'mqtt':
      case 'mqtts':
        return this.testMqttConnection(broker, puerto, topicos, topicPrueba);

      case 'http':
      case 'https':
        return this.httpClientService.testHttpConnection(broker, topicos.length > 0 ? topicos[0] : undefined);

      case 'ws':
      case 'wss':
        return this.webSocketClientService.testWebSocketConnection(broker, topicos.length > 0 ? topicos[0] : undefined);

      default:
        return {
          connected: false,
          message: `Protocolo no soportado: ${broker.protocolo}`
        };
    }
  }

  // --- Prueba de conexión MQTT (método original) ---
  private async testMqttConnection(broker: Broker, puerto?: number, topicos: string[] = [], topicPrueba?: string): Promise<{ connected: boolean; message: string; topicsAvailable?: string[]; jsonReceived?: string[]; activeTopicsCount?: number; topicPruebaReceived?: boolean }> {
    const testPuerto = puerto || broker.puerto;
    const protocol = broker.protocolo === 'mqtts' ? 'mqtts' : 'mqtt';
    const brokerUrl = `${protocol}://${broker.host}:${testPuerto}`;

    this.logger.log(`Probando conexión MQTT: ${brokerUrl} con tópicos: ${(topicos || []).join(', ')}`);

    try {
      const options: mqtt.IClientOptions = {
        clientId: `test-brokerlote-${Date.now()}`,
        clean: true,
        connectTimeout: 10000,
        reconnectPeriod: 0,
      };

      if (broker.usuario) options.username = broker.usuario;
      if (broker.password) options.password = broker.password;

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

      const client = mqtt.connect(brokerUrl, options);

      const connectionPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          client.end();
          reject(new Error('Timeout: No se pudo conectar en 10 segundos'));
        }, 10000);

        client.on('connect', () => {
          clearTimeout(timeout);
          resolve();
        });

        client.on('error', (error) => {
          clearTimeout(timeout);
          client.end();
          reject(error);
        });
      });

      await connectionPromise;

      // Verificar tópicos disponibles
      const topicsAvailable: string[] = [];
      const jsonReceived: string[] = [];
      const activeTopics: string[] = [];
      let topicPruebaReceived = false;

      if (topicPrueba) {
        // Si hay topic de prueba, verificar solo ese
        try {
          await new Promise<void>((resolve, reject) => {
            const subTimeout = setTimeout(() => {
              resolve(); // Resolver aunque no haya recibido mensaje
            }, 5000); // 5 segundos para verificar

            client.subscribe(topicPrueba, (err) => {
              if (err) {
                clearTimeout(subTimeout);
                reject(err);
                return;
              }

              // Escuchar mensaje en el topic de prueba
              const messageHandler = (receivedTopic: string, message: Buffer) => {
                if (receivedTopic === topicPrueba) {
                  topicPruebaReceived = true;
                  try {
                    JSON.parse(message.toString());
                    if (!jsonReceived.includes(topicPrueba)) jsonReceived.push(topicPrueba);
                  } catch (e) {
                    // Recibió mensaje pero no es JSON
                  }
                  client.removeListener('message', messageHandler);
                  clearTimeout(subTimeout);
                  resolve();
                }
              };

              client.on('message', messageHandler);
            });
          });
        } catch (error) {
          this.logger.warn(`Error suscribiéndose a topic de prueba ${topicPrueba}: ${error.message}`);
        }
      } else if (topicos.length > 0) {
        // Si hay tópicos especificados, verificarlos
        for (const topic of topicos) {
          try {
            await new Promise<void>((resolve, reject) => {
              const subTimeout = setTimeout(() => {
                topicsAvailable.push(topic); // Al menos se pudo suscribir
                resolve();
              }, 3000); // 3 segundos para verificar

              client.subscribe(topic, (err) => {
                if (err) {
                  clearTimeout(subTimeout);
                  reject(err);
                  return;
                }

                // Escuchar mensaje para verificar JSON
                const messageHandler = (receivedTopic: string, message: Buffer) => {
                  if (receivedTopic === topic) {
                    try {
                      JSON.parse(message.toString());
                      if (!jsonReceived.includes(topic)) jsonReceived.push(topic);
                      client.removeListener('message', messageHandler);
                      clearTimeout(subTimeout);
                      topicsAvailable.push(topic);
                      resolve();
                    } catch (e) {
                      // No es JSON válido, pero el topic existe
                      client.removeListener('message', messageHandler);
                      clearTimeout(subTimeout);
                      topicsAvailable.push(topic);
                      resolve();
                    }
                  }
                };

                client.on('message', messageHandler);
              });
            });
          } catch (error) {
            this.logger.warn(`Tópico ${topic} no disponible: ${error.message}`);
          }
        }
      } else {
        // Si no hay tópicos especificados ni topic de prueba, suscribirse a # para detectar topics activos
        try {
          await new Promise<void>((resolve, reject) => {
            const subTimeout = setTimeout(() => resolve(), 5000); // 5 segundos para recopilar

            client.subscribe('#', (err) => {
              if (err) {
                clearTimeout(subTimeout);
                reject(err);
                return;
              }

              const messageHandler = (receivedTopic: string, message: Buffer) => {
                if (!activeTopics.includes(receivedTopic)) {
                  activeTopics.push(receivedTopic);
                  try {
                    JSON.parse(message.toString());
                    if (!jsonReceived.includes(receivedTopic)) jsonReceived.push(receivedTopic);
                  } catch (e) {
                    // No es JSON, pero cuenta como topic activo
                  }
                }
              };

              client.on('message', messageHandler);

              // Resolver después del timeout
              setTimeout(() => {
                client.removeListener('message', messageHandler);
                clearTimeout(subTimeout);
                resolve();
              }, 5000);
            });
          });
        } catch (error) {
          this.logger.warn(`Error suscribiéndose a wildcard: ${error.message}`);
        }
      }

      client.end();

      let message = `Conexión exitosa.`;
      if (topicPrueba) {
        message += ` Topic de prueba "${topicPrueba}": ${topicPruebaReceived ? 'recibiendo datos' : 'no recibió datos'}.`;
      } else if (topicos.length > 0) {
        message += ` ${topicsAvailable.length}/${topicos.length} tópicos disponibles.`;
      } else {
        message += ` ${activeTopics.length} tópicos activos detectados.`;
      }

      if (jsonReceived.length > 0) {
        message += ` Datos del sensor recibido en: ${jsonReceived.join(', ')}.`;
      }

      this.logger.log(`✅ ${message}`);
      return {
        connected: true,
        message,
        topicsAvailable: topicPrueba ? (topicPruebaReceived ? [topicPrueba] : []) : (topicos.length > 0 ? topicsAvailable : activeTopics),
        jsonReceived,
        activeTopicsCount: activeTopics.length,
        topicPruebaReceived
      };

    } catch (error: any) {
      this.logger.error(`❌ Error de conexión a ${brokerUrl}: ${error.message}`);
      return {
        connected: false,
        message: `Error de conexión: ${error.message}`,
        topicsAvailable: []
      };
    }
  }

  // --- Prueba de conexión MQTT ---
  async testBrokerConnection(dto: CreateBrokerDto): Promise<{ connected: boolean; message: string }> {
    const { protocolo, host, puerto, usuario, password } = dto;

    if (!protocolo || !host || !puerto) {
      return { connected: false, message: 'Faltan campos requeridos: protocolo, host y puerto.' };
    }

    const brokerUrl = `${protocolo}://${host}:${puerto}`;

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
    topicos: (string | TopicoConfig)[],
    customMinMax?: { [topic: string]: { min?: number; max?: number } }
  ): Promise<void> {

    const topicDefaults = {
      'luz': { nombre: 'Sensor de Luz', min: 15, max: 500 },
      'temperatura': { nombre: 'Sensor de Temperatura', min: 10, max: 35 },
      'humedad': { nombre: 'Sensor de Humedad', min: 30, max: 85 },
      'humedad_suelo': { nombre: 'Sensor de Humedad del Suelo', min: 20, max: 80 },
      'bomba': { nombre: 'Bomba de Riego', min: 0, max: 1 },
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

      // Usar valores personalizados si están disponibles, sino usar defaults
      const customValues = customMinMax?.[topicStr];
      const minFinal = customValues?.min ?? customMin ?? defaults?.min ?? 0;
      const maxFinal = customValues?.max ?? customMax ?? defaults?.max ?? (isBomba ? 1 : 100);
      const nombreFinal = defaults?.nombre ?? (isBomba ? 'Bomba de Riego' : `Sensor ${topicName}`);

      // DEBUG: Log cuando se crea un sensor bomba
      if (isBomba) {
        this.logger.log(`DEBUG Creando sensor bomba con nombre: ${nombreFinal}`);
      }

      // Verificar si ya existe
      const existe = await this.sensorRepo.findOne({ where: { topic: topicStr, lote: { id: loteId } }});
      if(existe) continue;

      // Extraer sensorKey de la clave esperada (última parte del topic)
      const sensorKey = topicStr.split('/').pop() || topicStr;

      const sensorDto: CreateSensoreDto = {
        nombre: nombreFinal,
        loteId: loteId,
        fecha_instalacion: new Date().toISOString().split('T')[0],
        valor_minimo_alerta: minFinal,
        valor_maximo_alerta: maxFinal,
        estado: 'Activo',
        topic: topicStr,
        sensorKey: sensorKey, // Asignar la clave dinámica
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