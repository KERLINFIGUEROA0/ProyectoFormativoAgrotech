import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cultivo } from './entities/cultivo.entity';
import { CreateCultivoDto } from './dto/create-cultivo.dto';
import { UpdateCultivoDto } from './dto/update-cultivo.dto';
import { TipoCultivo } from '../tipo_cultivo/entities/tipo_cultivo.entity';

@Injectable()
export class CultivosService {
  constructor(
    @InjectRepository(Cultivo)
    private readonly cultivoRepository: Repository<Cultivo>,
    @InjectRepository(TipoCultivo)
    private readonly tipoCultivoRepository: Repository<TipoCultivo>,
  ) {}

  async crear(dto: CreateCultivoDto): Promise<Cultivo> {
    const tipoCultivo = await this.tipoCultivoRepository.findOne({ where: { id: dto.tipoCultivoId } });
    if (!tipoCultivo) throw new NotFoundException(`El tipo de cultivo con ID ${dto.tipoCultivoId} no existe`);
    
    const cultivo = this.cultivoRepository.create({ ...dto, tipoCultivo });
    return await this.cultivoRepository.save(cultivo);
  }

  async listar(): Promise<Cultivo[]> {
    return await this.cultivoRepository.find({ relations: ['tipoCultivo'] });
  }

  async buscarPorId(id: number): Promise<Cultivo> {
    const cultivo = await this.cultivoRepository.findOne({ where: { id }, relations: ['tipoCultivo'] });
    if (!cultivo) throw new NotFoundException(`El cultivo con ID ${id} no existe`);
    return cultivo;
  }

  async actualizar(id: number, dto: UpdateCultivoDto): Promise<Cultivo> {
    const cultivo = await this.buscarPorId(id);
    if (dto.tipoCultivoId) {
      const tipoCultivo = await this.tipoCultivoRepository.findOne({ where: { id: dto.tipoCultivoId } });
      if (!tipoCultivo) throw new NotFoundException(`El tipo de cultivo con ID ${dto.tipoCultivoId} no existe`);
      cultivo.tipoCultivo = tipoCultivo;
    }
    Object.assign(cultivo, dto);
    return await this.cultivoRepository.save(cultivo);
  }

  async eliminar(id: number): Promise<void> {
    const cultivo = await this.buscarPorId(id);
    await this.cultivoRepository.remove(cultivo);
  }
  
  // --- ✅ CORRECCIÓN AQUÍ ---
  async actualizarImagen(id: number, imgUrl: string): Promise<Cultivo> {
    const cultivo = await this.buscarPorId(id);
    // Simplemente guarda la ruta relativa que el controlador le proporciona.
    cultivo.img = imgUrl;
    return this.cultivoRepository.save(cultivo);
  }
}