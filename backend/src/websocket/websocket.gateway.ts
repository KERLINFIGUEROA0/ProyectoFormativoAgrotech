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
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGatewayDecorator({
  cors: true, // Habilitar CORS básico
})
export class AppWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('WebSocketGateway');

  constructor(
    private readonly jwtService: JwtService
  ) {}

  async handleConnection(client: Socket, ...args: any[]) {
    try {
      // ✅ ESTRATEGIA DUAL: Busca en 'auth' (Frontend) o 'headers' (Postman/Otros)
      let token = client.handshake.auth?.token;

      // Fallback: Si no viene en auth, busca en headers
      if (!token && client.handshake.headers.authorization) {
        token = client.handshake.headers.authorization.split(' ')[1];
      }

      if (!token) {
        // Lanzamos error para que el cliente reciba 'connect_error' y pare el bucle
        this.logger.warn(`⛔ Cliente ${client.id} rechazado: Sin token.`);
        client.disconnect();
        return;
      }

      // Validar Token
      const payload = this.jwtService.verify(token);

      // Guardar usuario en el socket para uso futuro
      client.data.user = payload;

      this.logger.log(`✅ Cliente conectado: ${client.id} | Usuario: ${payload.nombre || payload.sub}`);

    } catch (error) {
      // Este mensaje de error se envía al cliente en el evento 'connect_error'
      this.logger.error(`❌ Error Auth WS: ${error.message}`);
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