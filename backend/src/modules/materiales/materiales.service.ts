import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMaterialeDto } from './dto/create-materiale.dto';
import { UpdateMaterialeDto } from './dto/update-materiale.dto';
import { Material } from './entities/materiale.entity';
import { TipoConsumo } from '../../common/enums/tipo-consumo.enum';
import { TipoMovimiento } from '../../common/enums/tipo-movimiento.enum';
import { UnidadMedida } from '../../common/enums/unidad-medida.enum';
import { UnitConversionUtil } from '../../common/utils/unit-conversion.util';
import { MovimientosService } from '../../movimientos/movimientos.service';

@Injectable()
export class MaterialesService {
  constructor(
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
    private readonly movimientosService: MovimientosService,
  ) {}

  async create(createMaterialeDto: CreateMaterialeDto): Promise<Material> {
    // 1. Determinar Unidad Base (Gramos o Mililitros)
    const tipoConsumo = createMaterialeDto.tipoConsumo || TipoConsumo.CONSUMIBLE;
    const unidadBase = UnitConversionUtil.obtenerUnidadBase(
      tipoConsumo === TipoConsumo.CONSUMIBLE ? 'consumible' : 'no_consumible',
      createMaterialeDto.medidasDeContenido
    );

    // 2. Calcular el TOTAL ABSOLUTO de materia prima ingresada
    let cantidadTotalEnBase = 0;

    // Escenario A: Ingreso por Paquetes (Ej: 50 Bultos de 50kg)
    if (createMaterialeDto.cantidadPaquetes && createMaterialeDto.tamañoPorPaquete && createMaterialeDto.unidadMedidaIngreso) {

        // Paso A1: Calcular total en la unidad del ingreso (50 * 50 = 2500 kg)
        const totalIngreso = createMaterialeDto.cantidadPaquetes * createMaterialeDto.tamañoPorPaquete;

        // Paso A2: Convertir a la Unidad Base del Sistema (2500 kg -> 2,500,000 g)
        cantidadTotalEnBase = UnitConversionUtil.convertirABase(totalIngreso, createMaterialeDto.unidadMedidaIngreso);

    }
    // Escenario B: Ingreso Directo (Ej: 5000 gramos sueltos)
    else {
        // Asumimos que la cantidad viene en la unidad base o usamos la utilidad si viniera otra unidad
        cantidadTotalEnBase = UnitConversionUtil.convertirABase(
            createMaterialeDto.cantidad,
            createMaterialeDto.unidadMedidaIngreso || unidadBase
        );
    }

    // 3. Guardar el Material
    const material = this.materialRepository.create({
      ...createMaterialeDto,
      cantidad: cantidadTotalEnBase, // GUARDAMOS 2,500,000 (No 50, ni 2500)
      unidadBase: unidadBase,
      // Guardamos la referencia de cómo viene el paquete para info visual, pero el stock es 'cantidad'
      cantidadPorUnidad: createMaterialeDto.tamañoPorPaquete ?
          UnitConversionUtil.convertirABase(createMaterialeDto.tamañoPorPaquete, createMaterialeDto.unidadMedidaIngreso!) : null
    });

    const savedMaterial = await this.materialRepository.save(material);

    // Registrar movimiento de entrada si hay cantidad inicial
    if (savedMaterial.cantidad > 0) {
      await this.movimientosService.registrarMovimiento(
        TipoMovimiento.INGRESO,
        savedMaterial.cantidad,
        savedMaterial.id,
        `Entrada inicial de ${savedMaterial.nombre}`,
        `material-creado-${savedMaterial.id}`
      );
    }

    return savedMaterial;
  }
  async desactivar(id: number): Promise<Material> {
    const material = await this.findOne(id);
    material.estado = false;
    return this.materialRepository.save(material);
  }

  async reactivar(id: number): Promise<Material> {
    const material = await this.findOne(id);
    material.estado = true;
    return this.materialRepository.save(material);
  }

  async findAll(): Promise<Material[]> {
    return this.materialRepository.find();
  }

  async findOne(id: number): Promise<Material> {
    const material = await this.materialRepository.findOne({ where: { id } });
    if (!material) throw new NotFoundException(`El material con ID ${id} no fue encontrado.`);
    return material;
  }

  async update(id: number, updateMaterialeDto: UpdateMaterialeDto): Promise<Material> {
    const material = await this.findOne(id);
    const cantidadAnterior = Number(material.cantidad);

    // Lógica para recalcular cantidad si envían nuevos paquetes
    if (updateMaterialeDto.cantidad !== undefined || updateMaterialeDto.cantidadPaquetes) {
         let nuevaCantidadTotal = cantidadAnterior;

         // Si es una recarga de inventario (sumar al stock existente)
         if (updateMaterialeDto.cantidadPaquetes && updateMaterialeDto.tamañoPorPaquete) {
            const totalIngreso = updateMaterialeDto.cantidadPaquetes * updateMaterialeDto.tamañoPorPaquete;
            const totalEnBase = UnitConversionUtil.convertirABase(totalIngreso, updateMaterialeDto.unidadMedidaIngreso || material.unidadBase);

            // Aquí decides: ¿El update reemplaza el stock o suma?
            // Normalmente en un PUT de "cantidad" se reemplaza, pero ten cuidado.
            // Si quieres sumar, deberías hacerlo explícito. Asumiremos reemplazo o lógica de negocio tuya.
            // Para "Agregar Stock" es mejor sumar antes de llamar al update o tener un endpoint 'addStock'.

            nuevaCantidadTotal = totalEnBase; // Ojo: Esto reemplaza el valor.
         } else if (updateMaterialeDto.cantidad) {
            nuevaCantidadTotal = updateMaterialeDto.cantidad; // Asume que ya viene en base
         }

         updateMaterialeDto.cantidad = nuevaCantidadTotal;
    }

    this.materialRepository.merge(material, updateMaterialeDto);
    return this.materialRepository.save(material);
  }

  async remove(id: number): Promise<void> {
    const material = await this.findOne(id);
    await this.materialRepository.remove(material);
  }

  async actualizarImagen(id: number, imgUrl: string): Promise<Material> {
    const material = await this.findOne(id);
    material.img = imgUrl;
    return this.materialRepository.save(material);
  }

  // --- NUEVO MÉTODO PARA REPORTE DE STOCK BAJO ---
  async findLowStock(limite = 5): Promise<Material[]> {
    return this.materialRepository
      .createQueryBuilder('material')
      .where('material.cantidad <= :limite', { limite })
      .orderBy('material.cantidad', 'ASC')
      .getMany();
  }
}