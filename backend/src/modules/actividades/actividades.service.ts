import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In, DataSource } from 'typeorm';
import { Actividad } from './entities/actividade.entity';
import { CreateActividadDto } from './dto/create-actividade.dto';
import { UpdateActividadDto } from './dto/update-actividade.dto';
import { SearchActividadDto } from './dto/search-actividad.dto';
import { AsignarActividadDto } from './dto/asignar-actividad.dto';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Cultivo } from '../cultivos/entities/cultivo.entity';
import { Material } from '../materiales/entities/materiale.entity';
import { ActividadMaterial } from '../actividades_materiales/entities/actividades_materiale.entity';

@Injectable()
export class ActividadesService {
  constructor(
    private readonly dataSource: DataSource, // Para transacciones
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
  ) {}

  // --- INICIO DE LA LÓGICA DE CREATE (MODIFICADA) ---
  async create(dto: CreateActividadDto, usuarioIdentificacion: number) {
    // 1. Extraemos los materiales del DTO
    const { materiales, ...dtoActividad } = dto;

    // 2. Iniciamos la transacción
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 3. Creamos la actividad (con el queryRunner)
      const actividad = this.actividadRepository.create({
        ...dtoActividad,
        usuario: { identificacion: usuarioIdentificacion },
        cultivo: dto.cultivo ? { id: dto.cultivo } : undefined,
        estado: dto.estado || 'pendiente',
      });
      const saved = await queryRunner.manager.save(actividad);

      // 4. Procesamos los materiales (si existen)
      if (materiales && materiales.length > 0) {
        for (const item of materiales) {
          const { materialId, cantidadUsada } = item;

          // Buscar el material (usando el queryRunner)
          const material = await queryRunner.manager.findOne(Material, {
            where: { id: materialId },
          });

          if (!material) {
            throw new NotFoundException(
              `El material con ID ${materialId} no existe.`,
            );
          }

          // ¡LA LÓGICA CLAVE!
          if (material.cantidad < cantidadUsada) {
            throw new BadRequestException(
              `Stock insuficiente para ${material.nombre}. Disponible: ${material.cantidad}, Solicitado: ${cantidadUsada}`,
            );
          }

          // Restamos el stock
          material.cantidad -= cantidadUsada;
          await queryRunner.manager.save(material);

          // Creamos el registro en la tabla de unión
          const nuevaUnion = this.actMaterialRepository.create({
            actividad: saved,
            material: material,
            cantidadUsada: cantidadUsada,
          });
          await queryRunner.manager.save(nuevaUnion);
        }
      }

      // 5. Si todo salió bien, confirmamos la transacción
      await queryRunner.commitTransaction();
      return saved;
    } catch (error) {
      // 6. Si algo falla, revertimos todo
      await queryRunner.rollbackTransaction();
      // Re-lanzamos el error (sea de stock o de BD)
      throw error;
    } finally {
      // 7. Siempre liberamos el queryRunner
      await queryRunner.release();
    }
  }
  // --- FIN DE LA LÓGICA DE CREATE ---

  async findAll() {
    const actividades = await this.actividadRepository.find({
      // --- MODIFICACIÓN: Cargar las relaciones de materiales ---
      relations: [
        'usuario',
        'cultivo',
        'actividadMaterial',
        'actividadMaterial.material',
      ],
    });
    // (Tu .forEach() estaba vacío, así que lo omití)
    return actividades;
  }

  async findOne(id: number) {
    const actividad = await this.actividadRepository.findOne({
      where: { id },
      // --- MODIFICACIÓN: Cargar las relaciones de materiales ---
      relations: [
        'usuario',
        'cultivo',
        'actividadMaterial',
        'actividadMaterial.material',
      ],
    });
    return actividad;
  }

  // (El método 'update' se mantiene como lo tenías. Si también necesitas
  // que 'update' modifique materiales, la lógica sería más compleja)
  async update(id: number, dto: UpdateActividadDto) {
    const updateData: any = {};

    if (dto.titulo !== undefined) updateData.titulo = dto.titulo;
    if (dto.fecha !== undefined) updateData.fecha = dto.fecha;
    if (dto.descripcion !== undefined) updateData.descripcion = dto.descripcion;
    if (dto.img !== undefined) updateData.img = dto.img;
    if (dto.estado !== undefined) updateData.estado = dto.estado;

    if (dto.usuario !== undefined) {
      updateData.usuario = { identificacion: dto.usuario };
    }
    if (dto.cultivo !== undefined) {
      updateData.cultivo = { id: dto.cultivo };
    }

    // (Nota: La lógica para actualizar materiales no está implementada aquí)

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No hay campos válidos para actualizar');
    }

    await this.actividadRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: number) {
    const actividad = await this.findOne(id);
    if (!actividad) {
      return { message: 'Actividad no encontrada' };
    }
    // (Gracias a 'onDelete: CASCADE' en las entidades,
    // los registros de 'ActividadMaterial' se borrarán automáticamente)
    await this.actividadRepository.delete(id);
    return { message: 'Actividad eliminada correctamente' };
  }

  async search(dto: SearchActividadDto) {
    // (Lógica de búsqueda pendiente)
  }

  // --- INICIO DE LA LÓGICA DE ASIGNAR ACTIVIDAD (MODIFICADA) ---
  async asignarActividad(dto: AsignarActividadDto) {
    // 1. Extraer materiales
    const {
      cultivo: cultivoId,
      aprendices,
      titulo,
      descripcion,
      fecha,
      materiales,
    } = dto;

    // 2. Verificar que el cultivo exista
    const cultivo = await this.cultivoRepository.findOneBy({ id: cultivoId });
    if (!cultivo) {
      throw new NotFoundException(
        `El cultivo con ID ${cultivoId} no fue encontrado.`,
      );
    }

    // 3. Verificar que todos los aprendices existan
    if (aprendices.length === 0) {
      throw new BadRequestException('Debe seleccionar al menos un aprendiz.');
    }
    const usuariosEncontrados = await this.usuarioRepository.find({
      where: { identificacion: In(aprendices) },
    });
    if (usuariosEncontrados.length !== aprendices.length) {
      const idsEncontrados = usuariosEncontrados.map((u) => u.identificacion);
      const idsNoEncontrados = aprendices.filter(
        (id) => !idsEncontrados.includes(id),
      );
      throw new NotFoundException(
        `Los siguientes aprendices no existen: ${idsNoEncontrados.join(', ')}`,
      );
    }

    // 4. Iniciar Transacción
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const fechaActividad = new Date(fecha);
      const actividadesAGuardar: Actividad[] = [];

      // 5. Crear las actividades (usando queryRunner.manager)
      for (const identificacion of aprendices) {
        const nuevaActividad = this.actividadRepository.create({
          titulo,
          descripcion,
          fecha: fechaActividad,
          cultivo, // Usar la entidad completa
          usuario: { identificacion }, // TypeORM se encarga de la relación
          estado: 'pendiente',
        });
        // ¡Importante! Guardar CADA actividad para obtener su ID
        const saved = await queryRunner.manager.save(nuevaActividad);
        actividadesAGuardar.push(saved);
      }

      // 6. Procesar materiales (usando queryRunner.manager)
      if (materiales && materiales.length > 0) {
        // Aplicamos el descuento de stock UNA SOLA VEZ
        for (const item of materiales) {
          const material = await queryRunner.manager.findOne(Material, {
            where: { id: item.materialId },
          });
          if (!material)
            throw new NotFoundException(
              `Material ${item.materialId} no encontrado.`,
            );

          // La cantidad total usada es (cantidad por aprendiz * número de aprendices)
          const cantidadTotalUsada = item.cantidadUsada * aprendices.length;

          if (material.cantidad < cantidadTotalUsada) {
            throw new BadRequestException(
              `Stock insuficiente para ${material.nombre}. Se necesitan ${cantidadTotalUsada}, disponibles: ${material.cantidad}`,
            );
          }
          material.cantidad -= cantidadTotalUsada;
          await queryRunner.manager.save(material);

          // Ahora, creamos el registro de unión para CADA actividad creada
          for (const actividad of actividadesAGuardar) {
            const nuevaUnion = this.actMaterialRepository.create({
              actividad: actividad,
              material: material,
              cantidadUsada: item.cantidadUsada, // Guardamos la cantidad por aprendiz
            });
            await queryRunner.manager.save(nuevaUnion);
          }
        }
      }

      // 7. Confirmar transacción
      await queryRunner.commitTransaction();
      return actividadesAGuardar;
    } catch (error) {
      // 8. Revertir
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // 9. Liberar
      await queryRunner.release();
    }
  }
  // --- FIN DE LA LÓGICA DE ASIGNAR ACTIVIDAD ---
}