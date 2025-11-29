import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, In } from 'typeorm';
import * as XLSX from 'xlsx';
import { Cultivo } from './entities/cultivo.entity';
import { CreateCultivoDto } from './dto/create-cultivo.dto';
import { UpdateCultivoDto } from './dto/update-cultivo.dto';
import { TipoCultivo } from '../tipo_cultivo/entities/tipo_cultivo.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { Sublote } from '../sublotes/entities/sublote.entity';
import { Produccion } from '../producciones/entities/produccione.entity';

@Injectable()
export class CultivosService {
  constructor(
    @InjectRepository(Cultivo)
    private readonly cultivoRepository: Repository<Cultivo>,
    @InjectRepository(TipoCultivo)
    private readonly tipoCultivoRepository: Repository<TipoCultivo>,
    @InjectRepository(Lote)
    private readonly loteRepository: Repository<Lote>,
    @InjectRepository(Sublote)
    private readonly subloteRepository: Repository<Sublote>,
  ) {}

  async crear(dto: CreateCultivoDto): Promise<Cultivo> {
    const queryRunner = this.cultivoRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {

      // 1. Validaciones
      const tipoCultivo = await this.tipoCultivoRepository.findOne({ where: { id: dto.tipoCultivoId } });
      if (!tipoCultivo) throw new NotFoundException(`El tipo de cultivo con ID ${dto.tipoCultivoId} no existe`);

      const lote = await this.loteRepository.findOne({ where: { id: dto.loteId } });
      if (!lote) throw new NotFoundException(`El lote con ID ${dto.loteId} no existe`);

      // 2. Crear el cultivo (solo un registro)
      const cultivo = new Cultivo();
      cultivo.nombre = dto.nombre;
      cultivo.cantidad = dto.cantidad;
      cultivo.tipoCultivo = tipoCultivo;
      cultivo.lote = lote;
      cultivo.Fecha_Plantado = dto.Fecha_Plantado ? new Date(dto.Fecha_Plantado) : new Date();
      cultivo.descripcion = dto.descripcion || '';
      cultivo.Estado = dto.Estado || 'Activo';
      if (dto.img) cultivo.img = dto.img;

      // Guardar el cultivo para obtener su ID
      const cultivoGuardado = await queryRunner.manager.save(Cultivo, cultivo);

      // 3. Lógica de asignación a sublotes
      if (dto.subloteId && dto.subloteId > 0) {
        // ASIGNACIÓN ESPECÍFICA: Solo a un sublote
        const sublote = await this.subloteRepository.findOne({
          where: { id: dto.subloteId },
          relations: ['lote']
        });

        if (!sublote) throw new NotFoundException('Sublote no encontrado');
        if (sublote.lote.id !== lote.id) throw new BadRequestException('El sublote no pertenece al lote indicado');

        // Asignar cultivo al sublote específico
        sublote.cultivo = cultivoGuardado;
        sublote.estado = 'En cultivación';
        await queryRunner.manager.save(Sublote, sublote);

        // Estado del lote: Parcialmente ocupado
        lote.estado = 'Parcialmente ocupado';
        await queryRunner.manager.save(Lote, lote);

      } else {
        // ASIGNACIÓN MASIVA: A todos los sublotes del lote
        const todosSublotes = await this.subloteRepository.find({
          where: { lote: { id: lote.id } }
        });

        if (todosSublotes.length > 0) {
          // Asignar el mismo cultivo a todos los sublotes
          for (const sub of todosSublotes) {
            sub.cultivo = cultivoGuardado;
            sub.estado = 'En cultivación';
            await queryRunner.manager.save(Sublote, sub);
          }
        }

        // Estado del lote: En cultivación (totalmente ocupado)
        lote.estado = 'En cultivación';
        await queryRunner.manager.save(Lote, lote);
      }

      await queryRunner.commitTransaction();
      return cultivoGuardado;

    } catch (err) {
      await queryRunner.rollbackTransaction();
      console.error('Error creando cultivo:', err);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async listar(): Promise<Cultivo[]> {
    return await this.cultivoRepository.find({ relations: ['tipoCultivo', 'lote', 'sublotes'] });
  }

  async buscarPorId(id: number): Promise<Cultivo> {
    const cultivo = await this.cultivoRepository.findOne({ where: { id }, relations: ['tipoCultivo', 'lote', 'sublotes'] });
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

  async registrarCosecha(id: number, fecha: string, cantidad: number, esFinal: boolean): Promise<Cultivo> {
    const queryRunner = this.cultivoRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Obtener el cultivo con sus relaciones de terreno
      const cultivo = await this.cultivoRepository.findOne({
        where: { id },
        relations: ['lote', 'sublotes']
      });

      if (!cultivo) throw new NotFoundException(`Cultivo no encontrado`);
      if (cultivo.Estado === 'Finalizado') throw new BadRequestException(`Este cultivo ya fue finalizado`);

      // 2. Crear el registro de Producción (Historial de lo que salió hoy)
      const produccion = new Produccion();
      produccion.cantidad = cantidad;
      produccion.cantidadOriginal = cantidad;
      produccion.fecha = new Date(fecha);
      produccion.estado = 'Cosechado';
      produccion.cultivo = cultivo;
      await queryRunner.manager.save(Produccion, produccion);

      // 3. Actualizar contadores del Cultivo
      cultivo.cantidad_cosechada = (cultivo.cantidad_cosechada || 0) + Number(cantidad);

      // --- LÓGICA DE ESTADOS ---

      if (esFinal) {
        // CASO: ÚLTIMA COSECHA (LIBERAR TODO)
        cultivo.Estado = 'Finalizado';
        cultivo.Fecha_Fin = new Date(fecha);

        // A. Liberar Sublotes (si tiene)
        if (cultivo.sublotes && cultivo.sublotes.length > 0) {
          for (const sub of cultivo.sublotes) {
            sub.cultivo = null;        // Romper relación
            sub.estado = 'Disponible'; // Estado libre
            await queryRunner.manager.save(Sublote, sub);
          }
        }

        // B. Liberar Lote Principal
        if (cultivo.lote) {
          // Verificamos si hay OTROS sublotes ocupados en este mismo lote por OTROS cultivos
          const ocupados = await this.subloteRepository.count({
            where: {
              lote: { id: cultivo.lote.id },
              estado: 'En cultivación',
              id: Not(In(cultivo.sublotes.map(s => s.id))) // Excluir los que acabamos de liberar
            }
          });

          // Si nadie más está usando el lote, se libera completo
          if (ocupados === 0) {
            const lote = cultivo.lote;
            lote.estado = 'En preparación'; // Listo para el siguiente ciclo
            await queryRunner.manager.save(Lote, lote);
          }
        }

      } else {
        // CASO: COSECHA PARCIAL (MANTENER OCUPADO)
        // El cultivo avanza de etapa, pero NO soltamos el terreno
        cultivo.Estado = 'En Cosecha';
      }

      await queryRunner.manager.save(Cultivo, cultivo);
      await queryRunner.commitTransaction();

      return cultivo;

    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async finalizarCultivo(id: number, fechaFin: string): Promise<Cultivo> {
    // Método simplificado que usa registrarCosecha con cantidad 0 y esFinal=true
    return await this.registrarCosecha(id, fechaFin, 0, true);
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