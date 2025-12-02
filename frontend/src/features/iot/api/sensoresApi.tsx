// src/features/iot/api/sensoresApi.tsx
import { api } from "../../../lib/axios"; 
import type { LatestSensorData, SensorDataLog } from "../interfaces/iot";

// --- API para Sensores ---
export const listarSensores = async () => {
  const response = await api.get("/sensores/listar");
  return response.data;
};

export const crearSensor = async (sensorData: any) => {
  const response = await api.post("/sensores/crear", sensorData);
  return response.data;
};

export const actualizarSensor = async (id: number, sensorData: any) => {
  const response = await api.put(`/sensores/actualizar/${id}`, sensorData);
  return response.data;
};

export const eliminarSensor = async (id: number) => {
  const response = await api.delete(`/sensores/eliminar/${id}`);
  return response.data;
};

export const actualizarEstadoSensor = async (id: number, estado: 'Activo' | 'Inactivo' | 'Mantenimiento') => {
  const response = await api.patch(`/sensores/actualizar/${id}/estado`, { estado });
  return response.data;
};

/**
 * ✅ NUEVA: Actualiza la frecuencia de escaneo del sensor
 */
export const actualizarFrecuenciaEscaneo = async (id: number, frecuencia: number) => {
  // Asegúrate de que tu backend tenga este endpoint, o usa actualizarSensor si prefieres
  const response = await api.patch(`/sensores/actualizar/${id}/frecuencia`, { frecuencia });
  return response.data;
};

// --- API para Tipos de Sensor ---
export const listarTiposSensor = async () => {
  const response = await api.get('/tipo-sensor/listar');
  return response.data;
};

// --- API para Información de Sensores ---

export const getLatestSensorData = async (): Promise<LatestSensorData[]> => {
  const response = await api.get("/informacion-sensor/latest");
  return response.data.data; 
};

export const getSensorHistory = async (sensorId: number): Promise<SensorDataLog[]> => {
  const response = await api.get(`/informacion-sensor/sensor/${sensorId}`);
  return response.data.data;
};

export const getSensorDataLog = async (): Promise<SensorDataLog[]> => {
  const response = await api.get("/informacion-sensor");
  return response.data.data;
};

export const sincronizarSensoresLote = async (loteId: number) => {
  const response = await api.post(`/sensores/sincronizar-lote/${loteId}`);
  return response.data;
};


export const eliminarSensorDeLote = async (sensorId: number) => {
  const response = await api.delete(`/sensores/eliminar-de-lote/${sensorId}`);
  return response.data;
};

export const generateSensorReport = async (params: {
  scope: 'surco' | 'cultivo';
  scopeId: number;
  timeFilter: 'day' | 'date' | 'month';
  date?: string;
}) => {
  try {
    console.log('API call params:', params);
    const response = await api.get("/informacion-sensor/report", { params });
    console.log('API response status:', response.status);
    console.log('API response headers:', response.headers);
    console.log('API response.data (full):', JSON.stringify(response.data, null, 2));

    // More flexible validation - check what we actually received
    if (!response.data) {
      console.error('No response.data received');
      throw new Error('No data received from server');
    }

    console.log('response.data.success:', response.data.success);
    console.log('response.data.data exists:', !!response.data.data);
    console.log('response.data.data type:', typeof response.data.data);

    // Try different possible structures
    if (response.data.data !== undefined) {
      console.log('Returning response.data.data');
      return response.data.data;
    } else if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
      console.log('Returning response.data directly (no wrapper)');
      return response.data;
    } else {
      console.error('Unexpected response structure. Full response:', response.data);
      throw new Error(`Invalid response structure from server. Expected data property, got: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    console.error('API call failed:', error);
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as any;
      console.error('Error details:', axiosError.response?.data || axiosError.message);
    }
    throw error;
  }
};

export const getCultivosActivosLote = async (loteId: number) => {
  const response = await api.get(`/sensores/cultivos-activos-lote/${loteId}`);
  return response.data;
};

export const descargarReporteApi = async (data: {
  formato: 'pdf' | 'excel' | 'json';
  loteId: number;
  subloteId?: number;
  fechaInicio: string;
  fechaFin: string;
}) => {
  if (data.formato === 'json') {
    // Para testing, devolver JSON directamente
    const response = await api.post('/sensores/reporte-trazabilidad', data);
    return response.data;
  } else {
    // Para PDF/Excel, descargar como blob
    const response = await api.post('/sensores/reporte-trazabilidad', data, {
      responseType: 'blob',
    });
    return response.data; // Retorna el blob
  }
};