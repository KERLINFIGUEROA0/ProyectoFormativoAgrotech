import { io, Socket } from 'socket.io-client';
import { jwtDecode } from 'jwt-decode';

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, any[]> = new Map();
  private currentToken: string | undefined;

  // Método para verificar si un token es válido (no expirado)
  private isTokenValid(token: string): boolean {
    try {
      const decoded: any = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      return decoded.exp > currentTime;
    } catch (error) {
      console.error('Error decodificando token:', error);
      return false;
    }
  }

  // Método para conectar explícitamente pasando el token (opcional)
  connect(token?: string) {
    // 1. Evitar reconexiones si ya estamos conectados con el mismo token
    if (this.socket?.connected && this.currentToken === token) {
      return;
    }

    // 2. Limpieza previa
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.currentToken = token;

    if (token && !this.isTokenValid(token)) {
      console.warn('⚠️ Token expirado al intentar conectar WS.');
      window.dispatchEvent(new CustomEvent('tokenExpired'));
      return;
    }

    const API_URL = import.meta.env.VITE_BACKEND_URL;

    // --- CONFIGURACIÓN BLINDADA ---
    const options: any = {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,   // Aumentamos a 3s para no saturar el navegador en el bucle

      // ❌ ELIMINAMOS extraHeaders (No funcionan bien en websockets puros de navegador)

      // ✅ USAMOS auth: La forma nativa de Socket.IO para enviar credenciales
      auth: {
        token: token
      }
    };

    this.socket = io(API_URL, options);

    // --- LISTENERS DE ESTADO ---

    this.socket.on('connect', () => {
      console.log('🟢 WebSocket conectado y estable:', this.socket?.id);
    });

    // Manejar errores de conexión (incluyendo rechazo de auth)
    this.socket.on('connect_error', (error) => {
      console.error('⚠️ Error de conexión WebSocket:', error.message);

      // Si el backend rechaza la conexión, paramos el bucle inmediatamente
      if (error.message.includes('Unauthorized') || error.message.includes('token') || error.message.includes('credenciales')) {
        console.warn('⛔ Credenciales inválidas. Deteniendo intentos de reconexión.');
        this.socket?.disconnect(); // Esto mata el bucle
        window.dispatchEvent(new CustomEvent('tokenExpired'));
      }
    });

    this.socket.on('disconnect', (reason) => {
      // Si el servidor nos desconecta, evaluamos por qué
      if (reason === 'io server disconnect') {
        console.warn('🔴 El servidor forzó la desconexión.');
        // Solo intentamos reconectar si estamos seguros de que el token es válido
        if (this.currentToken && this.isTokenValid(this.currentToken)) {
           // Pequeño delay antes de reintentar manual
           setTimeout(() => this.socket?.connect(), 1000);
        } else {
           window.dispatchEvent(new CustomEvent('tokenExpired'));
        }
      } else {
        console.warn(`🔴 Desconexión por red/transporte: ${reason}`);
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