import {
  WebSocketGateway as WebSocketGatewayDecorator,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGatewayDecorator({
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://tu-dominio.com'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/mqtt', // Namespace específico para MQTT
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 20000,
  maxHttpBufferSize: 1e8,
  allowEIO3: true,
  transports: ['websocket', 'polling'],
})
export class MqttGateway {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('MqttGateway');

  handleConnection(client: Socket) {
    this.logger.log(`✅ Cliente MQTT conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente MQTT desconectado: ${client.id}`);
  }

  // Método para emitir lecturas nuevas
  emitLecturaNueva(data: any) {
    this.server.emit('lecturaNueva', data);
    this.logger.log(`📡 Evento emitido: lecturaNueva`);
  }

  // Método para emitir estado de conexión
  emitEstadoConexion(data: any) {
    this.server.emit('estadoConexion', data);
    this.logger.log(`📡 Evento emitido: estadoConexion para lote ${data.loteId}`);
  }

  // Método para emitir estado de sensor
  emitSensorStatus(sensorId: string, status: 'CONNECTED' | 'DISCONNECTED') {
    this.server.emit('sensorStatus', { id: sensorId, status });
    this.logger.log(`📡 Evento emitido: sensorStatus ${sensorId} -> ${status}`);
  }

  // Método para emitir datos del sensor
  emitSensorData(sensorId: string, data: any) {
    this.server.emit('sensorData', { id: sensorId, data });
    this.logger.log(`📡 Evento emitido: sensorData para ${sensorId}`);
  }

  // Eventos que el frontend puede enviar
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong');
  }

  @SubscribeMessage('solicitar-estado-sensores')
  handleSolicitarEstado(@ConnectedSocket() client: Socket) {
    // Podríamos emitir el estado actual de todos los sensores
    client.emit('estado-actual-solicitado');
    this.logger.log(`Cliente ${client.id} solicitó estado de sensores`);
  }
}