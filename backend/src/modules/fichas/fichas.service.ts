import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ficha } from './entities/ficha.entity';
import { CreateFichaDto } from './dto/create-ficha.dto';
import { UpdateFichaDto } from './dto/update-ficha.dto';

@Injectable()
export class FichasService {
  constructor(
    @InjectRepository(Ficha)
    private readonly fichaRepository: Repository<Ficha>,
  ) {}

  async create(createFichaDto: CreateFichaDto): Promise<Ficha> {
    const existingFicha = await this.fichaRepository.findOne({
      where: { id_ficha: createFichaDto.id_ficha },
    });
    if (existingFicha) {
      throw new ConflictException(`La ficha con el número ${createFichaDto.id_ficha} ya existe en el sistema`);
    }
    const ficha = this.fichaRepository.create(createFichaDto);
    return await this.fichaRepository.save(ficha);
  }

  async findAll(): Promise<Ficha[]> {
    return await this.fichaRepository.find({
      relations: ['usuarios'],
    });
  }

  async getOpciones(): Promise<{ value: string; label: string }[]> {
    const fichas = await this.fichaRepository.find();
    return fichas.map(ficha => ({
      value: ficha.id_ficha,
      label: `${ficha.nombre} (${ficha.id_ficha})`,
    }));
  }

  async findOne(id: number): Promise<Ficha> {
    const ficha = await this.fichaRepository.findOne({ where: { id } });
    if (!ficha) {
      throw new NotFoundException(`Ficha with ID ${id} not found`);
    }
    return ficha;
  }

  async update(id: number, updateFichaDto: UpdateFichaDto): Promise<Ficha> {
    const ficha = await this.findOne(id);
    Object.assign(ficha, updateFichaDto);
    return await this.fichaRepository.save(ficha);
  }

  async remove(id: number): Promise<void> {
    const ficha = await this.findOne(id);

    const usuariosAsignados = await this.fichaRepository.findOne({
      where: { id },
      relations: ['usuarios'],
    });

    if (usuariosAsignados && usuariosAsignados.usuarios && usuariosAsignados.usuarios.length > 0) {
      throw new Error('No se puede eliminar esta ficha porque tiene usuarios asignados.');
    }

    await this.fichaRepository.remove(ficha);
  }
}
