import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Inject, Logger, forwardRef } from '@nestjs/common';
import { UsuariosService } from '../modules/usuarios/usuarios.service';
import { AuthService } from '../auth/auth.service';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:5173',
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private connectedUsers = new Map<number, string>();

  constructor(
    private jwtService: JwtService,
    @Inject(forwardRef(() => UsuariosService))
    private usuariosService: UsuariosService,
    private authService: AuthService, // <-- INYECTAR AUTHSERVICE
  ) { }

  async handleConnection(client: Socket) {
    try {
      this.logger.log(`🔍 [Notifications] Intentando conectar cliente ${client.id}`);

      // ✅ PRIORIDAD 1: Buscar token en cookies (nuevo método con cookies HttpOnly)
      let token = client.handshake.headers.cookie
        ?.split('; ')
        ?.find(c => c.startsWith('Authentication='))
        ?.split('=')[1];

      this.logger.log(`🍪 [Notifications] Token desde cookie: ${token ? 'ENCONTRADO' : 'NO ENCONTRADO'}`);

      // Fallback 1: Buscar en auth (compatibilidad con versiones anteriores)
      if (!token) {
        token = client.handshake.auth?.token;
        this.logger.log(`🔑 [Notifications] Token desde auth: ${token ? 'ENCONTRADO' : 'NO ENCONTRADO'}`);
      }

      // Fallback 2: Buscar en headers Authorization (Postman)
      if (!token && client.handshake.headers.authorization) {
        token = client.handshake.headers.authorization.split(' ')[1];
        this.logger.log(`📨 [Notifications] Token desde Authorization header: ${token ? 'ENCONTRADO' : 'NO ENCONTRADO'}`);
      }

      if (!token) {
        this.logger.warn(`⛔ Cliente ${client.id} rechazado: Sin token.`);
        client.disconnect();
        return;
      }

      this.logger.log(`✅ [Notifications] Token encontrado, validando...`);

      const payload = this.jwtService.verify(token);
      this.connectedUsers.set(payload.sub, client.id);
      this.logger.log(`✅ Usuario conectado [ID: ${payload.sub}, Socket: ${client.id}]`);
    } catch (error) {
      this.logger.error(`❌ Error Auth WS: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    for (const [userId, socketId] of this.connectedUsers.entries()) {
      if (socketId === client.id) {
        this.connectedUsers.delete(userId);
        this.logger.log(`❌ Usuario desconectado [ID: ${userId}]`);
        break;
      }
    }
  }

  async sendPermissionsUpdate(userId: number) {
    const socketId = this.connectedUsers.get(userId);
    if (!socketId) {
      this.logger.warn(`⚠️ No socket found for user ${userId}, skipping permissions update`);
      return;
    }

    this.logger.log(`🚀 Sending permissions update to user ${userId}`);

    try {
      // Direct lookup - more reliable than nested calls
      const usuarioCompleto = await this.usuariosService.buscarPorId(userId);

      if (!usuarioCompleto) {
        this.logger.error(`❌ User ${userId} not found, cannot send permissions update`);
        return;
      }

      // Generate new token with updated permissions
      const newTokenData = await this.authService._createToken(usuarioCompleto);

      this.server.to(socketId).emit('permissions_updated', {
        permisos: newTokenData.permisos,
        modulos: newTokenData.modulos,
        access_token: newTokenData.access_token,
      });

      this.logger.log(`✅ Permissions update sent successfully to user ${userId}`);
    } catch (error) {
      this.logger.error(`❌ Error sending permissions update to user ${userId}: ${error.message}`);
      // Don't throw - just log and continue to prevent propagation of 400 errors
    }
  }
}

