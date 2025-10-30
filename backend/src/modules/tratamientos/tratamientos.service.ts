import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tratamiento } from './entities/tratamiento.entity';
import { CreateTratamientoDto } from './dto/create-tratamiento.dto';
import { UpdateTratamientoDto } from './dto/update-tratamiento.dto';
import { Cultivo } from '../cultivos/entities/cultivo.entity'; // <-- Importar Cultivo

@Injectable()
export class TratamientosService {
  constructor(
    @InjectRepository(Tratamiento)
    private readonly tratamientoRepo: Repository<Tratamiento>,
    @InjectRepository(Cultivo)
    private readonly cultivoRepo: Repository<Cultivo>,
  ) {}

  async create(dto: CreateTratamientoDto): Promise<Tratamiento> {
    const { cultivoId, ...restoDto } = dto;
    // Directamente crea desde el DTO, asumiendo que las fechas ya son Date por el transform: true
    const tratamiento = this.tratamientoRepo.create(restoDto); //

    if (cultivoId) {
      const cultivo = await this.cultivoRepo.findOne({ where: { id: cultivoId } });
      if (!cultivo) {
        throw new NotFoundException(`Cultivo con ID ${cultivoId} no encontrado.`);
      }
      tratamiento.cultivo = cultivo;
    }

    return this.tratamientoRepo.save(tratamiento);
  }

  async findAll(): Promise<Tratamiento[]> {
    return this.tratamientoRepo.find({ relations: ['cultivo'] });
  }

  async findOne(id: number): Promise<Tratamiento> {
    const tratamiento = await this.tratamientoRepo.findOne({
      where: { id },
      relations: ['cultivo']
    });
    if (!tratamiento) {
      throw new NotFoundException(`Tratamiento con ID ${id} no encontrado.`);
    }
    return tratamiento;
  }

  // --- MÉTODO UPDATE CORREGIDO (SIN new Date()) CON LOGS ---
  async update(id: number, dto: UpdateTratamientoDto): Promise<Tratamiento> {

    const { cultivoId, ...restoDto } = dto;
    const tratamiento = await this.findOne(id);

    // Lógica para asociar/desasociar cultivo
    if (dto.hasOwnProperty('cultivoId')) {
      if (cultivoId) {
        const cultivo = await this.cultivoRepo.findOne({ where: { id: cultivoId } });
        if (!cultivo) throw new NotFoundException(`Cultivo con ID ${cultivoId} no encontrado.`);
        tratamiento.cultivo = cultivo;
      } else {
        tratamiento.cultivo = null; // Permitido por la entidad
      }
    }

    // Usamos merge directamente con restoDto. Las fechas ya deberían ser Date gracias a transform: true
    this.tratamientoRepo.merge(tratamiento, restoDto);

    try {
      return await this.tratamientoRepo.save(tratamiento);
    } catch (dbError) {
      throw new Error(`Error al guardar en la base de datos: ${dbError.message || 'Error desconocido'}`);
    }
  }
  // --- FIN DEL MÉTODO UPDATE ---

  async remove(id: number): Promise<void> {
    const tratamiento = await this.findOne(id);
    await this.tratamientoRepo.remove(tratamiento);
  }
}