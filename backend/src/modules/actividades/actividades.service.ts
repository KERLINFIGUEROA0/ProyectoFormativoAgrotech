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
import { SubmitRespuestaDto } from './dto/submit-respuesta.dto';
import { CalificarActividadDto } from './dto/calificar-actividad.dto';
import { CreateRespuestaDto, CalificarRespuestaDto } from './dto/create-respuesta.dto';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Cultivo } from '../cultivos/entities/cultivo.entity';
import { Material } from '../materiales/entities/materiale.entity';
import { ActividadMaterial } from '../actividades_materiales/entities/actividades_materiale.entity';
import { RespuestaActividad } from './entities/respuesta_actividad.entity';
import { ActividadUsuario } from './entities/actividad_usuario.entity';
import { Gasto } from '../gastos_produccion/entities/gastos_produccion.entity';
import { TipoMovimiento } from '../../common/enums/tipo-movimiento.enum';
import { TipoConsumo } from '../../common/enums/tipo-consumo.enum';
import * as fs from 'fs';
import * as path from 'path';

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
    @InjectRepository(RespuestaActividad)
    private readonly respuestaRepository: Repository<RespuestaActividad>,
    @InjectRepository(ActividadUsuario)
    private readonly actividadUsuarioRepository: Repository<ActividadUsuario>,
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
    let restante = material.cantidadRestanteEnUnidadActual ?? material.cantidadPorUnidad;

    if (cantidadUsada <= restante) {
      // Suficiente en la unidad actual
      material.cantidadRestanteEnUnidadActual = restante - cantidadUsada;
      return { success: true, debeRegistrarEgreso: true };
    } else {
      // Necesita abrir nuevas unidades
      let adicionalNecesario = cantidadUsada - restante;
      let unidadesAAbrir = Math.ceil(adicionalNecesario / material.cantidadPorUnidad);

      if (material.cantidad < unidadesAAbrir) {
        return { success: false, debeRegistrarEgreso: false }; // No hay suficientes unidades
      }

      // Usar el restante de la actual y abrir nuevas
      material.cantidadRestanteEnUnidadActual = (unidadesAAbrir * material.cantidadPorUnidad) - adicionalNecesario;
      material.cantidad -= unidadesAAbrir;
      return { success: true, debeRegistrarEgreso: true };
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
          const nuevaUnion = this.actMaterialRepository.create({
            actividad: saved,
            material: material,
            cantidadUsada: cantidadUsada,
          });
          await queryRunner.manager.save(nuevaUnion);

          // --- 2. DESCRIPCIÓN DE GASTO DE MATERIAL MEJORADA ---
          if (resultado.debeRegistrarEgreso) {
            let costoTotal = 0;
            if (material.tipoConsumo === TipoConsumo.CONSUMIBLE && material.cantidadPorUnidad) {
              // Para consumibles, costo proporcional al contenido usado
              costoTotal = (Number(material.precio) || 0) * (cantidadUsada / material.cantidadPorUnidad);
            } else {
              // Para no consumibles, costo por unidad descontada
              costoTotal = (Number(material.precio) || 0) * cantidadUsada;
            }
            if (costoTotal > 0) {
              const nuevoGasto = gastoRepo.create({
                descripcion: `Material: ${material.nombre} (Act: ${saved.titulo})`,
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
        'actividadMaterial',
        'actividadMaterial.material',
      ],
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
            // Para revertir, simplemente agregar de vuelta la cantidad usada
            material.cantidad += am.cantidadUsada;
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
          const nuevaUnion = actMaterialRepo.create({
            actividad: saved,
            material: material,
            cantidadUsada: cantidadUsada,
          });
          await queryRunner.manager.save(nuevaUnion);

          // --- 3. DESCRIPCIÓN DE GASTO DE MATERIAL MEJORADA ---
          if (resultado.debeRegistrarEgreso) {
            let costoTotal = 0;
            if (material.tipoConsumo === TipoConsumo.CONSUMIBLE && material.cantidadPorUnidad) {
              // Para consumibles, costo proporcional al contenido usado
              costoTotal = (Number(material.precio) || 0) * (cantidadUsada / material.cantidadPorUnidad);
            } else {
              // Para no consumibles, costo por unidad descontada
              costoTotal = (Number(material.precio) || 0) * cantidadUsada;
            }
            if (costoTotal > 0) {
              const nuevoGasto = gastoRepo.create({
                descripcion: `Material: ${material.nombre} (Act: ${saved.titulo})`, // <-- Título NUEVO
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
      const saved = await this.respuestaRepository.save(existingRespuesta);

      // Cambiar estado de la actividad a 'enviado'
      actividad.estado = 'enviado';
      await this.actividadRepository.save(actividad);

      return saved;
    } else {
      // Crear nueva respuesta
      const respuesta = this.respuestaRepository.create({
        descripcion: dto.descripcion,
        archivos: dto.archivos,
        actividad: { id },
        usuario: { identificacion: userIdentificacion },
      });

      const saved = await this.respuestaRepository.save(respuesta);

      // Cambiar estado de la actividad a 'enviado'
      actividad.estado = 'enviado';
      await this.actividadRepository.save(actividad);

      return saved;
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

    // Actualizar estado de la actividad basado en todas las respuestas
    const actividad = respuesta.actividad;

    // Obtener todas las respuestas de esta actividad
    const todasLasRespuestas = await this.respuestaRepository.find({
      where: { actividad: { id: actividad.id } }
    });

    if (dto.estado === 'aprobado') {
      // Verificar si todas las respuestas están aprobadas
      const todasAprobadas = todasLasRespuestas.every(r => r.estado === 'aprobado');
      if (todasAprobadas) {
        actividad.estado = 'completado';
      } else {
        actividad.estado = 'enviado'; // Aún hay respuestas pendientes
      }
    } else {
      // Si se rechaza alguna respuesta, la actividad queda en estado rechazado
      actividad.estado = 'rechazado';
    }
    await this.actividadRepository.save(actividad);

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
    actividad.estado = dto.calificacion === 'aprobado' ? 'aprobado' : 'rechazado';

    return this.actividadRepository.save(actividad);
  }

  async asignarActividad(dto: AsignarActividadDto) {
    const { cultivo: cultivoId, aprendices, titulo, descripcion, fecha, materiales, archivoInicial } = dto;
    const cultivo = await this.cultivoRepository.findOneBy({ id: cultivoId });
    if (!cultivo) throw new NotFoundException(`El cultivo con ID ${cultivoId} no fue encontrado.`);
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
          const cantidadTotalUsada = item.cantidadUsada * aprendices.length;
          const resultado = this.descontarMaterial(material, cantidadTotalUsada);
          if (!resultado.success) {
            throw new BadRequestException(`Stock insuficiente para ${material.nombre}.`);
          }
          await queryRunner.manager.save(material);
          if (resultado.debeRegistrarEgreso) {
            let costoTotal = 0;
            if (material.tipoConsumo === TipoConsumo.CONSUMIBLE && material.cantidadPorUnidad) {
              // Para consumibles, costo proporcional al contenido usado
              costoTotal = (Number(material.precio) || 0) * (cantidadTotalUsada / material.cantidadPorUnidad);
            } else {
              // Para no consumibles, costo por unidad descontada
              costoTotal = (Number(material.precio) || 0) * cantidadTotalUsada;
            }
            if (costoTotal > 0) {
              const nuevoGasto = gastoRepo.create({
                descripcion: `Costo material: ${material.nombre} (Asignación: ${titulo})`,
                monto: costoTotal,
                fecha: fechaActividad,
                tipo: TipoMovimiento.EGRESO,
                cultivo: cultivo,
              });
              await queryRunner.manager.save(nuevoGasto);
            }
          }
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