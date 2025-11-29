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

    // Buscar TODOS los sensores que coincidan con este 'topic', incluyendo el lote, sublote y brokers del lote
    const sensores = await this.sensorRepo.find({
      where: { topic: topic, estado: 'Activo' }, // Solo sensores activos
      relations: ['lote', 'sublote', 'lote.brokerLotes', 'lote.brokerLotes.broker'],
    });

    if (sensores.length === 0) {
      this.logger.warn(`Mensaje en [${topic}], pero no hay sensores activos registrados en la DB para ese topic.`);
      return;
    }

    // Guardar el dato en cada sensor que cumpla las condiciones
    let guardados = 0;
    for (const sensor of sensores) {
      // Verificar que el lote tenga brokers configurados
      const brokersDelLote = sensor.lote.brokerLotes?.map(bl => bl.broker) || [];
      if (!brokersDelLote || brokersDelLote.length === 0) {
        this.logger.warn(`Sensor ID [${sensor.id}] en lote [${sensor.lote.nombre}] no tiene brokers configurados. Mensaje descartado para este sensor.`);
        continue;
      }

      // Verificar que el sublote esté activo para recibir datos MQTT (si tiene sublote asignado)
      if (sensor.sublote && !sensor.sublote.activo_mqtt) {
        this.logger.warn(`Sensor ID [${sensor.id}] en sublote [${sensor.sublote.nombre}] tiene MQTT desactivado. Mensaje descartado para este sensor.`);
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
        const brokerNames = brokersDelLote.map(b => b.nombre).join(', ');
        this.logger.log(`Dato [${valor}] guardado para Sensor ID [${sensor.id}] (Sublote: ${sensor.sublote?.nombre || 'N/A'}, Lote: ${sensor.lote.nombre}, Brokers: ${brokerNames}) desde topic [${topic}].`);
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
      // 2. Unimos la tabla de sublotes (donde está el sensor)
      .innerJoinAndSelect('sensor.sublote', 'sublote')
      // 3. Unimos la tabla de cultivos (para filtrar)
      .innerJoinAndSelect('sublote.cultivo', 'cultivo')
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
      relations: ['lote', 'sublote'],
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

  /**
   * Generate advanced report with statistics and chart data
   */
  
  async generateReport(scope: 'sublote' | 'cultivo', scopeId: number, timeFilter: 'day' | 'date' | 'month', date?: string, sensorId?: number) {
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
      .innerJoinAndSelect('sensor.sublote', 'sublote')
      .where('info.fechaRegistro >= :startDate', { startDate })
      .andWhere('info.fechaRegistro < :endDate', { endDate })
      .orderBy('info.fechaRegistro', 'ASC');

    if (scope === 'sublote') {
      queryBuilder = queryBuilder.andWhere('sublote.id = :subloteId', { subloteId: scopeId });
    } else if (scope === 'cultivo') {
      queryBuilder = queryBuilder
        .innerJoin('sublote.cultivo', 'cultivo')
        .andWhere('cultivo.id = :cultivoId', { cultivoId: scopeId });
    }

    // Filter by specific sensor if provided
    if (sensorId) {
      queryBuilder = queryBuilder.andWhere('sensor.id = :sensorId', { sensorId });
    }

    const data = await queryBuilder.getMany();
    this.logger.log(`📊 Found ${data.length} sensor data records`);

    // Group by sensor
    const sensorData = new Map<number, { sensor: Sensor, values: number[], timestamps: Date[], rawData: InformacionSensor[] }>();

    data.forEach(item => {
      if (!sensorData.has(item.sensor.id)) {
        sensorData.set(item.sensor.id, {
          sensor: item.sensor,
          values: [],
          timestamps: [],
          rawData: []
        });
      }
      const sensorInfo = sensorData.get(item.sensor.id)!;
      sensorInfo.values.push(Number(item.valor));
      sensorInfo.timestamps.push(item.fechaRegistro);
      sensorInfo.rawData.push(item);
    });

    this.logger.log(`📈 Grouped into ${sensorData.size} sensors`);

    // Calculate statistics for each sensor
    const report = await Promise.all(Array.from(sensorData.entries()).map(async ([sensorId, info]) => {
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

      // Detectar pronósticos para este sensor
      const pronosticos = await this.detectarPronosticos(info.sensor, info.rawData);

      return {
        sensorId,
        sensorName: info.sensor.nombre,
        statistics: {
          min,
          max,
          average: Number(avg.toFixed(2)),
          standardDeviation: Number(stdDev.toFixed(2))
        },
        chartData,
        alertas: pronosticos.alertas,
        fechasCriticas: pronosticos.fechasCriticas.map(d => d.toISOString())
      };
    }));

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

  /**
    * Detecta pronósticos basados en los últimos 10 datos según el tipo de sensor
    */
   async detectarPronosticos(sensor: Sensor, data: InformacionSensor[]): Promise<{ alertas: string[], fechasCriticas: Date[] }> {
     const nombreSensor = sensor.nombre.toLowerCase();
     const alertas: string[] = [];
     const fechasCriticas: Date[] = [];

     // Obtener los últimos 10 datos (ordenados por fecha descendente)
     const ultimos10 = data.slice(0, 10);

     if (ultimos10.length === 0) {
       return { alertas, fechasCriticas };
     }

     // Calcular estadísticas de los últimos 10 datos
     const valores = ultimos10.map(d => d.valor);
     const promedio = valores.reduce((sum, val) => sum + val, 0) / valores.length;
     const maxValor = Math.max(...valores);
     const minValor = Math.min(...valores);

     // Detectar pronósticos según el tipo de sensor
     if (nombreSensor.includes('temperatura') || nombreSensor.includes('clima') || nombreSensor.includes('temp')) {
       // PRONÓSTICOS PARA TEMPERATURA
       const UMBRAL_HELADA = 15; // °C para posible helada
       const UMBRAL_SEQUIA = 30; // °C para posible sequía

       const conteoHeladas = valores.filter(v => v < UMBRAL_HELADA).length;
       const conteoSequias = valores.filter(v => v > UMBRAL_SEQUIA).length;

       // Eventos críticos en los últimos 10 datos
       ultimos10.forEach(dato => {
         const fechaHora = dato.fechaRegistro.toLocaleString('es-ES', {
           year: 'numeric',
           month: '2-digit',
           day: '2-digit',
           hour: '2-digit',
           minute: '2-digit'
         });
         if (dato.valor < UMBRAL_HELADA) {
           alertas.push(`Temperatura baja (${dato.valor}°C) el ${fechaHora} - Riesgo de helada.`);
           fechasCriticas.push(dato.fechaRegistro);
         }
         if (dato.valor > UMBRAL_SEQUIA) {
           alertas.push(`Temperatura alta (${dato.valor}°C) el ${fechaHora} - Riesgo de estrés térmico.`);
           fechasCriticas.push(dato.fechaRegistro);
         }
       });

       // Pronósticos basados en tendencia
       if (conteoHeladas >= 5 || promedio < UMBRAL_HELADA) {
         alertas.push(`Pronóstico: Posible helada - Promedio últimos 10: ${promedio.toFixed(1)}°C (mín: ${minValor}°C).`);
       }
       if (conteoSequias >= 5 || promedio > UMBRAL_SEQUIA) {
         alertas.push(`Pronóstico: Posible sequía por calor - Promedio últimos 10: ${promedio.toFixed(1)}°C (máx: ${maxValor}°C).`);
       }

     } else if (nombreSensor.includes('humedad') && nombreSensor.includes('suelo')) {
       // PRONÓSTICOS PARA HUMEDAD DEL SUELO
       const UMBRAL_SECO = 20; // % humedad baja
       const UMBRAL_INUNDADO = 80; // % humedad alta

       const conteoSeco = valores.filter(v => v < UMBRAL_SECO).length;
       const conteoInundado = valores.filter(v => v > UMBRAL_INUNDADO).length;

       ultimos10.forEach(dato => {
         const fechaHora = dato.fechaRegistro.toLocaleString('es-ES', {
           year: 'numeric',
           month: '2-digit',
           day: '2-digit',
           hour: '2-digit',
           minute: '2-digit'
         });
         if (dato.valor < UMBRAL_SECO) {
           alertas.push(`Suelo seco (${dato.valor}%) el ${fechaHora} - Necesario riego.`);
           fechasCriticas.push(dato.fechaRegistro);
         }
         if (dato.valor > UMBRAL_INUNDADO) {
           alertas.push(`Suelo inundado (${dato.valor}%) el ${fechaHora} - Riesgo de pudrición.`);
           fechasCriticas.push(dato.fechaRegistro);
         }
       });

       if (conteoSeco >= 5 || promedio < UMBRAL_SECO) {
         alertas.push(`Pronóstico: Sequía del suelo - Promedio últimos 10: ${promedio.toFixed(1)}% (mín: ${minValor}%).`);
       }
       if (conteoInundado >= 5 || promedio > UMBRAL_INUNDADO) {
         alertas.push(`Pronóstico: Exceso de humedad - Promedio últimos 10: ${promedio.toFixed(1)}% (máx: ${maxValor}%).`);
       }

     } else if (nombreSensor.includes('humedad') && nombreSensor.includes('aire')) {
       // PRONÓSTICOS PARA HUMEDAD DEL AIRE
       const UMBRAL_SECO = 30; // % humedad relativa baja
       const UMBRAL_HUMEDO = 80; // % humedad relativa alta

       const conteoSeco = valores.filter(v => v < UMBRAL_SECO).length;
       const conteoHumendo = valores.filter(v => v > UMBRAL_HUMEDO).length;

       ultimos10.forEach(dato => {
         const fechaHora = dato.fechaRegistro.toLocaleString('es-ES', {
           year: 'numeric',
           month: '2-digit',
           day: '2-digit',
           hour: '2-digit',
           minute: '2-digit'
         });
         if (dato.valor < UMBRAL_SECO) {
           alertas.push(`Aire seco (${dato.valor}%) el ${fechaHora} - Riesgo de estrés hídrico.`);
           fechasCriticas.push(dato.fechaRegistro);
         }
         if (dato.valor > UMBRAL_HUMEDO) {
           alertas.push(`Aire muy húmedo (${dato.valor}%) el ${fechaHora} - Riesgo de enfermedades fúngicas.`);
           fechasCriticas.push(dato.fechaRegistro);
         }
       });

       if (conteoSeco >= 5 || promedio < UMBRAL_SECO) {
         alertas.push(`Pronóstico: Ambiente seco - Promedio últimos 10: ${promedio.toFixed(1)}% (mín: ${minValor}%).`);
       }
       if (conteoHumendo >= 5 || promedio > UMBRAL_HUMEDO) {
         alertas.push(`Pronóstico: Ambiente húmedo - Promedio últimos 10: ${promedio.toFixed(1)}% (máx: ${maxValor}%).`);
       }

     } else if (nombreSensor.includes('ph') || nombreSensor.includes('acidez')) {
       // PRONÓSTICOS PARA pH DEL SUELO
       const UMBRAL_ACIDO = 5.5; // pH ácido
       const UMBRAL_ALCALINO = 8.5; // pH alcalino
       const PH_OPTIMO_MIN = 6.0;
       const PH_OPTIMO_MAX = 7.5;

       ultimos10.forEach(dato => {
         const fechaHora = dato.fechaRegistro.toLocaleString('es-ES', {
           year: 'numeric',
           month: '2-digit',
           day: '2-digit',
           hour: '2-digit',
           minute: '2-digit'
         });
         if (dato.valor < UMBRAL_ACIDO) {
           alertas.push(`Suelo muy ácido (pH ${dato.valor}) el ${fechaHora} - Necesario encalado.`);
           fechasCriticas.push(dato.fechaRegistro);
         }
         if (dato.valor > UMBRAL_ALCALINO) {
           alertas.push(`Suelo muy alcalino (pH ${dato.valor}) el ${fechaHora} - Necesario acidificación.`);
           fechasCriticas.push(dato.fechaRegistro);
         }
       });

       if (promedio < PH_OPTIMO_MIN) {
         alertas.push(`Pronóstico: Suelo ácido - Promedio pH últimos 10: ${promedio.toFixed(1)} (rango óptimo: 6.0-7.5).`);
       }
       if (promedio > PH_OPTIMO_MAX) {
         alertas.push(`Pronóstico: Suelo alcalino - Promedio pH últimos 10: ${promedio.toFixed(1)} (rango óptimo: 6.0-7.5).`);
       }

     } else if (nombreSensor.includes('luz') || nombreSensor.includes('uv') || nombreSensor.includes('radiacion')) {
       // PRONÓSTICOS PARA LUZ/UV
       const UMBRAL_BAJA = 100; // Lux o unidad de luz baja
       const UMBRAL_ALTA = 10000; // Lux o unidad de luz muy alta

       const conteoBaja = valores.filter(v => v < UMBRAL_BAJA).length;
       const conteoAlta = valores.filter(v => v > UMBRAL_ALTA).length;

       ultimos10.forEach(dato => {
         const fechaHora = dato.fechaRegistro.toLocaleString('es-ES', {
           year: 'numeric',
           month: '2-digit',
           day: '2-digit',
           hour: '2-digit',
           minute: '2-digit'
         });
         if (dato.valor < UMBRAL_BAJA) {
           alertas.push(`Iluminación baja (${dato.valor} lux) el ${fechaHora} - Puede afectar crecimiento.`);
           fechasCriticas.push(dato.fechaRegistro);
         }
         if (dato.valor > UMBRAL_ALTA) {
           alertas.push(`Iluminación excesiva (${dato.valor} lux) el ${fechaHora} - Riesgo de quemaduras.`);
           fechasCriticas.push(dato.fechaRegistro);
         }
       });

       if (conteoBaja >= 5 || promedio < UMBRAL_BAJA) {
         alertas.push(`Pronóstico: Iluminación insuficiente - Promedio últimos 10: ${promedio.toFixed(0)} lux.`);
       }
       if (conteoAlta >= 5 || promedio > UMBRAL_ALTA) {
         alertas.push(`Pronóstico: Iluminación excesiva - Promedio últimos 10: ${promedio.toFixed(0)} lux.`);
       }

     } else if (nombreSensor.includes('co2') || nombreSensor.includes('dióxido') || nombreSensor.includes('gas')) {
       // PRONÓSTICOS PARA CO2
       const UMBRAL_BAJO = 300; // ppm CO2 bajo
       const UMBRAL_ALTO = 1000; // ppm CO2 alto

       ultimos10.forEach(dato => {
         const fechaHora = dato.fechaRegistro.toLocaleString('es-ES', {
           year: 'numeric',
           month: '2-digit',
           day: '2-digit',
           hour: '2-digit',
           minute: '2-digit'
         });
         if (dato.valor < UMBRAL_BAJO) {
           alertas.push(`CO2 bajo (${dato.valor} ppm) el ${fechaHora} - Puede limitar fotosíntesis.`);
           fechasCriticas.push(dato.fechaRegistro);
         }
         if (dato.valor > UMBRAL_ALTO) {
           alertas.push(`CO2 alto (${dato.valor} ppm) el ${fechaHora} - Riesgo de toxicidad.`);
           fechasCriticas.push(dato.fechaRegistro);
         }
       });

       if (promedio < UMBRAL_BAJO) {
         alertas.push(`Pronóstico: Niveles bajos de CO2 - Promedio últimos 10: ${promedio.toFixed(0)} ppm.`);
       }
       if (promedio > UMBRAL_ALTO) {
         alertas.push(`Pronóstico: Niveles altos de CO2 - Promedio últimos 10: ${promedio.toFixed(0)} ppm.`);
       }

     } else if (nombreSensor.includes('nivel') || nombreSensor.includes('agua') || nombreSensor.includes('tanque')) {
       // PRONÓSTICOS PARA NIVEL DE AGUA
       const UMBRAL_BAJO = 20; // % nivel bajo
       const UMBRAL_ALTO = 90; // % nivel alto

       const conteoBajo = valores.filter(v => v < UMBRAL_BAJO).length;
       const conteoAlto = valores.filter(v => v > UMBRAL_ALTO).length;

       ultimos10.forEach(dato => {
         const fechaHora = dato.fechaRegistro.toLocaleString('es-ES', {
           year: 'numeric',
           month: '2-digit',
           day: '2-digit',
           hour: '2-digit',
           minute: '2-digit'
         });
         if (dato.valor < UMBRAL_BAJO) {
           alertas.push(`Nivel de agua bajo (${dato.valor}%) el ${fechaHora} - Necesario rellenar.`);
           fechasCriticas.push(dato.fechaRegistro);
         }
         if (dato.valor > UMBRAL_ALTO) {
           alertas.push(`Nivel de agua alto (${dato.valor}%) el ${fechaHora} - Riesgo de desbordamiento.`);
           fechasCriticas.push(dato.fechaRegistro);
         }
       });

       if (conteoBajo >= 5 || promedio < UMBRAL_BAJO) {
         alertas.push(`Pronóstico: Nivel de agua bajo - Promedio últimos 10: ${promedio.toFixed(1)}%.`);
       }
       if (conteoAlto >= 5 || promedio > UMBRAL_ALTO) {
         alertas.push(`Pronóstico: Nivel de agua alto - Promedio últimos 10: ${promedio.toFixed(1)}%.`);
       }

     } else {
       // PRONÓSTICOS GENÉRICOS PARA OTROS SENSORES
       // Usar los umbrales configurados en el sensor
       const umbralMin = sensor.valor_minimo_alerta || 0;
       const umbralMax = sensor.valor_maximo_alerta || 100;

       ultimos10.forEach(dato => {
         const fechaHora = dato.fechaRegistro.toLocaleString('es-ES', {
           year: 'numeric',
           month: '2-digit',
           day: '2-digit',
           hour: '2-digit',
           minute: '2-digit'
         });
         if (dato.valor < umbralMin) {
           alertas.push(`Valor bajo (${dato.valor}) el ${fechaHora} - Fuera del rango normal.`);
           fechasCriticas.push(dato.fechaRegistro);
         }
         if (dato.valor > umbralMax) {
           alertas.push(`Valor alto (${dato.valor}) el ${fechaHora} - Fuera del rango normal.`);
           fechasCriticas.push(dato.fechaRegistro);
         }
       });

       if (promedio < umbralMin) {
         alertas.push(`Pronóstico: Valores persistentemente bajos - Promedio últimos 10: ${promedio.toFixed(2)}.`);
       }
       if (promedio > umbralMax) {
         alertas.push(`Pronóstico: Valores persistentemente altos - Promedio últimos 10: ${promedio.toFixed(2)}.`);
       }
     }

     return { alertas, fechasCriticas };
   }

}