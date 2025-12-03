import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { LatestSensorData } from '../interfaces/iot';

interface SensorStatus {
  [sensorId: string]: 'CONNECTED' | 'DISCONNECTED';
}

interface ConnectionStatus {
  loteId: number;
  connected: boolean;
  message: string;
  timestamp: string;
}

interface SensorData {
  id: string;
  data: any;
}

interface LecturaNueva {
  topic: string;
  data: any;
  loteId: number;
  timestamp: string;
}

export const useMqttSocket = (apiUrl: string = 'http://localhost:3000/mqtt') => {
  const [isConnected, setIsConnected] = useState(false);
  const [sensorStatuses, setSensorStatuses] = useState<SensorStatus>({});
  const [connectionStatuses, setConnectionStatuses] = useState<ConnectionStatus[]>([]);
  const [latestReadings, setLatestReadings] = useState<LatestSensorData[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Crear conexión socket
    const socket = io(apiUrl, {
      transports: ['websocket', 'polling'],
      auth: {
        token: localStorage.getItem('token') || '', // Asumiendo que guardas el token aquí
      },
    });

    socketRef.current = socket;

    // Eventos de conexión
    socket.on('connect', () => {
      console.log('Conectado al servidor MQTT');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Desconectado del servidor MQTT');
      setIsConnected(false);
    });

    // Evento de estado de sensor
    socket.on('sensorStatus', ({ id, status }: { id: string; status: 'CONNECTED' | 'DISCONNECTED' }) => {
      console.log(`Sensor ${id} cambió a ${status}`);
      setSensorStatuses(prev => ({
        ...prev,
        [id]: status
      }));
    });

    // Evento de estado de conexión de lote
    socket.on('estadoConexion', (data: ConnectionStatus) => {
      console.log(`Lote ${data.loteId} cambió estado: ${data.connected ? 'Conectado' : 'Desconectado'}`);
      setConnectionStatuses(prev => {
        const existing = prev.find(c => c.loteId === data.loteId);
        if (existing) {
          return prev.map(c => c.loteId === data.loteId ? data : c);
        } else {
          return [...prev, data];
        }
      });
    });

    // Evento de nueva lectura
    socket.on('lecturaNueva', (data: LecturaNueva) => {
      console.log(`Nueva lectura en ${data.topic}:`, data.data);
      // Aquí podrías actualizar el estado de lecturas más recientes
      // Por ahora solo logueamos
    });

    // Evento de datos del sensor
    socket.on('sensorData', (data: SensorData) => {
      console.log(`Datos del sensor ${data.id}:`, data.data);
      // Actualizar lecturas más recientes
      setLatestReadings(prev => {
        const sensorId = parseInt(data.id);
        if (isNaN(sensorId)) return prev;

        const existing = prev.find(r => r.id === sensorId);
        if (existing) {
          return prev.map(r =>
            r.id === sensorId
              ? { ...r, valor: data.data.value || data.data, fechaRegistro: new Date().toISOString() }
              : r
          );
        } else {
          return [...prev, {
            id: sensorId,
            nombre: `Sensor ${data.id}`,
            topic: '',
            valorMinimo: 0,
            valorMaximo: 100,
            valor: data.data.value || data.data,
            fechaRegistro: new Date().toISOString(),
            estado: 'Activo' as const
          }];
        }
      });
    });

    // Ping/Pong para mantener conexión
    socket.on('pong', () => {
      console.log('Pong recibido');
    });

    // Cleanup
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [apiUrl]);

  // Función para enviar ping
  const sendPing = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('ping');
    }
  };

  // Función para solicitar estado actual
  const requestCurrentStatus = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('solicitar-estado-sensores');
    }
  };

  return {
    isConnected,
    sensorStatuses,
    connectionStatuses,
    latestReadings,
    sendPing,
    requestCurrentStatus,
  };
};