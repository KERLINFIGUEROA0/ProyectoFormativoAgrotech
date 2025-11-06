import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { Cultivo } from './entities/cultivo.entity';
import { CreateCultivoDto } from './dto/create-cultivo.dto';
import { UpdateCultivoDto } from './dto/update-cultivo.dto';
import { TipoCultivo } from '../tipo_cultivo/entities/tipo_cultivo.entity';

@Injectable()
export class CultivosService {
  constructor(
    @InjectRepository(Cultivo)
    private readonly cultivoRepository: Repository<Cultivo>,
    @InjectRepository(TipoCultivo)
    private readonly tipoCultivoRepository: Repository<TipoCultivo>,
  ) {}

  async crear(dto: CreateCultivoDto): Promise<Cultivo> {
    const tipoCultivo = await this.tipoCultivoRepository.findOne({ where: { id: dto.tipoCultivoId } });
    if (!tipoCultivo) throw new NotFoundException(`El tipo de cultivo con ID ${dto.tipoCultivoId} no existe`);
    
    const cultivo = this.cultivoRepository.create({ ...dto, tipoCultivo });
    return await this.cultivoRepository.save(cultivo);
  }

  async listar(): Promise<Cultivo[]> {
    return await this.cultivoRepository.find({ relations: ['tipoCultivo'] });
  }

  async buscarPorId(id: number): Promise<Cultivo> {
    const cultivo = await this.cultivoRepository.findOne({ where: { id }, relations: ['tipoCultivo'] });
    if (!cultivo) throw new NotFoundException(`El cultivo con ID ${id} no existe`);
    return cultivo;
  }

  async actualizar(id: number, dto: UpdateCultivoDto): Promise<Cultivo> {
    const cultivo = await this.buscarPorId(id);
    if (dto.tipoCultivoId) {
      const tipoCultivo = await this.tipoCultivoRepository.findOne({ where: { id: dto.tipoCultivoId } });
      if (!tipoCultivo) throw new NotFoundException(`El tipo de cultivo con ID ${dto.tipoCultivoId} no existe`);
      cultivo.tipoCultivo = tipoCultivo;
    }
    Object.assign(cultivo, dto);
    return await this.cultivoRepository.save(cultivo);
  }

  async eliminar(id: number): Promise<void> {
    const cultivo = await this.buscarPorId(id);
    await this.cultivoRepository.remove(cultivo);
  }
  
  // --- ✅ CORRECCIÓN AQUÍ ---
  async actualizarImagen(id: number, imgUrl: string): Promise<Cultivo> {
    const cultivo = await this.buscarPorId(id);
    // Simplemente guarda la ruta relativa que el controlador le proporciona.
    cultivo.img = imgUrl;
    return this.cultivoRepository.save(cultivo);
  }

