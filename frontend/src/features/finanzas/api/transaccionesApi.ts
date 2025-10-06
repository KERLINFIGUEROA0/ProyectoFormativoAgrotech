import axios from "axios";
import type { TransaccionData } from "../interfaces/finanzas";

const API_URL = import.meta.env.VITE_BACKEND_URL;

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Funciones de la API ---

export const obtenerTransacciones = async () => {
  const response = await api.get("/finanzas/transacciones");
  return response.data;
};

export const crearTransaccion = async (data: TransaccionData) => {
  if (data.tipo === 'ingreso') {
    const payload = {
      produccionId: data.produccionId,
      cantidad: data.cantidad,
      monto: data.monto,
      fecha: data.fecha,
      descripcion: data.descripcion,
    };
    return api.post("/finanzas/transacciones", payload);
  } else { // egreso
    const payload = {
      produccionId: data.produccionId, // <-- AÑADIDO
      monto: data.monto,
      fecha: data.fecha,
      descripcion: data.descripcion,
    };
    return api.post("/gastos", payload);
  }
};

export const obtenerEstadisticasFinancieras = async () => {
  const response = await api.get("/finanzas/estadisticas");
  return response.data;
};

export const obtenerFlujoMensual = async () => {
  const response = await api.get("/finanzas/flujo-mensual");
  return response.data;
};

export const obtenerDistribucionEgresos = async () => {
  const response = await api.get("/finanzas/distribucion-egresos");
  return response.data;
};