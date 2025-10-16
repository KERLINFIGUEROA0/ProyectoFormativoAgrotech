import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tratamiento } from './entities/tratamiento.entity';
import { CreateTratamientoDto } from './dto/create-tratamiento.dto';
import { UpdateTratamientoDto } from './dto/update-tratamiento.dto';

@Injectable()
export class TratamientosService {
  constructor(
    @InjectRepository(Tratamiento)
    private readonly tratamientoRepo: Repository<Tratamiento>,
  ) {}

  async create(dto: CreateTratamientoDto): Promise<Tratamiento> {
    const tratamiento = this.tratamientoRepo.create(dto);
    return this.tratamientoRepo.save(tratamiento);
  }

  async findAll(): Promise<Tratamiento[]> {
    return this.tratamientoRepo.find();
  }

  async findOne(id: number): Promise<Tratamiento> {
    const tratamiento = await this.tratamientoRepo.findOne({ where: { id } });
    if (!tratamiento) {
      throw new NotFoundException(`Tratamiento con ID ${id} no encontrado.`);
    }
    return tratamiento;
  }

  async update(id: number, dto: UpdateTratamientoDto): Promise<Tratamiento> {
    const tratamiento = await this.findOne(id);
    this.tratamientoRepo.merge(tratamiento, dto);
    return this.tratamientoRepo.save(tratamiento);
  }

  async remove(id: number): Promise<void> {
    const tratamiento = await this.findOne(id);
    await this.tratamientoRepo.remove(tratamiento);
  }
}