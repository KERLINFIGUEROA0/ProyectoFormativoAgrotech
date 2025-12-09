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
import { Pago } from '../pagos/entities/pago.entity';
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

  // --- FUNCIÓN HELPER PARA FORMATEAR CANTIDADES SIN DECIMALES  ---
  private formatCantidad(num: number): string {
    const rounded = Math.round(num * 100) / 100;
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(2);
  }

  // --- FUNCIÓN HELPER PARA VERIFICAR ESTADO DE LA ACTIVIDAD ---
    private async verificarEstadoActividad(actividad: Actividad) {
      if (!actividad.asignados) {
        return;
      }

      try {
        const asignados = JSON.parse(actividad.asignados);

        if (!Array.isArray(asignados) || asignados.length === 0) {
          return;
        }

        // Obtener todas las respuestas de la actividad
        const respuestas = await this.respuestaRepository.find({
          where: { actividad: { id: actividad.id } },
          relations: ['usuario'],
        });

        // Contar respuestas únicas por usuario
        const usuariosQueRespondieron = new Set(respuestas.map(r => r.usuario.identificacion));

        // Si hay al menos una respuesta, cambiar a 'en proceso'
        if (usuariosQueRespondieron.size > 0) {
          // Si no todos han respondido, estado 'en proceso'
          if (usuariosQueRespondieron.size < asignados.length) {
            actividad.estado = 'en proceso';
          } else {
            // Todos han respondido, verificar si todas están calificadas
            const todasCalificadas = respuestas.every(r => r.estado !== 'pendiente');

            if (todasCalificadas) {
              const todasAprobadas = respuestas.every(r => r.estado === 'aprobado');

              actividad.estado = todasAprobadas ? 'completado' : 'en proceso'; // Si hay rechazos, mantener 'en proceso'
            } else {
              actividad.estado = 'en proceso'; // Todos respondieron, esperando calificación
            }
          }
        } else {
          // No hay respuestas, mantener pendiente
          actividad.estado = 'pendiente';
        }

        await this.actividadRepository.save(actividad);
      } catch (error) {
        console.error('❌ Error al verificar estado de actividad:', error);
      }
    }

  // --- LÓGICA DE STOCK UNIFICADO ---
  private descontarMaterial(material: Material, cantidadUsada: number): { success: boolean, debeRegistrarEgreso: boolean, debeGenerarGastoDepreciacion: boolean } {
    if (material.tipoConsumo === TipoConsumo.NO_CONSUMIBLE) {
      if (!material.usosTotales) {
        return { success: true, debeRegistrarEgreso: false, debeGenerarGastoDepreciacion: false };
      }
      const usosAntes = Number(material.usosActuales) || 0;
      material.usosActuales = usosAntes + cantidadUsada;

      // Verificar si alcanzó el límite de usos
      const alcanzoLimite = material.usosActuales >= material.usosTotales;

      if (alcanzoLimite) {
        // Si alcanzó el límite, reducir cantidad física y resetear usos
        material.cantidad = Number(material.cantidad) - 1;
        if (material.cantidad < 0) material.cantidad = 0;
        material.usosActuales = 0; // Resetear usos para la siguiente unidad
        return { success: true, debeRegistrarEgreso: true, debeGenerarGastoDepreciacion: true };
      }

      return { success: true, debeRegistrarEgreso: true, debeGenerarGastoDepreciacion: false };
    }

    if (Number(material.cantidad) < cantidadUsada) {
      return { success: false, debeRegistrarEgreso: false, debeGenerarGastoDepreciacion: false };
    }

    material.cantidad = Number(material.cantidad) - cantidadUsada;
    return { success: true, debeRegistrarEgreso: true, debeGenerarGastoDepreciacion: false };
  }

  private revertirDescontarMaterial(material: Material, cantidadDevuelta: number) {
    // Validar que la cantidad no cause overflow en la base de datos
    const maxCantidad = 9999999.999999; // Máximo para numeric(14,6)
    const nuevaCantidad = Number(material.cantidad) + cantidadDevuelta;

    if (nuevaCantidad > maxCantidad) {
      console.error(`❌ ERROR: Cantidad resultante ${nuevaCantidad} excede el límite máximo ${maxCantidad} para material ${material.nombre}. Cantidad devuelta: ${cantidadDevuelta}, Cantidad actual: ${material.cantidad}`);
      throw new BadRequestException(`La cantidad resultante (${nuevaCantidad}) excede el límite máximo permitido para el material ${material.nombre}.`);
    }

    if (material.tipoConsumo === TipoConsumo.NO_CONSUMIBLE) {
      if (!material.usosTotales) return;

      // Lógica inversa: reducir usos actuales
      material.usosActuales = Number(material.usosActuales) - cantidadDevuelta;

      // Si los usos quedan negativos, significa que se debe devolver una unidad física
      while (material.usosActuales < 0 && material.cantidad >= 0) {
        material.usosActuales += material.usosTotales;
        material.cantidad = Number(material.cantidad) + 1;
      }

      // Asegurar que no queden usos negativos
      if (material.usosActuales < 0) material.usosActuales = 0;

      return;
    }
    material.cantidad = nuevaCantidad;
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

          // 3.1. Generar gasto por depreciación si el material alcanzó su límite de usos
          if (resultado.debeGenerarGastoDepreciacion) {
            const precioUnitario = Number(material.precio) || 0;
            const costoDepreciacion = precioUnitario; // Costo completo del material depreciado

            const gastoDepreciacion = gastoRepo.create({
              descripcion: `Depreciación: ${material.nombre} (agotó ${material.usosTotales} usos) - ${saved.titulo}`,
              monto: parseFloat(costoDepreciacion.toFixed(2)),
              fecha: saved.fecha,
              tipo: TipoMovimiento.EGRESO,
              cultivo: cultivoEntidad ?? undefined,
              cantidad: 1,
              unidad: UnidadMedida.UNIDAD,
              precioUnitario: precioUnitario
            });
            await queryRunner.manager.save(gastoDepreciacion);
          }

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

          // 6. NO CREAR GASTO AQUÍ - Se creará en la devolución final
        }
      }

      // --- REGISTRO DE GASTO MANO DE OBRA REMOVIDO ---
      // Los gastos de mano de obra se registran cuando se pagan los pasantes
      // const costoManoDeObra = (Number(horas) || 0) * (Number(tarifaHora) || 0);
      // if (costoManoDeObra > 0) {
      //   const nuevoGasto = gastoRepo.create({
      //     descripcion: `Mano de obra: ${nombreUsuario} (Act: ${saved.titulo})`,
      //     monto: parseFloat(costoManoDeObra.toFixed(2)),
      //     fecha: saved.fecha,
      //     tipo: TipoMovimiento.EGRESO,
      //     cultivo: cultivoEntidad ?? undefined,
      //   });
      //   await queryRunner.manager.save(nuevoGasto);
      // }

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

    let actividades: any[];
    if (userRole && (userRole.toLowerCase() === 'instructor' || userRole.toLowerCase() === 'admin')) {
      actividades = await query.getMany();
    } else {
      actividades = await query.getMany();
      const nombreCompleto = `${user?.nombre || ''} ${user?.apellidos || ''}`.trim();
      actividades = actividades.filter(actividad => {
        if (!actividad.asignados) return false;
        try {
          const asignados = JSON.parse(actividad.asignados);
          return asignados.includes(nombreCompleto);
        } catch {
          return false;
        }
      });
    }

    // Calcular costoManoObra, totalHoras y promedioTarifa para cada actividad desde tabla pagos
    // También incluir información de usuarios asignados con ficha para actividades pendientes
    const actividadesWithCosto = await Promise.all(actividades.map(async (act) => {
      let costoManoObra = 0;
      let totalHoras = 0;
      let promedioTarifa = 0;

      const pagos = await this.dataSource.getRepository(Pago).find({
        where: { idActividad: act.id },
        relations: ['usuario'],
      });

      costoManoObra = pagos.reduce((sum, p) => sum + Number(p.monto || 0), 0);
      totalHoras = pagos.reduce((sum, p) => sum + Number(p.horasTrabajadas || 0), 0);
      promedioTarifa = pagos.length > 0 ? pagos.reduce((sum, p) => sum + Number(p.tarifaHora || 0), 0) / pagos.length : 0;

      // Si no hay pagos registrados, usar el costo estimado (horas * tarifaHora)
      if (costoManoObra === 0 && act.horas && act.tarifaHora) {
        costoManoObra = Number(act.horas) * Number(act.tarifaHora);
      }

      // Para actividades pendientes, incluir información de usuarios asignados con ficha
      let usuariosAsignados: any[] = [];
      if (act.asignados) {
        try {
          const nombresAsignados = JSON.parse(act.asignados);
          if (Array.isArray(nombresAsignados) && nombresAsignados.length > 0) {
            // Buscar usuarios por nombre completo
            const usuarios = await this.usuarioRepository.find({
              where: nombresAsignados.map(nombre => ({
                nombre: nombre.split(' ')[0],
                apellidos: nombre.split(' ').slice(1).join(' ')
              })),
              relations: ['ficha', 'tipoUsuario']
            });
            usuariosAsignados = usuarios;
          }
        } catch (error) {
          console.error('Error al parsear asignados:', error);
        }
      }

      return { ...act, costoManoObra, totalHoras, promedioTarifa, usuariosAsignados };
    }));

    return actividadesWithCosto;
  }

  async findOne(id: number) {
    const actividad = await this.actividadRepository.findOne({
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
        'respuestas',
        'respuestas.usuario',
      ],
      select: ['id', 'titulo', 'fecha', 'descripcion', 'img', 'archivoInicial', 'estado', 'horas', 'tarifaHora', 'asignados', 'respuestaTexto', 'respuestaArchivos', 'calificacion', 'comentarioInstructor'],
    });

    if (!actividad) {
      throw new NotFoundException(`Actividad con ID ${id} no encontrada.`);
    }

    // Calcular costo de mano de obra, totalHoras y promedioTarifa desde pagos
    let costoManoObra = 0;
    let totalHoras = 0;
    let promedioTarifa = 0;


    // DEBUG: Ver todos los pagos para verificar si existen
    const todosLosPagos = await this.dataSource.getRepository(Pago).find({
      relations: ['usuario', 'actividad'],
    });

    // Consultar pagos relacionados con la actividad
    const pagos = await this.dataSource.getRepository(Pago).find({
      where: { idActividad: actividad.id },
      relations: ['usuario'],
    });


    costoManoObra = pagos.reduce((sum, p) => sum + Number(p.monto || 0), 0);
    totalHoras = pagos.reduce((sum, p) => sum + Number(p.horasTrabajadas || 0), 0);
    promedioTarifa = pagos.length > 0 ? pagos.reduce((sum, p) => sum + Number(p.tarifaHora || 0), 0) / pagos.length : 0;

    // Si no hay pagos registrados, usar el costo estimado (horas * tarifaHora)
    if (costoManoObra === 0 && actividad.horas && actividad.tarifaHora) {
      costoManoObra = Number(actividad.horas) * Number(actividad.tarifaHora);
    } else {
    }


    return { ...actividad, costoManoObra, totalHoras, promedioTarifa };
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

      // 2. NO HAY GASTOS ANTIGUOS QUE BORRAR - Los gastos se crean solo en devolución

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

          // Generar gasto por depreciación si el material alcanzó su límite de usos
          if (resultado.debeGenerarGastoDepreciacion) {
            const precioUnitario = Number(material.precio) || 0;
            const costoDepreciacion = precioUnitario;

            const gastoDepreciacion = gastoRepo.create({
              descripcion: `Depreciación: ${material.nombre} (agotó ${material.usosTotales} usos) - ${saved.titulo}`,
              monto: parseFloat(costoDepreciacion.toFixed(2)),
              fecha: new Date(),
              tipo: TipoMovimiento.EGRESO,
              cultivo: cultivoEntidad ?? undefined,
              cantidad: 1,
              unidad: UnidadMedida.UNIDAD,
              precioUnitario: precioUnitario
            });
            await queryRunner.manager.save(gastoDepreciacion);
          }

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

          // NO CREAR GASTO AQUÍ - Se creará en la devolución final
        }
      }

      // 5. REGISTRAR NUEVO GASTO MANO DE OBRA REMOVIDO
      // Los gastos de mano de obra se registran cuando se pagan los pasantes
      // const costoManoDeObra = (Number(horas) || 0) * (Number(tarifaHora) || 0);
      // if (costoManoDeObra > 0) {
      //   const nuevoGasto = gastoRepo.create({
      //     descripcion: `Mano de obra: ${nombreUsuario} (Act: ${saved.titulo})`,
      //     monto: parseFloat(costoManoDeObra.toFixed(2)),
      //     fecha: saved.fecha,
      //     tipo: TipoMovimiento.EGRESO,
      //     cultivo: cultivoEntidad ?? undefined,
      //   });
      //   await queryRunner.manager.save(nuevoGasto);
      // }

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
    await this.actividadRepository.delete(id);
    return { message: 'Actividad eliminada correctamente' };
  }

  async search(dto: SearchActividadDto) {
    // Implementación de búsqueda existente...
  }

  async enviarRespuesta(id: number, dto: CreateRespuestaDto, userIdentificacion: number) {
    const actividad = await this.findOne(id);

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
          const gastoRepo = queryRunner.manager.getRepository(Gasto);
          // Necesitamos este repositorio para saber en qué unidad se prestó
          const actMaterialRepo = queryRunner.manager.getRepository(ActividadMaterial);

          for (const dev of dto.materialesDevueltos) {
            const material = await queryRunner.manager.findOne(Material, { where: { id: dev.materialId } });
            if (!material) {
              console.error(`❌ Material ${dev.materialId} no encontrado en BD`);
              continue;
            }

            // 🔥 PASO 1: DETERMINAR LA UNIDAD PARA CÁLCULO
            // Prioridad: Unidad seleccionada en frontend > Unidad originalmente asignada > Default 'UNIDAD'
            const asignacionOriginal = await actMaterialRepo.findOne({
              where: {
                actividad: { id: actividad.id },
                material: { id: material.id }
              }
            });

            const unidadAsignada = asignacionOriginal?.unidadMedida || UnidadMedida.UNIDAD;

            // LOG DE DECISIÓN DE UNIDAD
            console.log(`\n🔎 Analizando Material ID: ${dev.materialId} (${material.nombre})`);
            console.log(`   1. Unidad que viene del FRONT: "${dev.unidadSeleccionada}"`);
            console.log(`   2. Unidad original ASIGNADA: "${unidadAsignada}"`);

            // ✅ AQUÍ ESTÁ EL FIX: Usar la unidad que el usuario seleccionó realmente
            const unidadParaCalculo = (dev.unidadSeleccionada as UnidadMedida) || unidadAsignada;
            console.log(`   👉 DECISIÓN FINAL: Se usará la unidad "${unidadParaCalculo}" para calcular.`);

            // Cantidades que el usuario escribió (Ej: 50)
            const cantBuenasUsuario = Number(dev.cantidadDevuelta) || 0;
            const cantMalasUsuario = Number(dev.cantidadDanada) || 0;
            console.log(`   🔢 Cantidad ingresada por usuario: ${cantBuenasUsuario}`);

            // 🔥 PASO 2: CONVERTIR ESAS CANTIDADES A LA UNIDAD BASE DEL SISTEMA (Ej: Litros -> Mililitros)
            // Si no hacemos esto, el sistema sumará 50ml en vez de 50,000ml
            let cantBuenasBase = 0;
            let cantMalasBase = 0;

            // Detectar la unidad base del material (Gramos o Mililitros)
            let unidadBaseMaterial = material.unidadBase;
            if (!unidadBaseMaterial) {
              unidadBaseMaterial = UnitConversionUtil.obtenerUnidadBase(
                material.tipoConsumo === TipoConsumo.CONSUMIBLE ? 'consumible' : 'no_consumible',
                material.medidasDeContenido
              );
            }
            console.log(`   📏 Unidad BASE del sistema para este material: "${unidadBaseMaterial}"`);

            // Lógica de conversión (Usando la unidad seleccionada por el usuario)
            if (UnitConversionUtil.esUnidadEmpaque(unidadParaCalculo) &&
                [UnidadMedida.KILOGRAMO, UnidadMedida.LITRO, UnidadMedida.GRAMO, UnidadMedida.MILILITRO].includes(unidadBaseMaterial)) {
               // Si devolvió BULTOS o SACOS
               const pesoPorUnidad = Number(material.pesoPorUnidad) || 1;
               console.log(`   📦 Es unidad de empaque (Saco/Bulto). Peso por unidad: ${pesoPorUnidad}`);
               cantBuenasBase = cantBuenasUsuario * pesoPorUnidad;
               cantMalasBase = cantMalasUsuario * pesoPorUnidad;
            } else {
               // Conversión estándar (L -> ml, kg -> g)
               // Aquí es donde 50 L se convierten en 50,000 ml
               console.log(`   🔄 Ejecutando conversión estándar de ${unidadParaCalculo} a ${unidadBaseMaterial || 'base'}...`);
               cantBuenasBase = UnitConversionUtil.convertirABase(cantBuenasUsuario, unidadParaCalculo);
               cantMalasBase = UnitConversionUtil.convertirABase(cantMalasUsuario, unidadParaCalculo);
            }

            console.log(`   🧮 RESULTADO MATEMÁTICO: ${cantBuenasUsuario} ${unidadParaCalculo} === ${cantBuenasBase} (en base DB)`);

            if (cantBuenasBase < 10 && cantBuenasUsuario > 10) {
              console.error(`   🚨 ALERTA: La conversión dio un número muy pequeño. Verifica si 'convertirABase' está dividiendo en vez de multiplicar.`);
            }

            const totalRetornoBase = cantBuenasBase + cantMalasBase; // Total en mililitros/gramos

            // =========================================================
            // 🛠️ CASO A: HERRAMIENTAS (NO CONSUMIBLES)
            // =========================================================
            if (material.tipoConsumo === TipoConsumo.NO_CONSUMIBLE) {
                // Para herramientas, generalmente la unidad es UNIDAD, así que base y usuario son iguales.
                // Restamos de "En Uso" para liberarlas
                material.usosActuales = Number(material.usosActuales) - (cantBuenasUsuario + cantMalasUsuario);
                if (material.usosActuales < 0) material.usosActuales = 0;

                // Registro historial (lo bueno)
                if (cantBuenasUsuario > 0) {
                    await this.movimientosService.registrarMovimiento(
                        TipoMovimiento.INGRESO,
                        cantBuenasUsuario, // Guardamos el valor numérico base para cálculos
                        material.id,
                        `Devolución: ${cantBuenasUsuario} ${unidadParaCalculo} (Buen Estado) - ${actividad.titulo}`,
                        `dev-ok-${actividad.id}`
                    );
                }

                // Registro historial y cobro (lo dañado)
                if (cantMalasUsuario > 0) {
                    material.cantidad = Number(material.cantidad) - cantMalasUsuario; // Baja de inventario físico
                    if (material.cantidad < 0) material.cantidad = 0;

                    const precioUnitario = Number(material.precio) || 0;
                    const costoDano = cantMalasUsuario * precioUnitario;

                    // A. TRANSACCIÓN FINANCIERA (GASTO) - Se crea en devolverMaterialesFinal
                    // No crear gastos aquí para evitar duplicación

                    await this.movimientosService.registrarMovimiento(
                        TipoMovimiento.EGRESO,
                        cantMalasUsuario,
                        material.id,
                        `BAJA POR DAÑO: ${cantMalasUsuario} ${unidadParaCalculo} - ${actividad.titulo}`,
                        `baja-dano-${actividad.id}`
                    );
                }
            }

            // =========================================================
            // 🧪 CASO B: CONSUMIBLES (INSUMOS: Abono, Veneno, etc.)
            // =========================================================
            else {
                // Solo devolvemos al stock lo que sobró (lo bueno)
                if (cantBuenasBase > 0) {
                     // 🔥 AQUÍ ESTÁ EL ARREGLO:
                     // Sumamos al stock la cantidad CONVERTIDA (50,000 ml), no la del usuario (50).
                     // Usamos la función revertir (o suma directa)
                     this.revertirDescontarMaterial(material, cantBuenasBase);

                     // Registramos el movimiento
                     await this.movimientosService.registrarMovimiento(
                       TipoMovimiento.INGRESO,
                       cantBuenasBase, // Guardamos el valor numérico base para cálculos
                       material.id,
                       // 🔥 PERO en la descripción ponemos lo que el usuario entiende: "50 Litros"
                       `Devolución sobrante: ${cantBuenasUsuario} ${unidadParaCalculo} - ${actividad.titulo}`,
                       `dev-cons-${actividad.id}`
                     );

                     console.log(`   ✅ Material ${material.id} procesado. Stock se aumentará en: ${cantBuenasBase}`);
                }
                // =========================================================
                // 🧪 GESTIÓN FINANCIERA PARA CONSUMIBLES - SE EJECUTA SIEMPRE
                // =========================================================
                // Aquí calculamos el consumo real: ASIGNADO - DEVUELTO = CONSUMIDO
   
                if (asignacionOriginal) {
                    const cantidadAsignadaBase = Number(asignacionOriginal.cantidadUsadaBase) || 0;
   
                    console.log(`   🔍 DEBUG FINANCIERO CONSUMIBLE - Material: ${material.nombre}`);
                    console.log(`      - asignacionOriginal.cantidadUsadaBase: ${asignacionOriginal.cantidadUsadaBase}`);
                    console.log(`      - cantidadAsignadaBase (Number): ${cantidadAsignadaBase}`);
                    console.log(`      - cantBuenasBase (devuelto): ${cantBuenasBase}`);
   
                    // CÁLCULO CLAVE: Lo que se llevó - Lo que trajo = Lo que realmente gastó
                    let cantidadRealConsumidaBase = cantidadAsignadaBase - cantBuenasBase;
   
                    console.log(`      - cantidadRealConsumidaBase (antes de protección): ${cantidadRealConsumidaBase}`);
   
                    // Protección: Si devuelve más de lo asignado (error de usuario), el consumo es 0
                    if (cantidadRealConsumidaBase < 0) cantidadRealConsumidaBase = 0;
   
                    console.log(`   💰 CÁLCULO FINANCIERO:`);
                    console.log(`      - Asignado (Base): ${cantidadAsignadaBase}`);
                    console.log(`      - Devuelto (Base): ${cantBuenasBase}`);
                    console.log(`      - Consumido Real : ${cantidadRealConsumidaBase}`);
   
                    // Solo generamos transacción si hubo un consumo real mayor a 0
                    if (cantidadRealConsumidaBase > 0) {
                        let nuevoCostoTotal = 0;
                        let precioUnitarioBase = 0;
                        let precioUnitarioGasto = 0;
                        let factorUnidad = 1;
   
                        if (material.precio) {
                           const precioMaterial = Number(material.precio);
                           const pesoPorUnidad = Number(material.pesoPorUnidad) || 1;
   
                           // Calcular precio por unidad base (ej: precio por 1 gramo o 1 ml)
                           if (pesoPorUnidad > 0) {
                              precioUnitarioBase = precioMaterial / pesoPorUnidad;
                           } else {
                              precioUnitarioBase = precioMaterial;
                           }
   
                           // TOTAL = Precio Unitario * Cantidad Consumida (Los 5kg que faltan)
                           nuevoCostoTotal = precioUnitarioBase * cantidadRealConsumidaBase;
   
                           // Calcular precio unitario para el gasto (per unidad visual)
                           factorUnidad = UnitConversionUtil.convertirABase(1, asignacionOriginal.unidadMedida || UnidadMedida.UNIDAD);
                           precioUnitarioGasto = precioUnitarioBase * factorUnidad;
                       } else {
                           // Si no hay precio, asignar valores por defecto
                           precioUnitarioGasto = 0;
                           factorUnidad = 1;
                        }
   
                        console.log(`      - Actualizando asignacionOriginal:`);
                        console.log(`        - cantidadUsadaBase antes: ${asignacionOriginal.cantidadUsadaBase}`);
                        console.log(`        - cantidadUsada antes: ${asignacionOriginal.cantidadUsada}`);
                        console.log(`        - unidadMedida: ${asignacionOriginal.unidadMedida}`);
                        console.log(`        - cantidadAsignadaBase: ${cantidadAsignadaBase}`);
                        console.log(`        - cantidadRealConsumidaBase: ${cantidadRealConsumidaBase}`);
   
                        // A. Actualizar la relación ActividadMaterial con lo que realmente se gastó
                        asignacionOriginal.cantidadUsadaBase = cantidadRealConsumidaBase;

                        // B. Recalcular la cantidad visual para el usuario manteniendo la unidad original
                        // Convertir la cantidad consumida en base de vuelta a la unidad original del usuario
                        if (cantidadAsignadaBase > 0 && asignacionOriginal.cantidadUsada && asignacionOriginal.unidadMedida) {
                           // Regla de 3: si X unidades originales = cantidadAsignadaBase en base
                           // entonces cantidadRealConsumidaBase en base = ? unidades originales
                           asignacionOriginal.cantidadUsada = (cantidadRealConsumidaBase * Number(asignacionOriginal.cantidadUsada)) / cantidadAsignadaBase;
                        } else {
                           // Fallback: si no hay datos suficientes, mantener el valor original
                           console.warn(`No se pudo recalcular cantidadUsada para material ${material.nombre}. Manteniendo valor original.`);
                        }
   
                        asignacionOriginal.costo = nuevoCostoTotal;
   
                        console.log(`        - cantidadUsadaBase después: ${asignacionOriginal.cantidadUsadaBase}`);
                        console.log(`        - cantidadUsada después: ${asignacionOriginal.cantidadUsada}`);
                        console.log(`        - costo después: ${asignacionOriginal.costo}`);

                        console.log(`      ✅ Actualización completada para material ${material.nombre}`);
   
                        await actMaterialRepo.save(asignacionOriginal);
   
                        console.log(`      - Creando gasto:`);
                        console.log(`        - descripcion: Consumo: ${material.nombre} - ${this.formatCantidad(asignacionOriginal.cantidadUsada || 0)} ${asignacionOriginal.unidadMedida} (Act: ${actividad.titulo})`);
                        console.log(`        - cantidad: ${Number(asignacionOriginal.cantidadUsada?.toFixed(2) || '0')}`);
                        console.log(`        - precioUnitario: ${precioUnitarioGasto}`);
                        console.log(`        - factorUnidad: ${factorUnidad}`);
                        console.log(`        - monto: ${parseFloat(nuevoCostoTotal.toFixed(2))}`);

                        // Verificar si ya existe un gasto para este material en esta actividad
                        const gastoExistente = await gastoRepo.findOne({
                          where: {
                            descripcion: `Consumo: ${material.nombre} - ${this.formatCantidad(asignacionOriginal.cantidadUsada || 0)} ${asignacionOriginal.unidadMedida} (Act: ${actividad.titulo})`,
                            cultivo: actividad.cultivo ?? undefined
                          }
                        });

                        if (!gastoExistente) {
                          // B. CREAR LA TRANSACCIÓN (GASTO) POR EL CONSUMO REAL
                          const nuevoGasto = gastoRepo.create({
                                descripcion: `Consumo: ${material.nombre} - ${this.formatCantidad(asignacionOriginal.cantidadUsada || 0)} ${asignacionOriginal.unidadMedida} (Act: ${actividad.titulo})`,
                                monto: parseFloat(nuevoCostoTotal.toFixed(2)),
                                fecha: new Date(),
                                tipo: TipoMovimiento.EGRESO,
                                cultivo: actividad.cultivo ?? undefined,
                                cantidad: Number(asignacionOriginal.cantidadUsada?.toFixed(2) || '0'),
                                unidad: asignacionOriginal.unidadMedida,
                                precioUnitario: precioUnitarioGasto
                          });

                          await gastoRepo.save(nuevoGasto);
                          console.log(`      ✅ Transacción generada por: $${nuevoGasto.monto}`);
                        } else {
                          console.log(`      ℹ️ Gasto ya existe, no se duplica`);
                        }
                    } else {
                        console.log(`      ℹ️ Consumo fue 0 (Se devolvió todo). No se genera cobro.`);
                        // Actualizar asignación a 0
                        asignacionOriginal.cantidadUsadaBase = 0;
                        asignacionOriginal.cantidadUsada = 0;
                        asignacionOriginal.costo = 0;
                        await actMaterialRepo.save(asignacionOriginal);
                    }
                }
                }

            await queryRunner.manager.save(material);
          }
        } else {
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

    const resultado = {
      ...savedRespuesta,
      esPasante,
      usuario: {
        ...savedRespuesta.usuario,
        tipoUsuario: respuesta.usuario.tipoUsuario,
      },
    };

    return resultado;
  }

  async calificarActividad(id: number, dto: CalificarActividadDto, userRole?: string) {
    const actividad = await this.findOne(id);
    actividad.calificacion = dto.calificacion;
    actividad.comentarioInstructor = dto.comentarioInstructor;

    // El estado se actualizará automáticamente por verificarEstadoActividad
    // cuando se califiquen las respuestas individuales
    return this.actividadRepository.save(actividad);
  }

  async generarReporteActividad(id: number) {
    const actividad = await this.findOne(id);
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

    // Validaciones de seguridad
    if (!actividad.responsable || actividad.responsable.identificacion !== userIdentificacion) {
      throw new BadRequestException('Solo el responsable puede devolver materiales.');
    }
    if (actividad.estado !== 'completado') {
      throw new BadRequestException('Los materiales solo pueden devolverse cuando la actividad esté finalizada.');
    }

    // Verificar si todas las respuestas están aprobadas para crear gastos
    const todasRespuestasAprobadas = actividad.respuestas?.every(r => r.estado === 'aprobado') ?? false;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 🔍 DEBUG INICIAL
      console.log('\n==================================================');
      console.log('🚨 [BACKEND] INICIANDO PROCESO DE DEVOLUCIÓN');
      console.log('📦 DTO Recibido completo:', JSON.stringify(dto, null, 2));
      console.log('==================================================\n');

      const gastoRepo = queryRunner.manager.getRepository(Gasto);
      // Necesitamos este repositorio para saber en qué unidad se prestó
      const actMaterialRepo = queryRunner.manager.getRepository(ActividadMaterial);

      for (const dev of dto.materialesDevueltos) {
        const material = await queryRunner.manager.findOne(Material, { where: { id: dev.materialId } });
        if (!material) {
          console.error(`❌ Material ${dev.materialId} no encontrado en BD`);
          continue;
        }

        // 🔥 PASO 1: DETERMINAR LA UNIDAD PARA CÁLCULO
        // Prioridad: Unidad seleccionada en frontend > Unidad originalmente asignada > Default 'UNIDAD'
        const asignacionOriginal = await actMaterialRepo.findOne({
          where: {
            actividad: { id: actividad.id },
            material: { id: material.id }
          }
        });

        const unidadAsignada = asignacionOriginal?.unidadMedida || UnidadMedida.UNIDAD;

        // LOG DE DECISIÓN DE UNIDAD
        console.log(`\n🔎 Analizando Material ID: ${dev.materialId} (${material.nombre})`);
        console.log(`   1. Unidad que viene del FRONT: "${dev.unidadSeleccionada}"`);
        console.log(`   2. Unidad original ASIGNADA: "${unidadAsignada}"`);

        // ✅ AQUÍ ESTÁ EL FIX: Usar la unidad que el usuario seleccionó realmente
        const unidadParaCalculo = (dev.unidadSeleccionada as UnidadMedida) || unidadAsignada;
        console.log(`   👉 DECISIÓN FINAL: Se usará la unidad "${unidadParaCalculo}" para calcular.`);

        // Cantidades que el usuario escribió (Ej: 50)
        const cantBuenasUsuario = Number(dev.cantidadDevuelta) || 0;
        const cantMalasUsuario = Number(dev.cantidadDanada) || 0;
        console.log(`   🔢 Cantidad ingresada por usuario: ${cantBuenasUsuario}`);

        // 🔥 PASO 2: CONVERTIR ESAS CANTIDADES A LA UNIDAD BASE DEL SISTEMA (Ej: Litros -> Mililitros)
        // Si no hacemos esto, el sistema sumará 50ml en vez de 50,000ml
        let cantBuenasBase = 0;
        let cantMalasBase = 0;

        // Detectar la unidad base del material (Gramos o Mililitros)
        let unidadBaseMaterial = material.unidadBase;
        if (!unidadBaseMaterial) {
          unidadBaseMaterial = UnitConversionUtil.obtenerUnidadBase(
            material.tipoConsumo === TipoConsumo.CONSUMIBLE ? 'consumible' : 'no_consumible',
            material.medidasDeContenido
          );
        }
        console.log(`   📏 Unidad BASE del sistema para este material: "${unidadBaseMaterial}"`);

        // Lógica de conversión (Usando la unidad seleccionada por el usuario)
        if (UnitConversionUtil.esUnidadEmpaque(unidadParaCalculo) &&
            [UnidadMedida.KILOGRAMO, UnidadMedida.LITRO, UnidadMedida.GRAMO, UnidadMedida.MILILITRO].includes(unidadBaseMaterial)) {
           // Si devolvió BULTOS o SACOS
           const pesoPorUnidad = Number(material.pesoPorUnidad) || 1;
           console.log(`   📦 Es unidad de empaque (Saco/Bulto). Peso por unidad: ${pesoPorUnidad}`);
           cantBuenasBase = cantBuenasUsuario * pesoPorUnidad;
           cantMalasBase = cantMalasUsuario * pesoPorUnidad;
        } else {
           // Conversión estándar (L -> ml, kg -> g)
           // Aquí es donde 50 L se convierten en 50,000 ml
           console.log(`   🔄 Ejecutando conversión estándar de ${unidadParaCalculo} a ${unidadBaseMaterial || 'base'}...`);
           cantBuenasBase = UnitConversionUtil.convertirABase(cantBuenasUsuario, unidadParaCalculo);
           cantMalasBase = UnitConversionUtil.convertirABase(cantMalasUsuario, unidadParaCalculo);
        }

        console.log(`   🧮 RESULTADO MATEMÁTICO: ${cantBuenasUsuario} ${unidadParaCalculo} === ${cantBuenasBase} (en base DB)`);

        if (cantBuenasBase < 10 && cantBuenasUsuario > 10) {
          console.error(`   🚨 ALERTA: La conversión dio un número muy pequeño. Verifica si 'convertirABase' está dividiendo en vez de multiplicar.`);
        }

        const totalRetornoBase = cantBuenasBase + cantMalasBase; // Total en mililitros/gramos

        // =========================================================
        // 🛠️ CASO A: HERRAMIENTAS (NO CONSUMIBLES)
        // =========================================================
        if (material.tipoConsumo === TipoConsumo.NO_CONSUMIBLE) {
            // Para herramientas, generalmente la unidad es UNIDAD, así que base y usuario son iguales.
            // Restamos de "En Uso" para liberarlas
            material.usosActuales = Number(material.usosActuales) - (cantBuenasUsuario + cantMalasUsuario);
            if (material.usosActuales < 0) material.usosActuales = 0;

            // Registro historial (lo bueno)
            if (cantBuenasUsuario > 0) {
                await this.movimientosService.registrarMovimiento(
                    TipoMovimiento.INGRESO,
                    cantBuenasUsuario, // Guardamos el valor numérico base para cálculos
                    material.id,
                    `Devolución: ${cantBuenasUsuario} ${unidadParaCalculo} (Buen Estado) - ${actividad.titulo}`,
                    `dev-ok-${actividad.id}`
                );
            }

            // Registro historial y cobro (lo dañado)
            if (cantMalasUsuario > 0) {
                material.cantidad = Number(material.cantidad) - cantMalasUsuario; // Baja de inventario físico
                if (material.cantidad < 0) material.cantidad = 0;

                const precioUnitario = Number(material.precio) || 0;
                const costoDano = cantMalasUsuario * precioUnitario;

                // A. TRANSACCIÓN FINANCIERA (GASTO)
                const cobroPorDano = gastoRepo.create({
                    descripcion: `Daño Herramienta: ${material.nombre} (${cantMalasUsuario} ${unidadParaCalculo})`,
                    monto: parseFloat(costoDano.toFixed(2)),
                    fecha: new Date(),
                    tipo: TipoMovimiento.EGRESO,
                    cultivo: actividad.cultivo,
                    cantidad: cantMalasUsuario,
                    unidad: unidadParaCalculo,
                    precioUnitario: precioUnitario
                });
                await queryRunner.manager.save(cobroPorDano);

                await this.movimientosService.registrarMovimiento(
                    TipoMovimiento.EGRESO,
                    cantMalasUsuario,
                    material.id,
                    `BAJA POR DAÑO: ${cantMalasUsuario} ${unidadParaCalculo} - ${actividad.titulo}`,
                    `baja-dano-${actividad.id}`
                );
            }
        }

            // =========================================================
            // 🧪 CASO B: CONSUMIBLES (INSUMOS: Abono, Veneno, etc.)
            // =========================================================
            else {
                // ---------------------------------------------------------
                // 1. GESTIÓN DE INVENTARIO FÍSICO (Solo si devuelve algo)
                // ---------------------------------------------------------
                if (cantBuenasBase > 0) {
                     // Devolver al stock lo que sobró
                     this.revertirDescontarMaterial(material, cantBuenasBase);

                     // Registrar el movimiento de entrada en Kárdex
                     await this.movimientosService.registrarMovimiento(
                       TipoMovimiento.INGRESO,
                       cantBuenasBase,
                       material.id,
                       `Devolución sobrante: ${cantBuenasUsuario} ${unidadParaCalculo} - ${actividad.titulo}`,
                       `dev-cons-${actividad.id}`
                     );
                     console.log(`   ✅ Stock recuperado: ${cantBuenasBase} (Base)`);
                }

                // ---------------------------------------------------------
                // 2. GESTIÓN FINANCIERA (TRANSACCIÓN) - SE EJECUTA SIEMPRE
                // ---------------------------------------------------------
                // Aquí hacemos la matemática: ASIGNADO (10) - DEVUELTO (5) = A COBRAR (5)

                if (asignacionOriginal) {
                    const cantidadAsignadaBase = Number(asignacionOriginal.cantidadUsadaBase) || 0;

                    console.log(`   🔍 DEBUG FINANCIERO - Material: ${material.nombre}`);
                    console.log(`      - asignacionOriginal.cantidadUsadaBase: ${asignacionOriginal.cantidadUsadaBase}`);
                    console.log(`      - cantidadAsignadaBase (Number): ${cantidadAsignadaBase}`);
                    console.log(`      - cantBuenasBase (devuelto): ${cantBuenasBase}`);

                    // CÁLCULO CLAVE: Lo que se llevó - Lo que trajo = Lo que realmente gastó
                    let cantidadRealConsumidaBase = cantidadAsignadaBase - cantBuenasBase;

                    console.log(`      - cantidadRealConsumidaBase (antes de protección): ${cantidadRealConsumidaBase}`);

                    // Protección: Si devuelve más de lo asignado (error de usuario), el consumo es 0
                    if (cantidadRealConsumidaBase < 0) cantidadRealConsumidaBase = 0;

                    console.log(`   💰 CÁLCULO FINANCIERO:`);
                    console.log(`      - Asignado (Base): ${cantidadAsignadaBase}`);
                    console.log(`      - Devuelto (Base): ${cantBuenasBase}`);
                    console.log(`      - Consumido Real : ${cantidadRealConsumidaBase}`);

                    // Solo generamos transacción (dinero) si hubo un consumo real
                    if (cantidadRealConsumidaBase > 0) {
                        let nuevoCostoTotal = 0;
                        let precioUnitarioBase = 0;
                        let precioUnitarioGasto = 0;
                        let factorUnidad = 1;

                        if (material.precio) {
                           const precioMaterial = Number(material.precio);
                           const pesoPorUnidad = Number(material.pesoPorUnidad) || 1;

                           // Calcular precio por unidad base (ej: precio por 1 gramo o 1 ml)
                           if (pesoPorUnidad > 0) {
                               precioUnitarioBase = precioMaterial / pesoPorUnidad;
                           } else {
                               precioUnitarioBase = precioMaterial;
                           }

                           // TOTAL = Precio Unitario * Cantidad Consumida (Los 5kg que faltan)
                           nuevoCostoTotal = precioUnitarioBase * cantidadRealConsumidaBase;

                           // Calcular precio unitario para el gasto (per unidad visual)
                           factorUnidad = UnitConversionUtil.convertirABase(1, asignacionOriginal.unidadMedida || UnidadMedida.UNIDAD);
                           precioUnitarioGasto = precioUnitarioBase * factorUnidad;
                       } else {
                           // Si no hay precio, asignar valores por defecto
                           precioUnitarioGasto = 0;
                           factorUnidad = 1;
                       }

                       console.log(`      - Actualizando asignacionOriginal:`);
                        console.log(`        - cantidadUsadaBase antes: ${asignacionOriginal.cantidadUsadaBase}`);
                        console.log(`        - cantidadUsada antes: ${asignacionOriginal.cantidadUsada}`);

                       // A. Actualizar la relación ActividadMaterial con lo que realmente se gastó
                       asignacionOriginal.cantidadUsadaBase = cantidadRealConsumidaBase;

                       // B. Recalcular la cantidad visual para el usuario manteniendo la unidad original
                       // Convertir la cantidad consumida en base de vuelta a la unidad original del usuario
                       if (cantidadAsignadaBase > 0 && asignacionOriginal.cantidadUsada && asignacionOriginal.unidadMedida) {
                          // Regla de 3: si X unidades originales = cantidadAsignadaBase en base
                          // entonces cantidadRealConsumidaBase en base = ? unidades originales
                          asignacionOriginal.cantidadUsada = (cantidadRealConsumidaBase * Number(asignacionOriginal.cantidadUsada)) / cantidadAsignadaBase;
                       } else {
                          // Fallback: si no hay datos suficientes, mantener el valor original
                          console.warn(`No se pudo recalcular cantidadUsada para material ${material.nombre}. Manteniendo valor original.`);
                       }

                        asignacionOriginal.costo = nuevoCostoTotal;

                        console.log(`        - cantidadUsadaBase después: ${asignacionOriginal.cantidadUsadaBase}`);
                        console.log(`        - cantidadUsada después: ${asignacionOriginal.cantidadUsada}`);
                        console.log(`        - costo después: ${asignacionOriginal.costo}`);

                        await actMaterialRepo.save(asignacionOriginal);

                        // Gastos para consumibles se crean en enviarRespuesta con verificación de duplicados
                    }
                    else {
                        // Si devolvió TODO (Consumo 0), actualizamos la asignación a 0 costo
                        console.log(`      ℹ️ Se devolvió todo el material. Costo final: 0`);
                        asignacionOriginal.cantidadUsadaBase = 0;
                        asignacionOriginal.cantidadUsada = 0;
                        asignacionOriginal.costo = 0;
                        await actMaterialRepo.save(asignacionOriginal);
                    }
                }
            }

        await queryRunner.manager.save(material);
      }

      await queryRunner.commitTransaction();
      return { message: 'Devolución procesada correctamente. Stock actualizado.' };

    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async asignarActividad(dto: AsignarActividadDto, usuarioIdentificacion?: number) {
    const { cultivo: cultivoId, lote: loteId, sublote: subloteId, aprendices, titulo, descripcion, fecha, materiales, archivoInicial, responsable: responsableId } = dto;

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
      const usuariosAsignados = await this.usuarioRepository.find({
        where: { identificacion: In(aprendices) },
        relations: ['tipoUsuario']
      });
      const nombresAsignados = usuariosAsignados.map(u => `${u.nombre} ${u.apellidos}`);

      // Lógica para asignar responsable automáticamente
      if (!responsable) {
        if (aprendices.length === 1) {
          // Si hay un solo aprendiz/pasante, él es el responsable
          const usuarioUnico = usuariosAsignados[0];
          const tipoUsuario = usuarioUnico.tipoUsuario?.nombre?.toLowerCase();
          if (tipoUsuario === 'aprendiz' || tipoUsuario === 'pasante') {
            responsable = usuarioUnico;
          } else {
            // Si no es aprendiz/pasante, asignar al instructor
            responsable = await this.usuarioRepository.findOneBy({ identificacion: usuarioIdentificacion });
          }
        } else {
          // Si hay múltiples usuarios, el responsable es el instructor
          responsable = await this.usuarioRepository.findOneBy({ identificacion: usuarioIdentificacion });
        }
      }

      const actividad = this.actividadRepository.create({
        titulo, descripcion, fecha: new Date(fecha), cultivo, lote, sublote, responsable,
        usuario: usuarioIdentificacion ? { identificacion: usuarioIdentificacion } : undefined,
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

          // Generar gasto por depreciación si el material alcanzó su límite de usos
          if (res.debeGenerarGastoDepreciacion) {
            const precioUnitario = Number(material.precio) || 0;
            const costoDepreciacion = precioUnitario;

            const gastoDepreciacion = gastoRepo.create({
              descripcion: `Depreciación: ${material.nombre} (agotó ${material.usosTotales} usos) - ${titulo}`,
              monto: parseFloat(costoDepreciacion.toFixed(2)),
              fecha: new Date(),
              tipo: TipoMovimiento.EGRESO,
              cultivo: cultivo ?? undefined,
              cantidad: 1,
              unidad: UnidadMedida.UNIDAD,
              precioUnitario: precioUnitario
            });
            await queryRunner.manager.save(gastoDepreciacion);
          }

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

          // NO CREAR GASTO AQUÍ - Se creará en la devolución final

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