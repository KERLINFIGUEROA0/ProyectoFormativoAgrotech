import { io, Socket, type ManagerOptions, type SocketOptions } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, ((data: unknown) => void)[]> = new Map();
  private currentToken: string | undefined;

  // Método para conectar (ahora usa cookies automáticamente)
  connect() {

    // 1. Si ya está conectado, no hacer nada
    if (this.socket?.connected) {
      return;
    }

    // 2. Si hay un socket CONECTÁNDOSE (no conectado aún), no interrumpirlo
    if (this.socket && !this.socket.connected && this.socket.io['_readyState'] === 'opening') {
      return;
    }

    // 3. Solo desconectar si el socket está realmente roto o desconectado
    if (this.socket && this.socket.disconnected) {
      this.socket.removeAllListeners();
      this.socket = null;
    }

    // Ya no guardamos ni validamos el token aquí, las cookies lo manejan automáticamente
    this.currentToken = undefined;

    const API_URL = import.meta.env.VITE_BACKEND_URL;

    // --- CONFIGURACIÓN PARA COOKIES ---
    const options: Partial<ManagerOptions & SocketOptions> = {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,

      // ✅ IMPORTANTE: Enviar cookies automáticamente
      withCredentials: true,

      // ❌ YA NO ENVIAMOS TOKEN EN AUTH - Las cookies se envían automáticamente
    };

    this.socket = io(API_URL, options);

    // --- LISTENERS DE ESTADO ---

    this.socket.on('connect', () => {
    });

    // Manejar errores de conexión (incluyendo rechazo de auth)
    this.socket.on('connect_error', (error) => {
      // Si el backend rechaza la conexión, paramos el bucle inmediatamente
      if (error.message.includes('Unauthorized') || error.message.includes('token') || error.message.includes('credenciales')) {
        this.socket?.disconnect(); // Esto mata el bucle
        window.dispatchEvent(new CustomEvent('tokenExpired'));
      }
    });

    this.socket.on('disconnect', (reason) => {
      // Si el servidor nos desconecta, evaluamos por qué
      if (reason === 'io server disconnect') {
        // Emitimos evento de sesión expirada
        window.dispatchEvent(new CustomEvent('tokenExpired'));
      } else {
        // Aquí la reconexión automática de Socket.IO (reconnection: true) hará su trabajo
      }
    });

    this.setupEventListeners();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentToken = undefined;
  }

  // Método optimizado para suscribirse a eventos
  on(event: string, callback: (data: unknown) => void) {
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
  emit(event: string, data?: unknown) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
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

      this.triggerCallbacks('lote-estado-actualizado', data);
    });

    this.socket.on('lote-liberado', (data) => {

      this.triggerCallbacks('lote-liberado', data);
    });

    // Eventos de cultivos
    this.socket.on('cultivo-estado-actualizado', (data) => {

      this.triggerCallbacks('cultivo-estado-actualizado', data);
    });

    // Eventos de sublotes
    this.socket.on('sublote-estado-actualizado', (data) => {

      this.triggerCallbacks('sublote-estado-actualizado', data);
    });

    this.socket.on('sublote-liberado', (data) => {

      this.triggerCallbacks('sublote-liberado', data);
    });

    // Ping/Pong para mantener conexión
    this.socket.on('pong', () => {

    });
  }

  private triggerCallbacks(eventName: string, data: unknown) {
    if (this.listeners.has(eventName)) {
      this.listeners.get(eventName)?.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
        }
      });
    }
  }
}

// Exportar instancia singleton
const websocketService = new WebSocketService();
export default websocketService;
