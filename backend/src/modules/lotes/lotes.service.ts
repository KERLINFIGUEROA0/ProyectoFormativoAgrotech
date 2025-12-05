// src/modules/lotes/lotes.service.ts

import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lote } from './entities/lote.entity';
import { CreateLoteDto } from './dto/create-lote.dto';
import { UpdateLoteDto } from './dto/update-lote.dto';
import { UpdateLoteEstadoDto } from './dto/update-lote-estado.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { AppWebSocketGateway } from '../../websocket/websocket.gateway';

@Injectable()
export class LotesService {
  constructor(
    @InjectRepository(Lote)
    private readonly loteRepository: Repository<Lote>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly websocketGateway: AppWebSocketGateway,
  ) {}

  private async clearCache(id?: number) {
    await this.cacheManager.del('lotes_todos');
    await this.cacheManager.del('lotes_todos_alt');
    await this.cacheManager.del('lotes_estadisticas');
    if (id) {
      // The default cache key for the interceptor is the request URL
      await this.cacheManager.del(`/lotes/${id}`);
    }
  }

  async crear(dto: CreateLoteDto): Promise<Lote> {
    // Convertimos el área a string antes de crear y asignamos estado por defecto
    const loteData = {
      ...dto,
      area: String(dto.area),
      estado: dto.estado || 'En preparación', // Estado por defecto
    };
    const lote = this.loteRepository.create(loteData);
    const nuevoLote = await this.loteRepository.save(lote);
    await this.clearCache();
    return nuevoLote;
  }

  async listar(): Promise<Lote[]> {
    return await this.loteRepository.find({
      relations: ['sublotes', 'sublotes.cultivo'],
    });
  }

  async obtenerDisponibles(): Promise<Lote[]> {
    return await this.loteRepository.find({
      where: [
        { estado: 'En preparación' }, // Lotes listos para usar
        { estado: 'Parcialmente ocupado' } // Lotes con algunos sublotes disponibles
      ],
      relations: ['sublotes'],
      order: { nombre: 'ASC' }
    });
  }

  async buscarPorId(id: number): Promise<Lote> {
    const lote = await this.loteRepository.findOne({
      where: { id },
      relations: ['sublotes'],
    });
    if (!lote) {
      throw new NotFoundException(`El lote con ID ${id} no existe`);
    }
    return lote;
  }

  async actualizar(id: number, dto: UpdateLoteDto): Promise<Lote> {
    const lote = await this.buscarPorId(id);
    // Si se actualiza el área, también la convertimos a string
    if (dto.area) {
      dto.area = String(dto.area) as any;
    }
    Object.assign(lote, dto);
    const loteActualizado = await this.loteRepository.save(lote);
    await this.clearCache(id);
    return loteActualizado;
  }

  // ❌ ELIMINADO: Método eliminar - Los lotes se reutilizan, nunca se eliminan
  // Esto preserva toda la trazabilidad histórica

  async actualizarEstado(id: number, dto: UpdateLoteEstadoDto): Promise<Lote> {
    const lote = await this.buscarPorId(id);
    const estadoAnterior = lote.estado;
    lote.estado = dto.estado;
    const loteActualizado = await this.loteRepository.save(lote);
    await this.clearCache(id);

    // Emitir evento WebSocket para actualización en tiempo real
    this.websocketGateway.emitLoteEstadoActualizado(id, dto.estado, loteActualizado.nombre);

    return loteActualizado;
  }

  // ✅ MANTENIDO: Solo cambio de estado - Los lotes se reutilizan cambiando coordenadas
  // Esto permite "reiniciar" un lote para nuevo uso sin perder trazabilidad

  async obtenerEstadisticas() {
    const total = await this.loteRepository.count();

    const conteoPorEstado = await this.loteRepository
      .createQueryBuilder('lote')
      .select('lote.estado', 'estado')
      .addSelect('COUNT(lote.id)', 'cantidad')
      .groupBy('lote.estado')
      .getRawMany();

    const estadisticas = {
      total,
      enPreparacion: 0,
      parcialmenteOcupado: 0,
      enCultivo: 0,
      enMantenimiento: 0,
    };

    conteoPorEstado.forEach((item) => {
      const cantidad = parseInt(item.cantidad, 10);
      switch (item.estado) {
        case 'En preparación':
          estadisticas.enPreparacion = cantidad;
          break;
        case 'Parcialmente ocupado':
          estadisticas.parcialmenteOcupado = cantidad;
          break;
        case 'En cultivación':
          estadisticas.enCultivo = cantidad;
          break;
        case 'En mantenimiento':
          estadisticas.enMantenimiento = cantidad;
          break;
      }
    });

    return estadisticas;
  }
}

