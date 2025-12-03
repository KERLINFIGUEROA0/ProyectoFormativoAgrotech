import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, any[]> = new Map();
  private currentToken: string | undefined;

  // Método para conectar explícitamente pasando el token (opcional)
  connect(token?: string) {
    // Si ya estamos conectados con el mismo token, no hacer nada
    if (this.socket?.connected && this.currentToken === token) {
      return;
    }

    // Si hay una conexión existente, desconectarla primero
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.currentToken = token;

    const API_URL = import.meta.env.VITE_BACKEND_URL;

    const options: any = {
      // 🚀 CLAVE: Forzar websocket evita el handshake lento HTTP y reduce desconexiones
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    };

    // Solo enviar token si existe y es válido
    if (token) {
      options.auth = { token };
    }

    this.socket = io(API_URL, options);

    this.socket.on('connect', () => {
      console.log('🟢 WebSocket conectado:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('🔴 WebSocket desconectado:', reason);
      if (reason === 'io server disconnect') {
        // Si el servidor nos echó, no intentamos reconectar automáticamente
        // para evitar el bucle infinito. El AuthContext se encargará de reconectar cuando sea necesario.
        console.warn('El servidor desconectó la conexión WebSocket.');
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('⚠️ Error de conexión WebSocket:', error.message);
    });

    // Configurar listeners para eventos conocidos
    this.setupEventListeners();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Método optimizado para suscribirse a eventos
  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);

    // Si el socket ya existe, registrar el evento
    if (this.socket) {
      this.socket.on(event, callback);
    }

    // Retornar función para desuscribirse (limpieza)
    return () => {
      this.socket?.off(event, callback);
      const eventListeners = this.listeners.get(event) || [];
      this.listeners.set(event, eventListeners.filter(cb => cb !== callback));
    };
  }

  // Emitir eventos al servidor si fuera necesario
  emit(event: string, data?: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('⚠️ No se puede emitir, socket desconectado.');
    }
  }

  // Método para verificar estado de conexión
  isConnected(): boolean {
    return this.socket ? this.socket.connected : false;
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

  private triggerCallbacks(eventName: string, data: any) {
    if (this.listeners.has(eventName)) {
      this.listeners.get(eventName)?.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error en callback de evento:', eventName, error);
        }
      });
    }
  }
}

// Exportar instancia singleton
const websocketService = new WebSocketService();
export default websocketService;