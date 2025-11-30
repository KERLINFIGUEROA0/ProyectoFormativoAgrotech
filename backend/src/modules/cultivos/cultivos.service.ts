import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, In, EntityManager } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
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
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // Método auxiliar para limpiar caché de lotes
  private async clearLotesCache(loteId?: number) {
    await this.cacheManager.del('lotes_todos');
    await this.cacheManager.del('lotes_todos_alt');
    await this.cacheManager.del('lotes_estadisticas');
    if (loteId) {
      await this.cacheManager.del(`/lotes/${loteId}`);
    }
    console.log('Caché de lotes invalidada por cambios en cultivos');
  }

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

      // NUEVO: Limpiar caché para que se vea ocupado inmediatamente
      await this.clearLotesCache(lote.id);

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
    const updated = await this.cultivoRepository.save(cultivo);
    // Limpiar cache si se actualiza
    if(cultivo.lote) await this.clearLotesCache(cultivo.lote.id);
    return updated;
  }

  async eliminar(id: number): Promise<void> {
    const cultivo = await this.buscarPorId(id);
    const loteId = cultivo.lote?.id;
    await this.cultivoRepository.remove(cultivo);
    if(loteId) await this.clearLotesCache(loteId);
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
          // CORRECCIÓN: Pasamos queryRunner.manager como segundo argumento
          await this.actualizarEstadoLote(cultivo.lote.id, queryRunner.manager);
        }

      } else {
        // CASO: COSECHA PARCIAL (MANTENER OCUPADO)
        // El cultivo avanza de etapa, pero NO soltamos el terreno
        cultivo.Estado = 'En Cosecha';
      }

      await queryRunner.manager.save(Cultivo, cultivo);
      await queryRunner.commitTransaction();

      // NUEVO: Limpiar caché después de confirmar la transacción
      // Esto asegura que al listar lotes, aparezcan "Disponible" y sin el nombre del cultivo
      if (cultivo.lote) {
        await this.clearLotesCache(cultivo.lote.id);
      }

      return cultivo;

    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // Función auxiliar modificada para soportar transacciones
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
      // AQUÍ ESTÁ LA CLAVE: Usamos loteRepo que está conectado a la transacción
      await loteRepo.update(loteId, { estado: 'En preparación' });
      console.log(`Lote ${loteId} cambió a estado: En preparación (Transaccional)`);
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
        console.log(`Lote ${item.loteId} (${item.loteNombre}) actualizado: ${item.estadoActual} → ${item.estadoCorrecto}`);
      }
    }

    await this.clearLotesCache(); // Limpiar cache aquí también

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


}
