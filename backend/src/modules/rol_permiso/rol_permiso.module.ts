import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolPermiso } from './entities/rol_permiso.entity';
import { RolPermisoService } from './rol_permiso.service';
import { RolPermisoController } from './rol_permiso.controller';
import { TipoUsuario } from '../tipo_usuario/entities/tipo_usuario.entity';
import { Permiso } from '../permisos/entities/permiso.entity';
import { Usuario } from '../usuarios/entities/usuario.entity'; // <-- AÑADIR IMPORT
import { NotificationsModule } from '../../notifications/notifications.module'; // <-- AÑADIR IMPORT

@Module({
  imports: [
    TypeOrmModule.forFeature([RolPermiso, TipoUsuario, Permiso, Usuario]), // <-- AÑADIR Usuario
    NotificationsModule, // <-- AÑADIR ESTE MÓDULO
  ],
  providers: [RolPermisoService],
  controllers: [RolPermisoController],
})
export class RolPermisoModule {}


