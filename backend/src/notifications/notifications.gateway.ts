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
      // ✅ PRIORIDAD 1: Buscar token en cookies (nuevo método con cookies HttpOnly)
      let token = client.handshake.headers.cookie
        ?.split('; ')
        ?.find(c => c.startsWith('Authentication='))
        ?.split('=')[1];

      // Fallback 1: Buscar en auth (compatibilidad con versiones anteriores)
      if (!token) {
        token = client.handshake.auth?.token;
      }

      // Fallback 2: Buscar en headers Authorization (Postman)
      if (!token && client.handshake.headers.authorization) {
        token = client.handshake.headers.authorization.split(' ')[1];
      }

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      this.connectedUsers.set(payload.sub, client.id);
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    for (const [userId, socketId] of this.connectedUsers.entries()) {
      if (socketId === client.id) {
        this.connectedUsers.delete(userId);
        break;
      }
    }
  }

  async sendPermissionsUpdate(userId: number) {
    const socketId = this.connectedUsers.get(userId);
    if (!socketId) {
      return;
    }

    try {
      const usuarioCompleto = await this.usuariosService.buscarPorId(userId);

      if (!usuarioCompleto) {
        return;
      }

      // Generate new token with updated permissions
      const newTokenData = await this.authService._createToken(usuarioCompleto);

      this.server.to(socketId).emit('permissions_updated', {
        permisos: newTokenData.permisos,
        modulos: newTokenData.modulos,
        access_token: newTokenData.access_token,
      });
    } catch (error) {
    }
  }
}

