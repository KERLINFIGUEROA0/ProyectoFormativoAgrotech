import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipoUsuario } from './entities/tipo_usuario.entity';
import { Permiso } from '../permisos/entities/permiso.entity';
import { RolPermiso } from '../rol_permiso/entities/rol_permiso.entity';
import { TipoUsuarioService } from './tipo_usuario.service';
import { TipoUsuarioController } from './tipo_usuario.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([TipoUsuario, Permiso, RolPermiso]), // ⬅️ aquí metes todos
  ],
  controllers: [TipoUsuarioController],
  providers: [TipoUsuarioService],
  exports: [TipoUsuarioService],
})
export class TipoUsuarioModule {}

