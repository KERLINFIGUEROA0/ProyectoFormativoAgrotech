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

@WebSocketGatewayDecorator({
  cors: {
    origin: '*', // En producción, especifica tu dominio frontend
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/', // Namespace raíz para eventos generales
})
export class AppWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('WebSocketGateway');

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Cliente conectado: ${client.id}`);
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