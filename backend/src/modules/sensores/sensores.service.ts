import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sensor } from './entities/sensore.entity';
import { CreateSensoreDto } from './dto/create-sensore.dto';
import { UpdateSensoreDto } from './dto/update-sensore.dto';
import { Surco } from '../surcos/entities/surco.entity';
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
      relations: ['surco', 'surco.lote', 'surco.broker'],
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
    if (sensor.topic && sensor.surco?.broker) {
       // Construimos un tópico de configuración, ej: "granja/surco1/sensorLuz/config"
       const configTopic = `${sensor.topic}/config`;
       const payload = JSON.stringify({ 
         tipo: 'UPDATE_INTERVAL', 
         valor: segundos 
       });

       try {
         await this.mqttClientService.publishToBroker(
           sensor.surco.broker.id, 
           configTopic, 
           payload
         );
         console.log(`📡 Comando de frecuencia enviado a ${configTopic}`);
       } catch (error) {
         console.warn(`No se pudo enviar comando MQTT: ${error.message}`);
       }
    }

    return sensorActualizado;
  }


  async create(createSensoreDto: CreateSensoreDto): Promise<Sensor> {
    const { surcoId, topic, broker } = createSensoreDto;

    // Ya no validamos tópico único - múltiples sensores pueden usar el mismo tópico
    // Cada sensor guardará los datos en su propio surco/lote

    const surco = await this.surcoRepo.findOne({ 
      where: { id: surcoId },
      relations: ['broker']
    });
    if (!surco) throw new NotFoundException(`El surco con ID ${surcoId} no fue encontrado.`);

    // Si se proporciona información del broker, crear o actualizar el broker
    let brokerEntity: Broker | null = null;
    if (broker) {
      // Buscar si ya existe un broker con el mismo nombre
      let existingBroker = await this.brokerRepo.findOne({
        where: { nombre: broker.nombre }
      });

      if (existingBroker) {
        // Si existe, actualizarlo con los nuevos datos
        existingBroker.host = broker.host;
        existingBroker.puerto = broker.puerto;
        existingBroker.protocolo = broker.protocolo;
        if (broker.usuario !== undefined) existingBroker.usuario = broker.usuario;
        if (broker.password !== undefined) existingBroker.password = broker.password;
        brokerEntity = await this.brokerRepo.save(existingBroker);
      } else {
        // Si no existe, crear uno nuevo
        const nuevoBroker = this.brokerRepo.create({
          nombre: broker.nombre,
          host: broker.host,
          puerto: broker.puerto,
          protocolo: broker.protocolo,
          usuario: broker.usuario,
          password: broker.password,
        });
        brokerEntity = await this.brokerRepo.save(nuevoBroker);
      }

      // Asociar el broker al surco
      surco.broker = brokerEntity;
      await this.surcoRepo.save(surco);
    }

    // Crear el sensor
    const { broker: _, ...sensorData } = createSensoreDto; // Excluir broker del DTO
    const nuevoSensor = this.sensorRepo.create({ ...sensorData, surco });
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
    relations: ['surco', 'surco.lote', 'surco.cultivo', 'surco.broker'] 
  });
}

  async update(id: number, updateSensoreDto: UpdateSensoreDto): Promise<Sensor> {
    const sensor = await this.findOne(id);
    const { surcoId, topic } = updateSensoreDto;

    // Ya no validamos tópico único - múltiples sensores pueden usar el mismo tópico

    if (surcoId) {
      const surco = await this.surcoRepo.findOne({ 
        where: { id: surcoId },
        relations: ['broker']
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
   * Obtiene sensores activos por surco
   */
  async findBySurco(surcoId: number): Promise<Sensor[]> {
    return this.sensorRepo.find({
      where: {
        surco: { id: surcoId },
        estado: 'Activo'
      },
      relations: ['surco', 'surco.lote', 'surco.cultivo']
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
      relations: ['surco', 'surco.lote', 'surco.cultivo']
    });
  }
}