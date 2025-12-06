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
import { AuthService } from '../auth/auth.service'; // <-- AÑADIR IMPORT

@WebSocketGateway({
  cors: { origin: '*' },
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
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.headers.authorization?.split(' ')[1];
      if (!token) return client.disconnect();
      const payload = this.jwtService.verify(token);
      this.connectedUsers.set(payload.sub, client.id);
      this.logger.log(`✅ Usuario conectado [ID: ${payload.sub}, Socket: ${client.id}]`);
    } catch (error) {
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
    if (socketId) {
      this.logger.log(`🚀 Enviando actualización de permisos al usuario ${userId}`);
      
      const usuarioCompleto = await this.usuariosService.findByIdentificacion(
        (await this.usuariosService.buscarPorId(userId)).identificacion
      );
      
      if (usuarioCompleto) {
        // --- CAMBIO CLAVE: Generar y enviar nuevo token ---
        const newTokenData = await this.authService._createToken(usuarioCompleto);
        
        this.server.to(socketId).emit('permissions_updated', {
          permisos: newTokenData.permisos,
          modulos: newTokenData.modulos,
          access_token: newTokenData.access_token, // Se envía el nuevo token
        });
      }
    }
  }
}
