import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuarioPermiso } from './entities/usuarios_permiso.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Permiso } from '../permisos/entities/permiso.entity';
import { UsuarioPermisoService } from './usuarios_permisos.service';
import { UsuarioPermisoController } from './usuarios_permisos.controller';
import { NotificationsModule } from '../../notifications/notifications.module'; // <-- AÑADIR IMPORT

@Module({
  imports: [
    TypeOrmModule.forFeature([UsuarioPermiso, Usuario, Permiso]),
    NotificationsModule, // <-- AÑADIR ESTE MÓDULO
  ],
  controllers: [UsuarioPermisoController],
  providers: [UsuarioPermisoService],
  exports: [UsuarioPermisoService],
})
export class UsuarioPermisoModule {}


