import { api } from "../../../lib/axios";
import type { LoteData } from "../interfaces/cultivos";
// --- Funciones de la API para Lotes ---

export const obtenerLotes = async () => {
  const response = await api.get("/lotes/listar");
  return response.data;
};

export const obtenerLotesDisponibles = async () => {
  const response = await api.get("/lotes/disponibles");
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

// ✅ ELIMINADAS: Funciones de eliminación y archivado
// Los lotes se reutilizan cambiando coordenadas, nunca se eliminan

export const actualizarEstadoLote = async (id: number, estado: string) => {
  const response = await api.patch(`/lotes/${id}/estado`, { estado });
  return response.data;
};

export const obtenerEstadisticasLotes = async () => {
  const response = await api.get("/lotes/estadisticas");
  return response.data;
};