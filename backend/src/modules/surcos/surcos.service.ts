// src/modules/surcos/surcos.service.ts
import {
  Injectable, NotFoundException, BadRequestException,
  Inject,      // <--- IMPORTANTE
  forwardRef   // <--- IMPORTANTE
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Surco } from './entities/surco.entity';
import { CreateSurcoDto } from './dto/create-surco.dto';
import { UpdateSurcoDto } from './dto/update-surco.dto';
import { UpdateSurcoEstadoDto } from './dto/update-surco-estado.dto';
import { UpdateSurcoMqttDto } from './dto/update-surco-mqtt.dto';
import { Lote } from '../lotes/entities/lote.entity';
import { Cultivo } from '../cultivos/entities/cultivo.entity';
import { Broker } from '../mqtt-config/entities/broker.entity';
import { BrokerLote } from '../mqtt-config/entities/broker-lote.entity';
import { MqttConfigService } from '../mqtt-config/mqtt-config.service'; // Importarar el servicio

@Injectable()
export class SurcosService {
  constructor(
    @InjectRepository(Surco)
    private readonly surcoRepository: Repository<Surco>,
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

  async crear(dto: CreateSurcoDto): Promise<Surco> {
    const { loteId, cultivoId, activo_mqtt } = dto;

    const lote = await this.loteRepository.findOne({ where: { id: loteId } });
    if (!lote) {
      throw new NotFoundException(`El lote con ID ${loteId} no existe`);
    }

    const cultivo = cultivoId
      ? await this.cultivoRepository.findOne({ where: { id: cultivoId } })
      : null;
    if (cultivoId && !cultivo) {
      throw new NotFoundException(`El cultivo con ID ${cultivoId} no existe`);
    }

    const surco = this.surcoRepository.create({
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      lote,
      cultivo: cultivo || null,
      activo_mqtt: activo_mqtt ?? true, // Por defecto activo
    });

    const surcoGuardado = await this.surcoRepository.save(surco);
    console.log('Surco guardado:', surcoGuardado.id);

    return surcoGuardado;
  }

  async listar(): Promise<Surco[]> {
    return await this.surcoRepository.find({ relations: ['lote', 'cultivo'] });
  }

  async buscarPorId(id: number): Promise<Surco> {
    const surco = await this.surcoRepository.findOne({
      where: { id },
      relations: ['lote', 'cultivo'],
    });
    if (!surco) {
      throw new NotFoundException(`El surco con ID ${id} no existe`);
    }
    return surco;
  }

  async actualizar(id: number, dto: UpdateSurcoDto): Promise<Surco> {
    const { loteId, cultivoId, ...restoDto } = dto;
    const surco = await this.buscarPorId(id);

    // Si se intenta enviar un loteId diferente, se lanza un error.
    if (loteId && loteId !== surco.lote.id) {
      throw new BadRequestException('No se puede cambiar el lote de un surco existente.');
    }

    // Se actualizan los campos permitidos (nombre, descripción, etc.)
    Object.assign(surco, restoDto);

    // Se actualiza la relación con el cultivo si se proporciona un nuevo cultivoId
    if (cultivoId !== undefined) {
      if (cultivoId === null || cultivoId === undefined || cultivoId === 0) {
        surco.cultivo = null;
      } else {
        const cultivo = await this.cultivoRepository.findOne({ where: { id: cultivoId } });
        if (!cultivo) {
          throw new NotFoundException(`El cultivo con ID ${cultivoId} no existe`);
        }
        surco.cultivo = cultivo;
      }
    }

    return await this.surcoRepository.save(surco);
  }
async sincronizarSensores(id: number): Promise<{ message: string, sensoresCreados: number }> {
  // 1. Buscar el surco con su lote
  const surco = await this.surcoRepository.findOne({
    where: { id },
    relations: ['lote'] // Traemos el lote
  });

  if (!surco) throw new NotFoundException(`Surco #${id} no encontrado`);

  // 2. Redirigir a la sincronización por lote, ya que ahora los tópicos están asociados al lote
  // Importar y usar SensoresService para sincronizar por lote
  const { SensoresService } = await import('../sensores/sensores.service');
  // Como no podemos inyectar aquí, devolver mensaje indicando usar sincronización por lote
  return {
    message: `La sincronización de sensores ahora se realiza por lote. Use el endpoint de sincronización de sensores del lote ${surco.lote.id}.`,
    sensoresCreados: 0
  };
}
  async eliminar(id: number): Promise<void> {
    const surco = await this.buscarPorId(id);
    await this.surcoRepository.remove(surco);
  }

  async listarPorLote(loteId: number): Promise<Surco[]> {
    return await this.surcoRepository.find({
      where: { lote: { id: loteId } },
      relations: ['lote', 'cultivo']
    });
  }

  async actualizarEstado(id: number, dto: UpdateSurcoEstadoDto): Promise<Surco> {
    const surco = await this.buscarPorId(id);
    surco.estado = dto.estado;
    return await this.surcoRepository.save(surco);
  }

  async actualizarMqtt(id: number, dto: UpdateSurcoMqttDto): Promise<Surco> {
    const surco = await this.buscarPorId(id);
    surco.activo_mqtt = dto.activo_mqtt;
    return await this.surcoRepository.save(surco);
  }
}
