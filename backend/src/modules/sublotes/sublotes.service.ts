// src/modules/sublotes/sublotes.service.ts
import {
  Injectable, NotFoundException, BadRequestException,
  Inject,      // <--- IMPORTANTE
  forwardRef   // <--- IMPORTANTE
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull, EntityManager } from 'typeorm';
import { Sublote } from './entities/sublote.entity';
import { CreateSubloteDto } from './dto/create-sublote.dto';
import { UpdateSubloteDto } from './dto/update-sublote.dto';
import { UpdateSubloteEstadoDto } from './dto/update-sublote-estado.dto';
import { UpdateSubloteMqttDto } from './dto/update-sublote-mqtt.dto';
import { Lote } from '../lotes/entities/lote.entity';
import { Cultivo } from '../cultivos/entities/cultivo.entity';
import { Broker } from '../mqtt-config/entities/broker.entity';
import { BrokerLote } from '../mqtt-config/entities/broker-lote.entity';
import { MqttConfigService } from '../mqtt-config/mqtt-config.service'; // Importarar el servicio

@Injectable()
export class SublotesService {
  constructor(
    @InjectRepository(Sublote)
    private readonly subloteRepository: Repository<Sublote>,
    @InjectRepository(Lote)
    private readonly loteRepository: Repository<Lote>,
    @InjectRepository(Cultivo)
    private readonly cultivoRepository: Repository<Cultivo>,
    @InjectRepository(Broker)
    private readonly brokerRepository: Repository<Broker>,
    @InjectRepository(BrokerLote)
    private readonly brokerLoteRepository: Repository<BrokerLote>,
    @Inject(forwardRef(() => MqttConfigService))
    private readonly mqttConfigService: MqttConfigService,

  ) { }

  // Función privada para actualizar el estado del lote basado en sus sublotes ACTIVOS y cultivos asignados
  private async actualizarEstadoLote(loteId: number, manager?: EntityManager): Promise<void> {
    // Definir qué repositorio usar: si hay manager (transacción), usarlo; si no, usar el normal.
    const subloteRepo = manager ? manager.getRepository(Sublote) : this.subloteRepository;
    const cultivoRepo = manager ? manager.getRepository(Cultivo) : this.cultivoRepository;
    const loteRepo = manager ? manager.getRepository(Lote) : this.loteRepository;

    // Obtener todos los sublotes ACTIVOS del lote usando el repo correcto
    const sublotesActivos = await subloteRepo.find({
      where: { lote: { id: loteId } },
      relations: ['cultivo']
    });

    // Verificar si hay cultivos activos asignados a los sublotes del lote
    const cultivosEnSublotes = sublotesActivos
      .filter(s => s.cultivo !== null && (s.cultivo.Estado === 'Activo' || s.cultivo.Estado === 'En Cosecha'))
      .length;

    // Verificar cultivos directos usando el repo correcto
    const cultivosDirectosEnLote = await cultivoRepo.count({
      where: {
        lote: { id: loteId },
        Estado: In(['Activo', 'En Cosecha']),
        sublotes: { id: IsNull() }
      }
    });

    // Si no hay cultivos activos (ni en sublotes ni directos), el lote está en preparación
    if (cultivosEnSublotes === 0 && cultivosDirectosEnLote === 0) {
      await loteRepo.update(loteId, { estado: 'En preparación' });
      console.log(`Lote ${loteId} cambió a estado: En preparación (sin cultivos activos)`);
      return;
    }

    // Si hay sublotes activos
    if (sublotesActivos.length > 0) {
      const totalSublotesActivos = sublotesActivos.length;

      let nuevoEstado: string;

      if (cultivosEnSublotes === 0) {
        // Hay sublotes pero ninguno tiene cultivo activo
        nuevoEstado = 'En preparación';
      } else if (cultivosEnSublotes === totalSublotesActivos) {
        // Todos los sublotes activos tienen cultivos activos
        nuevoEstado = 'En cultivación';
      } else {
        // Algunos sublotes tienen cultivos activos
        nuevoEstado = 'Parcialmente ocupado';
      }

      await loteRepo.update(loteId, { estado: nuevoEstado });
      console.log(`Lote ${loteId} cambió a estado: ${nuevoEstado} (${cultivosEnSublotes}/${totalSublotesActivos} sublotes con cultivos activos)`);
    } else {
      // No hay sublotes activos, pero hay cultivos directos
      const nuevoEstado = cultivosDirectosEnLote > 0 ? 'En cultivación' : 'En preparación';
      await loteRepo.update(loteId, { estado: nuevoEstado });
      console.log(`Lote ${loteId} cambió a estado: ${nuevoEstado} (sin sublotes activos, ${cultivosDirectosEnLote} cultivos directos activos)`);
    }
  }

