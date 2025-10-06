import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoUsuario } from './../tipo_usuario/entities/tipo_usuario.entity';
import { CreateTipoUsuarioDto } from './dto/create-tipo_usuario.dto';
import { UpdateTipoUsuarioDto } from './dto/update-tipo_usuario.dto';
import { RolPermiso } from '../rol_permiso/entities/rol_permiso.entity';
import { Permiso } from '../permisos/entities/permiso.entity';

@Injectable()
export class TipoUsuarioService {
  constructor(
    @InjectRepository(TipoUsuario)
    private readonly tipoUsuarioRepo: Repository<TipoUsuario>,

    @InjectRepository(Permiso)
    private readonly permisoRepo: Repository<Permiso>,

    @InjectRepository(RolPermiso)
    private readonly rolPermisoRepo: Repository<RolPermiso>,
  ) {}

  create(dto: CreateTipoUsuarioDto) {
    const rol = this.tipoUsuarioRepo.create(dto);
    return this.tipoUsuarioRepo.save(rol);
  }

  async findAll() {
    const roles = await this.tipoUsuarioRepo.find({
      relations: ['rolPermisos', 'rolPermisos.permiso'],
    });
    
    return roles.map(rol => ({
      id: rol.id,
      nombre: rol.nombre,
      descripcion: rol.descripcion,
      permisos: rol.rolPermisos.map(rp => rp.permiso.nombre)
    }));
  }

  async findOne(id: number) {
    const rol = await this.tipoUsuarioRepo.findOne({
      where: { id },
      relations: ['rolPermisos', 'rolPermisos.permiso', 'usuarios'],
    });
    if (!rol) throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    return rol;
  }

  async update(id: number, dto: UpdateTipoUsuarioDto) {
    await this.findOne(id);
    await this.tipoUsuarioRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.tipoUsuarioRepo.delete(id);
  }
}
