// src/modules/usuarios_permisos/usuarios_permisos.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsuarioPermiso } from './entities/usuarios_permiso.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Permiso } from '../permisos/entities/permiso.entity';
import { NotificationsGateway } from '../../notifications/notifications.gateway';

@Injectable()
export class UsuarioPermisoService {
  constructor(
    @InjectRepository(UsuarioPermiso)
    private usuarioPermisoRepo: Repository<UsuarioPermiso>,
    @InjectRepository(Usuario)
    private usuarioRepo: Repository<Usuario>,
    @InjectRepository(Permiso)
    private permisoRepo: Repository<Permiso>,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async getPermissionsForUser(userId: number) {
    const user = await this.usuarioRepo.findOne({
      where: { id: userId },
      relations: [
        'tipoUsuario',
        'tipoUsuario.rolPermisos',
        'tipoUsuario.rolPermisos.permiso',
      ],
    });

    if (!user) {
      throw new NotFoundException(`Usuario con id ${userId} no encontrado.`);
    }

    // 1. Obtener todos los permisos del sistema.
    const allPermissions = await this.permisoRepo.find();

    // 2. Obtener los IDs de los permisos que ya vienen del ROL del usuario.
    const rolePermissionIds = new Set(
      (user.tipoUsuario?.rolPermisos || []).map((rp) => rp.permiso.id),
    );

    // 3. Filtrar para obtener solo los permisos que NO provienen del rol (adicionales).
    const additionalPermissions = allPermissions.filter(
      (p) => !rolePermissionIds.has(p.id),
    );

    // 4. Obtener los permisos individuales que han sido asignados explícitamente a este usuario.
    const individualPermissions = await this.usuarioPermisoRepo.find({
      where: { usuario: { id: userId } },
      relations: ['permiso'],
    });
    const individualPermissionIds = new Set(
      individualPermissions.map((up) => up.permiso.id),
    );

    // 5. Mapear los permisos adicionales para devolverlos al frontend.
    // Solo mostramos los permisos que se pueden activar/desactivar individualmente.
    return additionalPermissions.map((permiso) => {
      // El permiso individual está "activo" si su ID está en el conjunto de permisos individuales.
      const isIndividualActive = individualPermissionIds.has(permiso.id);

      return {
        permisoId: permiso.id,
        nombre: permiso.nombre,
        descripcion: permiso.descripcion,

        // Este campo indica si el permiso está activado individualmente para el usuario.
        // Será `true` si existe una entrada en la tabla `usuario_permisos`.
        activo: isIndividualActive,
      };
    });
  }

  // El método togglePermission se mantiene sin cambios, ya que su lógica es correcta
  async togglePermission(dto: {
    usuarioId: number;
    permisoId: number;
    estado: boolean;
  }) {
    const { usuarioId, permisoId, estado } = dto;

    const usuarioPermisoExistente = await this.usuarioPermisoRepo.findOne({
      where: {
        usuario: { id: usuarioId },
        permiso: { id: permisoId },
      },
    });

    let result;

    if (estado) {
      if (!usuarioPermisoExistente) {
        const usuario = await this.usuarioRepo.findOneBy({ id: usuarioId });
        if (!usuario) throw new NotFoundException(`Usuario con id ${usuarioId} no encontrado.`);

        const permiso = await this.permisoRepo.findOneBy({ id: permisoId });
        if (!permiso) throw new NotFoundException(`Permiso con id ${permisoId} no encontrado.`);

        const nuevoUsuarioPermiso = this.usuarioPermisoRepo.create({ usuario, permiso });
        result = await this.usuarioPermisoRepo.save(nuevoUsuarioPermiso);
      } else {
        result = usuarioPermisoExistente;
      }
    } else {
      if (usuarioPermisoExistente) {
        await this.usuarioPermisoRepo.remove(usuarioPermisoExistente);
        result = { message: 'Permiso desasignado correctamente.' };
      } else {
        result = { message: 'El permiso no estaba asignado. No se realizó ninguna acción.' };
      }
    }

    this.notificationsGateway.sendPermissionsUpdate(usuarioId);

    return result;
  }
}
