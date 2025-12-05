import { Injectable, NotFoundException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InformacionSensor } from './entities/informacion_sensor.entity';
import { Sensor } from '../sensores/entities/sensore.entity';
import { CreateInformacionSensorDto } from './dto/create-informacion_sensor.dto';
import { UpdateInformacionSensorDto } from './dto/update-informacion_sensor.dto';
import { MqttClientService } from '../mqtt-config/mqtt-client.service';

@Injectable()
export class InformacionSensorService {
  private readonly logger = new Logger(InformacionSensorService.name);

  constructor(
    @InjectRepository(InformacionSensor)
    private readonly infoRepo: Repository<InformacionSensor>,
    @InjectRepository(Sensor)
    private readonly sensorRepo: Repository<Sensor>,
    @Inject(forwardRef(() => MqttClientService))
    private readonly mqttClient: MqttClientService,
  ) {}


  /**
   * Procesa cualquier mensaje MQTT entrante.
   * Soporta JSON complejo y valores escalares simples.
   * Maneja la lógica de reconexión automática.
   */
  async createFromMqtt(topic: string, payload: string): Promise<void> {
    // 1. Intentar parsear el payload (puede ser JSON o un número string)
    let jsonData: any = null;
    let isJson = false;

    try {
      jsonData = JSON.parse(payload);
      isJson = typeof jsonData === 'object' && jsonData !== null;
    } catch (e) {
      // No es JSON, es un valor primitivo (string/numero)
      isJson = false;
    }

    // 2. Buscar TODOS los sensores que escuchen este tópico
    // Incluimos sensores desconectados para poder reactivarlos ("Reconexión automática")
    const sensores = await this.sensorRepo.find({
      where: [
        { topic: topic, estado: 'Activo' },
        { topic: topic, estado: 'Desconectado' }, // 👈 Clave para reconexión
        { topic: topic, estado: 'Inactivo' }      // Opcional: si quieres reactivar inactivos manuales
      ],
      relations: ['lote', 'sublote', 'lote.brokerLotes', 'lote.brokerLotes.broker'],
    });

    if (sensores.length === 0) {
      // Ruido de logs reducido, descomentar si necesitas depurar
      // this.logger.debug(`Mensaje en [${topic}] ignorado: No hay sensores configurados.`);
      return;
    }

    let guardados = 0;

    // 3. Iterar sobre cada sensor configurado para este tópico
    for (const sensor of sensores) {
      let valorFinal: number | null = null;
      let sensorDesconectado = false;

      // A. DETECCIÓN DE ESTADO DE CONEXIÓN INDIVIDUAL (Configurable)
      if (isJson) {
        // Usar configuración personalizada del sensor si existe
        if (sensor.connectionField) {
          // El sensor tiene configuración específica de campo de conexión
          if (jsonData.hasOwnProperty(sensor.connectionField)) {
            const valorEstado = jsonData[sensor.connectionField];

            // Verificar si el valor indica desconexión
            if (sensor.disconnectionValues && sensor.disconnectionValues.includes(valorEstado)) {
              sensorDesconectado = true;
              this.logger.warn(`🔴 Sensor ${sensor.nombre} DESCONECTADO - campo '${sensor.connectionField}': ${valorEstado}`);
            }
            // Verificar si el valor indica conexión
            else if (sensor.connectionValues && sensor.connectionValues.includes(valorEstado)) {
              if (sensor.estado === 'Desconectado') {
                this.logger.log(`🟢 Sensor ${sensor.nombre} RECONECTADO - campo '${sensor.connectionField}': ${valorEstado}`);
              }
              sensorDesconectado = false;
            }
            // Si el campo existe pero el valor no está en ninguna lista, verificar si es requerido
            else if (sensor.connectionRequired) {
              sensorDesconectado = true;
              this.logger.warn(`🔴 Sensor ${sensor.nombre} DESCONECTADO - campo '${sensor.connectionField}' tiene valor desconocido: ${valorEstado}`);
            }
          } else if (sensor.connectionRequired) {
            // El campo requerido no está presente
            sensorDesconectado = true;
            this.logger.warn(`🔴 Sensor ${sensor.nombre} DESCONECTADO - campo requerido '${sensor.connectionField}' no encontrado en JSON`);
          }
        } else {
          // Sin configuración específica, usar lógica genérica
          const indicadoresEstado = ['estado', 'status', 'connected', 'online', 'connection', 'state'];
          for (const indicador of indicadoresEstado) {
            if (jsonData.hasOwnProperty(indicador)) {
              const valorEstado = jsonData[indicador];
              // Verificar si indica desconexión
              if (valorEstado === 0 || valorEstado === false || valorEstado === 'offline' ||
                  valorEstado === 'disconnected' || valorEstado === 'inactive' ||
                  valorEstado === 'desconectado' || valorEstado === 'fuera_de_linea') {
                sensorDesconectado = true;
                this.logger.warn(`🔴 Sensor ${sensor.nombre} reportó DESCONEXIÓN via ${indicador}: ${valorEstado}`);
                break;
              }
              // Verificar si indica conexión (para reconexión)
              else if (valorEstado === 1 || valorEstado === true || valorEstado === 'online' ||
                       valorEstado === 'connected' || valorEstado === 'active' ||
                       valorEstado === 'conectado' || valorEstado === 'en_linea') {
                if (sensor.estado === 'Desconectado') {
                  this.logger.log(`🟢 Sensor ${sensor.nombre} reportó RECONEXIÓN via ${indicador}: ${valorEstado}`);
                }
                sensorDesconectado = false;
                break;
              }
            }
          }
        }

        // Verificar valores nulos o indefinidos que indiquen desconexión
        if (jsonData === null || jsonData === undefined ||
            (typeof jsonData === 'object' && Object.keys(jsonData).length === 0)) {
          sensorDesconectado = true;
          this.logger.warn(`🔴 Sensor ${sensor.nombre} envió JSON vacío/null - interpretado como desconexión`);
        }
      } else {
        // Para mensajes no JSON, verificar valores especiales
        const payloadLower = payload.toLowerCase().trim();
        if (payloadLower === 'null' || payloadLower === 'undefined' ||
            payloadLower === 'offline' || payloadLower === 'disconnected' ||
            payloadLower === 'desconectado' || payloadLower === 'fuera_de_linea') {
          sensorDesconectado = true;
          this.logger.warn(`🔴 Sensor ${sensor.nombre} reportó DESCONEXIÓN via payload: ${payload}`);
        } else if (payloadLower === 'online' || payloadLower === 'connected' ||
                   payloadLower === 'conectado' || payloadLower === 'en_linea') {
          if (sensor.estado === 'Desconectado') {
            this.logger.log(`🟢 Sensor ${sensor.nombre} reportó RECONEXIÓN via payload: ${payload}`);
          }
          sensorDesconectado = false;
        }
      }

      // Si se detectó desconexión, marcar el sensor inmediatamente
      if (sensorDesconectado) {
        sensor.estado = 'Desconectado';
        sensor.ultimo_mqtt_mensaje = new Date(); // Actualizar timestamp para evitar watchdog falso
        await this.sensorRepo.save(sensor);
        this.logger.warn(`❌ Sensor ${sensor.nombre} marcado como DESCONECTADO por reporte del dispositivo`);
        continue; // No procesar más datos para este sensor
      }

      // B. ESTRATEGIA DE EXTRACCIÓN DE DATOS
      if (isJson) {
        if (sensor.json_key) {
          // Caso 1: El sensor espera una clave específica (ej: "temp")
          // Payload: {"temp": 25, "hum": 60} -> Extrae 25
          if (jsonData.hasOwnProperty(sensor.json_key)) {
            valorFinal = Number(jsonData[sensor.json_key]);
          }
        } else {
          // Caso 2: El sensor NO tiene clave configurada, pero llega un JSON.
          // Intentamos buscar propiedades comunes o "value"
          if (jsonData.hasOwnProperty('value')) valorFinal = Number(jsonData['value']);
          else if (jsonData.hasOwnProperty('valor')) valorFinal = Number(jsonData['valor']);
          else if (jsonData.hasOwnProperty('data')) valorFinal = Number(jsonData['data']);
          else {
             // SOLUCIÓN MEJORADA: Extracción inteligente de datos por tipo de sensor
             const sensorName = sensor.nombre.toLowerCase();
             let claveEncontrada = false;

             // Búsqueda inteligente de claves basada en el tipo de sensor
             if (sensorName.includes('temperatura')) {
               valorFinal = Number(jsonData['Temperatura']);
               this.logger.log(`🔧 Sensor ${sensor.nombre}: Usando clave 'Temperatura' por defecto`);
             } else if (sensorName.includes('humedad') && jsonData.hasOwnProperty('Humedad')) {
               valorFinal = Number(jsonData['Humedad']);
               this.logger.log(`🔧 Sensor ${sensor.nombre}: Usando clave 'Humedad' por defecto`);
             } else if (sensorName.includes('luz') && jsonData.hasOwnProperty('Lux')) {
               valorFinal = Number(jsonData['Lux']) / 100;
               this.logger.log(`🔧 Sensor ${sensor.nombre}: Usando clave 'Lux' por defecto (dividido por 100)`);
             }
             // 👇 AQUÍ AGREGAMOS LA LÓGICA PARA LA BOMBA
             else if (sensorName.includes('bomba') && jsonData.hasOwnProperty('Estado')) {
               valorFinal = Number(jsonData['Estado']); // Extrae 1 o 0
               this.logger.log(`🔧 Sensor Bomba: Usando clave 'Estado' por defecto. Valor: ${valorFinal}`);
             }
             else {
               // 🔍 BÚSQUEDA INTELIGENTE PARA SENSORES DE HUMEDAD DEL SUELO
               if (sensorName.includes('humedad') && sensorName.includes('suelo')) {
                 // Buscar claves relacionadas con suelo/humedad
                 const clavesSuelo = ['suelo', 'soil', 'ground', 'tierra', 'moisture', 'agua', 'water', 'humedad_suelo'];
                 for (const clave of clavesSuelo) {
                   if (jsonData.hasOwnProperty(clave)) {
                     valorFinal = Number(jsonData[clave]);
                     this.logger.log(`🔧 Sensor ${sensor.nombre}: Usando clave '${clave}' para humedad del suelo: ${valorFinal}`);
                     claveEncontrada = true;
                     break;
                   }
                 }

                 // Si no encontró clave específica, buscar patrones como "sensorX"
                 if (!claveEncontrada) {
                   for (const [key, value] of Object.entries(jsonData)) {
                     if (key.toLowerCase().includes('sensor') && typeof value === 'number') {
                       valorFinal = value;
                       this.logger.log(`🔧 Sensor ${sensor.nombre}: Usando clave '${key}' (contiene 'sensor') para humedad del suelo: ${value}`);
                       claveEncontrada = true;
                       break;
                     }
                     // También buscar valores string que puedan convertirse a número
                     if (key.toLowerCase().includes('sensor') && typeof value === 'string' && !isNaN(Number(value))) {
                       valorFinal = Number(value);
                       this.logger.log(`🔧 Sensor ${sensor.nombre}: Convirtiendo string '${key}' a número para humedad del suelo: ${value}`);
                       claveEncontrada = true;
                       break;
                     }
                   }
                 }

                 // Último recurso: buscar cualquier valor numérico en el JSON
                 if (!claveEncontrada) {
                   for (const [key, value] of Object.entries(jsonData)) {
                     if (typeof value === 'number' && !isNaN(value) && value >= 0 && value <= 100) {
                       // Para humedad, esperamos valores entre 0-100%
                       valorFinal = value;
                       this.logger.log(`🔧 Sensor ${sensor.nombre}: Usando primer valor numérico válido '${key}' para humedad del suelo: ${value}`);
                       claveEncontrada = true;
                       break;
                     }
                   }
                 }
               }

               // Para otros tipos de sensores, búsqueda genérica
               if (!claveEncontrada) {
                 // Buscar el primer valor numérico en el JSON
                 for (const [key, value] of Object.entries(jsonData)) {
                   if (typeof value === 'number' && !isNaN(value)) {
                     valorFinal = value;
                     this.logger.log(`🔧 Sensor ${sensor.nombre}: Usando primer valor numérico encontrado '${key}': ${value}`);
                     claveEncontrada = true;
                     break;
                   } else if (typeof value === 'string' && !isNaN(Number(value))) {
                     valorFinal = Number(value);
                     this.logger.log(`🔧 Sensor ${sensor.nombre}: Convirtiendo string a número '${key}': ${value}`);
                     claveEncontrada = true;
                     break;
                   }
                 }
               }

               // Si aún no se encontró, loguear el JSON completo para debug
               if (!claveEncontrada) {
                 this.logger.warn(`Sensor ${sensor.nombre} recibe JSON pero no se pudo extraer valor numérico. JSON: ${JSON.stringify(jsonData)}`);
               }
             }
          }
        }
      } else {
        // Caso 3: Payload plano (ej: "25.5")
        valorFinal = parseFloat(payload);
      }

      // Validar si tenemos un número válido
      if (valorFinal === null || isNaN(valorFinal)) {
        // 🔥 CORRECCIÓN: Si el JSON llega pero NO tiene la clave de este sensor
        // (ej: desconectaste el sensor de Temperatura pero llega Humedad),
        // hacemos 'continue'. NO actualizamos su fecha, por lo que el Watchdog lo matará en 60s.
        // NO lo marcamos desconectado aquí manualmente para dar margen de error.
        continue;
      }

      // B. VALIDACIÓN DE PERMISOS (Broker/Lote/Sublote)
      // Verificar configuración de brokers (igual que antes)
      const brokersDelLote = sensor.lote.brokerLotes?.map(bl => bl.broker) || [];
      if (!brokersDelLote || brokersDelLote.length === 0) continue;

      // Verificar sublote activo
      if (sensor.sublote && !sensor.sublote.activo_mqtt) continue;

      try {
        // C. GUARDAR DATO
        const nuevaInfo = this.infoRepo.create({
          valor: valorFinal,
          sensor,
        });
        await this.infoRepo.save(nuevaInfo);

        // ======================================================
        // D. LÓGICA DE AUTOMATIZACIÓN DE BOMBA (NUEVO)
        // ======================================================

        // Verificamos si es un sensor de humedad de suelo
        if (sensor.topic && sensor.topic.includes('humedad_suelo')) {
          const HUMEDAD_MINIMA = sensor.valor_minimo_alerta || 30;
          const HUMEDAD_OPTIMA = sensor.valor_maximo_alerta || 70;
          const TOPIC_BOMBA = 'agrotech/actuadores/bomba/comando'; // Tópico donde escucha el ESP32

          if (valorFinal < HUMEDAD_MINIMA) {
            this.logger.warn(`💧 Humedad baja (${valorFinal}%) en ${sensor.nombre}. ENCENDIENDO BOMBA.`);
            await this.mqttClient.publishCommand(TOPIC_BOMBA, 'ON');

            // Opcional: Avisar al frontend via WebSocket
            // this.gateway.emitBombaEstado('ON', 'Automático por baja humedad');

          } else if (valorFinal >= HUMEDAD_OPTIMA) {
            this.logger.log(`✅ Humedad óptima (${valorFinal}%) en ${sensor.nombre}. APAGANDO BOMBA.`);
            await this.mqttClient.publishCommand(TOPIC_BOMBA, 'OFF');
          }
        }

        // E. 🔥 LÓGICA DE RECONEXIÓN INDIVIDUAL
        // Actualizamos la fecha SOLO para este sensor específico que sí envió datos
        sensor.ultimo_mqtt_mensaje = new Date();

        // Si estaba muerto, lo revivimos
        if (sensor.estado === 'Desconectado') {
            sensor.estado = 'Activo';
            this.logger.log(`🟢 Sensor RECONECTADO autom: [${sensor.nombre}]`);
        }

        await this.sensorRepo.save(sensor);
        guardados++;

      } catch (error) {
        this.logger.error(`Error guardando dato sensor ${sensor.id}: ${error.message}`);
      }
    }

    if (guardados > 0) {
      this.logger.log(`📥 Procesado [${topic}]: ${guardados} actualizaciones.`);
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

    // ✅ Ahora incluye sensores activos Y desconectados
    const sensores = await this.sensorRepo.find({
      where: [
        { estado: 'Activo' },
        { estado: 'Desconectado' }
      ],
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

        let valor: number | null = null; // Por defecto null
        let fechaRegistro: string | null = null;
        let estadoLogico = sensor.estado;

        // 🛑 Si el Watchdog lo marcó como desconectado, forzamos el null (N/A)
        if (sensor.estado === 'Desconectado') {
             valor = null;
             estadoLogico = 'Desconectado'; // Para pintar rojo en el frontend
             this.logger.warn(`❌ Sensor ${sensor.id} (${sensor.nombre}): DESCONECTADO - mostrando N/A`);
        } else {
             // ✅ Si está activo, buscamos su último dato real
             const ultimoDato = await this.infoRepo.findOne({
               where: { sensor: { id: sensor.id } },
               order: { fechaRegistro: 'DESC' },
             });

             if (ultimoDato) {
                 valor = Number(ultimoDato.valor);
                 fechaRegistro = ultimoDato.fechaRegistro.toISOString();
                 this.logger.log(`✅ Sensor ${sensor.id} (${sensor.nombre}): Valor=${valor} (ACTIVO)`);
             } else {
                 this.logger.warn(`⚠️ Sensor ${sensor.id} (${sensor.nombre}): ACTIVO pero sin datos en BD - mostrando N/A`);
             }
        }

        const resultado = {
          id: sensor.id,
          nombre: sensor.nombre,
          topic: sensor.topic,
          valorMinimo: sensor.valor_minimo_alerta,
          valorMaximo: sensor.valor_maximo_alerta,
          valor: valor, // Aquí va el 0 o el dato real
          fechaRegistro: fechaRegistro,
          estado: estadoLogico, // 'Activo' o 'Desconectado'
          unidad: 'u' // Puedes mejorar esto agregando unidad a la entidad Sensor
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