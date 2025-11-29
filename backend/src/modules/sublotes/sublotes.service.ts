// src/modules/sublotes/sublotes.service.ts
import {
  Injectable, NotFoundException, BadRequestException,
  Inject,      // <--- IMPORTANTE
  forwardRef   // <--- IMPORTANTE
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

    return await this.subloteRepository.save(sublote);
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
  async eliminar(id: number): Promise<void> {
    const sublote = await this.buscarPorId(id);
    await this.subloteRepository.remove(sublote);
  }

  async listarPorLote(loteId: number): Promise<Sublote[]> {
    return await this.subloteRepository.find({
      where: { lote: { id: loteId } },
      relations: ['lote', 'cultivo']
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
