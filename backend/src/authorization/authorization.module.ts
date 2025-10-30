import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { JwtStrategy } from '../auth/jwt.strategy';
import { RolPermiso } from '../modules/rol_permiso/entities/rol_permiso.entity';
import { UsuarioPermiso } from '../modules/usuarios_permisos/entities/usuarios_permiso.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RolPermiso, UsuarioPermiso]),

    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [ JwtStrategy],
  exports: [],  
})
export class AuthorizationModule {}