  async crear(dto: CreateSubloteDto): Promise<Sublote> {
    const { loteId, cultivoId, activo_mqtt, coordenadas } = dto;

    const lote = await this.loteRepository.findOne({ where: { id: loteId } });
    if (!lote) {
      throw new NotFoundException(`El lote con ID ${loteId} no existe`);
    }

    let cultivo: Cultivo | null = null;
    // Lógica de Estado Automático
    let estadoInicial = 'Disponible';

    if (cultivoId) {
      cultivo = await this.cultivoRepository.findOne({ where: { id: cultivoId } });
      if (!cultivo) throw new NotFoundException(`El cultivo con ID ${cultivoId} no existe`);

      // Si asignamos cultivo, el estado pasa a Ocupado
      estadoInicial = 'Ocupado';
    }

    const sublote = this.subloteRepository.create({
      nombre: dto.nombre,
      lote,
      cultivo: cultivo || null,
      activo_mqtt: activo_mqtt ?? true,
      estado: estadoInicial, // Asignamos el estado calculado
      coordenadas: coordenadas // Guardamos las coordenadas del mapa
    });

    const subloteGuardado = await this.subloteRepository.save(sublote);
    console.log('Sublote guardado:', subloteGuardado.id);

    // Actualizar el estado del lote después de crear el sublote
    await this.actualizarEstadoLote(loteId);

    return subloteGuardado;
  }

  async listar(): Promise<Sublote[]> {
    return await this.subloteRepository.find({ relations: ['lote', 'cultivo'] });
  }

  async buscarPorId(id: number): Promise<Sublote> {
    const sublote = await this.subloteRepository.findOne({
      where: { id },
      relations: ['lote', 'cultivo'],
    });
    if (!sublote) {
      throw new NotFoundException(`El sublote con ID ${id} no existe`);
    }
    return sublote;
  }

  async actualizar(id: number, dto: UpdateSubloteDto): Promise<Sublote> {
    const { loteId, cultivoId, ...restoDto } = dto;
    const sublote = await this.buscarPorId(id);

    // Si se intenta enviar un loteId diferente, se lanza un error.
    if (loteId && loteId !== sublote.lote.id) {
      throw new BadRequestException('No se puede cambiar el lote de un sublote existente.');
    }

    // Se actualizan los campos permitidos (nombre, área, etc.)
    Object.assign(sublote, restoDto);

    // Se actualiza la relación con el cultivo si se proporciona un nuevo cultivoId
    if (cultivoId !== undefined) {
      if (cultivoId === null || cultivoId === undefined || cultivoId === 0) {
        // Se retiró el cultivo -> Liberar sublote
        sublote.cultivo = null;
        sublote.estado = 'Disponible';
      } else {
        const cultivo = await this.cultivoRepository.findOne({ where: { id: cultivoId } });
        if (!cultivo) {
          throw new NotFoundException(`El cultivo con ID ${cultivoId} no existe`);
        }
        // Se asignó cultivo -> Ocupar sublote
        sublote.cultivo = cultivo;
        sublote.estado = 'Ocupado';
      }
    }

    const subloteActualizado = await this.subloteRepository.save(sublote);

    // Actualizar el estado del lote después de actualizar el sublote
    await this.actualizarEstadoLote(sublote.lote.id);

    return subloteActualizado;
  }
async sincronizarSensores(id: number): Promise<{ message: string, sensoresCreados: number }> {
  // 1. Buscar el sublote con su lote
  const sublote = await this.subloteRepository.findOne({
    where: { id },
    relations: ['lote'] // Traemos el lote
  });

  if (!sublote) throw new NotFoundException(`Sublote #${id} no encontrado`);

  // 2. Redirigir a la sincronización por lote, ya que ahora los tópicos están asociados al lote
  // Importar y usar SensoresService para sincronizar por lote
  const { SensoresService } = await import('../sensores/sensores.service');
  // Como no podemos inyectar aquí, devolver mensaje indicando usar sincronización por lote
  return {
    message: `La sincronización de sensores ahora se realiza por lote. Use el endpoint de sincronización de sensores del lote ${sublote.lote.id}.`,
    sensoresCreados: 0
  };
}
  async eliminar(id: number): Promise<{ message: string }> {
    const sublote = await this.buscarPorId(id);
    const loteId = sublote.lote.id;

    // IMPORTANTE: Cambiamos .remove() por .softDelete()
    // Esto mantendrá el registro en la BD pero con fecha de eliminación.
    const result = await this.subloteRepository.softDelete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Sublote con ID ${id} no encontrado`);
    }

    // Actualizar el estado del lote después de eliminar el sublote
    await this.actualizarEstadoLote(loteId);

    return { message: 'Sublote eliminado correctamente (archivado para historial)' };
  }

  // Si necesitas consultar sublotes eliminados para reportes históricos:
  async findOneWithDeleted(id: number): Promise<Sublote | null> {
    return this.subloteRepository.findOne({
      where: { id },
      withDeleted: true // <--- Esta opción permite ver los eliminados
    });
  }

  async listarPorLote(loteId: number): Promise<Sublote[]> {
    return await this.subloteRepository.find({
      where: { lote: { id: loteId } },
      relations: ['lote', 'cultivo']
    });
  }

  async listarDisponiblesPorLote(loteId: number): Promise<Sublote[]> {
    return await this.subloteRepository.find({
      where: {
        lote: { id: loteId },
        estado: 'Disponible' // Solo sublotes disponibles, no en cultivación
      },
      relations: ['lote', 'cultivo'],
      order: { nombre: 'ASC' }
    });
  }

  async actualizarEstado(id: number, dto: UpdateSubloteEstadoDto): Promise<Sublote> {
    const sublote = await this.buscarPorId(id);
    sublote.estado = dto.estado;
    return await this.subloteRepository.save(sublote);
  }

  async actualizarMqtt(id: number, dto: UpdateSubloteMqttDto): Promise<Sublote> {
    const sublote = await this.buscarPorId(id);
    sublote.activo_mqtt = dto.activo_mqtt;
    return await this.subloteRepository.save(sublote);
  }
}
