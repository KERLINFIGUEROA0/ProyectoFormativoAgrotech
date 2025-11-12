import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
// --- 1. ASEGÚRATE DE QUE 'Like' ESTÉ IMPORTADO ---
import { Repository, ILike, In, DataSource, Like } from 'typeorm';
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
  
  // ... (findAll y findOne quedan igual) ...
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

  // --- INICIO DE LA CORRECCIÓN ---
  // Este es el método que reemplaza tu 'update' vacío
  async update(id: number, dto: UpdateActividadDto) {
    // 1. Extraer materiales y el cultivoId
    const { materiales, cultivo: cultivoId, ...dtoActividad } = dto;

    // 2. Iniciar Transacción
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 3. Encontrar la actividad y sus relaciones antiguas
      const actividad = await queryRunner.manager.findOne(Actividad, {
        where: { id },
        relations: ['actividadMaterial', 'actividadMaterial.material', 'cultivo'],
      });

      if (!actividad) {
        throw new NotFoundException(`Actividad con ID ${id} no encontrada.`);
      }
      
      // Repositorios dentro de la transacción
      const gastoRepo = queryRunner.manager.getRepository(Gasto);
      const materialRepo = queryRunner.manager.getRepository(Material);
      const actMaterialRepo = queryRunner.manager.getRepository(ActividadMaterial);

      // --- 4. REVERTIR LÓGICA ANTERIOR (Materiales y Gastos) ---

      // 4a. Devolver el stock de los materiales antiguos
      if (actividad.actividadMaterial && actividad.actividadMaterial.length > 0) {
        for (const am of actividad.actividadMaterial) {
          // Usamos 'am.material.id' porque cargamos la relación
          const material = await materialRepo.findOneBy({ id: am.material.id });
          if (material) {
            material.cantidad += am.cantidadUsada; // Devolver stock
            await queryRunner.manager.save(material);
          }
          // 4b. Borrar la entrada de la tabla de unión
          await queryRunner.manager.remove(am);
        }
      }
      
      // 4c. Borrar los gastos antiguos (basado en la descripción que usa el método 'create')
      // Usamos el título que la actividad TENÍA ANTES de actualizarse
      const tituloAntiguo = actividad.titulo;
      if (actividad.cultivo) {
          await gastoRepo.delete({
            cultivo: { id: actividad.cultivo.id },
            // Usamos 'Like' (o 'ILike') para buscar la descripción
            descripcion: Like(`% (Actividad: ${tituloAntiguo})%`) 
          });
      }

      // --- 5. ACTUALIZAR LOS DATOS SIMPLES DE LA ACTIVIDAD ---
      
      // Si se envía un nuevo cultivoId, cargarlo
      let cultivoEntidad: Cultivo | null = actividad.cultivo;
      if (cultivoId) {
          cultivoEntidad = await queryRunner.manager.findOne(Cultivo, { where: { id: cultivoId } });
          if (!cultivoEntidad) {
              throw new NotFoundException(`El cultivo con ID ${cultivoId} no existe.`);
          }
      }
      
      // Aplicar cambios al DTO de actividad (titulo, descripcion, estado, etc.)
      Object.assign(actividad, dtoActividad); 
      actividad.cultivo = cultivoEntidad; // Asignar el nuevo cultivo
      
      // Guardar los cambios de la actividad (ej. nuevo título)
      const saved = await queryRunner.manager.save(actividad);


      // --- 6. APLICAR LÓGICA DE 'CREATE' PARA LOS NUEVOS MATERIALES ---
      // (dto.materiales es la NUEVA lista completa que viene del frontend)
      if (materiales && materiales.length > 0) {
        for (const item of materiales) {
          const { materialId, cantidadUsada } = item;
          const material = await materialRepo.findOne({ where: { id: materialId } });
          
          if (!material) throw new NotFoundException(`El material con ID ${materialId} no existe.`);
          if (material.cantidad < cantidadUsada) throw new BadRequestException(`Stock insuficiente para ${material.nombre}.`);

          // Restamos el stock NUEVO
          material.cantidad -= cantidadUsada;
          await queryRunner.manager.save(material);

          // Creamos el NUEVO registro en la tabla de unión
          const nuevaUnion = actMaterialRepo.create({
            actividad: saved,
            material: material,
            cantidadUsada: cantidadUsada,
          });
          await queryRunner.manager.save(nuevaUnion);

          // Creamos el NUEVO gasto
          const costoTotal = (Number(material.precio) || 0) * cantidadUsada;
          if (costoTotal > 0) {
            const nuevoGasto = gastoRepo.create({
              descripcion: `Costo material: ${material.nombre} (Actividad: ${saved.titulo})`, // Usar el título NUEVO
              monto: costoTotal,
              fecha: saved.fecha, 
              tipo: TipoMovimiento.EGRESO,
              cultivo: cultivoEntidad ?? undefined,
            });
            await queryRunner.manager.save(nuevoGasto);
          }
        }
      }

      // --- 7. FINALIZAR TRANSACCIÓN ---
      await queryRunner.commitTransaction();
      
      // Devolver la actividad actualizada
      return this.findOne(id); 

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
  // --- FIN DE LA CORRECCIÓN ---


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