  async exportarExcelGeneral(): Promise<Buffer> {
    const cultivos = await this.cultivoRepository.find({
      relations: [
        'tipoCultivo',
        'producciones',
        'producciones.ventas',
        'producciones.gastos'
      ]
    });

    // Crear libro de Excel con múltiples hojas
    const workbook = XLSX.utils.book_new();

    // 1. Hoja de Resumen General
    const resumenGeneral = cultivos.map(cultivo => {
      const totalVentas = cultivo.producciones
        .flatMap(p => p.ventas)
        .reduce((sum, v) => sum + (Number(v.valorTotalVenta) || 0), 0);

      const totalGastos = cultivo.producciones
        .flatMap(p => p.gastos)
        .reduce((sum, g) => sum + (Number(g.monto) || 0), 0);

      const cantidadTotalVendida = cultivo.producciones
        .flatMap(p => p.ventas)
        .reduce((sum, v) => sum + (Number(v.cantidadVenta) || 0), 0);

      const cantidadTotalProducida = cultivo.producciones
        .reduce((sum, p) => sum + (Number(p.cantidadOriginal) || Number(p.cantidad) || 0), 0);

      return {
        'ID Cultivo': cultivo.id,
        'Nombre del Cultivo': cultivo.nombre,
        'Tipo de Cultivo': cultivo.tipoCultivo.nombre,
        'Fecha de Plantado': new Date(cultivo.Fecha_Plantado).toLocaleDateString('es-CO'),
        'Estado': cultivo.Estado,
        'Cantidad Total Producida': cantidadTotalProducida,
        'Cantidad Total Vendida': cantidadTotalVendida,
        'Cantidad Disponible': cantidadTotalProducida - cantidadTotalVendida,
        'Total Ventas ($)': totalVentas.toLocaleString('es-CO'),
        'Total Gastos ($)': totalGastos.toLocaleString('es-CO'),
        'Ganancia Neta ($)': (totalVentas - totalGastos).toLocaleString('es-CO')
      };
    });

    const resumenSheet = XLSX.utils.json_to_sheet(resumenGeneral);
    XLSX.utils.book_append_sheet(workbook, resumenSheet, 'Resumen General');

    // 2. Hoja de Producciones
    const produccionesData = cultivos.flatMap(cultivo =>
      cultivo.producciones.map(p => {
        const ventasProduccion = p.ventas.reduce((sum, v) => sum + (Number(v.valorTotalVenta) || 0), 0);
        const cantidadVendida = p.ventas.reduce((sum, v) => sum + (Number(v.cantidadVenta) || 0), 0);
        const gastosProduccion = p.gastos.reduce((sum, g) => sum + (Number(g.monto) || 0), 0);
        const cantidadOriginal = Number(p.cantidadOriginal) || Number(p.cantidad) || 0;
        
        return {
          'ID Cultivo': cultivo.id,
          'Nombre Cultivo': cultivo.nombre,
          'ID Producción': p.id,
          'Fecha': new Date(p.fecha).toLocaleDateString('es-CO'),
          'Cantidad Original': cantidadOriginal,
          'Cantidad Vendida': cantidadVendida,
          'Cantidad Disponible': cantidadOriginal - cantidadVendida,
          'Total Ventas ($)': ventasProduccion.toLocaleString('es-CO'),
          'Total Gastos ($)': gastosProduccion.toLocaleString('es-CO'),
          'Ganancia ($)': (ventasProduccion - gastosProduccion).toLocaleString('es-CO'),
          'Estado': p.estado
        };
      })
    ).sort((a, b) => new Date(b.Fecha).getTime() - new Date(a.Fecha).getTime());

    const produccionesSheet = XLSX.utils.json_to_sheet(produccionesData);
    XLSX.utils.book_append_sheet(workbook, produccionesSheet, 'Producciones');

    // 3. Hoja de Ventas
    const ventasData = cultivos.flatMap(cultivo =>
      cultivo.producciones.flatMap(p => 
        p.ventas.map(v => ({
          'ID Cultivo': cultivo.id,
          'Nombre Cultivo': cultivo.nombre,
          'ID Producción': p.id,
          'ID Venta': v.id,
          'Fecha': new Date(v.fecha).toLocaleDateString('es-CO'),
          'Descripción': v.descripcion,
          'Cantidad': v.cantidadVenta,
          'Precio Unitario ($)': Number(v.precioUnitario).toLocaleString('es-CO'),
          'Total ($)': Number(v.valorTotalVenta).toLocaleString('es-CO'),
          'Estado Producción': p.estado
        }))
      )
    ).sort((a, b) => new Date(b.Fecha).getTime() - new Date(a.Fecha).getTime());

    const ventasSheet = XLSX.utils.json_to_sheet(ventasData);
    XLSX.utils.book_append_sheet(workbook, ventasSheet, 'Ventas');

    // 4. Hoja de Gastos
    const gastosData = cultivos.flatMap(cultivo =>
      cultivo.producciones.flatMap(p =>
        p.gastos.map(g => ({
          'ID Cultivo': cultivo.id,
          'Nombre Cultivo': cultivo.nombre,
          'ID Producción': p.id,
          'ID Gasto': g.id,
          'Fecha': new Date(g.fecha).toLocaleDateString('es-CO'),
          'Descripción': g.descripcion,
          'Monto ($)': Number(g.monto).toLocaleString('es-CO'),
          'Estado Producción': p.estado
        }))
      )
    ).sort((a, b) => new Date(b.Fecha).getTime() - new Date(a.Fecha).getTime());

    const gastosSheet = XLSX.utils.json_to_sheet(gastosData);
    XLSX.utils.book_append_sheet(workbook, gastosSheet, 'Gastos');

    // Generar el archivo Excel
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return excelBuffer;
  }

