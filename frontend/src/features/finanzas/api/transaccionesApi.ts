import axios from "axios";
import type { TransaccionData } from "../interfaces/finanzas";

const API_URL = import.meta.env.VITE_BACKEND_URL;

// Creamos una instancia de axios configurada para autenticación
const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Funciones de la API para Transacciones ---

export const obtenerTransacciones = async () => {
  const response = await api.get("/finanzas/transacciones");
  return response.data; // Asumimos que la API devuelve { data: [...] }
};

export const crearTransaccion = async (data: TransaccionData) => {
  const response = await api.post("/finanzas/transacciones", data);
  return response.data;
};

export const actualizarTransaccion = async (id: number, data: Partial<TransaccionData>) => {
  const response = await api.put(`/finanzas/transacciones/${id}`, data);
  return response.data;
};

export const eliminarTransaccion = async (id: number) => {
  const response = await api.delete(`/finanzas/transacciones/${id}`);
  return response.data;
};

export const obtenerEstadisticasFinancieras = async () => {
  const response = await api.get("/finanzas/estadisticas");
  return response.data; // Asumimos que la API devuelve { data: { ingresos, egresos, balance } }
};

// NUEVA FUNCIÓN para el gráfico de barras
export const obtenerFlujoMensual = async () => {
  // Este endpoint debería devolver datos como: { data: [{ mes: 'Ene', ingresos: 1000, egresos: 500 }, ...] }
  const response = await api.get("/finanzas/flujo-mensual");
  return response.data;
};

// NUEVA FUNCIÓN para el gráfico de pie
export const obtenerDistribucionEgresos = async () => {
  // Este endpoint debería devolver: { data: [{ nombre: 'Semillas', monto: 3500 }, ...] }
  const response = await api.get("/finanzas/distribucion-egresos");
  return response.data;
};