import { api } from "../../../lib/axios";
import type { Tratamiento, Epa } from "../interfaces/fitosanitario";

// --- API para EPA (Amenazas) ---

export const listarEpas = async (): Promise<Epa[]> => {
  const response = await api.get('/epa');
  return response.data;
};

// --- API para Tratamientos ---

export const listarTratamientos = async (): Promise<Tratamiento[]> => {
  const response = await api.get('/tratamientos');
  return response.data;
};

export const crearTratamiento = async (data: Partial<Tratamiento>): Promise<Tratamiento> => {
  const response = await api.post('/tratamientos', data);
  return response.data;
};

export const actualizarTratamiento = async (id: number, data: Partial<Tratamiento>): Promise<Tratamiento> => {
  const response = await api.patch(`/tratamientos/${id}`, data);
  return response.data;
};

export const eliminarTratamiento = async (id: number): Promise<void> => {
  await api.delete(`/tratamientos/${id}`);
};

export const listarTratamientosPorEpa = async (epaId: number): Promise<Tratamiento[]> => {
  const response = await api.get(`/epa/${epaId}/tratamientos`);
  return response.data;
};

export const buscarEpasExternas = async (query: string): Promise<Epa[]> => {
  if (!query || query.trim().length < 3) {
    return []; // No buscar si el término es muy corto
  }
  const response = await api.get(`/epa/buscar-externo?q=${query}`);
  return response.data;
};