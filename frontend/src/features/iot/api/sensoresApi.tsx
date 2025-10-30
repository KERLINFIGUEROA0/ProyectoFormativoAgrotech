// src/features/cultivos/api/sensoresApi.ts
import axios from "axios";

const API_URL = import.meta.env.VITE_BACKEND_URL;

const api = axios.create({
  baseURL: API_URL,
});

// Interceptor para añadir el token a cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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

// --- API para Tipos de Sensor (necesario para el formulario) ---
export const listarTiposSensor = async () => {
    const response = await api.get('/tipo-sensor/listar');
    return response.data;
}

// --- API para Información de Sensores ---
export const obtenerInformacionSensor = async (sensorId: number) => {
    const response = await api.get(`/informacion-sensor/sensor/${sensorId}`);
    return response.data;
}