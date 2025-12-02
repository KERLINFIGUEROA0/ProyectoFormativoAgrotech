import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, LessThan } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Sensor } from './entities/sensore.entity';
import { CreateSensoreDto } from './dto/create-sensore.dto';
import { UpdateSensoreDto } from './dto/update-sensore.dto';
import { GenerarReporteTrazabilidadDto } from './dto/generar-reporte.dto';
import { Sublote } from '../sublotes/entities/sublote.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { Broker } from '../mqtt-config/entities/broker.entity';
import { BrokerLote } from '../mqtt-config/entities/broker-lote.entity';
import { InformacionSensorService } from '../informacion_sensor/informacion_sensor.service';
import { MqttClientService } from '../mqtt-config/mqtt-client.service';
import { MqttConfigService } from '../mqtt-config/mqtt-config.service';
import { Cultivo } from '../cultivos/entities/cultivo.entity';
import { InformacionSensor } from '../informacion_sensor/entities/informacion_sensor.entity';
import { Produccion } from '../producciones/entities/produccione.entity';
import { Venta } from '../ventas/entities/venta.entity';
import { Gasto } from '../gastos_produccion/entities/gastos_produccion.entity';
import { Actividad } from '../actividades/entities/actividade.entity';
import { ActividadMaterial } from '../actividades_materiales/entities/actividades_materiale.entity';
import { Material } from '../materiales/entities/materiale.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { TipoUsuario } from '../tipo_usuario/entities/tipo_usuario.entity';

@Injectable()
export class SensoresService {
  private readonly logger = new Logger(SensoresService.name);

  constructor(
    @InjectRepository(Sensor)
    private readonly sensorRepo: Repository<Sensor>,
    @InjectRepository(Sublote)
    private readonly subloteRepo: Repository<Sublote>,
    @InjectRepository(Lote)
    private readonly loteRepo: Repository<Lote>,
    @InjectRepository(Broker)
    private readonly brokerRepo: Repository<Broker>,
    // INYECTA EL NUEVO REPOSITORIO
    @InjectRepository(BrokerLote)
    private readonly brokerLoteRepo: Repository<BrokerLote>,
    @InjectRepository(Cultivo)
    private readonly cultivoRepo: Repository<Cultivo>,
    @InjectRepository(InformacionSensor)
    private readonly infoSensorRepo: Repository<InformacionSensor>,
    @InjectRepository(Produccion)
    private readonly produccionRepo: Repository<Produccion>,
    @InjectRepository(Venta)
    private readonly ventaRepo: Repository<Venta>,
    @InjectRepository(Gasto)
    private readonly gastoRepo: Repository<Gasto>,
    @InjectRepository(Actividad)
    private readonly actividadRepo: Repository<Actividad>,
    @InjectRepository(ActividadMaterial)
    private readonly actividadMaterialRepo: Repository<ActividadMaterial>,
    @InjectRepository(Material)
    private readonly materialRepo: Repository<Material>,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(TipoUsuario)
    private readonly tipoUsuarioRepo: Repository<TipoUsuario>,

    @Inject(forwardRef(() => InformacionSensorService))
    private readonly infoSensorService: InformacionSensorService,
    @Inject(forwardRef(() => MqttClientService))
    private readonly mqttClientService: MqttClientService,
    @Inject(forwardRef(() => MqttConfigService))
    private readonly mqttConfigService: MqttConfigService,
  ) {}

  /**
   * 🕒 WATCHDOG: Se ejecuta cada 5 segundos.
   * Busca INDIVIDUALMENTE sensores que no hayan hablado en los últimos 10 segundos.
   */
  @Cron('*/5 * * * * *')
  async detectarDesconexiones() {
    // Definimos el límite: "Hace 10 segundos"
    // Usamos 10s en lugar de 5s exactos para dar un margen a la red wifi y evitar parpadeos falsos.
    const tiempoLimite = new Date(Date.now() - 10000);

    // 1. Buscar SOLO los sensores que están 'Activo' pero su fecha es vieja
    const sensoresCaidos = await this.sensorRepo.find({
      where: {
        estado: 'Activo',
        ultimo_mqtt_mensaje: LessThan(tiempoLimite), // ¿El último mensaje es más viejo que el límite?
      }
    });

    // 2. Apagar INDIVIDUALMENTE cada sensor caído
    if (sensoresCaidos.length > 0) {
      for (const sensor of sensoresCaidos) {
        // Solo si es un sensor MQTT (tiene tópico)
        if (sensor.topic) {
            sensor.estado = 'Desconectado';
            await this.sensorRepo.save(sensor);
            this.logger.warn(`❌ Sensor [${sensor.nombre}] ha sido marcado como DESCONECTADO (Inactividad).`);
        }
      }
    }
  }




