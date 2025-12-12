import { Module, forwardRef } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { AuthModule } from '../auth/auth.module';
import { UsuariosModule } from '../modules/usuarios/usuarios.module';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => UsuariosModule),
  ],
  providers: [NotificationsGateway],
  exports: [NotificationsGateway],
})
export class NotificationsModule { }