  async generarExcelCultivo(id: number): Promise<Buffer> {
    const cultivo = await this.cultivoRepository.findOne({
      where: { id },
      relations: [
        'tipoCultivo',
        'producciones',
        'producciones.ventas',
        'producciones.gastos'
      ]
    });

    if (!cultivo) {
      throw new NotFoundException(`Cultivo con ID ${id} no encontrado`);
    }

    // Crear libro de Excel con múltiples hojas
    const workbook = XLSX.utils.book_new();

    // Calcular totales y estadísticas
    const totalVentas = cultivo.producciones
      .flatMap(p => p.ventas)
      .reduce((sum, v) => sum + (Number(v.valorTotalVenta) || 0), 0);

    const totalGastos = cultivo.producciones
      .flatMap(p => p.gastos)
      .reduce((sum, g) => sum + (Number(g.monto) || 0), 0);

    const cantidadTotalVendida = cultivo.producciones
      .flatMap(p => p.ventas)
      .reduce((sum, v) => sum + (Number(v.cantidadVenta) || 0), 0);

    const cantidadTotalProducida = cultivo.producciones
      .reduce((sum, p) => sum + (Number(p.cantidadOriginal) || Number(p.cantidad) || 0), 0);

    // 1. Hoja de Información General
    const cultivoInfo = [{
      'Nombre del Cultivo': cultivo.nombre,
      'Tipo de Cultivo': cultivo.tipoCultivo.nombre,
      'Fecha de Plantado': cultivo.Fecha_Plantado,
      'Estado': cultivo.Estado,
      'Cantidad Total Producida': cantidadTotalProducida,
      'Cantidad Total Vendida': cantidadTotalVendida,
      'Cantidad Disponible': cantidadTotalProducida - cantidadTotalVendida,
      'Total Ventas ($)': totalVentas.toLocaleString('es-CO'),
      'Total Gastos ($)': totalGastos.toLocaleString('es-CO'),
      'Ganancia Neta ($)': (totalVentas - totalGastos).toLocaleString('es-CO'),
      'Descripción': cultivo.descripcion
    }];
    const cultivoSheet = XLSX.utils.json_to_sheet(cultivoInfo);
    XLSX.utils.book_append_sheet(workbook, cultivoSheet, 'Información General');

    // 2. Hoja de Producciones
    const produccionesData = cultivo.producciones.map(p => {
      const ventasProduccion = p.ventas.reduce((sum, v) => sum + (Number(v.valorTotalVenta) || 0), 0);
      const cantidadVendida = p.ventas.reduce((sum, v) => sum + (Number(v.cantidadVenta) || 0), 0);
      const gastosProduccion = p.gastos.reduce((sum, g) => sum + (Number(g.monto) || 0), 0);
      const cantidadOriginal = Number(p.cantidadOriginal) || Number(p.cantidad) || 0;
      
      return {
        'ID Producción': p.id,
        'Fecha': new Date(p.fecha).toLocaleDateString('es-CO'),
        'Cantidad Original': cantidadOriginal,
        'Cantidad Vendida': cantidadVendida,
        'Cantidad Disponible': cantidadOriginal - cantidadVendida,
        'Total Ventas ($)': ventasProduccion.toLocaleString('es-CO'),
        'Total Gastos ($)': gastosProduccion.toLocaleString('es-CO'),
        'Ganancia ($)': (ventasProduccion - gastosProduccion).toLocaleString('es-CO'),
        'Estado': p.estado
      };
    }).sort((a, b) => new Date(b.Fecha).getTime() - new Date(a.Fecha).getTime());
    const produccionesSheet = XLSX.utils.json_to_sheet(produccionesData);
    XLSX.utils.book_append_sheet(workbook, produccionesSheet, 'Producciones');

    // 3. Hoja de Ventas
    const ventasData = cultivo.producciones
      .flatMap(p => p.ventas.map(v => ({
        'ID Venta': v.id,
        'ID Producción': p.id,
        'Fecha': new Date(v.fecha).toLocaleDateString('es-CO'),
        'Descripción': v.descripcion,
        'Cantidad': v.cantidadVenta,
        'Precio Unitario ($)': Number(v.precioUnitario).toLocaleString('es-CO'),
        'Total ($)': Number(v.valorTotalVenta).toLocaleString('es-CO'),
        'Estado Producción': p.estado
      })))
      .sort((a, b) => new Date(b.Fecha).getTime() - new Date(a.Fecha).getTime());
    const ventasSheet = XLSX.utils.json_to_sheet(ventasData);
    XLSX.utils.book_append_sheet(workbook, ventasSheet, 'Ventas');

    // 4. Hoja de Gastos
    const gastosData = cultivo.producciones
      .flatMap(p => p.gastos.map(g => ({
        'ID Gasto': g.id,
        'ID Producción': p.id,
        'Fecha': new Date(g.fecha).toLocaleDateString('es-CO'),
        'Descripción': g.descripcion,
        'Monto ($)': Number(g.monto).toLocaleString('es-CO'),
        'Estado Producción': p.estado
      })))
      .sort((a, b) => new Date(b.Fecha).getTime() - new Date(a.Fecha).getTime());
    const gastosSheet = XLSX.utils.json_to_sheet(gastosData);
    XLSX.utils.book_append_sheet(workbook, gastosSheet, 'Gastos');

    // Generar el archivo Excel
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return excelBuffer;
  }


}