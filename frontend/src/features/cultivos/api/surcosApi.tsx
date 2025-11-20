// src/features/cultivos/api/surcosApi.tsx
import { api } from "../../../lib/axios";
import type { SurcoData } from "../interfaces/cultivos";

// --- Funciones de la API para Surcos ---

/**
 * ✅ NUEVA: Obtiene TODOS los surcos (para el filtro del monitor IoT)
 */
export const listarSurcos = async () => {
  const response = await api.get("/surcos/listar");
  return response.data;
};

export const obtenerSurcosPorLote = async (loteId: number) => {
  const response = await api.get(`/surcos/lotes/${loteId}/surcos`);
  return response.data;
};

export const crearSurco = async (surcoData: SurcoData) => {
  const response = await api.post("/surcos/crear", surcoData);
  return response.data;
};

export const actualizarSurco = async (id: number, surcoData: Partial<SurcoData>) => {
  const response = await api.put(`/surcos/actualizar/${id}`, surcoData);
  return response.data;
};

export const eliminarSurco = async (id: number) => {
  const response = await api.delete(`/surcos/eliminar/${id}`);
  return response.data;
};

export const actualizarEstadoSurco = async (id: number, estado: string) => {
  const response = await api.patch(`/surcos/actualizar/${id}/estado`, { estado });
  return response.data;
};

export const obtenerCultivos = async () => {
    const response = await api.get('/cultivos/listar');
    return response.data;
};
export const sincronizarSensoresSurco = async (id: number) => {
  const response = await api.post(`/surcos/${id}/sincronizar`);
  return response.data;
};