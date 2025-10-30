import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoCultivo } from './entities/tipo_cultivo.entity';
import { CreateTipoCultivoDto } from './dto/create-tipo_cultivo.dto';
import { UpdateTipoCultivoDto } from './dto/update-tipo_cultivo.dto';

@Injectable()
export class TipoCultivoService {
  constructor(
    @InjectRepository(TipoCultivo)
    private readonly tipoCultivoRepo: Repository<TipoCultivo>,
  ) {}

  async crear(data: CreateTipoCultivoDto): Promise<TipoCultivo> {
    const nuevo = this.tipoCultivoRepo.create(data);
    return await this.tipoCultivoRepo.save(nuevo);
  }

  async listar(): Promise<TipoCultivo[]> {
    return await this.tipoCultivoRepo.find({
      relations: ['cultivos'],
    });
  }

  async buscarPorId(id: number): Promise<TipoCultivo> {
    const tipo = await this.tipoCultivoRepo.findOne({
      where: { id },
      relations: ['cultivos'],
    });
    if (!tipo) {
      throw new NotFoundException(`TipoCultivo con id ${id} no encontrado`);
    }
    return tipo;
  }

  async actualizar(id: number, data: UpdateTipoCultivoDto): Promise<TipoCultivo> {
    const tipo = await this.buscarPorId(id);
    Object.assign(tipo, data);
    return await this.tipoCultivoRepo.save(tipo);
  }

  async eliminar(id: number): Promise<TipoCultivo> {
    const tipo = await this.buscarPorId(id);
    return await this.tipoCultivoRepo.remove(tipo);
  }
}
