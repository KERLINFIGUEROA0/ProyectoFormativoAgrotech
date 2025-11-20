import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InformacionSensor } from './entities/informacion_sensor.entity';
import { Sensor } from '../sensores/entities/sensore.entity';
import { CreateInformacionSensorDto } from './dto/create-informacion_sensor.dto';
import { UpdateInformacionSensorDto } from './dto/update-informacion_sensor.dto';

@Injectable()
export class InformacionSensorService {
  private readonly logger = new Logger(InformacionSensorService.name);

  constructor(
    @InjectRepository(InformacionSensor)
    private readonly infoRepo: Repository<InformacionSensor>,
    @InjectRepository(Sensor)
    private readonly sensorRepo: Repository<Sensor>,
  ) {}

  /**
   * Crea un registro a partir de un mensaje MQTT.
   * Busca TODOS los sensores con ese tópico y guarda los datos en cada uno que esté activo.
   * Esto permite que múltiples sensores compartan el mismo tópico pero guarden datos en diferentes surcos/lotes.
   */
  async createFromMqtt(topic: string, payload: string): Promise<void> {
    const valor = parseFloat(payload);
    if (isNaN(valor)) {
      this.logger.warn(`Payload no numérico [${payload}] en topic [${topic}]. Descartado.`);
      return;
    }

    // Buscar TODOS los sensores que coincidan con este 'topic', incluyendo el surco, lote y su broker
    const sensores = await this.sensorRepo.find({
      where: { topic: topic, estado: 'Activo' }, // Solo sensores activos
      relations: ['surco', 'surco.lote', 'surco.broker'],
    });

    if (sensores.length === 0) {
      this.logger.warn(`Mensaje en [${topic}], pero no hay sensores activos registrados en la DB para ese topic.`);
      return;
    }

    // Guardar el dato en cada sensor que cumpla las condiciones
    let guardados = 0;
    for (const sensor of sensores) {
      // Verificar que el surco tenga un broker configurado
      if (!sensor.surco.broker) {
        this.logger.warn(`Sensor ID [${sensor.id}] en surco [${sensor.surco.id}] no tiene broker configurado. Mensaje descartado para este sensor.`);
        continue;
      }

      // Verificar que el surco esté activo para recibir datos MQTT
      if (!sensor.surco.activo_mqtt) {
        this.logger.warn(`Sensor ID [${sensor.id}] en surco [${sensor.surco.id}] tiene MQTT desactivado. Mensaje descartado para este sensor.`);
        continue;
      }

      try {
        const nuevaInfo = this.infoRepo.create({
          valor,
          sensor, // Asocia la entidad Sensor completa
        });

        await this.infoRepo.save(nuevaInfo);

        // Actualizar timestamp del último mensaje MQTT
        sensor.ultimo_mqtt_mensaje = new Date();
        await this.sensorRepo.save(sensor);

        guardados++;
        this.logger.log(`Dato [${valor}] guardado para Sensor ID [${sensor.id}] (Surco: ${sensor.surco.nombre}, Lote: ${sensor.surco.lote?.nombre || 'N/A'}, Broker: ${sensor.surco.broker.nombre}) desde topic [${topic}].`);
      } catch (error) {
        this.logger.error(`Error guardando dato para Sensor ID [${sensor.id}]: ${error.message}`);
      }
    }

    if (guardados > 0) {
      this.logger.log(`✅ Dato [${valor}] guardado en ${guardados} sensor(es) desde topic [${topic}].`);
    }
  }

  async create(createDto: CreateInformacionSensorDto): Promise<InformacionSensor> {
    const { sensorId, valor } = createDto;
    const sensor = await this.sensorRepo.findOneBy({ id: sensorId });
    if (!sensor) {
      this.logger.error(`Sensor con ID ${sensorId} no fue encontrado.`);
      throw new NotFoundException(`Sensor con ID ${sensorId} no fue encontrado.`);
    }
    const nuevaInfo = this.infoRepo.create({ valor, sensor });
    return this.infoRepo.save(nuevaInfo);
  }

