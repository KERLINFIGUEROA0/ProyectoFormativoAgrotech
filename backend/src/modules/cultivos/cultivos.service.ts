import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, In, Between } from 'typeorm';
import * as XLSX from 'xlsx';
import { Cultivo } from './entities/cultivo.entity';
import { CreateCultivoDto } from './dto/create-cultivo.dto';
import { UpdateCultivoDto } from './dto/update-cultivo.dto';
import { TipoCultivo } from '../tipo_cultivo/entities/tipo_cultivo.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { Sublote } from '../sublotes/entities/sublote.entity';
import { Produccion } from '../producciones/entities/produccione.entity';
import { Actividad } from '../actividades/entities/actividade.entity';
import { ActividadMaterial } from '../actividades_materiales/entities/actividades_materiale.entity';
import { Venta } from '../../common/enums/ventas/entities/venta.entity';
import { Gasto } from '../gastos_produccion/entities/gastos_produccion.entity';
import { Material } from '../materiales/entities/materiale.entity';

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
    @InjectRepository(Actividad)
    private readonly actividadRepository: Repository<Actividad>,
    @InjectRepository(ActividadMaterial)
    private readonly actividadMaterialRepository: Repository<ActividadMaterial>,
    @InjectRepository(Produccion)
    private readonly produccionRepository: Repository<Produccion>,
    @InjectRepository(Venta)
    private readonly ventaRepository: Repository<Venta>,
    @InjectRepository(Gasto)
    private readonly gastoRepository: Repository<Gasto>,
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
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

        // A. Liberar TODOS los sublotes asignados a este cultivo (incluyendo soft-deleted)
        const todosSublotesAsignados = await this.subloteRepository.find({
          where: { cultivo: { id: cultivo.id } },
          withDeleted: true, // Incluir sublotes eliminados que tuvieron este cultivo
          relations: ['lote']
        });

        if (todosSublotesAsignados.length > 0) {
          // Liberar todos los sublotes que estaban asignados a este cultivo
          for (const sub of todosSublotesAsignados) {
            sub.cultivo = null;        // Romper relación
            sub.estado = 'Disponible'; // Estado libre
            await queryRunner.manager.save(Sublote, sub);
          }
        }

        // B. Actualizar estado del lote después de liberar sublotes
        if (cultivo.lote) {
          // Usar la función auxiliar para actualizar el estado del lote
          // Esta función considera sublotes activos y cultivos directos en el lote
          await this.actualizarEstadoLote(cultivo.lote.id);
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

  // Función auxiliar para actualizar el estado del lote basado en sus sublotes ACTIVOS y cultivos asignados
  private async actualizarEstadoLote(loteId: number): Promise<void> {
    // Obtener todos los sublotes ACTIVOS del lote (excluye soft-deleted)
    const sublotesActivos = await this.subloteRepository.find({
      where: { lote: { id: loteId } },
      relations: ['cultivo']
    });

    // Verificar si hay cultivos activos asignados a los sublotes del lote
    const cultivosEnSublotes = sublotesActivos
      .filter(s => s.cultivo !== null && (s.cultivo.Estado === 'Activo' || s.cultivo.Estado === 'En Cosecha'))
      .length;

    // Verificar si hay cultivos asignados directamente al lote (sin sublotes)
    const cultivosDirectosEnLote = await this.cultivoRepository.count({
      where: {
        lote: { id: loteId },
        Estado: In(['Activo', 'En Cosecha']),
        sublotes: { id: IsNull() } // Cultivos sin sublotes asignados
      }
    });

    // Si no hay cultivos activos (ni en sublotes ni directos), el lote está en preparación
    if (cultivosEnSublotes === 0 && cultivosDirectosEnLote === 0) {
      await this.loteRepository.update(loteId, { estado: 'En preparación' });
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

      await this.loteRepository.update(loteId, { estado: nuevoEstado });
    } else {
      // No hay sublotes activos, pero hay cultivos directos
      const nuevoEstado = cultivosDirectosEnLote > 0 ? 'En cultivación' : 'En preparación';
      await this.loteRepository.update(loteId, { estado: nuevoEstado });
    }
  }

  async finalizarCultivo(id: number, fechaFin: string): Promise<Cultivo> {
    // Método simplificado que usa registrarCosecha con cantidad 0 y esFinal=true
    return await this.registrarCosecha(id, fechaFin, 0, true);
  }

  // Método para diagnosticar el estado actual de lotes y cultivos
  async diagnosticarEstadosLotes(): Promise<any> {
    const lotes = await this.loteRepository.find({
      relations: ['sublotes', 'sublotes.cultivo']
    });

    const diagnostico: any[] = [];

    for (const lote of lotes) {
      // Cultivos activos en sublotes
      const cultivosEnSublotes = lote.sublotes
        .filter(s => s.cultivo !== null && (s.cultivo.Estado === 'Activo' || s.cultivo.Estado === 'En Cosecha'));

      // Cultivos directos en el lote (consulta separada)
      const cultivosDirectosCount = await this.cultivoRepository.count({
        where: {
          lote: { id: lote.id },
          Estado: In(['Activo', 'En Cosecha']),
          sublotes: { id: IsNull() }
        }
      });

      // Sublotes con cultivos asignados
      const sublotesOcupados = lote.sublotes.filter(s => s.cultivo !== null);

      const estadoActual = lote.estado;
      let estadoCorrecto = 'En preparación';

      if (cultivosEnSublotes.length > 0 || cultivosDirectosCount > 0) {
        if (lote.sublotes.length > 0) {
          if (cultivosEnSublotes.length === lote.sublotes.length) {
            estadoCorrecto = 'En cultivación';
          } else {
            estadoCorrecto = 'Parcialmente ocupado';
          }
        } else {
          estadoCorrecto = 'En cultivación';
        }
      }

      diagnostico.push({
        loteId: lote.id,
        loteNombre: lote.nombre,
        estadoActual,
        estadoCorrecto,
        necesitaActualizacion: estadoActual !== estadoCorrecto,
        resumen: {
          sublotesTotales: lote.sublotes.length,
          sublotesOcupados: sublotesOcupados.length,
          cultivosEnSublotes: cultivosEnSublotes.length,
          cultivosDirectos: cultivosDirectosCount
        }
      });
    }

    return {
      totalLotes: lotes.length,
      lotesNecesitanActualizacion: diagnostico.filter((d: any) => d.necesitaActualizacion).length,
      diagnostico
    };
  }

  // Método para actualizar estados de lotes que podrían estar inconsistentes
  async actualizarEstadosLotes(): Promise<{ message: string, lotesActualizados: number }> {
    const diagnostico = await this.diagnosticarEstadosLotes();
    let actualizados = 0;

    for (const item of diagnostico.diagnostico) {
      if (item.necesitaActualizacion) {
        await this.loteRepository.update(item.loteId, { estado: item.estadoCorrecto });
        actualizados++;
      }
    }

    return {
      message: `Estados de lotes actualizados correctamente. ${actualizados} lotes corregidos.`,
      lotesActualizados: actualizados
    };
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

  // --- MÉTODOS AUXILIARES PARA CONSULTAS EFICIENTES ---

  async getActividadesWithMateriales(cultivoId: number, fechaInicio?: Date, fechaFin?: Date): Promise<Actividad[]> {
    const query = this.actividadRepository.createQueryBuilder('a')
      .leftJoin('a.cultivo', 'c')
      .where('c.id = :cultivoId', { cultivoId })
      .leftJoinAndSelect('a.actividadMaterial', 'am')
      .leftJoinAndSelect('am.material', 'm');

    if (fechaInicio && fechaFin) {
      query.andWhere('a.fecha BETWEEN :inicio AND :fin', { inicio: fechaInicio, fin: fechaFin });
    }

    const actividades = await query.orderBy('a.fecha', 'ASC').getMany();
    return actividades;
  }

  async getProduccionesWithVentasYGastos(cultivoId: number, fechaInicio?: Date, fechaFin?: Date): Promise<Produccion[]> {
    const query = this.produccionRepository.createQueryBuilder('p')
      .leftJoinAndSelect('p.ventas', 'v')
      .leftJoinAndSelect('p.gastos', 'g')
      .where('p.cultivoId = :cultivoId', { cultivoId });

    if (fechaInicio && fechaFin) {
      query.andWhere('p.fecha BETWEEN :fechaInicio AND :fechaFin', { fechaInicio, fechaFin });
    }

    return await query.orderBy('p.fecha', 'ASC').getMany();
  }

  async getGastosDirectos(cultivoId: number, fechaInicio?: Date, fechaFin?: Date): Promise<Gasto[]> {
    const query = this.gastoRepository.createQueryBuilder('g')
      .where('g.cultivoId = :cultivoId', { cultivoId });

    if (fechaInicio && fechaFin) {
      query.andWhere('g.fecha BETWEEN :fechaInicio AND :fechaFin', { fechaInicio, fechaFin });
    }

    return await query.orderBy('g.fecha', 'ASC').getMany();
  }


}
