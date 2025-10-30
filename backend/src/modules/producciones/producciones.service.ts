// src/modules/producciones/producciones.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Produccion } from './entities/produccione.entity';
import { CreateProduccioneDto } from './dto/create-produccione.dto';
import { UpdateProduccioneDto } from './dto/update-produccione.dto';
import { Cultivo } from '../cultivos/entities/cultivo.entity';

@Injectable()
export class ProduccionesService {
  constructor(
    @InjectRepository(Produccion)
    private readonly produccionRepository: Repository<Produccion>,
    @InjectRepository(Cultivo)
    private readonly cultivoRepository: Repository<Cultivo>,
  ) {}

 async create(createProduccioneDto: CreateProduccioneDto): Promise<Produccion> {
   // ✅ DESESTRUCTURAMOS EL ESTADO
   const { cultivoId, estado, ...produccionData } = createProduccioneDto;

   const cultivo = await this.cultivoRepository.findOneBy({ id: cultivoId });
   if (!cultivo) {
     throw new NotFoundException(`El cultivo con ID ${cultivoId} no fue encontrado.`);
   }

   const nuevaProduccion = this.produccionRepository.create({
     ...produccionData,
     cultivo: cultivo,
     // ✅ ASIGNAMOS EL ESTADO (SI EXISTE), SI NO, USARÁ EL DEFAULT DE LA ENTIDAD
     estado: estado,
     // ✅ GUARDAMOS LA CANTIDAD ORIGINAL PARA MOSTRARLA EN EL FRONTEND
     cantidadOriginal: produccionData.cantidad,
   });

   return this.produccionRepository.save(nuevaProduccion);
 }

  findAll(): Promise<Produccion[]> {
    return this.produccionRepository.find({ 
      relations: ['cultivo'], 
      order: { fecha: 'DESC' } 
    });
  }

  // --- ✅ NUEVO: Encontrar todas las producciones de UN cultivo específico ---
  async findAllByCultivo(cultivoId: number): Promise<Produccion[]> {
    return this.produccionRepository.find({
      where: { cultivo: { id: cultivoId } },
      relations: ['cultivo'],
      order: { fecha: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Produccion> {
    const produccion = await this.produccionRepository.findOne({
      where: { id },
      relations: ['cultivo', 'ventas', 'gastos'], // Cargamos relaciones para estadísticas
    });
    if (!produccion) {
      throw new NotFoundException(`Producción con ID ${id} no encontrada.`);
    }
    return produccion;
  }

  // --- ✅ NUEVO: Calcular estadísticas para un cultivo específico ---
  async getStatsByCultivo(cultivoId: number) {
    const producciones = await this.findAllByCultivo(cultivoId);

    // 1. Total Cosechado (usando cantidadOriginal para mostrar la cosecha total)
    const totalCosechado = producciones.reduce((sum, p) => sum + (p.cantidadOriginal || p.cantidad), 0);

    // Para obtener ventas y gastos, necesitamos consultar las producciones con sus relaciones
    const produccionesConFinanzas = await this.produccionRepository.find({
        where: { cultivo: { id: cultivoId } },
        relations: ['ventas', 'gastos']
    });

    // 2. Ingresos Totales
    const ingresosTotales = produccionesConFinanzas
        .flatMap(p => p.ventas)
        .reduce((sum, venta) => sum + Number(venta.valorTotalVenta), 0);

    // 3. Gastos Totales
    const gastosTotales = produccionesConFinanzas
        .flatMap(p => p.gastos)
        .reduce((sum, gasto) => sum + Number(gasto.monto), 0);

    // 4. Cosecha Vendida (total vendido)
    const cosechaVendida = produccionesConFinanzas
        .flatMap(p => p.ventas)
        .reduce((sum, venta) => sum + venta.cantidadVenta, 0);

    return {
        totalCosechado,
        ingresosTotales,
        gastosTotales,
        cosechaVendida
    };
  }
  
  // --- ✅ IMPLEMENTADO: Actualizar una producción ---
  async update(id: number, updateProduccioneDto: UpdateProduccioneDto): Promise<Produccion> {
    const produccion = await this.findOne(id); // Reutilizamos findOne para verificar que existe
    const { cultivoId, ...dataToUpdate } = updateProduccioneDto;

    // Si se envía un nuevo cultivoId, lo actualizamos
    if (cultivoId) {
        const cultivo = await this.cultivoRepository.findOneBy({ id: cultivoId });
        if (!cultivo) {
            throw new NotFoundException(`El cultivo con ID ${cultivoId} no fue encontrado.`);
        }
        produccion.cultivo = cultivo;
    }
    
    // Mezclamos los nuevos datos con la entidad existente
    Object.assign(produccion, dataToUpdate);
    return this.produccionRepository.save(produccion);
  }

  // --- ✅ IMPLEMENTADO: Eliminar una producción ---
  async remove(id: number): Promise<void> {
    const produccion = await this.findOne(id); // Aseguramos que exista
    await this.produccionRepository.remove(produccion);
  }

  // --- ✅ NUEVO: Obtener producciones disponibles para venta (cantidadOriginal > 0) ---
  async findAvailableForSale(): Promise<Produccion[]> {
    return this.produccionRepository.find({
      where: {
        cantidadOriginal: MoreThan(0) // Solo producciones con cantidad original > 0
      },
      relations: ['cultivo'],
      order: { fecha: 'DESC' },
    });
  }
}