  async findOne(id: number): Promise<Sensor> {
    const sensor = await this.sensorRepo.findOne({
      where: { id },
      relations: ['lote', 'sublote', 'sublote.lote'],
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
       const brokerLotes = await this.brokerLoteRepo.find({
         where: { lote: { id: sensor.lote.id } },
         relations: ['broker']
       });
       const brokers = brokerLotes.map(bl => bl.broker);
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
    const { loteId: dtoLoteId, subloteId: dtoSubloteId, topic, broker: dtoBroker } = createSensoreDto;

    // Ya no validamos tópico único - múltiples sensores pueden usar el mismo tópico
    // Cada sensor guardará los datos en su propio lote

    const lote = await this.brokerRepo.manager.findOne(Lote, { where: { id: dtoLoteId } });
    if (!lote) throw new NotFoundException(`El lote con ID ${dtoLoteId} no fue encontrado.`);

    let sublote: Sublote | null = null;
    if (dtoSubloteId) {
      sublote = await this.subloteRepo.findOne({ where: { id: dtoSubloteId } });
      if (!sublote) throw new NotFoundException(`El sublote con ID ${dtoSubloteId} no fue encontrado.`);
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
        });
        brokerEntity = await this.brokerRepo.save(nuevoBroker);
      }
    }

    // Crear el sensor
    const { broker, loteId, subloteId, ...sensorData } = createSensoreDto; // Excluir broker, loteId, subloteId del DTO
    const nuevoSensor = this.sensorRepo.create({ ...sensorData, lote, sublote });
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
        relations: ['sublote', 'sublote.lote'],
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
  // Agrega 'sublote.cultivo' a la lista de relaciones
  return this.sensorRepo.find({
    relations: ['lote', 'sublote', 'sublote.lote', 'sublote.cultivo']
  });
 }

  async update(id: number, updateSensoreDto: UpdateSensoreDto): Promise<Sensor> {
    const sensor = await this.findOne(id);
    const { loteId, subloteId, topic } = updateSensoreDto;

    // Ya no validamos tópico único - múltiples sensores pueden usar el mismo tópico

    if (loteId) {
      const lote = await this.brokerRepo.manager.findOne(Lote, { where: { id: loteId } });
      if (!lote) throw new NotFoundException(`El lote con ID ${loteId} no fue encontrado.`);
      sensor.lote = lote;
    }

    if (subloteId) {
      const sublote = await this.subloteRepo.findOne({
        where: { id: subloteId }
      });
      if (!sublote) throw new NotFoundException(`El sublote con ID ${subloteId} no fue encontrado.`);
      sensor.sublote = sublote;
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
      relations: ['lote', 'sublote', 'sublote.lote', 'sublote.cultivo']
    });
  }

  /**
    * Obtiene sensores activos por sublote
    */
  async findBySublote(subloteId: number): Promise<Sensor[]> {
    return this.sensorRepo.find({
      where: {
        sublote: { id: subloteId },
        estado: 'Activo'
      },
      relations: ['lote', 'sublote', 'sublote.lote', 'sublote.cultivo']
    });
  }

  /**
    * Obtiene sensores activos por cultivo
    */
  async findByCultivo(cultivoId: number): Promise<Sensor[]> {
    return this.sensorRepo.find({
      where: {
        sublote: { cultivo: { id: cultivoId } },
        estado: 'Activo'
      },
      relations: ['lote', 'sublote', 'sublote.lote', 'sublote.cultivo']
    });
  }


  /**
   * Elimina un sensor específico de un lote sin afectar la configuración Broker-Lote
   */
  async eliminarSensorDeLote(sensorId: number): Promise<void> {
    const sensor = await this.findOne(sensorId);

    // Verificar que el sensor pertenezca a un lote (no a un surco directamente)
    if (!sensor.lote) {
      throw new BadRequestException('Este sensor no pertenece a un lote.');
    }

    // Eliminar el sensor
    await this.sensorRepo.remove(sensor);

    // Desuscribir del MQTT
    try {
      await this.mqttClientService.unsubscribeSensor(sensor);
    } catch (error) {
      this.logger.warn(`Error desuscribiendo sensor ${sensorId} del MQTT: ${error.message}`);
    }
  }

  /**
   * Sincroniza sensores para un lote basado en los tópicos configurados ESPECÍFICAMENTE para ese lote
   */
  async sincronizarSensoresLote(loteId: number): Promise<{ message: string, sensoresCreados: number }> {

    // 1. Buscamos las configuraciones de brokers asignadas a este lote
    const configuraciones = await this.brokerLoteRepo.find({
      where: { lote: { id: loteId } },
      relations: ['broker', 'lote'] // Traemos la info del broker para poder crear la conexión si hace falta
    });

    if (configuraciones.length === 0) {
      throw new BadRequestException(`El lote #${loteId} no tiene brokers configurados con tópicos.`);
    }

    let totalSensoresCreados = 0;

    // 2. Iteramos sobre cada configuración (puede haber más de un broker por lote)
    for (const config of configuraciones) {
      const broker = config.broker;
      const topicosEspecificos = config.topicos; // Estos son SOLO para este lote

      if (!topicosEspecificos || topicosEspecificos.length === 0) {
        continue; // Este broker está asignado al lote pero no tiene tópicos definidos
      }

      // 3. Obtener sensores existentes del lote que pertenecen a este broker (por coincidencia de tópico)
      // Nota: Aquí asumo que quieres evitar duplicados en el mismo lote
      const sensoresExistentes = await this.sensorRepo.find({
        where: {
          lote: { id: loteId },
          // Opcional: filtrar también por broker si guardas la referencia al broker en el sensor
        }
      });

      const topicosYaRegistrados = sensoresExistentes.map(s => s.topic);

      // Filtramos qué tópicos de la lista NO existen aún como sensores en este lote
      const topicosFaltantes = topicosEspecificos.filter(t => !topicosYaRegistrados.includes(t));

      if (topicosFaltantes.length > 0) {
        // Llamamos a tu servicio existente para crear los sensores
        // NOTA: Asegúrate que 'crearSensoresParaTopicos' use el loteId correcto que le pasas
        await this.mqttConfigService.crearSensoresParaTopicos(broker, loteId, topicosFaltantes);
        totalSensoresCreados += topicosFaltantes.length;
      }
    }

    if (totalSensoresCreados === 0) {
      return { message: 'Todos los sensores configurados ya existen en el lote.', sensoresCreados: 0 };
    }

    return {
      message: `Sincronización completada. Se crearon ${totalSensoresCreados} sensores nuevos en el lote ${loteId}.`,
      sensoresCreados: totalSensoresCreados
    };
  }

  /**
   * Cálculo simple de regresión lineal para pronóstico
   */
  private calcularPronostico(datos: any[]) {
    if (datos.length < 2) return { tendencia: 'Insuficiente información', prediccion: 0 };

    // Usamos los últimos 20 datos para la tendencia
    const n = datos.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    datos.forEach((d, i) => {
      const x = i; // Tiempo relativo
      const y = Number(d.valor);
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Predecir el siguiente valor (n)
    const prediccion = slope * n + intercept;

    let tendencia = 'Estable';
    if (slope > 0.5) tendencia = 'Tendencia al Alza (Subiendo)';
    if (slope < -0.5) tendencia = 'Tendencia a la Baja (Bajando)';

    return { tendencia, prediccion: prediccion.toFixed(2) };
  }

  // Función auxiliar para generar recomendaciones basadas en datos
  private generarRecomendaciones(sensorNombre: string, stats: any): string[] {
    const recomendaciones: string[] = [];
    const nombre = sensorNombre.toLowerCase();

    if (nombre.includes('luz') || nombre.includes('radiacion')) {
      if (stats.maximo > 800) recomendaciones.push('⚠️ Exceso de radiación: Evaluar uso de malla sombra para proteger el cultivo.');
      if (stats.promedio < 200) recomendaciones.push('⚠️ Luz insuficiente: Podría retrasar el crecimiento. Considerar iluminación suplementaria.');
    }

    if (nombre.includes('humedad') || nombre.includes('humedad_suelo')) {
      if (stats.minimo < 20) recomendaciones.push('💧 Humedad crítica baja detectada: Verificar sistema de riego y retención del suelo.');
      if (stats.maximo > 90) recomendaciones.push('🍄 Humedad excesiva: Riesgo de hongos/plagas. Mejorar ventilación y drenaje.');
    }

    if (nombre.includes('temperatura')) {
      if (stats.maximo > 35) recomendaciones.push('🌡️ Temperatura elevada: Implementar sistemas de enfriamiento o sombra.');
      if (stats.minimo < 10) recomendaciones.push('❄️ Temperatura baja: Proteger contra heladas nocturnas.');
    }

    if (nombre.includes('ph')) {
      if (stats.promedio < 5.5 || stats.promedio > 7.5) recomendaciones.push('🧪 pH fuera de rango óptimo: Realizar corrección del suelo.');
    }

    return recomendaciones;
  }

  async getFullTraceabilityData(dto: GenerarReporteTrazabilidadDto) {
    try {
      const { loteId, subloteId, cultivoId, fechaInicio, fechaFin } = dto;

      // Validar lote
      const lote = await this.loteRepo.findOne({ where: { id: loteId } });
      if (!lote) {
        throw new NotFoundException(`Lote no encontrado`);
      }

      // 1. Obtener cultivos con todas las relaciones necesarias
      // Buscar cultivos directamente en el lote O en sublotes del lote
      let query = this.cultivoRepo.createQueryBuilder('cultivo')
        .leftJoinAndSelect('cultivo.tipoCultivo', 'tipoCultivo')
        .leftJoinAndSelect('cultivo.producciones', 'producciones')
        .leftJoinAndSelect('cultivo.gastos', 'gastos')
        .leftJoinAndSelect('cultivo.actividades', 'actividades')
        .leftJoinAndSelect('actividades.responsable', 'responsable')
        .leftJoinAndSelect('actividades.actividadMaterial', 'am')
        .leftJoinAndSelect('am.material', 'material')
        .leftJoinAndSelect('cultivo.sublotes', 'sublotes')
        .leftJoinAndSelect('sublotes.lote', 'subloteLote')
        .where('(cultivo.loteId = :loteId OR subloteLote.id = :loteId)', { loteId })
        .andWhere('cultivo.Fecha_Plantado <= :fechaFin', { fechaFin })
        .andWhere('(cultivo.Fecha_Fin IS NULL OR cultivo.Fecha_Fin >= :fechaInicio)', { fechaInicio })
        .andWhere('(cultivo.Estado IS NULL OR cultivo.Estado != :estadoFinalizado)', { estadoFinalizado: 'Finalizado' });

      // Si se especifica un cultivo específico, filtrar por ese cultivo
      if (cultivoId) {
        query = query.andWhere('cultivo.id = :cultivoId', { cultivoId });
      }

      const cultivos = await query.getMany();

      const reporte: any = {
        lote: lote.nombre,
        rango: `${fechaInicio} al ${fechaFin}`,
        fechaGeneracion: new Date().toISOString(),
        cultivos: [],
        sensores: {}
      };

      // 2. Procesar Cultivos (Finanzas y Actividades)
      for (const c of cultivos) {
        const datosCultivo: any = {
          nombre: c.nombre,
          tipo: c.tipoCultivo?.nombre || 'Sin tipo',
          diasSembrado: Math.floor((new Date().getTime() - new Date(c.Fecha_Plantado).getTime()) / (1000 * 3600 * 24)),
          fechaSiembra: c.Fecha_Plantado,
          resumenFinanciero: {
            totalInversion: 0,
            totalVentas: 0,
            gananciaNeta: 0,
            detalleMateriales: [],
            detalleGastos: [],
            detalleVentas: []
          },
          actividadesLog: [],
          produccionTotalKg: 0,
          estadoActual: c.Estado || 'Activo'
        };

        // A. Procesar Actividades y Materiales
        if (c.actividades) {
          for (const act of c.actividades) {
            // Log de actividades
            datosCultivo.actividadesLog.push({
              fecha: act.fecha,
              tarea: act.titulo,
              descripcion: act.descripcion,
              responsable: act.responsable ? `${act.responsable.nombre} ${act.responsable.apellidos || ''}`.trim() : 'No asignado',
              estado: act.estado,
              cumplida: act.estado === 'completado',
              horasTrabajadas: act.horas || 0,
              costoManoObra: (act.horas || 0) * (act.tarifaHora || 0)
            });

            // Costos de materiales
            if (act.actividadMaterial) {
              for (const am of act.actividadMaterial) {
                if (am.material) {
                  // Usar la cantidad y unidad ORIGINAL en que se gastó el material
                  const cantidadOriginal = am.cantidadUsada || 0;
                  const unidadOriginal = am.unidadMedida || 'unidad';
                  const precioMaterial = am.material.precio || 0;
                  const pesoPorUnidad = am.material.pesoPorUnidad || 1;

                  // Precio por unidad base (gramo/ml) = precio_total / peso_total
                  const precioPorUnidadBase = precioMaterial / pesoPorUnidad;

                  // Convertir la cantidad original a unidades base para calcular el costo
                  const cantidadBase = am.cantidadUsadaBase || am.cantidadUsada || 0;
                  const costoTotal = precioPorUnidadBase * cantidadBase;

                  // Calcular precio unitario en la UNIDAD ORIGINAL
                  // precio_unitario_original = costo_total / cantidad_original
                  const precioUnitarioOriginal = cantidadOriginal > 0 ? costoTotal / cantidadOriginal : 0;

                  datosCultivo.resumenFinanciero.totalInversion += costoTotal;
                  datosCultivo.resumenFinanciero.detalleMateriales.push({
                    fecha: act.fecha,
                    nombre: am.material.nombre,
                    tipo: 'Material',
                    cantidad: cantidadOriginal, // Mostrar cantidad original
                    unidad: unidadOriginal.toLowerCase(), // Mostrar unidad original
                    precioUnitario: precioUnitarioOriginal, // Precio por unidad original
                    costoTotal: costoTotal
                  });
                }
              }
            }

            // Costos de mano de obra
            if (act.horas && act.tarifaHora) {
              datosCultivo.resumenFinanciero.totalInversion += (act.horas * act.tarifaHora);
            }
          }
        }

        // B. Gastos adicionales
        if (c.gastos) {
          for (const g of c.gastos) {
            datosCultivo.resumenFinanciero.totalInversion += Number(g.monto);
            datosCultivo.resumenFinanciero.detalleGastos.push({
              fecha: g.fecha,
              descripcion: g.descripcion,
              monto: Number(g.monto),
              tipo: g.tipo
            });
          }
        }

        // C. Producción y Ventas
        if (c.producciones) {
          for (const p of c.producciones) {
            const cantidadCosechada = Number(p.cantidad || 0);
            datosCultivo.produccionTotalKg += cantidadCosechada;

            // Ventas asociadas a esta producción específica
            const ventas = await this.ventaRepo.find({
              where: { produccion: { id: p.id } },
              relations: ['produccion']
            });

            const cantidadVendida = ventas.reduce((sum, v) => sum + Number(v.cantidadVenta), 0);
            const cantidadRestante = cantidadCosechada - cantidadVendida;

            // Agregar información de cosecha con inventario restante
            datosCultivo.cosechas = datosCultivo.cosechas || [];
            datosCultivo.cosechas.push({
              fecha: p.fecha,
              cantidadCosechada: cantidadCosechada,
              cantidadVendida: cantidadVendida,
              cantidadRestante: cantidadRestante,
              estado: cantidadRestante > 0 ? 'Pendiente' : 'Completada'
            });

            for (const v of ventas) {
              const valorTotal = Number(v.valorTotalVenta);
              datosCultivo.resumenFinanciero.totalVentas += valorTotal;
              datosCultivo.resumenFinanciero.detalleVentas.push({
                fecha: v.fecha,
                descripcion: v.descripcion || `Venta de ${c.nombre}`,
                cantidadVendida: v.cantidadVenta,
                precioUnitario: Number(v.precioUnitario),
                valorTotal: valorTotal
              });
            }
          }
        }

        // Calcular ganancia neta
        datosCultivo.resumenFinanciero.gananciaNeta =
          datosCultivo.resumenFinanciero.totalVentas - datosCultivo.resumenFinanciero.totalInversion;

        reporte.cultivos.push(datosCultivo);
      }

      // 3. Procesar Sensores con análisis avanzado
      // Buscar sensores directamente en el lote O en sublotes del lote
      const sensores = await this.sensorRepo.find({
        where: [
          { lote: { id: loteId } },
          { sublote: { lote: { id: loteId } } }
        ],
        relations: ['lote', 'sublote']
      });

      for (const s of sensores) {
        // A. Registros Históricos (Respetan el rango de fechas para gráficas y promedios)
        const registros = await this.infoSensorRepo.createQueryBuilder('info')
          .where('info.sensorId = :sid', { sid: s.id })
          .andWhere('info.fechaRegistro BETWEEN :inicio AND :fin', { inicio: fechaInicio, fin: fechaFin })
          .orderBy('info.fechaRegistro', 'ASC')
          .getMany();

        // B. ✅ NUEVO: Último Dato Real (Tiempo Real - Ignora fechas del reporte)
        // Esto garantiza que si hay una alerta AHORA MISMO, salga en el PDF.
        const ultimoDatoReal = await this.infoSensorRepo.findOne({
            where: { sensor: { id: s.id } },
            order: { fechaRegistro: 'DESC' }
        });

        // Si no hay registros históricos en el rango, usamos arrays vacíos para no romper el código
        const valores = registros.map(r => Number(r.valor));
        const stats = registros.length > 0 ? {
            maximo: Math.max(...valores),
            minimo: Math.min(...valores),
            promedio: Number((valores.reduce((a, b) => a + b, 0) / valores.length).toFixed(2)),
            totalRegistros: registros.length
        } : {
            maximo: 0, minimo: 0, promedio: 0, totalRegistros: 0
        };

        // Lógica de actuadores (bomba para humedad)
        const eventosBomba: any[] = [];
        if (s.nombre.toLowerCase().includes('humedad')) {
          registros.forEach(r => {
            if (Number(r.valor) < 20) { // Umbral configurable
              eventosBomba.push({
                fecha: r.fechaRegistro,
                valor: Number(r.valor),
                accion: 'ENCENDIDO AUTOMÁTICO (Bomba de riego)',
                duracionEstimada: '15-30 minutos' // Estimación
              });
            }
          });
        }

        // Muestreo diario (últimos 5 datos por día)
        const agrupadoPorDia: any = registros.reduce((acc, curr) => {
          const dia = new Date(curr.fechaRegistro).toISOString().split('T')[0];
          if (!acc[dia]) acc[dia] = [];
          acc[dia].push(curr);
          return acc;
        }, {});

        const muestreoDiario: any[] = Object.keys(agrupadoPorDia).map(dia => ({
          dia,
          datos: agrupadoPorDia[dia].slice(-5).map((d: any) => ({
            hora: new Date(d.fechaRegistro).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            valor: Number(d.valor)
          }))
        }));

        // Picos altos y bajos (top 5)
        const picosAltos: any[] = [...registros]
          .sort((a, b) => Number(b.valor) - Number(a.valor))
          .slice(0, 5)
          .map(p => ({
            fecha: p.fechaRegistro,
            valor: Number(p.valor)
          }));

        const picosBajos: any[] = [...registros]
          .sort((a, b) => Number(a.valor) - Number(b.valor))
          .slice(0, 5)
          .map(p => ({
            fecha: p.fechaRegistro,
            valor: Number(p.valor)
          }));

        reporte.sensores[s.nombre] = {
          unidad: 'unidad', // Campo por defecto
          umbralMinimo: s.valor_minimo_alerta,
          umbralMaximo: s.valor_maximo_alerta,
          stats,
          eventosBomba,
          muestreoDiario,
          picosAltos,
          picosBajos,

          // ✅ ENVIAMOS EL DATO EN TIEMPO REAL AL PDF
          ultimoRegistro: ultimoDatoReal ? {
              valor: Number(ultimoDatoReal.valor),
              fecha: ultimoDatoReal.fechaRegistro
          } : null,

          recomendaciones: this.generarRecomendaciones(s.nombre, stats),
          alertas: registros.filter(r =>
            Number(r.valor) > Number(s.valor_maximo_alerta || 999) ||
            Number(r.valor) < Number(s.valor_minimo_alerta || 0)
          ).length
        };
      }

      return reporte;
    } catch (error) {
      console.error('Error generando reporte de trazabilidad:', error);
      throw error;
    }
  }

  /**
   * Obtiene cultivos activos de un lote para el selector de reportes
   */
  async getCultivosActivosLote(loteId: number) {
    return await this.cultivoRepo.createQueryBuilder('cultivo')
      .leftJoinAndSelect('cultivo.tipoCultivo', 'tipoCultivo')
      .leftJoinAndSelect('cultivo.sublotes', 'sublotes')
      .leftJoinAndSelect('sublotes.lote', 'subloteLote')
      .where('(cultivo.loteId = :loteId OR subloteLote.id = :loteId)', { loteId })
      .andWhere('(cultivo.Estado IS NULL OR cultivo.Estado != :estadoFinalizado)', { estadoFinalizado: 'Finalizado' })
      .select([
        'cultivo.id',
        'cultivo.nombre',
        'tipoCultivo.nombre',
        'sublotes.nombre',
        'subloteLote.nombre'
      ])
      .getMany();
  }
}