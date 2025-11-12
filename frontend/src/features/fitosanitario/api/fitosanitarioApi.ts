import { api } from "../../../lib/axios";
// --- MODIFICACIÓN: Añadir 'EpaData' (la crearemos en el siguiente paso) ---
import type { Tratamiento, Epa, EpaData } from "../interfaces/fitosanitario";

// --- API para EPA (Amenazas) ---

export const listarEpas = async (): Promise<Epa[]> => {
  const response = await api.get('/epa');
  // --- MODIFICACIÓN: Asegurar que devuelva el array de datos ---
  return response.data.data || response.data;
};

// --- NUEVA FUNCIÓN ---
export const crearEpa = async (data: EpaData): Promise<Epa> => {
  const response = await api.post('/epa', data);
  return response.data;
};

// --- NUEVA FUNCIÓN ---
export const actualizarEpa = async (
  id: number,
  data: EpaData,
): Promise<Epa> => {
  const response = await api.patch(`/epa/${id}`, data);
  return response.data;
};

// --- NUEVA FUNCIÓN ---
export const eliminarEpa = async (id: number): Promise<void> => {
  await api.delete(`/epa/${id}`);
};

// --- NUEVA FUNCIÓN ---
export const subirImagenEpa = async (id: number, file: File) => {
  const formData = new FormData();
  formData.append('file', file); // 'file' debe coincidir con el FileInterceptor del backend
  const response = await api.post(`/epa/${id}/imagen`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// --- API para Tratamientos (Sin cambios) ---

export const listarTratamientos = async (): Promise<Tratamiento[]> => {
  const response = await api.get('/tratamientos');
  return response.data;
};

export const crearTratamiento = async (
  data: Partial<Tratamiento>,
): Promise<Tratamiento> => {
  const response = await api.post('/tratamientos', data);
  return response.data;
};

export const actualizarTratamiento = async (
  id: number,
  data: Partial<Tratamiento>,
): Promise<Tratamiento> => {
  const response = await api.patch(`/tratamientos/${id}`, data);
  return response.data;
};

export const eliminarTratamiento = async (id: number): Promise<void> => {
  await api.delete(`/tratamientos/${id}`);
};

export const listarTratamientosPorEpa = async (
  epaId: number,
): Promise<Tratamiento[]> => {
  const response = await api.get(`/epa/${epaId}/tratamientos`);
  return response.data;
};

// --- FUNCIÓN ELIMINADA ---
// Ya no necesitamos la API externa
/*
export const buscarEpasExternas = async (query: string): Promise<Epa[]> => {
  if (!query || query.trim().length < 3) {
    return []; 
  }
  const response = await api.get(`/epa/buscar-externo?q=${query}`);
  return response.data;
};
*/