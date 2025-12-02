import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  // Callbacks para eventos
  private eventCallbacks: { [eventName: string]: ((data: any) => void)[] } = {};

  constructor() {
    this.connect();
  }

  private connect() {
    const API_URL = import.meta.env.VITE_BACKEND_URL;

    this.socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    this.socket.on('connect', () => {
      console.log('🟢 WebSocket conectado:', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔴 WebSocket desconectado:', reason);
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión WebSocket:', error);
      this.handleReconnect();
    });

    // Configurar listeners para eventos conocidos
    this.setupEventListeners();
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Intentando reconectar... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('❌ Máximo número de intentos de reconexión alcanzado');
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Eventos de lotes
    this.socket.on('lote-estado-actualizado', (data) => {
      console.log('📡 Lote estado actualizado:', data);
      this.triggerCallbacks('lote-estado-actualizado', data);
    });

    this.socket.on('lote-liberado', (data) => {
      console.log('📡 Lote liberado:', data);
      this.triggerCallbacks('lote-liberado', data);
    });

    // Eventos de cultivos
    this.socket.on('cultivo-estado-actualizado', (data) => {
      console.log('📡 Cultivo estado actualizado:', data);
      this.triggerCallbacks('cultivo-estado-actualizado', data);
    });

    // Eventos de sublotes
    this.socket.on('sublote-estado-actualizado', (data) => {
      console.log('📡 Sublote estado actualizado:', data);
      this.triggerCallbacks('sublote-estado-actualizado', data);
    });

    this.socket.on('sublote-liberado', (data) => {
      console.log('📡 Sublote liberado:', data);
      this.triggerCallbacks('sublote-liberado', data);
    });

    // Ping/Pong para mantener conexión
    this.socket.on('pong', () => {
      console.log('🏓 Pong recibido');
    });
  }

  // Método para suscribirse a eventos
  on(eventName: string, callback: (data: any) => void) {
    if (!this.eventCallbacks[eventName]) {
      this.eventCallbacks[eventName] = [];
    }
    this.eventCallbacks[eventName].push(callback);

    // Devolver función para desuscribirse
    return () => {
      this.off(eventName, callback);
    };
  }

  // Método para desuscribirse de eventos
  off(eventName: string, callback: (data: any) => void) {
    if (this.eventCallbacks[eventName]) {
      this.eventCallbacks[eventName] = this.eventCallbacks[eventName].filter(
        cb => cb !== callback
      );
    }
  }

  // Método para emitir eventos al servidor
  emit(eventName: string, data?: any) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(eventName, data);
    } else {
      console.warn('⚠️ WebSocket no conectado, no se puede emitir evento:', eventName);
    }
  }

  // Método para enviar ping
  ping() {
    this.emit('ping');
  }

  // Método para solicitar actualización manual
  solicitarActualizacionLotes() {
    this.emit('solicitar-actualizacion-lotes');
  }

  private triggerCallbacks(eventName: string, data: any) {
    if (this.eventCallbacks[eventName]) {
      this.eventCallbacks[eventName].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error en callback de evento:', eventName, error);
        }
      });
    }
  }

  // Método para verificar estado de conexión
  isConnected(): boolean {
    return this.socket ? this.socket.connected : false;
  }

  // Método para desconectar manualmente
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Método para obtener el ID del socket
  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

// Exportar instancia singleton
export const websocketService = new WebSocketService();
export default websocketService;