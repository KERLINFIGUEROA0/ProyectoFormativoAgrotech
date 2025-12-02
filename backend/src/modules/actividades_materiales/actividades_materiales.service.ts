import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateActividadesMaterialeDto } from './dto/create-actividades_materiale.dto';
import { UpdateActividadesMaterialeDto } from './dto/update-actividades_materiale.dto';
import { ActividadMaterial } from './entities/actividades_materiale.entity';
import { Material } from '../materiales/entities/materiale.entity';
import { UnidadMedida } from '../../common/enums/unidad-medida.enum';
import { UnitConversionUtil } from '../../common/utils/unit-conversion.util';
import { TipoConsumo } from '../../common/enums/tipo-consumo.enum';

@Injectable()
export class ActividadesMaterialesService {
  constructor(
    @InjectRepository(ActividadMaterial)
    private readonly actividadMaterialRepo: Repository<ActividadMaterial>,
    @InjectRepository(Material)
    private readonly materialRepo: Repository<Material>,
  ) {}


  async create(createDto: CreateActividadesMaterialeDto) {
    // 1. Buscar el material en inventario
    const material = await this.materialRepo.findOne({
      where: { id: createDto.materialId }
    });

    if (!material) throw new NotFoundException('Material no encontrado');

    // 2. Calcular la cantidad a descontar en la Unidad Base del Material
    const cantidadAUsar = createDto.cantidadUsada || 0; // Default to 0 if not specified
    const unidadUsada = createDto.unidadMedida || UnidadMedida.UNIDAD; // Default to UNIDAD if not specified

    // Convertir a unidad base usando la utilidad
    let cantidadEnUnidadBase: number;

    console.log(`📊 Conversión para material ${material.nombre}:`);
    console.log(`   - Cantidad solicitada: ${cantidadAUsar} ${unidadUsada}`);
    console.log(`   - Unidad base del material: ${material.unidadBase}`);
    console.log(`   - Peso por unidad: ${material.pesoPorUnidad}`);

    // Determinar la unidad base si no está definida (para materiales existentes)
    let unidadBaseMaterial = material.unidadBase;
    if (!unidadBaseMaterial) {
      unidadBaseMaterial = UnitConversionUtil.obtenerUnidadBase(
        material.tipoConsumo === TipoConsumo.CONSUMIBLE ? 'consumible' : 'no_consumible',
        material.medidasDeContenido
      );
      console.log(`   🔧 Unidad base determinada: ${unidadBaseMaterial}`);
    }

    // Verificamos si es una unidad de empaque (Saco, Caja, etc.) y si el material tiene unidad base (g o ml)
    if (UnitConversionUtil.esUnidadEmpaque(unidadUsada) &&
        (unidadBaseMaterial === UnidadMedida.GRAMO || unidadBaseMaterial === UnidadMedida.MILILITRO)) {
      // Para empaques: multiplicar por el peso/volumen del empaque
      // Ej: 1 SACO * 50kg = 50kg, o 1 BIDÓN * 20L = 20L
      const contenidoDelEmpaque = Number(material.pesoPorUnidad) || 1; // Fallback a 1 si es nulo
      cantidadEnUnidadBase = cantidadAUsar * contenidoDelEmpaque;
      console.log(`   📦 Empaque detectado: ${cantidadAUsar} ${unidadUsada} * ${contenidoDelEmpaque} = ${cantidadEnUnidadBase} ${unidadBaseMaterial}`);
    } else {
      // Lógica normal (Gramo -> Kilo, Litro -> Ml)
      console.log(`   🔄 Conversión estándar iniciada...`);
      try {
        cantidadEnUnidadBase = UnitConversionUtil.convertirABase(cantidadAUsar, unidadUsada);
        console.log(`   ✅ Conversión completada: ${cantidadEnUnidadBase} ${unidadBaseMaterial || 'unidades'}`);
      } catch (error) {
        console.error(`   ❌ Error en conversión: ${error.message}`);
        throw new BadRequestException(error.message);
      }
    }

    console.log(`   💰 Stock actual: ${material.cantidad} ${material.unidadBase}`);
    console.log(`   📉 Se descontarán: ${cantidadEnUnidadBase} ${material.unidadBase}`);

    // 3. Validar Stock
    if (material.cantidad < cantidadEnUnidadBase) {
      throw new BadRequestException(
        `Stock insuficiente. Tienes ${material.cantidad} (${material.unidadBase}), intentas usar ${cantidadEnUnidadBase} (${material.unidadBase})`
      );
    }

    // 4. Calcular costo proporcional (regla de tres)
    let costoActividad = 0;

    if (material.tipoConsumo === TipoConsumo.CONSUMIBLE && material.precio) {
      // Caso 1: El material tiene un peso/volumen por unidad definido (Ej: Bulto de 50kg vale $50.000)
      // Precio por unidad base = PrecioEmpaque / PesoEmpaque
      if (material.pesoPorUnidad && Number(material.pesoPorUnidad) > 0) {
        const precioPorUnidadBase = Number(material.precio) / Number(material.pesoPorUnidad);
        // Costo = (Precio/UnidadBase) * (UnidadesBase usadas)
        costoActividad = precioPorUnidadBase * cantidadEnUnidadBase;
      }
      // Caso 2: No tiene peso definido, asumimos que el precio es por la unidad base directa
      else {
        costoActividad = Number(material.precio) * cantidadEnUnidadBase;
      }
    }
    // Si es NO CONSUMIBLE (Herramienta), el costo por uso es 0 (o podrías definir lógica de depreciación)
    else {
      costoActividad = 0;
    }

    // 5. Actualizar Material (Descontar)
    material.cantidad = Number(material.cantidad) - cantidadEnUnidadBase;
    material.usosActuales = Number(material.usosActuales) + 1;

    // 6. Guardar todo
    await this.materialRepo.save(material);

    const nuevaAsignacion = this.actividadMaterialRepo.create({
      cantidadUsada: createDto.cantidadUsada || 0,
      unidadMedida: createDto.unidadMedida || UnidadMedida.UNIDAD,
      costo: costoActividad,
      cantidadUsadaBase: cantidadEnUnidadBase,
      actividad: { id: createDto.actividadId },
      material: { id: createDto.materialId }
    });

    return await this.actividadMaterialRepo.save(nuevaAsignacion);
  }

