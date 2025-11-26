import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sensor } from './entities/sensore.entity';
import { CreateSensoreDto } from './dto/create-sensore.dto';
import { UpdateSensoreDto } from './dto/update-sensore.dto';
import { Surco } from '../surcos/entities/surco.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { Broker } from '../mqtt-config/entities/broker.entity';
import { InformacionSensorService } from '../informacion_sensor/informacion_sensor.service';
import { MqttClientService } from '../mqtt-config/mqtt-client.service';

@Injectable()
export class SensoresService {
  constructor(
    @InjectRepository(Sensor)
    private readonly sensorRepo: Repository<Sensor>,
    @InjectRepository(Surco)
    private readonly surcoRepo: Repository<Surco>,
    @InjectRepository(Broker)
    private readonly brokerRepo: Repository<Broker>,
    @Inject(forwardRef(() => InformacionSensorService))
    private readonly infoSensorService: InformacionSensorService,
    @Inject(forwardRef(() => MqttClientService))
    private readonly mqttClientService: MqttClientService,
  ) {}


  

  async findOne(id: number): Promise<Sensor> {
    const sensor = await this.sensorRepo.findOne({
      where: { id },
      relations: ['lote', 'surco', 'surco.lote'],
    });
    if (!sensor) {
      throw new NotFoundException(`Sensor con ID ${id} no encontrado.`);
    }
    return sensor;
  }


  /**
   * Función para actualizar el tiempo de escaneo de un sensor específico
   * y notificar al dispositivo IoT si está conectado.
   */
  async actualizarFrecuenciaEscaneo(id: number, segundos: number): Promise<Sensor> {
    const sensor = await this.findOne(id);
    
    // 1. Actualizar en Base de Datos
    sensor.frecuencia_escaneo = segundos;
    const sensorActualizado = await this.sensorRepo.save(sensor);

    // 2. (Opcional) Enviar comando al dispositivo IoT vía MQTT
    // Esto permite que el dispositivo físico sepa que debe cambiar su ritmo.
    if (sensor.topic && sensor.lote) {
       // Construimos un tópico de configuración, ej: "granja/lote1/sensorLuz/config"
       const configTopic = `${sensor.topic}/config`;
       const payload = JSON.stringify({
         tipo: 'UPDATE_INTERVAL',
         valor: segundos
       });

       // Enviar a todos los brokers del lote
       const brokers = await this.brokerRepo.find({ where: { lote: { id: sensor.lote.id } } });
       for (const broker of brokers) {
         try {
           await this.mqttClientService.publishToBroker(
             broker.id,
             configTopic,
             payload
           );
           console.log(`📡 Comando de frecuencia enviado a ${configTopic} via broker ${broker.nombre}`);
         } catch (error) {
           console.warn(`No se pudo enviar comando MQTT via broker ${broker.nombre}: ${error.message}`);
         }
       }
     }

    return sensorActualizado;
  }


  async create(createSensoreDto: CreateSensoreDto): Promise<Sensor> {
    const { loteId: dtoLoteId, surcoId: dtoSurcoId, topic, broker: dtoBroker } = createSensoreDto;

    // Ya no validamos tópico único - múltiples sensores pueden usar el mismo tópico
    // Cada sensor guardará los datos en su propio lote

    const lote = await this.brokerRepo.manager.findOne(Lote, { where: { id: dtoLoteId } });
    if (!lote) throw new NotFoundException(`El lote con ID ${dtoLoteId} no fue encontrado.`);

    let surco: Surco | null = null;
    if (dtoSurcoId) {
      surco = await this.surcoRepo.findOne({ where: { id: dtoSurcoId } });
      if (!surco) throw new NotFoundException(`El surco con ID ${dtoSurcoId} no fue encontrado.`);
    }

    // Si se proporciona información del broker, crear o actualizar el broker
    let brokerEntity: Broker | null = null;
    if (dtoBroker) {
      // Buscar si ya existe un broker con el mismo nombre
      let existingBroker = await this.brokerRepo.findOne({
        where: { nombre: dtoBroker.nombre }
      });

      if (existingBroker) {
        // Si existe, actualizarlo con los nuevos datos
        existingBroker.host = dtoBroker.host;
        existingBroker.puerto = dtoBroker.puerto;
        existingBroker.protocolo = dtoBroker.protocolo;
        if (dtoBroker.usuario !== undefined) existingBroker.usuario = dtoBroker.usuario;
        if (dtoBroker.password !== undefined) existingBroker.password = dtoBroker.password;
        brokerEntity = await this.brokerRepo.save(existingBroker);
      } else {
        // Si no existe, crear uno nuevo
        const nuevoBroker = this.brokerRepo.create({
          nombre: dtoBroker.nombre,
          host: dtoBroker.host,
          puerto: dtoBroker.puerto,
          protocolo: dtoBroker.protocolo,
          usuario: dtoBroker.usuario,
          password: dtoBroker.password,
          lote: lote,
        });
        brokerEntity = await this.brokerRepo.save(nuevoBroker);
      }
    }

    // Crear el sensor
    const { broker, loteId, surcoId, ...sensorData } = createSensoreDto; // Excluir broker, loteId, surcoId del DTO
    const nuevoSensor = this.sensorRepo.create({ ...sensorData, lote, surco });
    const sensorGuardado = await this.sensorRepo.save(nuevoSensor);

    // Insertar un dato inicial en informacion_sensor
    // Usamos un valor promedio entre el mínimo y máximo de alerta como valor inicial
    const valorInicial = (Number(sensorGuardado.valor_minimo_alerta) + Number(sensorGuardado.valor_maximo_alerta)) / 2;
    
    try {
      await this.infoSensorService.create({
        sensorId: sensorGuardado.id,
        valor: Number(valorInicial.toFixed(2)),
      });
    } catch (error) {
      // Si falla la inserción del dato inicial, no falla la creación del sensor
      // Solo logueamos el error
      console.error(`Error al insertar dato inicial para sensor ${sensorGuardado.id}:`, error);
    }

    // Suscribirse al tópico MQTT del nuevo sensor
    try {
      // Recargar el sensor con las relaciones para el servicio MQTT
      const sensorCompleto = await this.sensorRepo.findOne({
        where: { id: sensorGuardado.id },
        relations: ['surco', 'surco.broker'],
      });
      
      if (sensorCompleto) {
        await this.mqttClientService.subscribeToNewSensor(sensorCompleto);
      }
    } catch (error) {
      console.error(`Error suscribiéndose al tópico MQTT del sensor ${sensorGuardado.id}:`, error);
    }

    return sensorGuardado;
  }

