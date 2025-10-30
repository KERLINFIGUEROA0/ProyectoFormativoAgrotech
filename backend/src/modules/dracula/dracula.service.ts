import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dracula } from './entities/dracula.entity';
import { CreateDraculaDto } from './dto/create-dracula.dto';
import { UpdateDraculaDto } from './dto/update-dracula.dto';

@Injectable()
export class DraculaService {
  constructor(
    @InjectRepository(Dracula)
    private readonly draculaRepository: Repository<Dracula>,
  ) {}

  async crear(dto: CreateDraculaDto): Promise<Dracula> {
    const dracula = this.draculaRepository.create(dto);
    return await this.draculaRepository.save(dracula);
  }

  async listar(): Promise<Dracula[]> {
    return await this.draculaRepository.find();
  }

  async buscarPorId(id: number): Promise<Dracula> {
    const dracula = await this.draculaRepository.findOne({ where: { id } });
    if (!dracula) throw new NotFoundException(`El dracula con ID ${id} no existe`);
    return dracula;
  }

  async actualizar(id: number, dto: UpdateDraculaDto): Promise<Dracula> {
    const dracula = await this.buscarPorId(id);
    Object.assign(dracula, dto);
    return await this.draculaRepository.save(dracula);
  }

  async eliminar(id: number): Promise<void> {
    const dracula = await this.buscarPorId(id);
    await this.draculaRepository.remove(dracula);
  }
}