  async findAll() {
    return await this.actividadMaterialRepo.find({
      relations: ['material', 'actividad']
    });
  }

  async findOne(id: number) {
    const actividadMaterial = await this.actividadMaterialRepo.findOne({
      where: { id },
      relations: ['material', 'actividad']
    });

    if (!actividadMaterial) {
      throw new NotFoundException(`ActividadMaterial con ID ${id} no encontrado`);
    }

    return actividadMaterial;
  }

  async update(id: number, updateActividadesMaterialeDto: UpdateActividadesMaterialeDto) {
    const actividadMaterial = await this.findOne(id);

    // Si se cambia la cantidad o unidad, recalcular
    if (updateActividadesMaterialeDto.cantidadUsada !== undefined || updateActividadesMaterialeDto.unidadMedida) {
      const nuevaCantidad = updateActividadesMaterialeDto.cantidadUsada ?? actividadMaterial.cantidadUsada ?? 0;
      const nuevaUnidad = updateActividadesMaterialeDto.unidadMedida ?? actividadMaterial.unidadMedida ?? UnidadMedida.UNIDAD;

      let cantidadEnBaseNueva: number;

      // Determinar la unidad base si no está definida
      let unidadBaseMaterial = actividadMaterial.material.unidadBase;
      if (!unidadBaseMaterial) {
        unidadBaseMaterial = UnitConversionUtil.obtenerUnidadBase(
          actividadMaterial.material.tipoConsumo === TipoConsumo.CONSUMIBLE ? 'consumible' : 'no_consumible',
          actividadMaterial.material.medidasDeContenido
        );
      }
  
      // Verificamos si es una unidad de empaque (Saco, Caja, etc.) y si el material tiene unidad base (g o ml)
      if (UnitConversionUtil.esUnidadEmpaque(nuevaUnidad) &&
          (unidadBaseMaterial === UnidadMedida.GRAMO || unidadBaseMaterial === UnidadMedida.MILILITRO)) {
        // Para empaques: multiplicar por el peso/volumen del empaque
        // Ej: 1 SACO * 50kg = 50kg, o 1 BIDÓN * 20L = 20L
        const contenidoDelEmpaque = Number(actividadMaterial.material.pesoPorUnidad) || 1; // Fallback a 1 si es nulo
        cantidadEnBaseNueva = nuevaCantidad * contenidoDelEmpaque;
      } else {
        // Lógica normal (Gramo -> Kilo, Litro -> Ml)
        try {
          cantidadEnBaseNueva = UnitConversionUtil.convertirABase(nuevaCantidad, nuevaUnidad);
        } catch (error) {
          throw new BadRequestException(error.message);
        }
      }
      const cantidadEnBaseAnterior = actividadMaterial.cantidadUsadaBase || 0;

      // Ajustar el stock del material
      const diferencia = cantidadEnBaseNueva - cantidadEnBaseAnterior;
      if (actividadMaterial.material.cantidad < diferencia) {
        throw new BadRequestException('Stock insuficiente para el cambio');
      }

      actividadMaterial.material.cantidad = Number(actividadMaterial.material.cantidad) - diferencia;
      actividadMaterial.cantidadUsadaBase = cantidadEnBaseNueva;

      // Recalcular costo proporcional con la nueva cantidad
      let nuevoCosto = 0;
      if (actividadMaterial.material.tipoConsumo === TipoConsumo.CONSUMIBLE && actividadMaterial.material.precio) {
        if (actividadMaterial.material.pesoPorUnidad && Number(actividadMaterial.material.pesoPorUnidad) > 0) {
          const precioPorUnidadBase = Number(actividadMaterial.material.precio) / Number(actividadMaterial.material.pesoPorUnidad);
          nuevoCosto = precioPorUnidadBase * cantidadEnBaseNueva;
        } else {
          nuevoCosto = Number(actividadMaterial.material.precio) * cantidadEnBaseNueva;
        }
      }
      actividadMaterial.costo = nuevoCosto;

      await this.materialRepo.save(actividadMaterial.material);
    }

    // Actualizar campos
    if (updateActividadesMaterialeDto.cantidadUsada !== undefined) {
      actividadMaterial.cantidadUsada = updateActividadesMaterialeDto.cantidadUsada;
    }
    if (updateActividadesMaterialeDto.unidadMedida) {
      actividadMaterial.unidadMedida = updateActividadesMaterialeDto.unidadMedida;
    }

    return await this.actividadMaterialRepo.save(actividadMaterial);
  }

  async remove(id: number) {
    const actividadMaterial = await this.findOne(id);

    // Devolver el material al stock
    if (actividadMaterial.cantidadUsadaBase) {
      actividadMaterial.material.cantidad = Number(actividadMaterial.material.cantidad) + actividadMaterial.cantidadUsadaBase;
      await this.materialRepo.save(actividadMaterial.material);
    }

    await this.actividadMaterialRepo.remove(actividadMaterial);
    return { message: 'ActividadMaterial eliminado correctamente' };
  }
}
