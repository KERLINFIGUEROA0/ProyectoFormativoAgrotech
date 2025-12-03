import {
  WebSocketGateway as WebSocketGatewayDecorator,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGatewayDecorator({
  cors: {
    origin: '*', // En producción, especifica tu dominio frontend
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/', // Namespace raíz para eventos generales
  // Configuración para estabilidad de conexión
  pingTimeout: 60000, // 60 segundos para ping timeout
  pingInterval: 25000, // 25 segundos entre pings
  connectTimeout: 20000, // 20 segundos para timeout de conexión
  maxHttpBufferSize: 1e8, // 100MB máximo buffer
  allowEIO3: true, // Permitir Engine.IO v3
  transports: ['websocket', 'polling'], // Permitir ambos transportes
})
export class AppWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('WebSocketGateway');

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket, ...args: any[]) {
    try {
      // 1. Intentar extraer el token de varios lugares posibles
      let token = client.handshake.auth?.token || client.handshake.headers?.authorization;

      // 2. Si viene como "Bearer xyz", limpiarlo
      if (token && token.startsWith('Bearer ')) {
        token = token.split(' ')[1];
      }

      if (!token) {
        this.logger.warn(`⚠️ Cliente ${client.id} intentó conectarse sin token. Desconectando...`);
        client.disconnect();
        return;
      }

      // 3. Verificar el token (esto lanza error si es inválido)
      const payload = this.jwtService.verify(token);

      // 4. (Opcional) Unir al usuario a una sala con su ID o Rol para notificaciones privadas
      // client.join(`user_${payload.sub}`);

      this.logger.log(`✅ Cliente conectado: ${client.id} (Usuario: ${payload.sub || payload.username})`);

    } catch (error) {
      this.logger.error(`🔴 Error de autenticación en WS para cliente ${client.id}:`, error.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
  }

  // Método para emitir eventos de actualización de lotes
  emitLoteEstadoActualizado(loteId: number, nuevoEstado: string, loteNombre?: string) {
    this.server.emit('lote-estado-actualizado', {
      loteId,
      nuevoEstado,
      loteNombre,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`📡 Evento emitido: lote ${loteId} cambió a ${nuevoEstado}`);
  }

  // Método para emitir eventos de actualización de cultivos
  emitCultivoEstadoActualizado(cultivoId: number, nuevoEstado: string, cultivoNombre?: string) {
    this.server.emit('cultivo-estado-actualizado', {
      cultivoId,
      nuevoEstado,
      cultivoNombre,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`📡 Evento emitido: cultivo ${cultivoId} cambió a ${nuevoEstado}`);
  }

  // Método para emitir eventos de actualización de sublotes
  emitSubloteEstadoActualizado(subloteId: number, nuevoEstado: string, subloteNombre?: string) {
    this.server.emit('sublote-estado-actualizado', {
      subloteId,
      nuevoEstado,
      subloteNombre,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`📡 Evento emitido: sublote ${subloteId} cambió a ${nuevoEstado}`);
  }

  // Método para emitir eventos de liberación de lotes
  emitLoteLiberado(loteId: number, loteNombre?: string) {
    this.server.emit('lote-liberado', {
      loteId,
      loteNombre,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`📡 Evento emitido: lote ${loteId} liberado`);
  }

  // Método para emitir eventos de liberación de sublotes
  emitSubloteLiberado(subloteId: number, subloteNombre?: string) {
    this.server.emit('sublote-liberado', {
      subloteId,
      subloteNombre,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`📡 Evento emitido: sublote ${subloteId} liberado`);
  }

  // Evento de ping/pong para mantener conexión viva
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong');
  }

  // Evento para que clientes soliciten actualización manual
  @SubscribeMessage('solicitar-actualizacion-lotes')
  handleSolicitarActualizacion(@ConnectedSocket() client: Socket) {
    // Podríamos emitir una señal para que el frontend refresque datos
    client.emit('actualizacion-solicitada');
    this.logger.log(`Cliente ${client.id} solicitó actualización de lotes`);
  }
}