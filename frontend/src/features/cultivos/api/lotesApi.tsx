import axios from "axios";
import type { LoteData } from "../interfaces/cultivos";

const API_URL = import.meta.env.VITE_BACKEND_URL;

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

// --- Funciones de la API para Lotes ---

export const obtenerLotes = async () => {
  const response = await api.get("/lotes/listar");
  return response.data;
};

export const crearLote = async (loteData: LoteData) => {
  const response = await api.post("/lotes/crear", loteData);
  return response.data;
};

export const actualizarLote = async (id: number, loteData: Partial<LoteData>) => {
  const response = await api.put(`/lotes/actualizar/${id}`, loteData);
  return response.data;
};

export const eliminarLote = async (id: number) => {
  const response = await api.delete(`/lotes/eliminar/${id}`);
  return response.data;
};

export const actualizarEstadoLote = async (id: number, estado: string) => {
  const response = await api.patch(`/lotes/${id}/estado`, { estado });
  return response.data;
};

export const obtenerEstadisticasLotes = async () => {
  const response = await api.get("/lotes/estadisticas");
  return response.data;
};