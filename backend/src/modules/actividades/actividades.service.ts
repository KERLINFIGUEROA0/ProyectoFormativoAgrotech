// Reemplaza TODO el archivo: src/modules/actividades/actividades.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In, DataSource, Like } from 'typeorm';
import { Actividad } from './entities/actividade.entity';
import { CreateActividadDto } from './dto/create-actividade.dto';
import { UpdateActividadDto } from './dto/update-actividade.dto';
import { SearchActividadDto } from './dto/search-actividad.dto';
import { AsignarActividadDto } from './dto/asignar-actividad.dto';
import { DevolverMaterialesFinalDto } from './dto/devolver-materiales-final.dto';
import { SubmitRespuestaDto } from './dto/submit-respuesta.dto';
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
import { MovimientosService } from '../../movimientos/movimientos.service';
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
          // Usar el directorio temp-uploads del proyecto
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

  // --- FUNCIÓN HELPER PARA DESCONTAR MATERIALES ---
  private descontarMaterial(material: Material, cantidadUsada: number): { success: boolean, debeRegistrarEgreso: boolean } {
    if (material.tipoConsumo === TipoConsumo.NO_CONSUMIBLE) {
      // Para no consumibles, manejar por usos
      if (!material.usosTotales) {
        // Si no hay usos totales, asumir ilimitado, no descontar
        return { success: true, debeRegistrarEgreso: false };
      }
      material.usosActuales += cantidadUsada;
      let debeDescontar = false;
      while (material.usosActuales >= material.usosTotales) {
        if (material.cantidad <= 0) {
          return { success: false, debeRegistrarEgreso: false };
        }
        material.usosActuales -= material.usosTotales;
        material.cantidad -= 1;
        debeDescontar = true;
      }
      return { success: true, debeRegistrarEgreso: debeDescontar };
    }

    // Para consumibles: manejar unidades parciales si cantidadPorUnidad existe, sino descontar directamente
    if (!material.cantidadPorUnidad) {
      // Si no hay cantidad por unidad, descontar directamente (compatibilidad con materiales existentes)
      if (material.cantidad < cantidadUsada) {
        return { success: false, debeRegistrarEgreso: false };
      }
      material.cantidad -= cantidadUsada;
      return { success: true, debeRegistrarEgreso: true };
    }

    // Lógica para consumibles con unidades
    let unidadesAAbrir = 0;

    if (material.cantidadRestanteEnUnidadActual === null || material.cantidadRestanteEnUnidadActual === undefined) {
      // No hay unidad abierta, necesitamos abrir una
      if (cantidadUsada <= material.cantidadPorUnidad) {
        // Suficiente con abrir una unidad
        material.cantidadRestanteEnUnidadActual = material.cantidadPorUnidad - cantidadUsada;
        unidadesAAbrir = 1;
      } else {
        // Necesita más de una unidad
        unidadesAAbrir = Math.ceil(cantidadUsada / material.cantidadPorUnidad);
        material.cantidadRestanteEnUnidadActual = (unidadesAAbrir * material.cantidadPorUnidad) - cantidadUsada;
      }
    } else {
      // Hay una unidad parcialmente abierta
      let restante = material.cantidadRestanteEnUnidadActual;

      if (cantidadUsada <= restante) {
        // Suficiente en la unidad actual
        material.cantidadRestanteEnUnidadActual = restante - cantidadUsada;
        unidadesAAbrir = 0; // No necesitamos abrir más unidades
      } else {
        // Necesita abrir unidades adicionales
        let adicionalNecesario = cantidadUsada - restante;
        unidadesAAbrir = Math.ceil(adicionalNecesario / material.cantidadPorUnidad);
        material.cantidadRestanteEnUnidadActual = (unidadesAAbrir * material.cantidadPorUnidad) - adicionalNecesario;
      }
    }

    if (material.cantidad < unidadesAAbrir) {
      return { success: false, debeRegistrarEgreso: false }; // No hay suficientes unidades
    }

    material.cantidad -= unidadesAAbrir;
    return { success: true, debeRegistrarEgreso: true };
  }

  // --- FUNCIÓN HELPER PARA REVERTIR DESCUENTO DE MATERIALES ---
  private revertirDescontarMaterial(material: Material, cantidadDevuelta: number) {
    if (material.tipoConsumo === TipoConsumo.NO_CONSUMIBLE) {
      // Para no consumibles, manejar por usos
      if (!material.usosTotales) {
        // Si no hay usos totales, no revertir
        return;
      }
      material.usosActuales -= cantidadDevuelta;
      while (material.usosActuales < 0 && material.cantidad > 0) {
        material.usosActuales += material.usosTotales;
        material.cantidad += 1;
      }
      return;
    }

    // Para consumibles
    if (!material.cantidadPorUnidad) {
      // Si no hay cantidad por unidad, agregar directamente
      material.cantidad += cantidadDevuelta;
      return;
    }

    // Lógica para consumibles con unidades
    let unidadesADevolver = 0;

    if (material.cantidadRestanteEnUnidadActual !== null && material.cantidadRestanteEnUnidadActual !== undefined) {
      // Hay una unidad parcialmente abierta
      const espacioDisponible = material.cantidadPorUnidad - material.cantidadRestanteEnUnidadActual;
      if (cantidadDevuelta <= espacioDisponible) {
        // Cabe en la unidad actual
        material.cantidadRestanteEnUnidadActual += cantidadDevuelta;
        return;
      } else {
        // Llena la unidad actual y devuelve unidades completas
        const restante = cantidadDevuelta - espacioDisponible;
        unidadesADevolver = Math.floor(restante / material.cantidadPorUnidad);
        const resto = restante % material.cantidadPorUnidad;
        material.cantidadRestanteEnUnidadActual = material.cantidadPorUnidad - resto;
        material.cantidad += unidadesADevolver + 1; // +1 por la unidad que se llenó
        return;
      }
    } else {
      // No hay unidad abierta, devolver unidades completas
      unidadesADevolver = Math.floor(cantidadDevuelta / material.cantidadPorUnidad);
      const resto = cantidadDevuelta % material.cantidadPorUnidad;
      if (resto > 0) {
        material.cantidadRestanteEnUnidadActual = resto;
        material.cantidad += unidadesADevolver + 1;
      } else {
        material.cantidad += unidadesADevolver;
      }
    }
  }

  // --- MÉTODO 'create' ACTUALIZADO ---
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

      // --- 1. OBTENER EL NOMBRE DEL USUARIO ---
      const usuario = await queryRunner.manager.findOne(Usuario, {
        where: { identificacion: usuarioIdentificacion },
        select: ['nombre', 'apellidos'], // Solo traemos lo que necesitamos
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

      // (Lógica de materiales)
      if (materiales && materiales.length > 0) {
        for (const item of materiales) {
          // ... (lógica de buscar material y restar stock)
          const { materialId, cantidadUsada } = item;
          const material = await queryRunner.manager.findOne(Material, { where: { id: materialId } });
          if (!material) throw new NotFoundException(`El material con ID ${materialId} no existe.`);
          const resultado = this.descontarMaterial(material, cantidadUsada);
          if (!resultado.success) {
            throw new BadRequestException(`Stock insuficiente para ${material.nombre}.`);
          }
          await queryRunner.manager.save(material);

          // Registrar movimiento de salida
          await this.movimientosService.registrarMovimiento(
            TipoMovimiento.EGRESO,
            cantidadUsada,
            material.id,
            `Salida por creación de actividad: ${saved.titulo}`,
            `actividad-${saved.id}`
          );

          const nuevaUnion = this.actMaterialRepository.create({
            actividad: saved,
            material: material,
            cantidadUsada: cantidadUsada,
          });
          await queryRunner.manager.save(nuevaUnion);

          // --- 2. REGISTRO DE GASTO DE MATERIAL ---
          if (resultado.debeRegistrarEgreso) {
            let costoTotal = 0;
            if (material.tipoConsumo === TipoConsumo.CONSUMIBLE) {
              // Para consumibles, calcular costo proporcional si hay cantidadPorUnidad
              if (material.cantidadPorUnidad) {
                costoTotal = (Number(material.precio) || 0) * (cantidadUsada / material.cantidadPorUnidad);
              } else {
                costoTotal = (Number(material.precio) || 0) * cantidadUsada;
              }
            } else {
              // Para no consumibles, costo por unidad usada
              costoTotal = (Number(material.precio) || 0) * 1; // Ya que se deduce 1 unidad
            }
            if (costoTotal > 0) {
              const nuevoGasto = gastoRepo.create({
                descripcion: `Material ${material.tipoConsumo === TipoConsumo.CONSUMIBLE ? 'consumible' : 'no consumible'}: ${material.nombre} (Act: ${saved.titulo})`,
                monto: costoTotal,
                fecha: saved.fecha,
                tipo: TipoMovimiento.EGRESO,
                cultivo: cultivoEntidad ?? undefined,
              });
              await queryRunner.manager.save(nuevoGasto);
            }
          }
        }
      }

      // --- 3. DESCRIPCIÓN DE MANO DE OBRA MEJORADA ---
      const costoManoDeObra = (Number(horas) || 0) * (Number(tarifaHora) || 0);
      if (costoManoDeObra > 0) {
        const nuevoGasto = gastoRepo.create({
          descripcion: `Mano de obra: ${nombreUsuario} (Act: ${saved.titulo})`,
          monto: costoManoDeObra,
          fecha: saved.fecha,
          tipo: TipoMovimiento.EGRESO,
          cultivo: cultivoEntidad ?? undefined,
        });
        await queryRunner.manager.save(nuevoGasto);
      }
      // --- FIN DE CAMBIOS EN 'create' ---

      await queryRunner.commitTransaction();
      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ... (findAll con filtrado por asignaciones específicas) ...
  async findAll(userIdentificacion?: number) {
    if (!userIdentificacion) {
      // Si no hay usuario autenticado, devolver vacío
      return [];
    }

    // Obtener el rol del usuario
    const user = await this.usuarioRepository.findOne({
      where: { identificacion: userIdentificacion },
      relations: ['tipoUsuario'],
    });
    const userRole = user?.tipoUsuario?.nombre;

    // Para instructores y admin: ver todas las actividades
    if (userRole && (userRole.toLowerCase() === 'instructor' || userRole.toLowerCase() === 'admin')) {
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

      return query.getMany();
    } else {
      // Para aprendices y pasantes: filtrar solo las actividades asignadas al usuario
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

      const actividades = await query.getMany();

      // Obtener el nombre completo del usuario
      const usuario = await this.usuarioRepository.findOne({
        where: { identificacion: userIdentificacion },
        select: ['nombre', 'apellidos']
      });
      const nombreCompleto = `${usuario?.nombre || ''} ${usuario?.apellidos || ''}`.trim();

      // Filtrar actividades donde el usuario esté asignado
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

  // --- MÉTODO 'update' ACTUALIZADO ---
  async update(id: number, dto: UpdateActividadDto) {
    const { materiales, cultivo: cultivoId, horas, tarifaHora, ...dtoActividad } = dto;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // --- 1. CARGAR RELACIÓN DE 'usuario' ---
      const actividad = await queryRunner.manager.findOne(Actividad, {
        where: { id },
        relations: ['actividadMaterial', 'actividadMaterial.material', 'cultivo', 'usuario'], // <-- AÑADIDO 'usuario'
      });
      if (!actividad) {
        throw new NotFoundException(`Actividad con ID ${id} no encontrada.`);
      }

      const gastoRepo = queryRunner.manager.getRepository(Gasto);
      const materialRepo = queryRunner.manager.getRepository(Material);
      const actMaterialRepo = queryRunner.manager.getRepository(ActividadMaterial);

      // Obtenemos el nombre del usuario asignado (ej. "David")
      const nombreUsuario = `${actividad.usuario?.nombre || 'Usuario'} ${actividad.usuario?.apellidos || ''}`.trim();

      // --- 4. REVERTIR GASTOS Y MATERIALES ANTIGUOS ---
      // (Lógica de revertir stock de materiales)
      if (actividad.actividadMaterial && actividad.actividadMaterial.length > 0) {
        for (const am of actividad.actividadMaterial) {
          const material = await materialRepo.findOneBy({ id: am.material.id });
          if (material) {
            // Revertir usando la lógica inversa de descontar
            this.revertirDescontarMaterial(material, am.cantidadUsada);
            await queryRunner.manager.save(material);
          }
          await queryRunner.manager.remove(am);
        }
      }

      // --- 2. BORRAR GASTOS USANDO EL TÍTULO ANTIGUO ---
      // (Esta es la forma más segura que teníamos)
      if (actividad.cultivo) {
        await gastoRepo.delete({
          cultivo: { id: actividad.cultivo.id },
          descripcion: Like(`%(Act: ${actividad.titulo})%`) // Borra todo lo que contenga `(Act: TítuloAntiguo)`
        });
      }

      // --- 5. ACTUALIZAR LOS DATOS SIMPLES DE LA ACTIVIDAD ---
      // (Lógica de actualizar cultivo, horas y tarifa queda igual)
      let cultivoEntidad: Cultivo | null = actividad.cultivo;
      if (cultivoId) {
        cultivoEntidad = await queryRunner.manager.findOne(Cultivo, { where: { id: cultivoId } });
        if (!cultivoEntidad) {
          throw new NotFoundException(`El cultivo con ID ${cultivoId} no existe.`);
        }
      }
      Object.assign(actividad, dtoActividad);
      actividad.cultivo = cultivoEntidad;
      actividad.horas = horas;
      actividad.tarifaHora = tarifaHora;

      const saved = await queryRunner.manager.save(actividad); // 'saved' ahora tiene el título NUEVO

      // --- 6. APLICAR LÓGICA DE 'CREATE' PARA LOS NUEVOS MATERIALES ---
      if (materiales && materiales.length > 0) {
        for (const item of materiales) {
          // ... (lógica de restar stock y crear ActividadMaterial) ...
          const { materialId, cantidadUsada } = item;
          const material = await materialRepo.findOne({ where: { id: materialId } });
          if (!material) throw new NotFoundException(`El material con ID ${materialId} no existe.`);
          const resultado = this.descontarMaterial(material, cantidadUsada);
          if (!resultado.success) {
            throw new BadRequestException(`Stock insuficiente para ${material.nombre}.`);
          }
          await queryRunner.manager.save(material);

          // Registrar movimiento de salida
          await this.movimientosService.registrarMovimiento(
            TipoMovimiento.EGRESO,
            cantidadUsada,
            material.id,
            `Salida por actualización de actividad: ${saved.titulo}`,
            `actividad-${saved.id}`
          );

          const nuevaUnion = actMaterialRepo.create({
            actividad: saved,
            material: material,
            cantidadUsada: cantidadUsada,
          });
          await queryRunner.manager.save(nuevaUnion);

          // --- 3. REGISTRO DE GASTO DE MATERIAL ---
          if (resultado.debeRegistrarEgreso) {
            let costoTotal = 0;
            if (material.tipoConsumo === TipoConsumo.CONSUMIBLE) {
              // Para consumibles, calcular costo proporcional si hay cantidadPorUnidad
              if (material.cantidadPorUnidad) {
                costoTotal = (Number(material.precio) || 0) * (cantidadUsada / material.cantidadPorUnidad);
              } else {
                costoTotal = (Number(material.precio) || 0) * cantidadUsada;
              }
            } else {
              // Para no consumibles, costo por unidad usada
              costoTotal = (Number(material.precio) || 0) * 1; // Ya que se deduce 1 unidad
            }
            if (costoTotal > 0) {
              const nuevoGasto = gastoRepo.create({
                descripcion: `Material ${material.tipoConsumo === TipoConsumo.CONSUMIBLE ? 'consumible' : 'no consumible'}: ${material.nombre} (Act: ${saved.titulo})`,
                monto: costoTotal,
                fecha: saved.fecha,
                tipo: TipoMovimiento.EGRESO,
                cultivo: cultivoEntidad ?? undefined,
              });
              await queryRunner.manager.save(nuevoGasto);
            }
          }
        }
      }

      // --- 4. DESCRIPCIÓN DE MANO DE OBRA MEJORADA ---
      const costoManoDeObra = (Number(horas) || 0) * (Number(tarifaHora) || 0);
      if (costoManoDeObra > 0) {
        const nuevoGasto = gastoRepo.create({
          descripcion: `Mano de obra: ${nombreUsuario} (Act: ${saved.titulo})`, // <-- Nombre de "David" + Título NUEVO
          monto: costoManoDeObra,
          fecha: saved.fecha,
          tipo: TipoMovimiento.EGRESO,
          cultivo: cultivoEntidad ?? undefined,
        });
        await queryRunner.manager.save(nuevoGasto);
      }
      // --- FIN DE CAMBIOS EN 'update' ---

      await queryRunner.commitTransaction();
      return this.findOne(id);

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ... (remove, search, y asignarActividad quedan igual) ...
  async remove(id: number) {
    const actividad = await this.findOne(id);
    if (!actividad) {
      return { message: 'Actividad no encontrada' };
    }
    await this.actividadRepository.delete(id);
    return { message: 'Actividad eliminada correctamente' };
  }

  async search(dto: SearchActividadDto) {
    // Implementa tu lógica de búsqueda aquí si es necesario
  }

  async enviarRespuesta(id: number, dto: CreateRespuestaDto, userIdentificacion: number) {
    console.log('📨 enviarRespuesta called for actividad:', id, 'user:', userIdentificacion);
    const actividad = await this.findOne(id);
    if (!actividad) {
      throw new NotFoundException(`Actividad con ID ${id} no encontrada.`);
    }

    // Verificar que el usuario esté asignado a la actividad
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
      } catch (error) {
        if (error instanceof BadRequestException) throw error;
        // Si hay error al parsear, permitir por ahora (compatibilidad)
      }
    }

    // Verificar si ya existe una respuesta pendiente o rechazada
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
        // Eliminar archivos físicos anteriores antes de actualizar
        if (existingRespuesta.archivos && existingRespuesta.archivos.trim() !== '') {
          this.eliminarArchivosFisicos(existingRespuesta.archivos);
        }

        // Actualizar respuesta existente
        existingRespuesta.descripcion = dto.descripcion || '';
        existingRespuesta.archivos = dto.archivos || '';
        existingRespuesta.estado = 'pendiente';
        existingRespuesta.comentarioInstructor = undefined;
        saved = await queryRunner.manager.save(existingRespuesta);
      } else {
        // Crear nueva respuesta
        const respuesta = this.respuestaRepository.create({
          descripcion: dto.descripcion,
          archivos: dto.archivos,
          actividad: { id },
          usuario: { identificacion: userIdentificacion },
        });

        saved = await queryRunner.manager.save(respuesta);
      }

      // Procesar devoluciones de materiales si existen
      if (dto.materialesDevueltos && dto.materialesDevueltos.length > 0) {
        for (const devolucion of dto.materialesDevueltos) {
          const material = await queryRunner.manager.findOne(Material, {
            where: { id: devolucion.materialId }
          });

          if (!material) {
            throw new NotFoundException(`Material con ID ${devolucion.materialId} no encontrado.`);
          }

          // Aumentar el stock del material devuelto
          this.revertirDescontarMaterial(material, devolucion.cantidadDevuelta);

          await queryRunner.manager.save(material);

          // Registrar movimiento de entrada por devolución
          await this.movimientosService.registrarMovimiento(
            TipoMovimiento.INGRESO,
            devolucion.cantidadDevuelta,
            material.id,
            `Devolución por respuesta de actividad: ${actividad.titulo}`,
            `devolucion-actividad-${actividad.id}-usuario-${userIdentificacion}`
          );
        }
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
      .leftJoinAndSelect('usuario.ficha', 'ficha')
      .where('respuesta.actividad = :actividadId', { actividadId: id })
      .orderBy('respuesta.fechaEnvio', 'DESC');

    // Si es aprendiz, solo ver su respuesta
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
      relations: ['actividad'],
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

    return savedRespuesta;
  }

  async calificarActividad(id: number, dto: CalificarActividadDto, userRole?: string) {
    if (userRole?.toLowerCase() !== 'instructor' && userRole?.toLowerCase() !== 'admin') {
      throw new BadRequestException('Solo instructores y administradores pueden calificar actividades.');
    }

    const actividad = await this.findOne(id);
    if (!actividad) {
      throw new NotFoundException(`Actividad con ID ${id} no encontrada.`);
    }

    actividad.calificacion = dto.calificacion;
    actividad.comentarioInstructor = dto.comentarioInstructor;

    // El estado se actualizará automáticamente por verificarEstadoActividad
    // cuando se califiquen las respuestas individuales
    return this.actividadRepository.save(actividad);
  }

  async generarReporteActividad(id: number) {
    const actividad = await this.findOne(id);
    if (!actividad) {
      throw new NotFoundException(`Actividad con ID ${id} no encontrada.`);
    }

    let asignados: string[] = [];
    if (actividad.asignados) {
      try {
        asignados = JSON.parse(actividad.asignados);
      } catch (error) {
        asignados = [];
      }
    }

    // Obtener todas las respuestas
    const respuestas = await this.respuestaRepository.find({
      where: { actividad: { id } },
      relations: ['usuario'],
    });

    // Crear mapa de respuestas por nombre completo
    const respuestasMap = new Map<string, RespuestaActividad>();
    respuestas.forEach(r => {
      const nombreCompleto = `${r.usuario.nombre} ${r.usuario.apellidos}`.trim();
      respuestasMap.set(nombreCompleto, r);
    });

    // Generar reporte
    const reporte = asignados.map(nombre => {
      const respuesta = respuestasMap.get(nombre);
      return {
        nombre,
        estado: respuesta ? respuesta.estado : 'pendiente',
        fechaEnvio: respuesta ? respuesta.fechaEnvio : null,
        comentarioInstructor: respuesta ? respuesta.comentarioInstructor : null,
      };
    });

    return {
      actividad: {
        id: actividad.id,
        titulo: actividad.titulo,
        descripcion: actividad.descripcion,
        estado: actividad.estado,
      },
      reporte,
    };
  }

  async generarReporteExcel(id: number): Promise<Buffer> {
    const data = await this.generarReporteActividad(id);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte Actividad');

    // Título
    worksheet.addRow(['Reporte de Actividad']);
    worksheet.addRow([`Título: ${data.actividad.titulo}`]);
    worksheet.addRow([`Descripción: ${data.actividad.descripcion}`]);
    worksheet.addRow([`Estado: ${data.actividad.estado}`]);
    worksheet.addRow([]); // Línea vacía

    // Encabezados
    worksheet.addRow(['Nombre', 'Estado', 'Fecha de Envío', 'Comentario Instructor']);

    // Datos
    data.reporte.forEach(item => {
      worksheet.addRow([
        item.nombre,
        item.estado,
        item.fechaEnvio ? item.fechaEnvio.toISOString().split('T')[0] : 'N/A',
        item.comentarioInstructor || 'N/A',
      ]);
    });

    // Estilos
    worksheet.getColumn(1).width = 30;
    worksheet.getColumn(2).width = 15;
    worksheet.getColumn(3).width = 15;
    worksheet.getColumn(4).width = 30;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async devolverMaterialesFinal(id: number, dto: DevolverMaterialesFinalDto, userIdentificacion: number) {
    const actividad = await this.findOne(id);
    if (!actividad) {
      throw new NotFoundException(`Actividad con ID ${id} no encontrada.`);
    }

    // Verificar que el usuario sea el responsable
    if (!actividad.responsable || actividad.responsable.identificacion !== userIdentificacion) {
      throw new BadRequestException('Solo el responsable designado puede devolver materiales al finalizar la actividad.');
    }

    // Verificar que la actividad esté finalizada
     if (actividad.estado !== 'completado') {
       throw new BadRequestException('Los materiales solo pueden devolverse cuando la actividad esté finalizada.');
     }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const devolucion of dto.materialesDevueltos) {
        const material = await queryRunner.manager.findOne(Material, {
          where: { id: devolucion.materialId }
        });

        if (!material) {
          throw new NotFoundException(`Material con ID ${devolucion.materialId} no encontrado.`);
        }

        // Devolver al stock
        this.revertirDescontarMaterial(material, devolucion.cantidadDevuelta);

        await queryRunner.manager.save(material);

        // Registrar movimiento de ingreso por devolución final
        await this.movimientosService.registrarMovimiento(
          TipoMovimiento.INGRESO,
          devolucion.cantidadDevuelta,
          material.id,
          `Devolución final por actividad completada: ${actividad.titulo}`,
          `devolucion-final-actividad-${actividad.id}-responsable-${userIdentificacion}`
        );
      }

      await queryRunner.commitTransaction();
      return { message: 'Materiales devueltos exitosamente.' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async asignarActividad(dto: AsignarActividadDto) {
     const { cultivo: cultivoId, lote: loteId, sublote: subloteId, aprendices, titulo, descripcion, fecha, materiales, archivoInicial, responsable: responsableId } = dto;
     const cultivo = await this.cultivoRepository.findOneBy({ id: cultivoId });
     if (!cultivo) throw new NotFoundException(`El cultivo con ID ${cultivoId} no fue encontrado.`);

     let lote: Lote | undefined;
     if (loteId) {
       lote = await this.loteRepository.findOneBy({ id: loteId }) || undefined;
       if (!lote) throw new NotFoundException(`El lote con ID ${loteId} no fue encontrado.`);
     }

     let sublote: Sublote | undefined;
     if (subloteId) {
       sublote = await this.subloteRepository.findOneBy({ id: subloteId }) || undefined;
       if (!sublote) throw new NotFoundException(`El sublote con ID ${subloteId} no fue encontrado.`);
     }

     let responsable: Usuario | undefined;
     if (responsableId) {
       responsable = await this.usuarioRepository.findOneBy({ identificacion: responsableId }) || undefined;
       if (!responsable) throw new NotFoundException(`El usuario responsable con ID ${responsableId} no fue encontrado.`);
       if (!aprendices.includes(responsableId)) throw new BadRequestException('El responsable debe estar incluido en la lista de aprendices.');
     }

     if (aprendices.length === 0) throw new BadRequestException('Debe seleccionar al menos un aprendiz.');
    const usuariosEncontrados = await this.usuarioRepository.find({ where: { identificacion: In(aprendices) } });
    if (usuariosEncontrados.length !== aprendices.length) {
      const idsEncontrados = usuariosEncontrados.map((u) => u.identificacion);
      const idsNoEncontrados = aprendices.filter((id) => !idsEncontrados.includes(id));
      throw new NotFoundException(`Los siguientes aprendices no existen: ${idsNoEncontrados.join(', ')}`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const fechaActividad = new Date(fecha);

      // Obtener nombres de los usuarios asignados
      const usuariosAsignados = await this.usuarioRepository.find({
        where: { identificacion: In(aprendices) },
        select: ['nombre', 'apellidos']
      });
      const nombresAsignados = usuariosAsignados.map(u => `${u.nombre} ${u.apellidos}`);

      // Crear UNA actividad compartida
      const actividad = this.actividadRepository.create({
        titulo,
        descripcion,
        fecha: fechaActividad,
        cultivo,
        lote,
        sublote,
        responsable,
        estado: 'pendiente',
        asignados: JSON.stringify(nombresAsignados),
        archivoInicial,
      });
      const savedActividad = await queryRunner.manager.save(actividad);

      // Crear asignaciones específicas en actividad_usuario
      // Temporalmente deshabilitado hasta ejecutar migración
      /*
      for (const identificacion of aprendices) {
        const usuario = usuariosEncontrados.find(u => u.identificacion === identificacion);
        if (usuario) {
          const asignacion = this.actividadUsuarioRepository.create({
            actividad: savedActividad,
            usuario: usuario,
          });
          await queryRunner.manager.save(asignacion);
        }
      }
      */

      // Manejar materiales
      if (materiales && materiales.length > 0) {
        const gastoRepo = queryRunner.manager.getRepository(Gasto);
        for (const item of materiales) {
          const material = await queryRunner.manager.findOne(Material, { where: { id: item.materialId } });
          if (!material) throw new NotFoundException(`Material ${item.materialId} no encontrado.`);
          const cantidadTotalUsada = item.cantidadUsada; // Cantidad total para la actividad
          const resultado = this.descontarMaterial(material, cantidadTotalUsada);
          if (!resultado.success) {
            throw new BadRequestException(`Stock insuficiente para ${material.nombre}.`);
          }
          await queryRunner.manager.save(material);
          // Registrar gasto
          if (resultado.debeRegistrarEgreso) {
            let costoTotal = 0;
            if (material.tipoConsumo === TipoConsumo.CONSUMIBLE) {
              // Para consumibles, calcular costo proporcional si hay cantidadPorUnidad
              if (material.cantidadPorUnidad) {
                costoTotal = (Number(material.precio) || 0) * (cantidadTotalUsada / material.cantidadPorUnidad);
              } else {
                costoTotal = (Number(material.precio) || 0) * cantidadTotalUsada;
              }
            } else {
              // Para no consumibles, costo por unidad usada
              costoTotal = (Number(material.precio) || 0) * 1; // Ya que se deduce 1 unidad
            }
            if (costoTotal > 0) {
              const nuevoGasto = gastoRepo.create({
                descripcion: `Material ${material.tipoConsumo === TipoConsumo.CONSUMIBLE ? 'consumible' : 'no consumible'}: ${material.nombre} (Asignación: ${titulo})`,
                monto: costoTotal,
                fecha: fechaActividad,
                tipo: TipoMovimiento.EGRESO,
                cultivo: cultivo,
              });
              await queryRunner.manager.save(nuevoGasto);
            }
          }

          // Registrar movimiento de salida
          await this.movimientosService.registrarMovimiento(
            TipoMovimiento.EGRESO,
            cantidadTotalUsada,
            material.id,
            `Salida por asignación de actividad: ${titulo}`,
            `actividad-${savedActividad.id}`
          );
          // Crear ActividadMaterial para la actividad compartida
          const nuevaUnion = this.actMaterialRepository.create({
            actividad: savedActividad,
            material: material,
            cantidadUsada: item.cantidadUsada, // Cantidad por usuario
          });
          await queryRunner.manager.save(nuevaUnion);
        }
      }

      await queryRunner.commitTransaction();
      return { actividad: savedActividad };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}