  async findAll(): Promise<Sensor[]> {
  // Agrega 'surco.cultivo' a la lista de relaciones
  return this.sensorRepo.find({
    relations: ['lote', 'surco', 'surco.lote', 'surco.cultivo']
  });
}

  async update(id: number, updateSensoreDto: UpdateSensoreDto): Promise<Sensor> {
    const sensor = await this.findOne(id);
    const { loteId, surcoId, topic } = updateSensoreDto;

    // Ya no validamos tópico único - múltiples sensores pueden usar el mismo tópico

    if (loteId) {
      const lote = await this.brokerRepo.manager.findOne(Lote, { where: { id: loteId } });
      if (!lote) throw new NotFoundException(`El lote con ID ${loteId} no fue encontrado.`);
      sensor.lote = lote;
    }

    if (surcoId) {
      const surco = await this.surcoRepo.findOne({
        where: { id: surcoId }
      });
      if (!surco) throw new NotFoundException(`El surco con ID ${surcoId} no fue encontrado.`);
      sensor.surco = surco;
    }

    Object.assign(sensor, updateSensoreDto);
    return this.sensorRepo.save(sensor);
  }

  async updateEstado(id: number, estado: 'Activo' | 'Inactivo' | 'Mantenimiento'): Promise<Sensor> {
    const sensor = await this.findOne(id);
    const estadoAnterior = sensor.estado;
    sensor.estado = estado;
    const updated = await this.sensorRepo.save(sensor);

    // Si cambió de inactivo a activo, suscribir
    if (estadoAnterior !== 'Activo' && estado === 'Activo') {
      await this.mqttClientService.subscribeToNewSensor(updated);
    }
    // Si cambió de activo a inactivo, desuscribir
    else if (estadoAnterior === 'Activo' && estado !== 'Activo') {
      await this.mqttClientService.unsubscribeSensor(updated);
    }

    return updated;
  }

  async remove(id: number): Promise<void> {
    const sensor = await this.findOne(id);
    await this.sensorRepo.remove(sensor);
  }

  /**
   * Obtiene sensores activos por lote
   */
  async findByLote(loteId: number): Promise<Sensor[]> {
    return this.sensorRepo.find({
      where: {
        lote: { id: loteId },
        estado: 'Activo'
      },
      relations: ['lote', 'surco', 'surco.lote', 'surco.cultivo']
    });
  }

  /**
   * Obtiene sensores activos por surco
   */
  async findBySurco(surcoId: number): Promise<Sensor[]> {
    return this.sensorRepo.find({
      where: {
        surco: { id: surcoId },
        estado: 'Activo'
      },
      relations: ['lote', 'surco', 'surco.lote', 'surco.cultivo']
    });
  }

  /**
   * Obtiene sensores activos por cultivo
   */
  async findByCultivo(cultivoId: number): Promise<Sensor[]> {
    return this.sensorRepo.find({
      where: {
        surco: { cultivo: { id: cultivoId } },
        estado: 'Activo'
      },
      relations: ['lote', 'surco', 'surco.lote', 'surco.cultivo']
    });
  }
}