import { Module, forwardRef } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { AuthModule } from 'src/auth/auth.module';
import { UsuariosModule } from '../modules/usuarios/usuarios.module';

@Module({
  imports: [
    AuthModule,
    forwardRef(() => UsuariosModule),
  ],
  providers: [NotificationsGateway],
  exports: [NotificationsGateway],
})
export class NotificationsModule {}

