import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AppWebSocketGateway } from './websocket.gateway';

@Module({
  imports: [AuthModule], // Importa AuthModule para tener acceso a JwtService
  providers: [AppWebSocketGateway],
  exports: [AppWebSocketGateway],
})
export class WebSocketModule {}