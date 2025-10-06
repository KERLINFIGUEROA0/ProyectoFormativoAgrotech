import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Gasto } from './entities/gastos_produccion.entity';
import { CreateGastosProduccionDto } from './dto/create-gastos_produccion.dto';
import { UpdateGastosProduccionDto } from './dto/update-gastos_produccion.dto';
import { Produccion } from '../producciones/entities/produccione.entity';

@Injectable()
export class GastosProduccionService {
  constructor(
    @InjectRepository(Gasto)
    private readonly gastoRepository: Repository<Gasto>,
    @InjectRepository(Produccion)
    private readonly produccionRepository: Repository<Produccion>,
  ) {}

  async create(createGastosProduccionDto: CreateGastosProduccionDto): Promise<Gasto> {
    const { produccionId: produccionId, ...gastoData } = createGastosProduccionDto;

    const produccion = await this.produccionRepository.findOneBy({ id: produccionId });
    if (!produccion) {
      throw new NotFoundException(`La producción con ID ${produccionId} no fue encontrada.`);
    }

    const nuevoGasto = this.gastoRepository.create({
      ...gastoData,
      produccion: produccion,
      tipo: 'egreso',
    });

    return this.gastoRepository.save(nuevoGasto);
  }

  findAll() {
    return this.gastoRepository.find({ relations: ['produccion'] });
  }

  async findOne(id: number): Promise<Gasto> {
    const gasto = await this.gastoRepository.findOne({ where: { id }, relations: ['produccion'] });
    if (!gasto) {
      throw new NotFoundException(`Gasto con ID ${id} no encontrado.`);
    }
    return gasto;
  }

  // --- 👇 INICIO DE LA CORRECCIÓN ---
  async update(id: number, updateGastosProduccionDto: UpdateGastosProduccionDto): Promise<Gasto> {
    const { produccionId: produccionId, ...restoDto } = updateGastosProduccionDto;
    
    // Se asegura de que el gasto exista antes de intentar actualizarlo.
    const gasto = await this.findOne(id);

    // Si se proporciona un nuevo ID de producción, se busca y se actualiza la relación.
    if (produccionId) {
      const produccion = await this.produccionRepository.findOneBy({ id: produccionId });
      if (!produccion) {
        throw new NotFoundException(`La producción con ID ${produccionId} no fue encontrada.`);
      }
      gasto.produccion = produccion;
    }

    // Se fusionan los demás datos del DTO (descripción, monto, etc.)
    Object.assign(gasto, restoDto);

    // Se guarda la entidad actualizada.
    return this.gastoRepository.save(gasto);
  }
  // --- 👆 FIN DE LA CORRECCIÓN ---

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.gastoRepository.delete(id);
  }
}