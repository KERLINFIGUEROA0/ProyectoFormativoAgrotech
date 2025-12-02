import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource, Like } from 'typeorm';
import { Actividad } from './entities/actividade.entity';
import { CreateActividadDto } from './dto/create-actividade.dto';
import { UpdateActividadDto } from './dto/update-actividade.dto';
import { SearchActividadDto } from './dto/search-actividad.dto';
import { AsignarActividadDto } from './dto/asignar-actividad.dto';
import { DevolverMaterialesFinalDto } from './dto/devolver-materiales-final.dto';
import { CalificarActividadDto } from './dto/calificar-actividad.dto';
import { CreateRespuestaDto, CalificarRespuestaDto } from './dto/create-respuesta.dto';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Cultivo } from '../cultivos/entities/cultivo.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { Sublote } from '../sublotes/entities/sublote.entity';
import { Material } from '../materiales/entities/materiale.entity';
import { ActividadMaterial } from '../actividades_materiales/entities/actividades_materiale.entity';
import { RespuestaActividad } from './entities/respuesta_actividad.entity';
import { ActividadUsuario } from './entities/actividad_usuario.entity';
import { Gasto } from '../gastos_produccion/entities/gastos_produccion.entity';
import { TipoMovimiento } from '../../common/enums/tipo-movimiento.enum';
import { TipoConsumo } from '../../common/enums/tipo-consumo.enum';
import { UnidadMedida } from '../../common/enums/unidad-medida.enum';
import { UnitConversionUtil } from '../../common/utils/unit-conversion.util';
import { MovimientosService } from '../../movimientos/movimientos.service';
import { DateUtil } from '../../common/utils/date.util';
import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ActividadesService {
  constructor(
     private readonly dataSource: DataSource,
     @InjectRepository(Material)
     private readonly materialRepository: Repository<Material>,
     @InjectRepository(ActividadMaterial)
     private readonly actMaterialRepository: Repository<ActividadMaterial>,
     @InjectRepository(Actividad)
     private readonly actividadRepository: Repository<Actividad>,
     @InjectRepository(Usuario)
     private readonly usuarioRepository: Repository<Usuario>,
     @InjectRepository(Cultivo)
     private readonly cultivoRepository: Repository<Cultivo>,
     @InjectRepository(Lote)
     private readonly loteRepository: Repository<Lote>,
     @InjectRepository(Sublote)
     private readonly subloteRepository: Repository<Sublote>,
     @InjectRepository(RespuestaActividad)
     private readonly respuestaRepository: Repository<RespuestaActividad>,
     @InjectRepository(ActividadUsuario)
     private readonly actividadUsuarioRepository: Repository<ActividadUsuario>,
     private readonly movimientosService: MovimientosService,
   ) { }

  // --- FUNCIÓN HELPER PARA ELIMINAR ARCHIVOS FÍSICOS ---
  private eliminarArchivosFisicos(archivosJson: string) {
    try {
      const archivos = JSON.parse(archivosJson);
      if (Array.isArray(archivos)) {
        archivos.forEach(filename => {
          const filePath = path.resolve(process.cwd(), 'temp-uploads', 'actividades', filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });
      }
    } catch (error) {
      console.error('Error al eliminar archivos físicos:', error);
    }
  }

  // --- FUNCIÓN HELPER PARA VERIFICAR ESTADO DE LA ACTIVIDAD ---
    private async verificarEstadoActividad(actividad: Actividad) {
      console.log('🔍 verificando estado actividad:', actividad.id, 'estado actual:', actividad.estado);

      if (!actividad.asignados) {
        console.log('❌ No hay asignados');
        return;
      }

      try {
        const asignados = JSON.parse(actividad.asignados);
        console.log('👥 Asignados:', asignados);

        if (!Array.isArray(asignados) || asignados.length === 0) {
          console.log('❌ Asignados vacío o no array');
          return;
        }

        // Obtener todas las respuestas de la actividad
        const respuestas = await this.respuestaRepository.find({
          where: { actividad: { id: actividad.id } },
          relations: ['usuario'],
        });

        console.log('📝 Respuestas encontradas:', respuestas.length);

        // Contar respuestas únicas por usuario
        const usuariosQueRespondieron = new Set(respuestas.map(r => r.usuario.identificacion));
        console.log('👤 Usuarios que respondieron:', Array.from(usuariosQueRespondieron));

        // Si hay al menos una respuesta, cambiar a 'en proceso'
        if (usuariosQueRespondieron.size > 0) {
          // Si no todos han respondido, estado 'en proceso'
          if (usuariosQueRespondieron.size < asignados.length) {
            actividad.estado = 'en proceso';
            console.log('🔄 Estado: en proceso (no todos respondieron)');
          } else {
            // Todos han respondido, verificar si todas están calificadas
            const todasCalificadas = respuestas.every(r => r.estado !== 'pendiente');
            console.log('✅ Todas calificadas:', todasCalificadas);

            if (todasCalificadas) {
              const todasAprobadas = respuestas.every(r => r.estado === 'aprobado');
              console.log('🎯 Todas aprobadas:', todasAprobadas);

              actividad.estado = todasAprobadas ? 'completado' : 'en proceso'; // Si hay rechazos, mantener 'en proceso'
              console.log('🏁 Estado final:', actividad.estado);
            } else {
              actividad.estado = 'en proceso'; // Todos respondieron, esperando calificación
              console.log('⏳ Estado: en proceso (esperando calificación)');
            }
          }
        } else {
          // No hay respuestas, mantener pendiente
          actividad.estado = 'pendiente';
          console.log('📋 Estado: pendiente (sin respuestas)');
        }

        await this.actividadRepository.save(actividad);
        console.log('💾 Actividad guardada con estado:', actividad.estado);
      } catch (error) {
        console.error('❌ Error al verificar estado de actividad:', error);
      }
    }

  // --- LÓGICA DE STOCK UNIFICADO ---
  private descontarMaterial(material: Material, cantidadUsada: number): { success: boolean, debeRegistrarEgreso: boolean } {
    if (material.tipoConsumo === TipoConsumo.NO_CONSUMIBLE) {
      if (!material.usosTotales) {
        return { success: true, debeRegistrarEgreso: false };
      }
      material.usosActuales = Number(material.usosActuales) + cantidadUsada;
      return { success: true, debeRegistrarEgreso: true };
    }

    if (Number(material.cantidad) < cantidadUsada) {
      return { success: false, debeRegistrarEgreso: false };
    }

    material.cantidad = Number(material.cantidad) - cantidadUsada;
    return { success: true, debeRegistrarEgreso: true };
  }

  private revertirDescontarMaterial(material: Material, cantidadDevuelta: number) {
    if (material.tipoConsumo === TipoConsumo.NO_CONSUMIBLE) {
      if (!material.usosTotales) return;
      material.usosActuales -= cantidadDevuelta;
      while (material.usosActuales < 0 && material.cantidad > 0) {
        material.usosActuales += material.usosTotales;
        material.cantidad += 1;
      }
      return;
    }
    material.cantidad = Number(material.cantidad) + cantidadDevuelta;
  }

  // --- MÉTODO CREATE ACTUALIZADO PARA CALCULAR GASTOS EXACTOS ---
  async create(dto: CreateActividadDto, usuarioIdentificacion: number) {
    const { materiales, cultivo: cultivoId, horas, tarifaHora, ...dtoActividad } = dto;

    let cultivoEntidad: Cultivo | null = null;
    if (cultivoId) {
      cultivoEntidad = await this.cultivoRepository.findOneBy({ id: cultivoId });
      if (!cultivoEntidad) {
        throw new NotFoundException(`El cultivo con ID ${cultivoId} no existe.`);
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const gastoRepo = queryRunner.manager.getRepository(Gasto);

      const usuario = await queryRunner.manager.findOne(Usuario, {
        where: { identificacion: usuarioIdentificacion },
        select: ['nombre', 'apellidos'],
      });
      const nombreUsuario = `${usuario?.nombre || 'Usuario'} ${usuario?.apellidos || ''}`.trim();

      const actividad = this.actividadRepository.create({
        ...dtoActividad,
        horas,
        tarifaHora,
        usuario: { identificacion: usuarioIdentificacion },
        cultivo: cultivoEntidad ?? undefined,
        estado: dto.estado || 'pendiente',
      });
      const saved = await queryRunner.manager.save(actividad);

      // --- LÓGICA DE MATERIALES Y GASTOS ---
      if (materiales && materiales.length > 0) {
        for (const item of materiales) {
          const { materialId, cantidadUsada, unidadMedida } = item;
          
          // 1. Obtener material
          const material = await queryRunner.manager.findOne(Material, { where: { id: materialId } });
          if (!material) throw new NotFoundException(`El material con ID ${materialId} no existe.`);

          // 2. Determinar unidad base y conversión
          const unidadUsada = (unidadMedida as UnidadMedida) || UnidadMedida.UNIDAD;
          let unidadBaseMaterial = material.unidadBase;
          if (!unidadBaseMaterial) {
            unidadBaseMaterial = UnitConversionUtil.obtenerUnidadBase(
              material.tipoConsumo === TipoConsumo.CONSUMIBLE ? 'consumible' : 'no_consumible',
              material.medidasDeContenido
            );
          }

          let cantidadEnUnidadBase: number;
          // Verificar conversión especial para empaques (ej. 1 bulto = 50kg)
          if (UnitConversionUtil.esUnidadEmpaque(unidadUsada) &&
              (unidadBaseMaterial === UnidadMedida.KILOGRAMO || unidadBaseMaterial === UnidadMedida.LITRO || unidadBaseMaterial === UnidadMedida.GRAMO || unidadBaseMaterial === UnidadMedida.MILILITRO)) {
            const contenidoDelEmpaque = Number(material.pesoPorUnidad) || 1;
            cantidadEnUnidadBase = cantidadUsada * contenidoDelEmpaque;
          } else {
            cantidadEnUnidadBase = UnitConversionUtil.convertirABase(cantidadUsada, unidadUsada);
          }

          // 3. Descontar Stock
          const resultado = this.descontarMaterial(material, cantidadEnUnidadBase);
          if (!resultado.success) {
            throw new BadRequestException(`Stock insuficiente para ${material.nombre}.`);
          }
          await queryRunner.manager.save(material);

          // 4. Calcular COSTO EXACTO (Fórmula del PDF)
          let costoTotal = 0;
          let precioUnitarioCalculado = 0; // Variable para el precio unitario

          if (material.tipoConsumo === TipoConsumo.CONSUMIBLE) {
            const precioMaterial = Number(material.precio) || 0; // Precio del bulto/envase completo
            const pesoPorUnidad = Number(material.pesoPorUnidad) || 1; // Contenido del bulto (ej. 50kg)

            // A. Precio por unidad base (ej: precio por gramo o ml)
            const precioPorUnidadBase = precioMaterial / pesoPorUnidad;

            // B. Costo Total = PrecioBase * CantidadTotalBase
            costoTotal = precioPorUnidadBase * cantidadEnUnidadBase;

            // C. Precio Unitario para Mostrar (Ej: Precio por 1 Kg o por 1 Litro según lo que eligió el usuario)
            // Fórmula: Costo Total / Cantidad que ingresó el usuario
            precioUnitarioCalculado = cantidadUsada > 0 ? costoTotal / cantidadUsada : 0;

          } else {
            // Herramientas (Costo por uso si aplica, o 0)
            costoTotal = 0;
            precioUnitarioCalculado = 0;
          }

          // 5. Guardar relación Actividad-Material con el costo calculado
          const nuevaUnion = this.actMaterialRepository.create({
            actividad: saved,
            material: material,
            cantidadUsada: cantidadUsada,
            unidadMedida: unidadUsada,
            cantidadUsadaBase: cantidadEnUnidadBase,
            costo: costoTotal // Guardamos el costo histórico calculado
          });
          await queryRunner.manager.save(nuevaUnion);

          await this.movimientosService.registrarMovimiento(
            TipoMovimiento.EGRESO,
            cantidadEnUnidadBase,
            material.id,
            `Uso en actividad: ${saved.titulo}`,
            `actividad-${saved.id}`
          );

          // 6. CREAR REGISTRO EN GASTOS (TRANSACCIONES) AUTOMÁTICAMENTE
          if (costoTotal > 0) {
            const nuevoGasto = gastoRepo.create({
              // La descripción queda como respaldo textual
              descripcion: `Insumo: ${material.nombre} - ${cantidadUsada} ${unidadUsada} (Act: ${saved.titulo})`,

              monto: parseFloat(costoTotal.toFixed(2)), // TOTAL COSTO
              fecha: saved.fecha,
              tipo: TipoMovimiento.EGRESO,
              cultivo: cultivoEntidad ?? undefined,

              // ✅ AQUÍ GUARDAMOS EL DESGLOSE PARA FINANZAS
              cantidad: cantidadUsada,                // Ej: 100
              unidad: unidadUsada,                    // Ej: kg
              precioUnitario: parseFloat(precioUnitarioCalculado.toFixed(2)) // Ej: 1000
            });
            await queryRunner.manager.save(nuevoGasto);
          }
        }
      }

      // --- REGISTRO DE GASTO MANO DE OBRA ---
      const costoManoDeObra = (Number(horas) || 0) * (Number(tarifaHora) || 0);
      if (costoManoDeObra > 0) {
        const nuevoGasto = gastoRepo.create({
          descripcion: `Mano de obra: ${nombreUsuario} (Act: ${saved.titulo})`,
          monto: parseFloat(costoManoDeObra.toFixed(2)),
          fecha: saved.fecha,
          tipo: TipoMovimiento.EGRESO,
          cultivo: cultivoEntidad ?? undefined,
        });
        await queryRunner.manager.save(nuevoGasto);
      }

      await queryRunner.commitTransaction();
      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ... (findAll, findOne se mantienen igual) ...
  async findAll(userIdentificacion?: number) {
    if (!userIdentificacion) return [];
    const user = await this.usuarioRepository.findOne({
      where: { identificacion: userIdentificacion },
      relations: ['tipoUsuario'],
    });
    const userRole = user?.tipoUsuario?.nombre;

    const query = this.actividadRepository.createQueryBuilder('actividad')
      .leftJoinAndSelect('actividad.cultivo', 'cultivo')
      .leftJoinAndSelect('actividad.lote', 'lote')
      .leftJoinAndSelect('actividad.sublote', 'sublote')
      .leftJoinAndSelect('actividad.responsable', 'responsable')
      .leftJoinAndSelect('actividad.actividadMaterial', 'actividadMaterial')
      .leftJoinAndSelect('actividadMaterial.material', 'material')
      .leftJoinAndSelect('actividad.respuestas', 'respuestas')
      .leftJoinAndSelect('respuestas.usuario', 'usuarioRespuesta')
      .leftJoinAndSelect('usuarioRespuesta.ficha', 'fichaUsuario')
      .addSelect('actividad.asignados');

    if (userRole && (userRole.toLowerCase() === 'instructor' || userRole.toLowerCase() === 'admin')) {
      return query.getMany();
    } else {
      const actividades = await query.getMany();
      const nombreCompleto = `${user?.nombre || ''} ${user?.apellidos || ''}`.trim();
      return actividades.filter(actividad => {
        if (!actividad.asignados) return false;
        try {
          const asignados = JSON.parse(actividad.asignados);
          return asignados.includes(nombreCompleto);
        } catch {
          return false;
        }
      });
    }
  }

  async findOne(id: number) {
    return this.actividadRepository.findOne({
      where: { id },
      relations: [
        'usuario',
        'usuario.ficha',
        'cultivo',
        'lote',
        'sublote',
        'responsable',
        'actividadMaterial',
        'actividadMaterial.material',
      ],
      select: ['id', 'titulo', 'fecha', 'descripcion', 'img', 'archivoInicial', 'estado', 'horas', 'tarifaHora', 'asignados', 'respuestaTexto', 'respuestaArchivos', 'calificacion', 'comentarioInstructor'],
    });
  }

  // --- MÉTODO UPDATE ACTUALIZADO ---
  async update(id: number, dto: UpdateActividadDto) {
    const { materiales, cultivo: cultivoId, horas, tarifaHora, ...dtoActividad } = dto;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const actividad = await queryRunner.manager.findOne(Actividad, {
        where: { id },
        relations: ['actividadMaterial', 'actividadMaterial.material', 'cultivo', 'usuario'],
      });
      if (!actividad) throw new NotFoundException(`Actividad con ID ${id} no encontrada.`);

      const gastoRepo = queryRunner.manager.getRepository(Gasto);
      const materialRepo = queryRunner.manager.getRepository(Material);
      const actMaterialRepo = queryRunner.manager.getRepository(ActividadMaterial);
      const nombreUsuario = `${actividad.usuario?.nombre || 'Usuario'} ${actividad.usuario?.apellidos || ''}`.trim();

      // 1. REVERTIR MATERIALES AL STOCK (Devolución antes de recalcular)
      if (actividad.actividadMaterial && actividad.actividadMaterial.length > 0) {
        for (const am of actividad.actividadMaterial) {
          const material = await materialRepo.findOneBy({ id: am.material.id });
          if (material) {
            this.revertirDescontarMaterial(material, am.cantidadUsadaBase || 0);
            await queryRunner.manager.save(material);
          }
          await queryRunner.manager.remove(am);
        }
      }

      // 2. BORRAR GASTOS ANTIGUOS DE ESTA ACTIVIDAD PARA RECALCULARLOS
      // Se borran gastos que tengan el título de la actividad en la descripción
      if (actividad.cultivo) {
        await gastoRepo.delete({
          cultivo: { id: actividad.cultivo.id },
          descripcion: Like(`%(Act: ${actividad.titulo})%`)
        });
      }

      // 3. ACTUALIZAR DATOS BÁSICOS DE ACTIVIDAD
      let cultivoEntidad: Cultivo | null = actividad.cultivo;
      if (cultivoId) {
        cultivoEntidad = await queryRunner.manager.findOne(Cultivo, { where: { id: cultivoId } });
        if (!cultivoEntidad) throw new NotFoundException(`El cultivo con ID ${cultivoId} no existe.`);
      }
      Object.assign(actividad, dtoActividad);
      actividad.cultivo = cultivoEntidad;
      actividad.horas = horas;
      actividad.tarifaHora = tarifaHora;

      const saved = await queryRunner.manager.save(actividad);

      // 4. REGISTRAR NUEVOS MATERIALES Y GASTOS (Misma lógica de cálculo que Create)
      if (materiales && materiales.length > 0) {
        for (const item of materiales) {
          const { materialId, cantidadUsada, unidadMedida } = item;
          const material = await materialRepo.findOne({ where: { id: materialId } });
          if (!material) throw new NotFoundException(`El material con ID ${materialId} no existe.`);

          const unidadUsada = (unidadMedida as UnidadMedida) || UnidadMedida.UNIDAD;
          let unidadBaseMaterial = material.unidadBase;
          if (!unidadBaseMaterial) {
            unidadBaseMaterial = UnitConversionUtil.obtenerUnidadBase(
              material.tipoConsumo === TipoConsumo.CONSUMIBLE ? 'consumible' : 'no_consumible',
              material.medidasDeContenido
            );
          }

          let cantidadEnUnidadBase: number;
          if (UnitConversionUtil.esUnidadEmpaque(unidadUsada) &&
              (unidadBaseMaterial === UnidadMedida.KILOGRAMO || unidadBaseMaterial === UnidadMedida.LITRO || unidadBaseMaterial === UnidadMedida.GRAMO || unidadBaseMaterial === UnidadMedida.MILILITRO)) {
            const contenidoDelEmpaque = Number(material.pesoPorUnidad) || 1;
            cantidadEnUnidadBase = cantidadUsada * contenidoDelEmpaque;
          } else {
            cantidadEnUnidadBase = UnitConversionUtil.convertirABase(cantidadUsada, unidadUsada);
          }

          const resultado = this.descontarMaterial(material, cantidadEnUnidadBase);
          if (!resultado.success) throw new BadRequestException(`Stock insuficiente para ${material.nombre}.`);
          await queryRunner.manager.save(material);

          // CÁLCULO DE COSTO EXACTO
          let costoTotal = 0;
          let precioUnitarioCalculado = 0; // Variable para el precio unitario

          if (material.tipoConsumo === TipoConsumo.CONSUMIBLE) {
            const precioMaterial = Number(material.precio) || 0;
            const pesoPorUnidad = Number(material.pesoPorUnidad) || 1;

            // A. Precio por unidad base
            const precioPorUnidadBase = precioMaterial / pesoPorUnidad;

            // B. Costo Total = PrecioBase * CantidadTotalBase
            costoTotal = precioPorUnidadBase * cantidadEnUnidadBase;

            // C. Precio Unitario para Mostrar
            precioUnitarioCalculado = cantidadUsada > 0 ? costoTotal / cantidadUsada : 0;

          } else {
            // Herramientas
            costoTotal = 0;
            precioUnitarioCalculado = 0;
          }

          const nuevaUnion = actMaterialRepo.create({
            actividad: saved,
            material: material,
            cantidadUsada: cantidadUsada,
            unidadMedida: unidadUsada,
            cantidadUsadaBase: cantidadEnUnidadBase,
            costo: costoTotal
          });
          await queryRunner.manager.save(nuevaUnion);

          await this.movimientosService.registrarMovimiento(
            TipoMovimiento.EGRESO,
            cantidadEnUnidadBase,
            material.id,
            `Uso en actividad: ${saved.titulo}`,
            `actividad-${saved.id}`
          );

          if (costoTotal > 0) {
            const nuevoGasto = gastoRepo.create({
              descripcion: `Insumo: ${material.nombre} - ${cantidadUsada} ${unidadUsada} (Act: ${saved.titulo})`,
              monto: parseFloat(costoTotal.toFixed(2)),
              fecha: saved.fecha,
              tipo: TipoMovimiento.EGRESO,
              cultivo: cultivoEntidad ?? undefined,

              // ✅ AQUÍ GUARDAMOS EL DESGLOSE PARA FINANZAS
              cantidad: cantidadUsada,
              unidad: unidadUsada,
              precioUnitario: parseFloat(precioUnitarioCalculado.toFixed(2))
            });
            await queryRunner.manager.save(nuevoGasto);
          }
        }
      }

      // 5. REGISTRAR NUEVO GASTO MANO DE OBRA
      const costoManoDeObra = (Number(horas) || 0) * (Number(tarifaHora) || 0);
      if (costoManoDeObra > 0) {
        const nuevoGasto = gastoRepo.create({
          descripcion: `Mano de obra: ${nombreUsuario} (Act: ${saved.titulo})`,
          monto: parseFloat(costoManoDeObra.toFixed(2)),
          fecha: saved.fecha,
          tipo: TipoMovimiento.EGRESO,
          cultivo: cultivoEntidad ?? undefined,
        });
        await queryRunner.manager.save(nuevoGasto);
      }

      await queryRunner.commitTransaction();
      return this.findOne(id);

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ... (remove, search y otros métodos se mantienen igual)
  async remove(id: number) {
    const actividad = await this.findOne(id);
    if (!actividad) return { message: 'Actividad no encontrada' };
    await this.actividadRepository.delete(id);
    return { message: 'Actividad eliminada correctamente' };
  }

  async search(dto: SearchActividadDto) {
    // Implementación de búsqueda existente...
  }

  async enviarRespuesta(id: number, dto: CreateRespuestaDto, userIdentificacion: number) {
    console.log('📨 enviarRespuesta called for actividad:', id, 'user:', userIdentificacion);
    const actividad = await this.findOne(id);
    if (!actividad) {
      throw new NotFoundException(`Actividad con ID ${id} no encontrada.`);
    }

      if (actividad.asignados) {
        try {
          const asignados = JSON.parse(actividad.asignados);
          const usuario = await this.usuarioRepository.findOne({
            where: { identificacion: userIdentificacion },
            select: ['nombre', 'apellidos']
          });
          const nombreCompleto = `${usuario?.nombre || ''} ${usuario?.apellidos || ''}`.trim();
          if (!asignados.includes(nombreCompleto)) {
            throw new BadRequestException('No estás asignado a esta actividad.');
          }
        } catch (error) {}
      }

      const existingRespuesta = await this.respuestaRepository.findOne({
        where: { actividad: { id }, usuario: { identificacion: userIdentificacion } },
      });

      if (existingRespuesta && existingRespuesta.estado === 'aprobado') {
        throw new BadRequestException('La respuesta ya fue aprobada.');
      }

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        let saved: RespuestaActividad;
        if (existingRespuesta) {
          if (existingRespuesta.archivos) this.eliminarArchivosFisicos(existingRespuesta.archivos);
          existingRespuesta.descripcion = dto.descripcion || '';
          existingRespuesta.archivos = dto.archivos || '';
          existingRespuesta.estado = 'pendiente';
          existingRespuesta.comentarioInstructor = undefined;
          saved = await queryRunner.manager.save(existingRespuesta);
        } else {
          const respuesta = this.respuestaRepository.create({
            descripcion: dto.descripcion,
            archivos: dto.archivos,
            actividad: { id },
            usuario: { identificacion: userIdentificacion },
          });
          saved = await queryRunner.manager.save(respuesta);
        }

        if (dto.materialesDevueltos && dto.materialesDevueltos.length > 0) {
          console.log('🔄 PROCESANDO DEVOLUCIONES:', dto.materialesDevueltos);
          const gastoRepo = queryRunner.manager.getRepository(Gasto);

          for (const devolucion of dto.materialesDevueltos) {
            console.log('📦 Procesando devolución:', devolucion);
            const material = await queryRunner.manager.findOne(Material, { where: { id: devolucion.materialId } });
            if (!material) {
              console.error(`❌ Material ${devolucion.materialId} no encontrado`);
              continue;
            }

            console.log('📊 Material encontrado:', {
              id: material.id,
              nombre: material.nombre,
              tipoConsumo: material.tipoConsumo,
              cantidadActual: material.cantidad,
              usosActuales: material.usosActuales
            });

            // Convertir strings a números si vienen del frontend
            const cantBuenas = Number(devolucion.cantidadDevuelta) || 0;
            const cantMalas = Number(devolucion.cantidadDanada) || 0;
            const totalRetorno = cantBuenas + cantMalas;

            console.log('🔢 Cantidades procesadas:', {
              cantBuenas,
              cantMalas,
              totalRetorno,
              tipoConsumo: material.tipoConsumo
            });

            // =========================================================
            // 🛠️ CASO A: HERRAMIENTAS (NO CONSUMIBLES)
            // =========================================================
            if (material.tipoConsumo === TipoConsumo.NO_CONSUMIBLE) {
              console.log('🔧 Procesando herramienta no consumible');

                // 1. LIMPIAR PRÉSTAMO (El usuario devuelve TODO, bueno o malo)
                const usosAntes = Number(material.usosActuales);
                material.usosActuales = usosAntes - totalRetorno;
                if (material.usosActuales < 0) material.usosActuales = 0;
                console.log(`📉 Usos actuales: ${usosAntes} → ${material.usosActuales}`);

                // 2. REGISTRAR ENTRADA DE LO BUENO (Stock disponible)
                if (cantBuenas > 0) {
                    console.log(`✅ Registrando entrada de ${cantBuenas} unidades buenas`);
                    await this.movimientosService.registrarMovimiento(
                        TipoMovimiento.INGRESO,
                        cantBuenas,
                        material.id,
                        `Devolución (Buen Estado): ${cantBuenas} Unidades - ${actividad.titulo}`,
                        `dev-ok-${actividad.id}`
                    );
                }

                // 3. REGISTRAR BAJA DE LO MALO (Pérdida de Activo)
                if (cantMalas > 0) {
                    console.log(`💥 Procesando ${cantMalas} unidades dañadas`);

                    // 🔥 RESTAR DEL STOCK FÍSICO TOTAL porque se rompieron
                    const stockAntes = Number(material.cantidad);
                    material.cantidad = stockAntes - cantMalas;
                    if (material.cantidad < 0) material.cantidad = 0;
                    console.log(`📊 Stock físico: ${stockAntes} → ${material.cantidad}`);

                    const precioUnitario = Number(material.precio) || 0;
                    const costoDano = cantMalas * precioUnitario;
                    console.log(`💰 Costo del daño: ${cantMalas} × ${precioUnitario} = ${costoDano}`);

                    // A. TRANSACCIÓN FINANCIERA (GASTO)
                    console.log('💸 Creando transacción financiera...');
                    const cobroPorDano = gastoRepo.create({
                        descripcion: `Pérdida/Daño Herramienta: ${material.nombre} (${cantMalas} Unds)`,
                        monto: parseFloat(costoDano.toFixed(2)),
                        fecha: DateUtil.getCurrentDate(),
                        tipo: TipoMovimiento.EGRESO,
                        cultivo: actividad.cultivo,
                        cantidad: cantMalas,
                        unidad: 'Unidad',
                        precioUnitario: precioUnitario
                    });
                    await queryRunner.manager.save(cobroPorDano);
                    console.log('✅ Transacción financiera creada');

                    // B. MOVIMIENTO DE BAJA (KARDEX)
                    console.log('📝 Registrando movimiento de baja...');
                    await this.movimientosService.registrarMovimiento(
                        TipoMovimiento.EGRESO,
                        cantMalas,
                        material.id,
                        `BAJA POR DAÑO: ${cantMalas} Unidades - ${actividad.titulo}`,
                        `baja-dano-${actividad.id}`
                    );
                    console.log('✅ Movimiento de baja registrado');
                } else {
                  console.log('ℹ️ No hay unidades dañadas para procesar');
                }
            }
            // =========================================================
            // 🧪 CASO B: CONSUMIBLES (Insumos)
            // =========================================================
            else {
                console.log('🧪 Procesando insumo consumible');

                // Solo devolvemos al stock lo que sobró (lo bueno)
                if (cantBuenas > 0) {
                     console.log(`✅ Devolviendo ${cantBuenas} unidades al stock`);
                     this.revertirDescontarMaterial(material, cantBuenas);

                     await this.movimientosService.registrarMovimiento(
                       TipoMovimiento.INGRESO,
                       cantBuenas,
                       material.id,
                       `Devolución sobrante insumo: ${actividad.titulo}`,
                       `dev-cons-${actividad.id}`
                     );
                } else {
                  console.log('ℹ️ No hay sobrantes para devolver');
                }
                // Los consumibles "dañados" no generan transacción extra
                if (cantMalas > 0) {
                  console.log(`⚠️ Consumible tiene ${cantMalas} unidades marcadas como dañadas, pero no se procesan`);
                }
            }

            console.log('💾 Guardando cambios en material...');
            // Guardar actualización del material
            await queryRunner.manager.save(material);
            console.log('✅ Material actualizado');
          }
        } else {
          console.log('ℹ️ No hay materiales devueltos para procesar');
        }

      await queryRunner.commitTransaction();

      // Cargar la actividad completa con el campo asignados para verificar estado
      const actividadCompleta = await this.findOne(id);

      // Verificar si todos los asignados han respondido
      if (actividadCompleta) {
        await this.verificarEstadoActividad(actividadCompleta);
      }

      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async obtenerRespuestasPorActividad(id: number, userIdentificacion?: number, userRole?: string) {
    const query = this.respuestaRepository.createQueryBuilder('respuesta')
      .leftJoinAndSelect('respuesta.usuario', 'usuario')
      .leftJoinAndSelect('usuario.tipoUsuario', 'tipoUsuario')
      .leftJoinAndSelect('usuario.ficha', 'ficha')
      .where('respuesta.actividad = :actividadId', { actividadId: id })
      .orderBy('respuesta.fechaEnvio', 'DESC');

    if (userIdentificacion && userRole && (userRole.toLowerCase() === 'aprendiz' || userRole.toLowerCase() === 'pasante')) {
      query.andWhere('usuario.identificacion = :identificacion', { identificacion: userIdentificacion });
    }
    return query.getMany();
  }

  async calificarRespuesta(respuestaId: number, dto: CalificarRespuestaDto, userRole?: string) {
    console.log('🎯 calificarRespuesta called for respuesta:', respuestaId, 'estado:', dto.estado);

    if (userRole?.toLowerCase() !== 'instructor' && userRole?.toLowerCase() !== 'admin') {
      throw new BadRequestException('Solo instructores y administradores pueden calificar respuestas.');
    }

    const respuesta = await this.respuestaRepository.findOne({
      where: { id: respuestaId },
      relations: ['actividad', 'usuario', 'usuario.tipoUsuario'],
    });
    if (!respuesta) {
      throw new NotFoundException(`Respuesta con ID ${respuestaId} no encontrada.`);
    }

    console.log('👤 Usuario encontrado:', {
      id: respuesta.usuario.identificacion,
      nombre: respuesta.usuario.nombre,
      tipoUsuario: respuesta.usuario.tipoUsuario?.nombre
    });

    respuesta.estado = dto.estado;
    respuesta.comentarioInstructor = dto.comentarioInstructor;

    const savedRespuesta = await this.respuestaRepository.save(respuesta);

    // Cargar la actividad completa con el campo asignados para verificar estado
    const actividadCompleta = await this.findOne(respuesta.actividad.id);

    // Actualizar estado de la actividad basado en todas las respuestas
    if (actividadCompleta) {
      await this.verificarEstadoActividad(actividadCompleta);
    }

    // Retornar información adicional sobre si el usuario es pasante
    const esPasante = respuesta.usuario.tipoUsuario?.nombre?.toLowerCase() === 'pasante';
    console.log('🔍 Verificación de pasante:', {
      tipoUsuarioNombre: respuesta.usuario.tipoUsuario?.nombre,
      esPasante
    });

    const resultado = {
      ...savedRespuesta,
      esPasante,
      usuario: {
        ...savedRespuesta.usuario,
        tipoUsuario: respuesta.usuario.tipoUsuario,
      },
    };

    console.log('📤 Respuesta que se retorna al frontend:', {
      id: resultado.id,
      estado: resultado.estado,
      esPasante: resultado.esPasante,
      usuarioTipo: resultado.usuario.tipoUsuario?.nombre
    });

    return resultado;
  }

  async calificarActividad(id: number, dto: CalificarActividadDto, userRole?: string) {
    const actividad = await this.findOne(id);
    if (!actividad) throw new NotFoundException(`Actividad ${id} no encontrada.`);
    actividad.calificacion = dto.calificacion;
    actividad.comentarioInstructor = dto.comentarioInstructor;

    // El estado se actualizará automáticamente por verificarEstadoActividad
    // cuando se califiquen las respuestas individuales
    return this.actividadRepository.save(actividad);
  }

  async generarReporteActividad(id: number) {
    const actividad = await this.findOne(id);
    if (!actividad) throw new NotFoundException(`Actividad ${id} no encontrada.`);
    let asignados: string[] = [];
    try { asignados = JSON.parse(actividad.asignados || '[]'); } catch {}
    
    const respuestas = await this.respuestaRepository.find({
      where: { actividad: { id } },
      relations: ['usuario'],
    });
    const respuestasMap = new Map<string, RespuestaActividad>();
    respuestas.forEach(r => respuestasMap.set(`${r.usuario.nombre} ${r.usuario.apellidos}`.trim(), r));

    const reporte = asignados.map(nombre => {
      const r = respuestasMap.get(nombre);
      return {
        nombre,
        estado: r ? r.estado : 'pendiente',
        fechaEnvio: r ? r.fechaEnvio : null,
        comentarioInstructor: r ? r.comentarioInstructor : null,
      };
    });

    return { actividad: { id: actividad.id, titulo: actividad.titulo, descripcion: actividad.descripcion, estado: actividad.estado }, reporte };
  }

  async generarReporteExcel(id: number): Promise<Buffer> {
    const data = await this.generarReporteActividad(id);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte');
    worksheet.addRow(['Reporte de Actividad', data.actividad.titulo]);
    worksheet.addRow(['Estado', data.actividad.estado]);
    worksheet.addRow([]);
    worksheet.addRow(['Aprendiz', 'Estado', 'Fecha', 'Comentarios']);
    data.reporte.forEach(r => {
      worksheet.addRow([r.nombre, r.estado, r.fechaEnvio, r.comentarioInstructor]);
    });
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async devolverMaterialesFinal(id: number, dto: DevolverMaterialesFinalDto, userIdentificacion: number) {
    const actividad = await this.findOne(id);
    if (!actividad) throw new NotFoundException(`Actividad ${id} no encontrada.`);

    // Verificar permisos
    if (!actividad.responsable || actividad.responsable.identificacion !== userIdentificacion) {
      throw new BadRequestException('Solo el responsable puede devolver materiales.');
    }

    if (actividad.estado !== 'completado') {
      throw new BadRequestException('Los materiales solo pueden devolverse cuando la actividad esté finalizada.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const gastoRepo = queryRunner.manager.getRepository(Gasto);

      for (const dev of dto.materialesDevueltos) {
        const material = await queryRunner.manager.findOne(Material, { where: { id: dev.materialId } });
        if (!material) continue;

        // Convertir strings a números si vienen del frontend
        const cantBuenas = Number(dev.cantidadDevuelta) || 0;
        const cantMalas = Number(dev.cantidadDanada) || 0;

        // 🔥 AGREGAR ESTA LÍNEA QUE FALTA 🔥
        const totalRetorno = cantBuenas + cantMalas;

        // =========================================================
        // 🛠️ CASO A: HERRAMIENTAS (NO CONSUMIBLES)
        // =========================================================
        if (material.tipoConsumo === TipoConsumo.NO_CONSUMIBLE) {

            // 1. LIMPIAR PRÉSTAMO (El usuario devuelve TODO, bueno o malo)
            // Si prestó 10, y devuelve 7 buenas + 3 malas, se liberan las 10 de 'usosActuales'.
            // AHORA SÍ FUNCIONARÁ porque 'totalRetorno' ya existe
            material.usosActuales = Number(material.usosActuales) - totalRetorno;
            if (material.usosActuales < 0) material.usosActuales = 0;

            // 2. REGISTRAR ENTRADA DE LO BUENO (Stock disponible)
            if (cantBuenas > 0) {
                // OJO: No sumamos a material.cantidad porque al ser NO_CONSUMIBLE,
                // la cantidad física nunca se restó al prestarse, solo se movió a 'usosActuales'.
                // Solo registramos el movimiento para el historial.

                await this.movimientosService.registrarMovimiento(
                    TipoMovimiento.INGRESO,
                    cantBuenas,
                    material.id,
                    `Devolución (Buen Estado): ${cantBuenas} Unidades - ${actividad.titulo}`, // 👈 Muestra Unidades
                    `dev-ok-${actividad.id}`
                );
            }

            // 3. REGISTRAR BAJA DE LO MALO (Pérdida de Activo)
            if (cantMalas > 0) {
                // 🔥 AQUÍ SÍ RESTAMOS DEL STOCK FÍSICO TOTAL porque se rompieron
                material.cantidad = Number(material.cantidad) - cantMalas;
                if (material.cantidad < 0) material.cantidad = 0;

                const precioUnitario = Number(material.precio) || 0;
                const costoDano = cantMalas * precioUnitario;

                // A. TRANSACCIÓN FINANCIERA (GASTO)
                const cobroPorDano = gastoRepo.create({
                    descripcion: `Pérdida/Daño Herramienta: ${material.nombre} (${cantMalas} Unds)`,
                    monto: parseFloat(costoDano.toFixed(2)),
                    fecha: new Date(),
                    tipo: TipoMovimiento.EGRESO,
                    cultivo: actividad.cultivo,

                    // ✅ DATOS CLAVE PARA FINANZAS
                    cantidad: cantMalas,
                    unidad: 'Unidad', // 👈 Se guarda como 'Unidad'
                    precioUnitario: precioUnitario
                });
                await queryRunner.manager.save(cobroPorDano);

                // B. MOVIMIENTO DE BAJA (KARDEX)
                await this.movimientosService.registrarMovimiento(
                    TipoMovimiento.EGRESO,
                    cantMalas,
                    material.id,
                    `BAJA POR DAÑO: ${cantMalas} Unidades - ${actividad.titulo}`, // 👈 Muestra Unidades
                    `baja-dano-${actividad.id}`
                );
            }
        }

        // =========================================================
        // CASO B: CONSUMIBLES (Insumos)
        // =========================================================
        else {
            // Solo devolvemos al stock lo que sobró (lo bueno)
            if (cantBuenas > 0) {
                 this.revertirDescontarMaterial(material, cantBuenas);

                 await this.movimientosService.registrarMovimiento(
                   TipoMovimiento.INGRESO,
                   cantBuenas,
                   material.id,
                   `Devolución sobrante insumo: ${actividad.titulo}`,
                   `dev-cons-${actividad.id}`
                 );
            }
            // Los consumibles "dañados" o gastados no generan transacción extra aquí
            // porque ya se cobraron totalmente al asignarse la actividad.
        }

        // Guardar actualización de stock del material
        await queryRunner.manager.save(material);
      }

      await queryRunner.commitTransaction();
      return { message: 'Devolución procesada correctamente.' };

    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async asignarActividad(dto: AsignarActividadDto) {
    let { cultivo: cultivoId, lote: loteId, sublote: subloteId, aprendices, titulo, descripcion, fecha, materiales, archivoInicial, responsable: responsableId } = dto;

    // --- 🚀 LÓGICA NUEVA: Auto-asignar responsable si es único ---
    if (aprendices.length === 1 && !responsableId) {
        // Si es uno solo y no eligieron líder, él es el líder automático
        responsableId = aprendices[0];
    }
    // -------------------------------------------------------------
    
    // ... (Validaciones de entidades Cultivo, Lote, Sublote, Responsable igual que antes) ...
    const cultivo = await this.cultivoRepository.findOneBy({ id: cultivoId });
    if (!cultivo) throw new NotFoundException('Cultivo no encontrado');
    
    let lote, sublote, responsable;
    if(loteId) lote = await this.loteRepository.findOneBy({ id: loteId });
    if(subloteId) sublote = await this.subloteRepository.findOneBy({ id: subloteId });
    if(responsableId) responsable = await this.usuarioRepository.findOneBy({ identificacion: responsableId });

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const usuariosAsignados = await this.usuarioRepository.find({ where: { identificacion: In(aprendices) } });
      const nombresAsignados = usuariosAsignados.map(u => `${u.nombre} ${u.apellidos}`);

      const actividad = this.actividadRepository.create({
        titulo, descripcion, fecha: new Date(fecha), cultivo, lote, sublote, responsable,
        estado: 'pendiente', asignados: JSON.stringify(nombresAsignados), archivoInicial
      });
      const saved = await queryRunner.manager.save(actividad);

      if (materiales && materiales.length > 0) {
        const gastoRepo = queryRunner.manager.getRepository(Gasto);
        for (const item of materiales) {
          const material = await queryRunner.manager.findOne(Material, { where: { id: item.materialId } });
          if (!material) throw new NotFoundException(`Material ${item.materialId} no encontrado.`);

          const unidadUsada = (item.unidadMedida as UnidadMedida) || UnidadMedida.UNIDAD;
          let unidadBase = material.unidadBase || UnitConversionUtil.obtenerUnidadBase(
            material.tipoConsumo === TipoConsumo.CONSUMIBLE ? 'consumible' : 'no_consumible', 
            material.medidasDeContenido
          );

          let cantidadBase = 0;
          if (UnitConversionUtil.esUnidadEmpaque(unidadUsada) && [UnidadMedida.KILOGRAMO, UnidadMedida.LITRO, UnidadMedida.GRAMO, UnidadMedida.MILILITRO].includes(unidadBase)) {
             cantidadBase = (item.cantidadUsada || 0) * (Number(material.pesoPorUnidad) || 1);
          } else {
             cantidadBase = UnitConversionUtil.convertirABase(item.cantidadUsada || 0, unidadUsada);
          }

          const res = this.descontarMaterial(material, cantidadBase);
          if (!res.success) throw new BadRequestException(`Stock insuficiente: ${material.nombre}`);
          await queryRunner.manager.save(material);

          // CÁLCULO DE COSTO Y GASTO
          let costoTotal = 0;
          let precioUnitarioCalculado = 0; // Variable para el precio unitario

          if (material.tipoConsumo === TipoConsumo.CONSUMIBLE) {
             const precioMaterial = Number(material.precio) || 0;
             const pesoPorUnidad = Number(material.pesoPorUnidad) || 1;

             // A. Precio por unidad base
             const precioPorUnidadBase = precioMaterial / pesoPorUnidad;

             // B. Costo Total = PrecioBase * CantidadTotalBase
             costoTotal = precioPorUnidadBase * cantidadBase;

             // C. Precio Unitario para Mostrar
             precioUnitarioCalculado = item.cantidadUsada > 0 ? costoTotal / item.cantidadUsada : 0;

          } else {
             // Herramientas
             costoTotal = 0;
             precioUnitarioCalculado = 0;
          }

          const union = this.actMaterialRepository.create({
            actividad: saved, material, cantidadUsada: item.cantidadUsada, unidadMedida: unidadUsada,
            cantidadUsadaBase: cantidadBase, costo: costoTotal
          });
          await queryRunner.manager.save(union);

          if (costoTotal > 0) {
            const gasto = gastoRepo.create({
              descripcion: `Insumo: ${material.nombre} - ${item.cantidadUsada} ${unidadUsada} (Asignación: ${titulo})`,
              monto: parseFloat(costoTotal.toFixed(2)),
              fecha: saved.fecha,
              tipo: TipoMovimiento.EGRESO,
              cultivo,

              // ✅ AQUÍ GUARDAMOS EL DESGLOSE PARA FINANZAS
              cantidad: item.cantidadUsada,
              unidad: unidadUsada,
              precioUnitario: parseFloat(precioUnitarioCalculado.toFixed(2))
            });
            await queryRunner.manager.save(gasto);
          }

          await this.movimientosService.registrarMovimiento(
            TipoMovimiento.EGRESO, cantidadBase, material.id, `Asignación: ${titulo}`, `act-${saved.id}`
          );
        }
      }
      await queryRunner.commitTransaction();
      return { actividad: saved };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }
}