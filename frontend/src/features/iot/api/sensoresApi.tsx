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