import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMaterialeDto } from './dto/create-materiale.dto';
import { UpdateMaterialeDto } from './dto/update-materiale.dto';
import { Material } from './entities/materiale.entity';
import { TipoConsumo } from '../../common/enums/tipo-consumo.enum';
import { TipoMovimiento } from '../../common/enums/tipo-movimiento.enum';
import { MovimientosService } from '../../movimientos/movimientos.service';

@Injectable()
export class MaterialesService {
  constructor(
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
    private readonly movimientosService: MovimientosService,
  ) {}

  async create(createMaterialeDto: CreateMaterialeDto): Promise<Material> {
    const material = this.materialRepository.create(createMaterialeDto);
    // Inicializar cantidadRestanteEnUnidadActual para consumibles
    if (material.tipoConsumo === TipoConsumo.CONSUMIBLE && material.cantidadPorUnidad) {
      material.cantidadRestanteEnUnidadActual = material.cantidadPorUnidad;
    }
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
    const cantidadAnterior = material.cantidad;

    this.materialRepository.merge(material, updateMaterialeDto);
    const updatedMaterial = await this.materialRepository.save(material);

    // Registrar movimiento si se aumentó la cantidad
    if (updateMaterialeDto.cantidad && updateMaterialeDto.cantidad > cantidadAnterior) {
      const cantidadAgregada = updateMaterialeDto.cantidad - cantidadAnterior;
      await this.movimientosService.registrarMovimiento(
        TipoMovimiento.INGRESO,
        cantidadAgregada,
        updatedMaterial.id,
        `Reabastecimiento de ${updatedMaterial.nombre}`,
        `material-reabastecido-${updatedMaterial.id}`
      );
    }

    return updatedMaterial;
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