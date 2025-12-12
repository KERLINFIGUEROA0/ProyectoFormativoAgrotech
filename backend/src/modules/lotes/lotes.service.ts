// src/modules/lotes/lotes.service.ts

import { Injectable, NotFoundException, Inject, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lote } from './entities/lote.entity';
import { CreateLoteDto } from './dto/create-lote.dto';
import { UpdateLoteDto } from './dto/update-lote.dto';
import { UpdateLoteEstadoDto } from './dto/update-lote-estado.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { AppWebSocketGateway } from '../../websocket/websocket.gateway';
import { polygon as turfPolygon, booleanIntersects } from '@turf/turf';

@Injectable()
export class LotesService {
  constructor(
    @InjectRepository(Lote)
    private readonly loteRepository: Repository<Lote>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly websocketGateway: AppWebSocketGateway,
  ) { }

  private async clearCache(id?: number) {
    await this.cacheManager.del('lotes_todos');
    await this.cacheManager.del('lotes_todos_alt');
    await this.cacheManager.del('lotes_estadisticas');
    if (id) {
      // The default cache key for the interceptor is the request URL
      await this.cacheManager.del(`/lotes/${id}`);
    }
  }

  /**
   * Verifica si las coordenadas de un polígono se superponen con lotes existentes
   * @param coordenadas - Coordenadas del polígono a validar
   * @param excludeLoteId - ID del lote a excluir de la validación (para edición)
   * @returns Objeto con información de superposición
   */
  private async checkPolygonOverlap(
    coordenadas: { type: 'point' | 'polygon'; coordinates: any },
    excludeLoteId?: number,
  ): Promise<{ isOverlapping: boolean; overlappingLote?: Lote }> {
    // Solo validar polígonos, no puntos
    if (!coordenadas || coordenadas.type !== 'polygon' || !Array.isArray(coordenadas.coordinates)) {
      return { isOverlapping: false };
    }

    // Obtener TODOS los lotes (filtraremos en memoria)
    const todosLosLotes = await this.loteRepository.find();

    // Filtrar solo los que tienen coordenadas de tipo polígono
    const lotesExistentes = todosLosLotes.filter(
      lote => lote.coordenadas?.type === 'polygon' && Array.isArray(lote.coordenadas.coordinates)
    );

    // Convertir las coordenadas nuevas a formato Turf.js
    // Turf espera coordenadas en formato [lng, lat] y el primer y último punto deben ser iguales
    const newCoords = coordenadas.coordinates as Array<{ lat: number; lng: number }>;
    const turfCoords = newCoords.map((c) => [c.lng, c.lat]);

    // Cerrar el polígono si no está cerrado
    if (turfCoords.length > 0) {
      const firstPoint = turfCoords[0];
      const lastPoint = turfCoords[turfCoords.length - 1];
      if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
        turfCoords.push([...firstPoint]);
      }
    }

    const newPolygon = turfPolygon([[...turfCoords]]);

    // Verificar superposición con cada lote existente
    for (const lote of lotesExistentes) {
      // Excluir el lote actual si estamos editando
      if (excludeLoteId && lote.id === excludeLoteId) {
        continue;
      }

      if (lote.coordenadas?.type === 'polygon' && Array.isArray(lote.coordenadas.coordinates)) {
        const existingCoords = lote.coordenadas.coordinates as Array<{ lat: number; lng: number }>;
        const existingTurfCoords = existingCoords.map((c) => [c.lng, c.lat]);

        // Cerrar el polígono si no está cerrado
        if (existingTurfCoords.length > 0) {
          const firstPoint = existingTurfCoords[0];
          const lastPoint = existingTurfCoords[existingTurfCoords.length - 1];
          if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
            existingTurfCoords.push([...firstPoint]);
          }
        }

        const existingPolygon = turfPolygon([[...existingTurfCoords]]);

        // Verificar si hay intersección
        if (booleanIntersects(newPolygon, existingPolygon)) {
          return { isOverlapping: true, overlappingLote: lote };
        }
      }
    }

    return { isOverlapping: false };
  }

  async crear(dto: CreateLoteDto): Promise<Lote> {
    // Verificar superposición de coordenadas si es un polígono
    if (dto.coordenadas) {
      const overlapCheck = await this.checkPolygonOverlap(dto.coordenadas as any);
      if (overlapCheck.isOverlapping && overlapCheck.overlappingLote) {
        throw new BadRequestException(
          `Las coordenadas del lote se superponen con el lote existente: "${overlapCheck.overlappingLote.nombre}". Por favor, elige coordenadas diferentes.`
        );
      }
    }

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

    // Verificar superposición si se están actualizando las coordenadas
    if (dto.coordenadas) {
      const overlapCheck = await this.checkPolygonOverlap(dto.coordenadas as any, id);
      if (overlapCheck.isOverlapping && overlapCheck.overlappingLote) {
        throw new BadRequestException(
          `Las coordenadas actualizadas se superponen con el lote existente: "${overlapCheck.overlappingLote.nombre}". Por favor, elige coordenadas diferentes.`
        );
      }
    }

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

