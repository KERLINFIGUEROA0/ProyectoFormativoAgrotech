import { WebSocketGateway, WebSocketServer, SubscribeMessage } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: true })
export class MqttGateway {
  @WebSocketServer()
  server: Server;

  /**
   * Emite datos procesados al frontend.
   * El payload incluye 'loteId' para que el front sepa dónde pintar.
   */
  emitMeasurement(payload: any) {
    this.server.emit('lectura-sensor', payload);
  }

  // Opcional: Notificar estado de conexión
  emitConnectionStatus(payload: { loteId: string, status: boolean }) {
    this.server.emit('estado-conexion', payload);
  }
}