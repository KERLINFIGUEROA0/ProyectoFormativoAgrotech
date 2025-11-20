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
   * (Esta es la consulta que necesitas para "mostrar en pantalla" el estado actual).
   */
  async getLatestData(): Promise<any[]> {
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

    // Para cada sensor, obtenemos su último dato
    const resultados = await Promise.all(
      sensores.map(async (sensor) => {
        this.logger.debug(`🔎 Buscando último dato para sensor ID: ${sensor.id}, Nombre: ${sensor.nombre}`);
        
        // Intentamos buscar el último dato usando la relación
        const ultimoDato = await this.infoRepo.findOne({
          where: { sensor: { id: sensor.id } },
          order: { fechaRegistro: 'DESC' },
        });

        if (ultimoDato) {
          this.logger.log(`✅ Sensor ${sensor.id} (${sensor.nombre}): Valor=${ultimoDato.valor}, Fecha=${ultimoDato.fechaRegistro}`);
        } else {
          this.logger.warn(`⚠️ Sensor ${sensor.id} (${sensor.nombre}): Sin datos en informacion_sensor`);
        }

        const resultado = {
          id: sensor.id,
          nombre: sensor.nombre,
          topic: sensor.topic,
          valorMinimo: sensor.valor_minimo_alerta,
          valorMaximo: sensor.valor_maximo_alerta,
          valor: ultimoDato ? Number(ultimoDato.valor) : null,
          fechaRegistro: ultimoDato ? ultimoDato.fechaRegistro.toISOString() : null,
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

  /**
   * Generate advanced report with statistics and chart data
   */
  
  async generateReport(scope: 'surco' | 'cultivo', scopeId: number, timeFilter: 'day' | 'date' | 'month', date?: string) {
    this.logger.log(`🔍 Generating report: scope=${scope}, scopeId=${scopeId}, timeFilter=${timeFilter}, date=${date}`);

    let startDate: Date;
    let endDate: Date;
    const now = new Date();

    // Calculate date range
    if (timeFilter === 'day') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    } else if (timeFilter === 'date' && date) {
      const targetDate = new Date(date);
      startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      endDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);
    } else if (timeFilter === 'month' && date) {
      const [year, month] = date.split('-').map(Number);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 1);
    } else {
      throw new Error('Invalid time filter parameters');
    }

    this.logger.log(`📅 Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Build query based on scope
    let queryBuilder = this.infoRepo.createQueryBuilder('info')
      .innerJoinAndSelect('info.sensor', 'sensor')
      .innerJoinAndSelect('sensor.surco', 'surco')
      .where('info.fechaRegistro >= :startDate', { startDate })
      .andWhere('info.fechaRegistro < :endDate', { endDate })
      .orderBy('info.fechaRegistro', 'ASC');

    if (scope === 'surco') {
      queryBuilder = queryBuilder.andWhere('surco.id = :surcoId', { surcoId: scopeId });
    } else if (scope === 'cultivo') {
      queryBuilder = queryBuilder
        .innerJoin('surco.cultivo', 'cultivo')
        .andWhere('cultivo.id = :cultivoId', { cultivoId: scopeId });
    }

    const data = await queryBuilder.getMany();
    this.logger.log(`📊 Found ${data.length} sensor data records`);

    // Group by sensor
    const sensorData = new Map<number, { sensor: Sensor, values: number[], timestamps: Date[] }>();

    data.forEach(item => {
      if (!sensorData.has(item.sensor.id)) {
        sensorData.set(item.sensor.id, {
          sensor: item.sensor,
          values: [],
          timestamps: []
        });
      }
      const sensorInfo = sensorData.get(item.sensor.id)!;
      sensorInfo.values.push(Number(item.valor));
      sensorInfo.timestamps.push(item.fechaRegistro);
    });

    this.logger.log(`📈 Grouped into ${sensorData.size} sensors`);

    // Calculate statistics for each sensor
    const report = Array.from(sensorData.entries()).map(([sensorId, info]) => {
      const values = info.values;
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      // Prepare chart data
      const chartData = info.timestamps.map((timestamp, index) => ({
        timestamp: timestamp.toISOString(),
        value: values[index]
      }));

      return {
        sensorId,
        sensorName: info.sensor.nombre,
        statistics: {
          min,
          max,
          average: Number(avg.toFixed(2)),
          standardDeviation: Number(stdDev.toFixed(2))
        },
        chartData
      };
    });

    return {
      scope,
      scopeId,
      timeFilter,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      sensors: report
    };
  }

}