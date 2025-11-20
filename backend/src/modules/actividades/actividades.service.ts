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
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Cultivo } from '../cultivos/entities/cultivo.entity';
import { Material } from '../materiales/entities/materiale.entity';
import { ActividadMaterial } from '../actividades_materiales/entities/actividades_materiale.entity';
import { Gasto } from '../gastos_produccion/entities/gastos_produccion.entity';
import { TipoMovimiento } from '../../common/enums/tipo-movimiento.enum';
import { TipoConsumo } from '../../common/enums/tipo-consumo.enum';

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
  ) { }

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

    // Para consumibles: manejar unidades parciales
    if (!material.cantidadPorUnidad) {
      // Si no hay cantidad por unidad, tratar como items individuales
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
            const costoTotal = (Number(material.precio) || 0) * cantidadUsada;
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

  // ... (findAll y findOne quedan igual) ...
  async findAll() {
    return this.actividadRepository.find({
      relations: [
        'usuario',
        'usuario.ficha',
        'cultivo',
        'actividadMaterial',
        'actividadMaterial.material',
      ],
    });
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
            const costoTotal = (Number(material.precio) || 0) * cantidadUsada;
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

  async asignarActividad(dto: AsignarActividadDto) {
    // ... (este método no necesita cambios, ya que los gastos de mano de obra
    // se están añadiendo manualmente en el formulario de edición)
    const { cultivo: cultivoId, aprendices, titulo, descripcion, fecha, materiales } = dto;
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
      const actividadesAGuardar: Actividad[] = [];
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
            const costoTotal = (Number(material.precio) || 0) * cantidadTotalUsada;
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
          for (const actividad of actividadesAGuardar) {
            const nuevaUnion = this.actMaterialRepository.create({
              actividad: actividad,
              material: material,
              cantidadUsada: item.cantidadUsada,
            });
            await queryRunner.manager.save(nuevaUnion);
          }
        }
      }
      await queryRunner.commitTransaction();
      return actividadesAGuardar;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}