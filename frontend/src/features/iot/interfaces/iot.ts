// src/features/iot/interfaces/iot.ts

export interface Lote {
  id: number;
  nombre: string;
  localizacion?: number;
  area?: string;
  estado: string;
  coordenadas?: any;
}

export interface Surco {
  id: number;
  nombre: string;
  lote: Lote;
  // Agregamos el cultivo opcional para el filtro
  cultivo?: {
    id: number;
    nombre: string;
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

  // ✅ NUEVO: Campo para mapear el JSON
  json_key?: string | null;

  // Nueva propiedad para mapear con sensorKey dinámico
  sensorKey?: string | null;

  // Último mensaje MQTT para determinar estado de conexión
  ultimo_mqtt_mensaje?: string | null;

  lote: Lote;
  surco?: Surco | null;
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
  estado?: 'Activo' | 'Desconectado'; // Nuevo campo para estado del sensor
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
  protocolo: 'mqtt' | 'mqtts' | 'http' | 'https' | 'ws' | 'wss';
  host: string;
  puerto: number;
  usuario?: string;
  password?: string;
  lotes: Lote[];
  prefijoTopicos?: string;
  topicosAdicionales?: string[];
  estado: 'Activo' | 'Inactivo';
  subscripciones: Subscripcion[];
  sslConfig?: {
    enabled: boolean;
    ca?: string;
    cert?: string;
    key?: string;
    rejectUnauthorized?: boolean;
  };
}

// Clase auxiliar para configuración personalizada de tópicos
export interface TopicoConfig {
  topic: string;
  min?: number;
  max?: number;
}

export interface CreateBrokerDto {
  nombre: string;
  protocolo: 'mqtt' | 'mqtts' | 'http' | 'https' | 'ws' | 'wss';
  host: string;
  puerto: number;
  usuario?: string;
  password?: string;
  loteId: number;
  prefijoTopicos?: string;
  topicosAdicionales?: (string | TopicoConfig)[];
  sslConfig?: {
    enabled: boolean;
    ca?: string;
    cert?: string;
    key?: string;
    rejectUnauthorized?: boolean;
  };
}

export interface CreateSubscripcionDto {
  brokerId: number;
  topic: string;
  qos: number;
}

// --- Interfaces for Reports ---

export interface SensorStatistics {
  min: number;
  max: number;
  average: number;
  standardDeviation: number;
}

export interface ChartDataPoint {
  timestamp: string;
  value: number;
}

export interface SensorReport {
  sensorId: number;
  sensorName: string;
  statistics: SensorStatistics;
  chartData: ChartDataPoint[];
  alertas: string[];
  fechasCriticas: string[];
}

export interface ReportData {
  scope: 'surco' | 'cultivo';
  scopeId: number;
  timeFilter: 'day' | 'date' | 'month';
  dateRange: {
    start: string;
    end: string;
  };
  sensors: SensorReport[];
}

// --- Interfaces para BrokerLote (Configuraciones por Lote) ---

export interface BrokerLote {
  id: number;
  broker: Broker;
  lote: Lote;
  topicos: string[];
  puerto?: number;
  topicPrueba?: string;
}

export interface CreateBrokerLoteDto {
  brokerId: number;
  loteId: number;
  topicos: (string | TopicoConfig)[];
  puerto?: number;
  topicPrueba?: string;
}