  async findAll(): Promise<InformacionSensor[]> {
    return this.infoRepo.find({
      relations: ['sensor'],
      order: { fechaRegistro: 'DESC' },
      take: 50,
    });
  }
  // Reemplaza el método 'findByCultivo' con esto:
  async findByCultivo(cultivoId: number) {
    return this.infoRepo.createQueryBuilder('info')
      // 1. Unimos la tabla de sensores
      .innerJoinAndSelect('info.sensor', 'sensor')
      // 2. Unimos la tabla de surcos (donde está el sensor)
      .innerJoinAndSelect('sensor.surco', 'surco')
      // 3. Unimos la tabla de cultivos (para filtrar)
      .innerJoinAndSelect('surco.cultivo', 'cultivo')
      // 4. Filtramos por el ID del cultivo que recibimos
      .where('cultivo.id = :cultivoId', { cultivoId })
      // 5. Ordenamos por fecha (más reciente primero)
      .orderBy('info.fechaRegistro', 'DESC')
      .getMany();
  }

  async findAllBySensor(sensorId: number, take: number = 100): Promise<InformacionSensor[]> {
    return this.infoRepo.find({
      where: { sensor: { id: sensorId } },
      relations: ['sensor'],
      order: { fechaRegistro: 'DESC' },
      take: take,
    });
  }

  /**
   * ✅ NUEVO: Devuelve el último dato registrado de CADA sensor.
   * Solo muestra datos si hay mensajes MQTT recientes (últimos 2 minutos por defecto).
   * Si no hay mensajes MQTT recientes, muestra null para que aparezca "N/A".
   */
  async getLatestData(maxAgeMinutes: number = 10): Promise<any[]> {
    this.logger.log('🔍 Iniciando getLatestData...');

    // Usamos TypeORM QueryBuilder para obtener todos los sensores activos
    const sensores = await this.sensorRepo.find({
      where: { estado: 'Activo' },
      relations: ['surco', 'surco.broker'],
    });

    this.logger.log(`✅ Encontrados ${sensores.length} sensores activos`);

    if (sensores.length === 0) {
      this.logger.warn('⚠️ No hay sensores activos');
      return [];
    }

    // Calcular el tiempo límite (hace maxAgeMinutes minutos)
    const limiteTiempo = new Date();
    limiteTiempo.setMinutes(limiteTiempo.getMinutes() - maxAgeMinutes);

    // Para cada sensor, obtenemos su último dato
    const resultados = await Promise.all(
      sensores.map(async (sensor) => {
        this.logger.debug(`🔎 Buscando último dato para sensor ID: ${sensor.id}, Nombre: ${sensor.nombre}`);

        let valor: number | null = null;
        let fechaRegistro: string | null = null;

        // Verificar si hay mensajes MQTT recientes
        if (sensor.ultimo_mqtt_mensaje) {
          const fechaMqtt = new Date(sensor.ultimo_mqtt_mensaje);
          if (fechaMqtt >= limiteTiempo) {
            // Hay mensajes MQTT recientes, buscar el último dato
            const ultimoDato = await this.infoRepo.findOne({
              where: { sensor: { id: sensor.id } },
              order: { fechaRegistro: 'DESC' },
            });

            if (ultimoDato) {
              valor = Number(ultimoDato.valor);
              fechaRegistro = ultimoDato.fechaRegistro.toISOString();
              this.logger.log(`✅ Sensor ${sensor.id} (${sensor.nombre}): Valor=${valor}, Último MQTT=${fechaMqtt.toISOString()} (ACTIVO)`);
            } else {
              this.logger.warn(`⚠️ Sensor ${sensor.id} (${sensor.nombre}): MQTT reciente pero sin datos en BD`);
            }
          } else {
            // Último mensaje MQTT es antiguo
            this.logger.warn(`⚠️ Sensor ${sensor.id} (${sensor.nombre}): Último MQTT antiguo (${fechaMqtt.toISOString()}), mostrando N/A`);
          }
        } else {
          // Nunca ha recibido mensajes MQTT
          this.logger.warn(`⚠️ Sensor ${sensor.id} (${sensor.nombre}): Nunca ha recibido mensajes MQTT`);
        }

        const resultado = {
          id: sensor.id,
          nombre: sensor.nombre,
          topic: sensor.topic,
          valorMinimo: sensor.valor_minimo_alerta,
          valorMaximo: sensor.valor_maximo_alerta,
          valor: valor,
          fechaRegistro: fechaRegistro,
        };

        return resultado;
      })
    );

    this.logger.log(`✅ Devolviendo ${resultados.length} resultados`);
    return resultados;
  }

  // --- Métodos placeholder ---
  findOne(id: number) {
    return `This action returns a #${id} informacionSensor`;
  }
  update(id: number, updateDto: UpdateInformacionSensorDto) {
    return `This action updates a #${id} informacionSensor`;
  }
  remove(id: number) {
    return `This action removes a #${id} informacionSensor`;
  }
  
}