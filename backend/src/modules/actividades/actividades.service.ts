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
// --- 1. IMPORTAR GASTO Y TIPOMOVIMIENTO ---
import { Gasto } from '../gastos_produccion/entities/gastos_produccion.entity';
import { TipoMovimiento } from '../../common/enums/tipo-movimiento.enum';

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

  // --- 2. MODIFICAR MÉTODO CREATE ---
  async create(dto: CreateActividadDto, usuarioIdentificacion: number) {
    // 1. Extraemos los materiales y el cultivoId
    const { materiales, cultivo: cultivoId, ...dtoActividad } = dto;

  // 1.5 Cargar la entidad Cultivo
  // Usar null para coincidir con el tipo devuelto por findOneBy
  let cultivoEntidad: Cultivo | null = null;
    if (cultivoId) {
      cultivoEntidad = await this.cultivoRepository.findOneBy({ id: cultivoId });
      if (!cultivoEntidad) {
        throw new NotFoundException(`El cultivo con ID ${cultivoId} no existe.`);
      }
    }

    // 2. Iniciamos la transacción
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 3. Creamos la actividad
      const actividad = this.actividadRepository.create({
        ...dtoActividad,
        usuario: { identificacion: usuarioIdentificacion },
        cultivo: cultivoEntidad ?? undefined, // convertir null a undefined para TypeORM
        estado: dto.estado || 'pendiente',
      });
      const saved = await queryRunner.manager.save(actividad);

      // 4. Procesamos los materiales
      if (materiales && materiales.length > 0) {
        // Obtenemos el repositorio de Gasto DENTRO del queryRunner
        const gastoRepo = queryRunner.manager.getRepository(Gasto);

        for (const item of materiales) {
          const { materialId, cantidadUsada } = item;
          const material = await queryRunner.manager.findOne(Material, { where: { id: materialId } });
          
          if (!material) throw new NotFoundException(`El material con ID ${materialId} no existe.`);
          if (material.cantidad < cantidadUsada) throw new BadRequestException(`Stock insuficiente para ${material.nombre}.`);

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

          // --- 4.1 LÓGICA DE COSTO AÑADIDA ---
          const costoTotal = (Number(material.precio) || 0) * cantidadUsada;
          if (costoTotal > 0) {
            const nuevoGasto = gastoRepo.create({
              descripcion: `Costo material: ${material.nombre} (Actividad: ${saved.titulo})`,
              monto: costoTotal,
              fecha: saved.fecha, // Usamos la fecha de la actividad
              tipo: TipoMovimiento.EGRESO,
              cultivo: cultivoEntidad ?? undefined, // Asociamos el gasto al cultivo (undefined si no hay)
            });
            await queryRunner.manager.save(nuevoGasto);
          }
          // --- FIN LÓGICA DE COSTO ---
        }
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
  
  // ... (findAll, findOne, update, remove, search no necesitan cambios) ...
  async findAll() {
    // ...
    const actividades = await this.actividadRepository.find({
      relations: [
        'usuario',
        'cultivo',
        'actividadMaterial',
        'actividadMaterial.material',
      ],
    });
    return actividades;
  }

  async findOne(id: number) {
    // ...
    const actividad = await this.actividadRepository.findOne({
      where: { id },
      relations: [
        'usuario',
        'cultivo',
        'actividadMaterial',
        'actividadMaterial.material',
      ],
    });
    return actividad;
  }

  async update(id: number, dto: UpdateActividadDto) {
    // ...
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
    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No hay campos válidos para actualizar');
    }

    await this.actividadRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: number) {
    // ...
    const actividad = await this.findOne(id);
    if (!actividad) {
      return { message: 'Actividad no encontrada' };
    }
    await this.actividadRepository.delete(id);
    return { message: 'Actividad eliminada correctamente' };
  }

  async search(dto: SearchActividadDto) {
    // ...
  }


  // --- 3. MODIFICAR MÉTODO ASIGNARACTIVIDAD ---
  async asignarActividad(dto: AsignarActividadDto) {
    // 1. Extraer materiales (sin cambios)
    const { cultivo: cultivoId, aprendices, titulo, descripcion, fecha, materiales } = dto;

    // 2. Verificar que el cultivo exista (sin cambios)
    const cultivo = await this.cultivoRepository.findOneBy({ id: cultivoId });
    if (!cultivo) throw new NotFoundException(`El cultivo con ID ${cultivoId} no fue encontrado.`);

    // 3. Verificar que todos los aprendices existan (sin cambios)
    if (aprendices.length === 0) throw new BadRequestException('Debe seleccionar al menos un aprendiz.');
    const usuariosEncontrados = await this.usuarioRepository.find({ where: { identificacion: In(aprendices) } });
    if (usuariosEncontrados.length !== aprendices.length) {
      const idsEncontrados = usuariosEncontrados.map((u) => u.identificacion);
      const idsNoEncontrados = aprendices.filter((id) => !idsEncontrados.includes(id));
      throw new NotFoundException(`Los siguientes aprendices no existen: ${idsNoEncontrados.join(', ')}`);
    }

    // 4. Iniciar Transacción (sin cambios)
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const fechaActividad = new Date(fecha);
      const actividadesAGuardar: Actividad[] = [];
      
      // 5. Crear las actividades (sin cambios)
      for (const identificacion of aprendices) {
        const nuevaActividad = this.actividadRepository.create({
          titulo,
          descripcion,
          fecha: fechaActividad,
          cultivo,
          usuario: { identificacion },
          estado: 'pendiente',
        });
        const saved = await queryRunner.manager.save(nuevaActividad);
        actividadesAGuardar.push(saved);
      }

      // 6. Procesar materiales
      if (materiales && materiales.length > 0) {
        // Obtenemos el repositorio de Gasto DENTRO del queryRunner
        const gastoRepo = queryRunner.manager.getRepository(Gasto);

        for (const item of materiales) {
          const material = await queryRunner.manager.findOne(Material, { where: { id: item.materialId } });
          if (!material) throw new NotFoundException(`Material ${item.materialId} no encontrado.`);

          // La cantidad total usada es (cantidad por aprendiz * número de aprendices)
          const cantidadTotalUsada = item.cantidadUsada * aprendices.length;

          if (material.cantidad < cantidadTotalUsada) {
            throw new BadRequestException(`Stock insuficiente para ${material.nombre}. Se necesitan ${cantidadTotalUsada}, disponibles: ${material.cantidad}`);
          }
          material.cantidad -= cantidadTotalUsada;
          await queryRunner.manager.save(material);

          // --- 6.1 LÓGICA DE COSTO AÑADIDA ---
          // Registramos UN solo gasto por el total de materiales usados
          const costoTotal = (Number(material.precio) || 0) * cantidadTotalUsada;
          if (costoTotal > 0) {
            const nuevoGasto = gastoRepo.create({
              descripcion: `Costo material: ${material.nombre} (Asignación: ${titulo})`,
              monto: costoTotal,
              fecha: fechaActividad,
              tipo: TipoMovimiento.EGRESO,
              cultivo: cultivo, // Asociamos el gasto al cultivo
            });
            await queryRunner.manager.save(nuevoGasto);
          }
          // --- FIN LÓGICA DE COSTO ---

          // Creamos el registro de unión para CADA actividad creada (sin cambios)
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

      // 7. Confirmar transacción (sin cambios)
      await queryRunner.commitTransaction();
      return actividadesAGuardar;
    } catch (error) {
      // 8. Revertir (sin cambios)
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // 9. Liberar (sin cambios)
      await queryRunner.release();
    }
  }
}