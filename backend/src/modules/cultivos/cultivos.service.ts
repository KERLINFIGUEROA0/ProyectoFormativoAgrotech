import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, In, EntityManager } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as ExcelJS from 'exceljs';
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
import { Pago } from '../pagos/entities/pago.entity';
import { AppWebSocketGateway } from '../../websocket/websocket.gateway';

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
    @InjectRepository(Produccion)
    private readonly produccionRepository: Repository<Produccion>,
    @InjectRepository(Gasto)
    private readonly gastoRepository: Repository<Gasto>,
    @InjectRepository(Pago)
    private readonly pagoRepository: Repository<Pago>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly webSocketGateway: AppWebSocketGateway,
  ) {}

  // Método auxiliar para limpiar caché de lotes
  private async clearLotesCache(loteId?: number) {
    await this.cacheManager.del('lotes_todos');
    await this.cacheManager.del('lotes_todos_alt');
    await this.cacheManager.del('lotes_estadisticas');
    if (loteId) {
      await this.cacheManager.del(`/lotes/${loteId}`);
    }
    console.log('🧹 Caché de lotes invalidada.');
  }

  async crear(dto: CreateCultivoDto): Promise<Cultivo> {
    const queryRunner = this.cultivoRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    // Variable para capturar el nuevo estado y enviarlo por WebSocket
    let nuevoEstadoNotificacion = '';

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

      // CORRECCIÓN: Crear fecha a mediodía en zona horaria local para evitar offset
      // dto.Fecha_Plantado viene como 'YYYY-MM-DD'
      if (!dto.Fecha_Plantado) {
        throw new BadRequestException('La fecha de plantado es requerida');
      }
      cultivo.Fecha_Plantado = new Date(dto.Fecha_Plantado);
      cultivo.descripcion = dto.descripcion || '';
      cultivo.Estado = dto.Estado || 'Activo';
      cultivo.img = dto.img || ''; // Asegurar que nunca sea null

      // Guardar el cultivo para obtener su ID
      const cultivoGuardado = await queryRunner.manager.save(Cultivo, cultivo);

      // 3. Lógica de asignación a sublotes
      if (dto.subloteId && dto.subloteId > 0) {
        // ASIGNACIÓN ESPECÍFICA: Solo a un sublote
        const sublote = await this.subloteRepository.findOne({
          where: { id: dto.subloteId },
          relations: ['lote', 'cultivo']
        });

        if (!sublote) throw new NotFoundException('Sublote no encontrado');
        if (sublote.lote.id !== lote.id) throw new BadRequestException('El sublote no pertenece al lote indicado');

        // VALIDACIÓN DE CONCURRENCIA: Verificar que el sublote específico no esté ocupado
        if (sublote.cultivo) {
          throw new BadRequestException(
            `No se puede asignar el cultivo al sublote "${sublote.nombre}". ` +
            `Este sublote ya tiene asignado el cultivo "${sublote.cultivo.nombre}". ` +
            `Finalice el cultivo existente o elija otro sublote.`
          );
        }

        // Asignar cultivo al sublote específico
        sublote.cultivo = cultivoGuardado;
        sublote.estado = 'En cultivación';
        await queryRunner.manager.save(Sublote, sublote);

        // Estado del lote: Parcialmente ocupado
        lote.estado = 'Parcialmente ocupado';
        await queryRunner.manager.save(Lote, lote);
        nuevoEstadoNotificacion = 'Parcialmente ocupado';

      } else {
        // ASIGNACIÓN MASIVA: A todos los sublotes del lote
        const todosSublotes = await this.subloteRepository.find({
          where: { lote: { id: lote.id } },
          relations: ['cultivo']
        });

        if (todosSublotes.length > 0) {
          // VALIDACIÓN DE CONCURRENCIA: Verificar que ningún sublote esté ocupado
          const sublotesOcupados = todosSublotes.filter(sub => sub.cultivo !== null);
          if (sublotesOcupados.length > 0) {
            const nombresOcupados = sublotesOcupados.map(sub => `"${sub.nombre}" (${sub.cultivo?.nombre})`).join(', ');
            throw new BadRequestException(
              `No se puede asignar el cultivo masivamente. Los siguientes sublotes ya están ocupados: ${nombresOcupados}. ` +
              `Finalice los cultivos existentes o use asignación específica a sublotes disponibles.`
            );
          }

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
        nuevoEstadoNotificacion = 'En cultivación';
      }

      await queryRunner.commitTransaction();

      // ============================================================
      // 🔥 EMITIR EVENTO WEBSOCKET PARA TIEMPO REAL
      // ============================================================

      // 1. Limpiar caché para que se vea ocupado inmediatamente
      await this.clearLotesCache(lote.id);

      // 2. Notificar a todos los clientes conectados (Tiempo Real)
      if (nuevoEstadoNotificacion) {
        this.webSocketGateway.emitLoteEstadoActualizado(lote.id, nuevoEstadoNotificacion);
        console.log(`🚀 WebSocket emitido: Lote ${lote.id} ahora está ${nuevoEstadoNotificacion}`);
      }

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
    cultivo.img = imgUrl || ''; // Asegurar que nunca sea null
    return this.cultivoRepository.save(cultivo);
  }

  async registrarCosecha(id: number, fecha: string, cantidad: number, esFinal: boolean): Promise<Cultivo> {
    const queryRunner = this.cultivoRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let loteId: number | null = null;
    let resultadoEstadoLote: { liberado: boolean, nuevoEstado?: string } | undefined;

    try {
      // 1. Obtener el cultivo con sus relaciones de terreno
      const cultivo = await this.cultivoRepository.findOne({
        where: { id },
        relations: ['lote', 'sublotes']
      });

      if (!cultivo) throw new NotFoundException(`Cultivo no encontrado`);
      if (cultivo.Estado === 'Finalizado') throw new BadRequestException(`Este cultivo ya fue finalizado`);

      loteId = cultivo.lote?.id || null;

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
        // A. Finalizar Cultivo PRIMERO para que la lógica de estado lo detecte como inactivo
        cultivo.Estado = 'Finalizado';
        cultivo.Fecha_Fin = new Date(fecha);
        await queryRunner.manager.save(Cultivo, cultivo); // Guardamos estado finalizado

        // B. Liberar Sublotes (Usando queryRunner para ver los cambios en la transacción)
        const sublotesAsignados = await queryRunner.manager.find(Sublote, {
          where: { cultivo: { id: cultivo.id } },
          relations: ['lote']
        });

        for (const sub of sublotesAsignados) {
          sub.cultivo = null;        // Romper relación
          sub.estado = 'Disponible'; // Liberar
          await queryRunner.manager.save(Sublote, sub);
        }

        // C. Actualizar estado del Lote (Ahora detectará que NO hay cultivos activos)
        if (loteId) {
          resultadoEstadoLote = await this.actualizarEstadoLote(loteId, queryRunner.manager);
        }

      } else {
        // CASO: COSECHA PARCIAL (MANTENER OCUPADO)
        cultivo.Estado = 'En Cosecha';
      }

      await queryRunner.manager.save(Cultivo, cultivo);
      await queryRunner.commitTransaction();

      // 🔥 IMPORTANTE: Emitir WebSocket FUERA de la transacción
      // Solo después de confirmar que todo se guardó correctamente
      if (esFinal && loteId && resultadoEstadoLote) {
        if (resultadoEstadoLote.liberado) {
          // Emitir evento de liberación del lote
          this.webSocketGateway.emitLoteLiberado(loteId);
        } else if (resultadoEstadoLote.nuevoEstado) {
          // Emitir evento de cambio de estado
          this.webSocketGateway.emitLoteEstadoActualizado(loteId, resultadoEstadoLote.nuevoEstado);
        }
      }

      // Limpiar caché después de confirmar la transacción
      if (loteId) {
        await this.clearLotesCache(loteId);
      }

      return cultivo;

    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // --- 🔥 MÉTODO BLINDADO: CALCULAR ESTADO DEL LOTE ---
  private async actualizarEstadoLote(loteId: number, manager?: EntityManager): Promise<{ liberado: boolean, nuevoEstado?: string }> {
    const loteRepo = manager ? manager.getRepository(Lote) : this.loteRepository;
    const cultivoRepo = manager ? manager.getRepository(Cultivo) : this.cultivoRepository;
    const subloteRepo = manager ? manager.getRepository(Sublote) : this.subloteRepository;

    console.log(`🔄 Recalculando estado para Lote ${loteId}...`);

    // 1. REGLA DE ORO: ¿Cuántos cultivos ACTIVOS quedan en este lote?
    // (Ignoramos los finalizados/cancelados)
    const totalCultivosActivos = await cultivoRepo.count({
      where: {
        lote: { id: loteId },
        Estado: In(['Activo', 'En Cosecha']) // Solo cuentan estos estados
      }
    });

    console.log(`📊 Cultivos activos en el lote: ${totalCultivosActivos}`);

    // CASO 1: Si NO hay cultivos activos, el lote ESTÁ LIBRE.
    if (totalCultivosActivos === 0) {
      await loteRepo.update(loteId, { estado: 'En preparación' });
      console.log(`✅ Lote ${loteId} liberado completamente: 'En preparación'`);
      return { liberado: true };
    }

    // CASO 2: Si hay cultivos activos, determinamos si es parcial o total
    // Verificamos cuántos sublotes tiene el lote en total
    const totalSublotes = await subloteRepo.count({ where: { lote: { id: loteId } } });

    // Verificamos cuántos sublotes están ocupados actualmente
    const sublotesOcupados = await subloteRepo.count({
      where: {
        lote: { id: loteId },
        estado: 'Ocupado'
      }
    });

    let nuevoEstado = 'Parcialmente ocupado';

    if (totalSublotes > 0 && sublotesOcupados === totalSublotes) {
      nuevoEstado = 'En cultivación'; // Lleno
    } else if (totalSublotes === 0 && totalCultivosActivos > 0) {
      nuevoEstado = 'En cultivación'; // Lleno (sin sublotes, uso directo)
    }

    await loteRepo.update(loteId, { estado: nuevoEstado });
    console.log(`ℹ️ Lote ${loteId} actualizado a: ${nuevoEstado}`);

    return { liberado: false, nuevoEstado };
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
      // Usar la misma lógica que actualizarEstadoLote: contar cultivos activos directamente
      const cultivosActivos = await this.cultivoRepository.count({
        where: {
          lote: { id: lote.id },
          Estado: In(['Activo', 'En Cosecha'])
        }
      });

      // Sublotes con cultivos asignados
      const sublotesOcupados = lote.sublotes.filter(s => s.cultivo !== null);

      const estadoActual = lote.estado;
      let estadoCorrecto = 'En preparación';

      if (cultivosActivos > 0) {
        if (lote.sublotes.length > 0) {
          const sublotesOcupadosCount = lote.sublotes.filter(s => s.estado === 'Ocupado').length;
          if (sublotesOcupadosCount === lote.sublotes.length) {
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
          cultivosEnSublotes: cultivosActivos,
          cultivosDirectos: 0 // En este sistema no hay cultivos directos, todos están asignados a sublotes
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

        // Emitir evento WebSocket para notificar el cambio
        if (item.estadoCorrecto === 'En preparación') {
          this.webSocketGateway.emitLoteLiberado(item.loteId);
        } else {
          this.webSocketGateway.emitLoteEstadoActualizado(item.loteId, item.estadoCorrecto);
        }

        actualizados++;
      }
    }

    await this.clearLotesCache(); // Limpiar cache aquí también

    return {
      message: `Estados de lotes actualizados correctamente. ${actualizados} lotes corregidos.`,
      lotesActualizados: actualizados
    };
  }

  // Función auxiliar para aplicar estilos a una hoja
  private applyWorksheetStyles(worksheet: ExcelJS.Worksheet, columnWidths: number[]) {
    // Estilos para encabezados (fila 1)
    worksheet.getRow(1).eachCell(cell => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF008000' } // Verde
      };
      cell.font = {
        color: { argb: 'FFFFFFFF' }, // Blanco
        bold: true
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Bordes para todas las celdas
    worksheet.eachRow(row => {
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Anchos de columna
    columnWidths.forEach((width, index) => {
      worksheet.getColumn(index + 1).width = width;
    });
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

    // Obtener gastos directos para cada cultivo
    const directGastosMap = new Map<number, Gasto[]>();
    for (const cultivo of cultivos) {
      const directGastos = await this.getGastosDirectos(cultivo.id);
      directGastosMap.set(cultivo.id, directGastos);
    }

  // Crear libro de Excel con múltiples hojas
  const workbook = new ExcelJS.Workbook();



    // 1. Hoja de Resumen General
    const resumenGeneral = cultivos.map(cultivo => {
      const totalVentas = cultivo.producciones
        .flatMap(p => p.ventas)
        .reduce((sum, v) => sum + (Number(v.valorTotalVenta) || 0), 0);

      const directGastos = directGastosMap.get(cultivo.id) || [];
      const totalDirectGastos = directGastos.reduce((sum, g) => sum + (Number(g.monto) || 0), 0);
      const totalGastos = cultivo.producciones
        .flatMap(p => p.gastos)
        .reduce((sum, g) => sum + (Number(g.monto) || 0), 0) + totalDirectGastos;

      const cantidadTotalVendida = cultivo.producciones
        .flatMap(p => p.ventas)
        .reduce((sum, v) => sum + (Number(v.cantidadVenta) || 0), 0);

      const cantidadTotalProducida = cultivo.producciones
        .reduce((sum, p) => sum + (Number(p.cantidadOriginal) || Number(p.cantidad) || 0), 0);

      return {
        'ID Cultivo': cultivo.id,
        'Nombre del Cultivo': cultivo.nombre,
        'Tipo de Cultivo': cultivo.tipoCultivo.nombre,
        'Fecha de Plantado': cultivo.Fecha_Plantado || '',
        'Estado': cultivo.Estado,
        'Cantidad Total Producida': cantidadTotalProducida,
        'Cantidad Total Vendida': cantidadTotalVendida,
        'Cantidad Disponible': cantidadTotalProducida - cantidadTotalVendida,
        'Total Ventas ($)': totalVentas.toLocaleString('es-CO'),
        'Total Gastos ($)': totalGastos.toLocaleString('es-CO'),
        'Ganancia Neta ($)': (totalVentas - totalGastos).toLocaleString('es-CO')
      };
    });

    const resumenSheet = workbook.addWorksheet('Resumen General');
    if (resumenGeneral.length > 0) {
      resumenSheet.addRow(Object.keys(resumenGeneral[0]));
      resumenGeneral.forEach(item => resumenSheet.addRow(Object.values(item)));
    }
    this.applyWorksheetStyles(resumenSheet, [10, 25, 20, 15, 12, 20, 18, 18, 15, 15, 15]);

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

    const produccionesSheet = workbook.addWorksheet('Producciones');
    if (produccionesData.length > 0) {
      produccionesSheet.addRow(Object.keys(produccionesData[0]));
      produccionesData.forEach(item => produccionesSheet.addRow(Object.values(item)));
    }
    this.applyWorksheetStyles(produccionesSheet, [10, 20, 15, 12, 18, 18, 18, 15, 15, 15, 12]);

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

    const ventasSheet = workbook.addWorksheet('Ventas');
    if (ventasData.length > 0) {
      ventasSheet.addRow(Object.keys(ventasData[0]));
      ventasData.forEach(item => ventasSheet.addRow(Object.values(item)));
    }
    this.applyWorksheetStyles(ventasSheet, [10, 20, 15, 10, 12, 35, 12, 18, 15, 18]);

    // 4. Hoja de Gastos
    const gastosData: any[] = cultivos.flatMap(cultivo => {
      const directGastos = directGastosMap.get(cultivo.id) || [];
      const prodGastos = cultivo.producciones.flatMap(p =>
        p.gastos.map(g => ({
          'ID Cultivo': cultivo.id,
          'Nombre Cultivo': cultivo.nombre,
          'ID Producción': p.id.toString(),
          'ID Gasto': g.id,
          'Fecha': new Date(g.fecha).toLocaleDateString('es-CO'),
          'Descripción': g.descripcion,
          'Monto ($)': Number(g.monto).toLocaleString('es-CO'),
          'Estado Producción': p.estado
        }))
      );
      const dirGastos = directGastos.map(g => ({
        'ID Cultivo': cultivo.id,
        'Nombre Cultivo': cultivo.nombre,
        'ID Producción': 'Directo',
        'ID Gasto': g.id,
        'Fecha': new Date(g.fecha).toLocaleDateString('es-CO'),
        'Descripción': g.descripcion,
        'Monto ($)': Number(g.monto).toLocaleString('es-CO'),
        'Estado Producción': 'Directo'
      }));
      return [...prodGastos, ...dirGastos];
    }).sort((a, b) => new Date(b.Fecha).getTime() - new Date(a.Fecha).getTime());

    const gastosSheet = workbook.addWorksheet('Gastos');
    if (gastosData.length > 0) {
      gastosSheet.addRow(Object.keys(gastosData[0]));
      gastosData.forEach(item => gastosSheet.addRow(Object.values(item)));
    }
    this.applyWorksheetStyles(gastosSheet, [10, 20, 15, 10, 12, 35, 15, 18]);

    // Generar el archivo Excel
    const excelBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(excelBuffer);
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

    // Obtener gastos directos
    const directGastos = await this.getGastosDirectos(id);

  // Crear libro de Excel con múltiples hojas
  const workbook = new ExcelJS.Workbook();


    // Calcular totales y estadísticas
    const totalVentas = cultivo.producciones
      .flatMap(p => p.ventas)
      .reduce((sum, v) => sum + (Number(v.valorTotalVenta) || 0), 0);

    const totalDirectGastos = directGastos.reduce((sum, g) => sum + (Number(g.monto) || 0), 0);
    const totalGastos = cultivo.producciones
      .flatMap(p => p.gastos)
      .reduce((sum, g) => sum + (Number(g.monto) || 0), 0) + totalDirectGastos;

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
    const cultivoSheet = workbook.addWorksheet('Información General');
    cultivoSheet.addRow(Object.keys(cultivoInfo[0]));
    cultivoInfo.forEach(item => cultivoSheet.addRow(Object.values(item)));
    this.applyWorksheetStyles(cultivoSheet, [25, 20, 15, 12, 20, 18, 18, 15, 15, 15, 40]);

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
    const produccionesSheet = workbook.addWorksheet('Producciones');
    if (produccionesData.length > 0) {
      produccionesSheet.addRow(Object.keys(produccionesData[0]));
      produccionesData.forEach(item => produccionesSheet.addRow(Object.values(item)));
    }
    this.applyWorksheetStyles(produccionesSheet, [15, 12, 18, 18, 18, 15, 15, 15, 12]);

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
    const ventasSheet = workbook.addWorksheet('Ventas');
    if (ventasData.length > 0) {
      ventasSheet.addRow(Object.keys(ventasData[0]));
      ventasData.forEach(item => ventasSheet.addRow(Object.values(item)));
    }
    this.applyWorksheetStyles(ventasSheet, [10, 15, 12, 35, 12, 18, 15, 18]);

    // 4. Hoja de Gastos
    const gastosData: any[] = cultivo.producciones
      .flatMap(p => p.gastos.map(g => ({
        'ID Gasto': g.id,
        'ID Producción': p.id.toString(),
        'Fecha': new Date(g.fecha).toLocaleDateString('es-CO'),
        'Descripción': g.descripcion,
        'Monto ($)': Number(g.monto).toLocaleString('es-CO'),
        'Estado Producción': p.estado
      })))
      .concat(directGastos.map(g => ({
        'ID Gasto': g.id,
        'ID Producción': 'Directo',
        'Fecha': new Date(g.fecha).toLocaleDateString('es-CO'),
        'Descripción': g.descripcion,
        'Monto ($)': Number(g.monto).toLocaleString('es-CO'),
        'Estado Producción': 'Directo'
      })))
      .sort((a, b) => new Date(b.Fecha).getTime() - new Date(a.Fecha).getTime());
    const gastosSheet = workbook.addWorksheet('Gastos');
    if (gastosData.length > 0) {
      gastosSheet.addRow(Object.keys(gastosData[0]));
      gastosData.forEach(item => gastosSheet.addRow(Object.values(item)));
    }
    this.applyWorksheetStyles(gastosSheet, [10, 15, 12, 35, 15, 18]);

    // Generar el archivo Excel
    const excelBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(excelBuffer);
  }

  // --- MÉTODOS AUXILIARES PARA CONSULTAS EFICIENTES ---

  async getActividadesWithMateriales(cultivoId: number, fechaInicio?: string, fechaFin?: string): Promise<Actividad[]> {
    const query = this.actividadRepository.createQueryBuilder('a')
      .leftJoin('a.cultivo', 'c')
      .where('c.id = :cultivoId', { cultivoId })
      .leftJoinAndSelect('a.actividadMaterial', 'am')
      .leftJoinAndSelect('am.material', 'm');

    if (fechaInicio && fechaFin) {
      query.andWhere('a.fecha BETWEEN :inicio AND :fin', { inicio: new Date(fechaInicio), fin: new Date(fechaFin + 'T23:59:59.999') });
    }

    const actividades = await query.orderBy('a.fecha', 'ASC').getMany();
    return actividades;
  }

  async getProduccionesWithVentasYGastos(cultivoId: number, fechaInicio?: string, fechaFin?: string): Promise<Produccion[]> {
    const query = this.produccionRepository.createQueryBuilder('p')
      .leftJoinAndSelect('p.ventas', 'v')
      .leftJoinAndSelect('p.gastos', 'g')
      .where('p.cultivoId = :cultivoId', { cultivoId });

    if (fechaInicio && fechaFin) {
      query.andWhere('p.fecha BETWEEN :fechaInicio AND :fechaFin', { fechaInicio: new Date(fechaInicio), fechaFin: new Date(fechaFin + 'T23:59:59.999') });
    }

    return await query.orderBy('p.fecha', 'ASC').getMany();
  }

  async getGastosDirectos(cultivoId: number, fechaInicio?: string, fechaFin?: string): Promise<Gasto[]> {
    const query = this.gastoRepository.createQueryBuilder('g')
      .where('g.cultivoId = :cultivoId', { cultivoId });

    if (fechaInicio && fechaFin) {
      query.andWhere('g.fecha BETWEEN :fechaInicio AND :fechaFin', { fechaInicio: new Date(fechaInicio), fechaFin: new Date(fechaFin + 'T23:59:59.999') });
    }

    return await query.orderBy('g.fecha', 'ASC').getMany();
  }


}
