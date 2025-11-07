// src/modules/surcos/surcos.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
  ) {}
  
  async crear(dto: CreateSurcoDto): Promise<Surco> {
    const { loteId, cultivoId, brokerId, activo_mqtt } = dto;

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

    const broker = brokerId
      ? await this.brokerRepository.findOne({ where: { id: brokerId } })
      : null;
    if (brokerId && !broker) {
      throw new NotFoundException(`El broker con ID ${brokerId} no existe`);
    }

    const surco = this.surcoRepository.create({
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      lote,
      cultivo: cultivo || null,
      broker: broker || null,
      activo_mqtt: activo_mqtt ?? true, // Por defecto activo
    });

    return await this.surcoRepository.save(surco);
  }

  async listar(): Promise<Surco[]> {
    return await this.surcoRepository.find({ relations: ['lote', 'cultivo', 'broker'] });
  }

  async buscarPorId(id: number): Promise<Surco> {
    const surco = await this.surcoRepository.findOne({
      where: { id },
      relations: ['lote', 'cultivo', 'broker'],
    });
    if (!surco) {
      throw new NotFoundException(`El surco con ID ${id} no existe`);
    }
    return surco;
  }

  async actualizar(id: number, dto: UpdateSurcoDto): Promise<Surco> {
    const { loteId, cultivoId, brokerId, ...restoDto } = dto;
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

    // Se actualiza la relación con el broker si se proporciona un nuevo brokerId
    if (brokerId !== undefined) {
      if (brokerId === null || brokerId === undefined || brokerId === 0) {
        surco.broker = null;
      } else {
        const broker = await this.brokerRepository.findOne({ where: { id: brokerId } });
        if (!broker) {
          throw new NotFoundException(`El broker con ID ${brokerId} no existe`);
        }
        surco.broker = broker;
      }
    }

    return await this.surcoRepository.save(surco);
  }

  async eliminar(id: number): Promise<void> {
    const surco = await this.buscarPorId(id);
    await this.surcoRepository.remove(surco);
  }

  async listarPorLote(loteId: number): Promise<Surco[]> {
    return await this.surcoRepository.find({ 
      where: { lote: { id: loteId } }, 
      relations: ['lote', 'cultivo', 'broker'] 
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
