// src/features/iot/interfaces/iot.ts

export interface Surco {
  id: number;
  nombre: string;
  lote: {
    id: number;
    nombre: string;
  };
  // Agregamos el cultivo opcional para el filtro
  cultivo?: {
    id: number;
    nombre: string;
  } | null;
  broker?: {
    id: number;
    nombre: string;
    host: string;
    puerto: number;
    protocolo: string;
  } | null;
}

export interface Sensor {
  id: number;
  nombre: string;
  estado: 'Activo' | 'Inactivo' | 'Mantenimiento';
  fecha_instalacion: string;
  valor_minimo_alerta: number;
  valor_maximo_alerta: number;
  topic: string | null;
  
  // ✅ NUEVA PROPIEDAD
  frecuencia_escaneo?: number; 
  latestData?: LatestSensorData;
  
  surco: Surco;
}

// Para los datos del dashboard
export interface SensorDataLog {
  id: number;
  fechaRegistro: string;
  valor: number;
  sensor: {
    id: number;
  };
}

// Para el endpoint /latest
export interface LatestSensorData {
  id: number;
  nombre: string;
  topic: string | null;
  valorMinimo: number;
  valorMaximo: number;
  valor: number | null;
  fechaRegistro: string | null;
}

// --- Interfaces para la Configuración del Broker ---

export interface Subscripcion {
  id: number;
  topic: string;
  qos: number;
}

export interface Broker {
  id: number;
  nombre: string;
  protocolo: string;
  host: string;
  puerto: number;
  usuario?: string;
  password?: string;
  // Ya no usamos surco único aquí si cambiamos a 1:N, pero lo dejamos por compatibilidad
  surco?: Surco | null; 
  prefijoTopicos?: string;
  topicosAdicionales?: string[];
  estado: 'Activo' | 'Inactivo';
  subscripciones: Subscripcion[];
}

export type CreateBrokerDto = Omit<Broker, 'id' | 'subscripciones' | 'estado'>;

export interface CreateSubscripcionDto {
  brokerId: number;
  topic: string;
  qos: number;
}