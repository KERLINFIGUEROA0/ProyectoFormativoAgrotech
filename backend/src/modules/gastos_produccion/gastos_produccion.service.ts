import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Gasto } from './entities/gastos_produccion.entity';
import { CreateGastosProduccionDto } from './dto/create-gastos_produccion.dto';
import { UpdateGastosProduccionDto } from './dto/update-gastos_produccion.dto';
import { TipoMovimiento } from '../../common/enums/tipo-movimiento.enum';
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
    const produccion = await this.produccionRepository.findOne({ where: { id: createGastosProduccionDto.produccion } });
    if (!produccion) {
      throw new NotFoundException(`La producción con ID ${createGastosProduccionDto.produccion} no fue encontrada.`);
    }

    const nuevoGasto = this.gastoRepository.create({
      descripcion: createGastosProduccionDto.descripcion,
      monto: createGastosProduccionDto.monto,
      fecha: createGastosProduccionDto.fecha,
      tipo: TipoMovimiento.EGRESO,
      produccion: produccion,
    });

    return this.gastoRepository.save(nuevoGasto);
  }

  async findAll(): Promise<any[]> {
    const gastos = await this.gastoRepository.find({
      relations: ['produccion'],
      order: { fecha: 'DESC' },
    });

    return gastos.map(g => ({
      id: g.id,
      descripcion: g.descripcion,
      monto: parseFloat(g.monto as any),
      fecha: g.fecha,
      tipo: g.tipo,
    }));
  }

  async findOne(id: number): Promise<Gasto> {
    const gasto = await this.gastoRepository.findOne({ where: { id }, relations: ['produccion'] });
    if (!gasto) {
      throw new NotFoundException(`Gasto con ID ${id} no encontrado.`);
    }
    return gasto;
  }

  async update(id: number, updateGastosProduccionDto: UpdateGastosProduccionDto): Promise<Gasto> {
    const gasto = await this.findOne(id);
    Object.assign(gasto, updateGastosProduccionDto);
    return this.gastoRepository.save(gasto);
  }

  async remove(id: number): Promise<void> {
    const gasto = await this.findOne(id);
    await this.gastoRepository.remove(gasto);
  }
}

