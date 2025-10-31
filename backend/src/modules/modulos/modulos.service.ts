// src/modulos/modulos.service.ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Modulo } from "./entities/modulo.entity";
import { CreateModuloDto } from "./dto/create-modulo.dto";
import { UpdateModuloDto } from "./dto/update-modulo.dto";

@Injectable()
export class ModulosService {
  constructor(
    @InjectRepository(Modulo)
    private readonly moduloRepository: Repository<Modulo>
  ) {}

  async crear(data: CreateModuloDto): Promise<Modulo> {
    const nuevo = this.moduloRepository.create(data);
    return await this.moduloRepository.save(nuevo);
  }

  async listar(): Promise<Modulo[]> {
    return await this.moduloRepository.find({ relations: ["permisos"] });
  }

  async buscarPorId(id: number): Promise<Modulo> {
    const modulo = await this.moduloRepository.findOne({
      where: { id },
      relations: ["permisos"],
    });
    if (!modulo) throw new NotFoundException(`Módulo con id ${id} no encontrado`);
    return modulo;
  }

  async actualizar(id: number, data: UpdateModuloDto): Promise<Modulo> {
    const modulo = await this.buscarPorId(id);
    Object.assign(modulo, data);
    return await this.moduloRepository.save(modulo);
  }

  async eliminar(id: number): Promise<void> {
    const modulo = await this.buscarPorId(id);
    await this.moduloRepository.remove(modulo);
  }
}

