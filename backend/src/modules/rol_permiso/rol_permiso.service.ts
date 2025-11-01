import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolPermiso } from './entities/rol_permiso.entity';
import { TipoUsuario } from '../tipo_usuario/entities/tipo_usuario.entity';
import { Permiso } from '../permisos/entities/permiso.entity';
import { NotificationsGateway } from '../../notifications/notifications.gateway';
import { Usuario } from '../usuarios/entities/usuario.entity';

@Injectable()
export class RolPermisoService {
  constructor(
    @InjectRepository(RolPermiso)
    private readonly rolPermisoRepo: Repository<RolPermiso>,
    @InjectRepository(TipoUsuario)
    private readonly tipoUsuarioRepo: Repository<TipoUsuario>,
    @InjectRepository(Permiso)
    private readonly permisoRepo: Repository<Permiso>,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async getPermissionsByRole(roleId: number) {
    const role = await this.tipoUsuarioRepo.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Rol con id ${roleId} no encontrado.`);
    }

    const allPermissions = await this.permisoRepo.find();
    const assignedPermissions = await this.rolPermisoRepo.find({
      where: { tipoUsuario: { id: roleId } },
      relations: ['permiso'],
    });

    const assignedPermissionIds = new Set(
      assignedPermissions.map((rp) => rp.permiso.id),
    );

    return allPermissions.map((permiso) => ({
      permisoId: permiso.id,
      nombre: permiso.nombre,
      descripcion: permiso.descripcion,
      activo: assignedPermissionIds.has(permiso.id),
    }));
  }

  async getPermissionsByRoleDetallado(roleId: number) {
    const role = await this.tipoUsuarioRepo.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Rol con id ${roleId} no encontrado.`);
    }

    const allPermissions = await this.permisoRepo.find({
      relations: ['modulo']
    });
    const assignedPermissions = await this.rolPermisoRepo.find({
      where: { tipoUsuario: { id: roleId } },
      relations: ['permiso'],
    });

    const assignedPermissionIds = new Set(
      assignedPermissions.map((rp) => rp.permiso.id),
    );

    return allPermissions.map((permiso) => ({
      permisoId: permiso.id,
      nombre: permiso.nombre,
      descripcion: permiso.descripcion,
      activo: assignedPermissionIds.has(permiso.id),
      modulo: permiso.modulo ? {
        id: permiso.modulo.id,
        nombre: permiso.modulo.nombre,
        descripcion: permiso.modulo.descripcion
      } : null
    }));
  }

  async togglePermission(dto: {
    rolId: number;
    permisoId: number;
    estado: boolean;
  }) {
    const { rolId, permisoId, estado } = dto;

    const rolPermisoExistente = await this.rolPermisoRepo.findOne({
      where: {
        tipoUsuario: { id: rolId },
        permiso: { id: permisoId },
      },
    });

    let result;

    if (estado) {
      if (!rolPermisoExistente) {
        const tipoUsuario = await this.tipoUsuarioRepo.findOneBy({ id: rolId });
        if (!tipoUsuario) throw new NotFoundException(`Rol con id ${rolId} no encontrado.`);
        
        const permiso = await this.permisoRepo.findOneBy({ id: permisoId });
        if (!permiso) throw new NotFoundException(`Permiso con id ${permisoId} no encontrado.`);

        const nuevoRolPermiso = this.rolPermisoRepo.create({ tipoUsuario, permiso });
        result = await this.rolPermisoRepo.save(nuevoRolPermiso);
      } else {
        result = rolPermisoExistente;
      }
    } else {
      if (rolPermisoExistente) {
        await this.rolPermisoRepo.remove(rolPermisoExistente);
        result = { message: 'Permiso desasignado correctamente.' };
      } else {
        result = { message: 'El permiso no estaba asignado. No se realizó ninguna acción.' };
      }
    }

    // Notificar a todos los usuarios afectados por el cambio de rol
    const usuariosAfectados = await this.usuarioRepo.find({ where: { tipoUsuario: { id: rolId } } });
    for (const usuario of usuariosAfectados) {
      this.notificationsGateway.sendPermissionsUpdate(usuario.id);
    }
    
    return result;
  }
}

