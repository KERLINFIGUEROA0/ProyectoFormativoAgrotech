import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permiso } from './entities/permiso.entity';
import { CreatePermisoDto } from './dto/create-permiso.dto';
import { UpdatePermisoDto } from './dto/update-permiso.dto';

@Injectable()
export class PermisosService {
  constructor(
    @InjectRepository(Permiso)
    private readonly permisoRepo: Repository<Permiso>,
  ) {}

  create(dto: CreatePermisoDto) {
    const permiso = this.permisoRepo.create(dto);
    return this.permisoRepo.save(permiso);
  }

  findAll() {
    return this.permisoRepo.find({ relations: ['modulo'] });
  }

  findOne(id: number) {
    return this.permisoRepo.findOne({ where: { id }, relations: ['modulo'] });
  }

  async update(id: number, dto: UpdatePermisoDto) {
    await this.permisoRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    return this.permisoRepo.delete(id);
  }
}

