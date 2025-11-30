import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
import { Venta } from '../../common/enums/ventas/entities/venta.entity';
import { Gasto } from '../gastos_produccion/entities/gastos_produccion.entity';
import { Actividad } from '../actividades/entities/actividade.entity';
import { ActividadMaterial } from '../actividades_materiales/entities/actividades_materiale.entity';
import { Material } from '../materiales/entities/materiale.entity';

@Injectable()
export class SensoresService {
  private readonly logger = new Logger(SensoresService.name);

  constructor(
    @InjectRepository(Sensor)
    private readonly sensorRepo: Repository<Sensor>,
    @InjectRepository(Sublote)
    private readonly subloteRepo: Repository<Sublote>,
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

    @Inject(forwardRef(() => InformacionSensorService))
    private readonly infoSensorService: InformacionSensorService,
    @Inject(forwardRef(() => MqttClientService))
    private readonly mqttClientService: MqttClientService,
    @Inject(forwardRef(() => MqttConfigService))
    private readonly mqttConfigService: MqttConfigService,
  ) {}


  

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

  async getFullTraceabilityData(dto: GenerarReporteTrazabilidadDto) {
    const { loteId, fechaInicio, fechaFin } = dto;
    console.log('Iniciando recolección de datos de trazabilidad:', dto);

    // Verificar que el lote existe
    const lote = await this.brokerRepo.manager.findOne(Lote, { where: { id: loteId } });
    if (!lote) {
      throw new NotFoundException(`Lote con ID ${loteId} no encontrado`);
    }
    console.log(`Lote encontrado: ${lote.nombre}`);

    // 1. Obtener Cultivo(s) en ese rango de fechas y Lote
    const cultivos = await this.cultivoRepo.find({
      where: { lote: { id: loteId } },
      relations: [
        'producciones',
        'gastos',
        'actividades',
        'actividades.responsable',
        'actividades.responsable.tipoUsuario',
        'actividades.actividadMaterial',
        'actividades.actividadMaterial.material'
      ]
    });
    console.log(`Encontrados ${cultivos.length} cultivos para el lote ${loteId}`);

    // Estructura para acumular datos
    const reporte: any = {
      loteNombre: lote.nombre,
      fechaInicio,
      fechaFin,
      resumen: {
        diasSembrado: 0,
        totalInversion: 0,
        costosLaborales: 0,
        totalVentas: 0,
        gananciaNeta: 0,
      },
      actividades: [],
      materiales: [],
      alertas: [],
      datosSensores: {}
    };

    // 2. Calcular Finanzas e Inventario recorriendo cultivos
    try {
      for (const cultivo of cultivos) {
        console.log(`Procesando cultivo ${cultivo.nombre}`);

        // Calcular días
        const inicio = new Date(cultivo.Fecha_Plantado);
        const fin = cultivo.Fecha_Fin ? new Date(cultivo.Fecha_Fin) : new Date();
        const diffTime = Math.abs(fin.getTime() - inicio.getTime());
        reporte.resumen.diasSembrado += Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Sumar gastos
        if (cultivo.gastos && cultivo.gastos.length > 0) {
          reporte.resumen.totalInversion += cultivo.gastos.reduce((a, b) => a + Number(b.monto), 0);
        }

        // Sumar ventas a través de producciones
        if (cultivo.producciones && cultivo.producciones.length > 0) {
          for (const produccion of cultivo.producciones) {
            try {
              const ventas = await this.ventaRepo.find({ where: { produccion: { id: produccion.id } } });
              reporte.resumen.totalVentas += ventas.reduce((a, b) => a + Number(b.valorTotalVenta), 0);
            } catch (error) {
              console.warn(`Error obteniendo ventas para producción ${produccion.id}:`, error.message);
            }
          }
        }

        // Obtener actividades realizadas
        if (cultivo.actividades && cultivo.actividades.length > 0) {
          for (const actividad of cultivo.actividades) {
            // Calcular costo de la actividad
            let costoTotal = 0;
            let tipoUsuario = 'Sin asignar';

            if (actividad.responsable && actividad.responsable.tipoUsuario) {
              tipoUsuario = actividad.responsable.tipoUsuario.nombre;

              // Solo calcular costo para pasantes (no para aprendices)
              if (tipoUsuario.toLowerCase().includes('pasante') && actividad.horas && actividad.tarifaHora) {
                costoTotal = Number(actividad.horas) * Number(actividad.tarifaHora);
              }
            }

            reporte.actividades.push({
              titulo: actividad.titulo,
              descripcion: actividad.descripcion,
              fecha: actividad.fecha,
              estado: actividad.estado,
              responsable: actividad.responsable ? {
                nombre: actividad.responsable.nombre,
                apellidos: actividad.responsable.apellidos,
                identificacion: actividad.responsable.identificacion,
                tipoUsuario: tipoUsuario
              } : null,
              horas: actividad.horas,
              tarifaHora: actividad.tarifaHora,
              costoTotal: costoTotal,
              calificacion: actividad.calificacion,
              comentarioInstructor: actividad.comentarioInstructor,
              respuestaTexto: actividad.respuestaTexto
            });

            // Acumular costos laborales
            reporte.resumen.costosLaborales += costoTotal;

            // Obtener materiales usados en esta actividad
            if (actividad.actividadMaterial && actividad.actividadMaterial.length > 0) {
              for (const am of actividad.actividadMaterial) {
                if (am.material) {
                  reporte.materiales.push({
                    nombre: am.material.nombre,
                    cantidad: am.cantidadUsada,
                    fecha: actividad.fecha,
                    actividad: actividad.titulo
                  });
                }
              }
            }
          }
        }
      }
      console.log(`Procesadas ${reporte.actividades.length} actividades para el lote ${loteId}`);
      console.log(`Costos laborales acumulados: $${reporte.resumen.costosLaborales}`);
    } catch (error) {
      console.error('Error procesando cultivos:', error);
      throw error;
    }

    reporte.resumen.gananciaNeta = reporte.resumen.totalVentas - (reporte.resumen.totalInversion + reporte.resumen.costosLaborales);

    // 3. Lógica Pesada de Sensores
    try {
      const sensoresDelLote = await this.sensorRepo.find({
        where: { lote: { id: loteId } },
        relations: ['lote']
      });
      console.log(`Encontrados ${sensoresDelLote.length} sensores para el lote ${loteId}`);

      for (const sensor of sensoresDelLote) {
        console.log(`Procesando sensor ${sensor.nombre} (ID: ${sensor.id})`);

        try {
          // Top 10 Picos Altos
          const picosAltos = await this.infoSensorRepo
            .createQueryBuilder('info')
            .where('info.sensorId = :sid', { sid: sensor.id })
            .andWhere('info.fechaRegistro BETWEEN :inicio AND :fin', { inicio: fechaInicio, fin: fechaFin })
            .orderBy('info.valor', 'DESC')
            .limit(10)
            .getMany();

          // Top 10 Picos Bajos
          const picosBajos = await this.infoSensorRepo
            .createQueryBuilder('info')
            .where('info.sensorId = :sid', { sid: sensor.id })
            .andWhere('info.fechaRegistro BETWEEN :inicio AND :fin', { inicio: fechaInicio, fin: fechaFin })
            .orderBy('info.valor', 'ASC')
            .limit(10)
            .getMany();

          // Alertas
          const alertas = await this.infoSensorRepo
            .createQueryBuilder('info')
            .where('info.sensorId = :sid', { sid: sensor.id })
            .andWhere('(info.valor > :max OR info.valor < :min)', { max: sensor.valor_maximo_alerta, min: sensor.valor_minimo_alerta })
            .andWhere('info.fechaRegistro BETWEEN :inicio AND :fin', { inicio: fechaInicio, fin: fechaFin })
            .getMany();

          reporte.datosSensores[sensor.nombre] = { picosAltos, picosBajos, alertas };
          console.log(`Datos obtenidos para sensor ${sensor.nombre}: ${picosAltos.length} altos, ${picosBajos.length} bajos, ${alertas.length} alertas`);
        } catch (error) {
          console.warn(`Error procesando sensor ${sensor.nombre}:`, error.message);
          reporte.datosSensores[sensor.nombre] = { picosAltos: [], picosBajos: [], alertas: [] };
        }
      }
    } catch (error) {
      console.error('Error obteniendo sensores:', error);
      // Continuar sin datos de sensores
    }

    console.log('Datos de trazabilidad recolectados exitosamente');
    return reporte;
  }
}