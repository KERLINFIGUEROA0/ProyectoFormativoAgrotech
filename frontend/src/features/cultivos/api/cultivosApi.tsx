// src/features/cultivos/api/cultivosApi.ts
import { api } from "../../../lib/axios";
// --- API para Cultivos ---
export const listarCultivos = async () => {
  const response = await api.get("/cultivos/listar");
  return response.data;
};

export const crearCultivo = async (cultivoData: any) => {
  const response = await api.post("/cultivos/crear", cultivoData);
  return response.data;
};

export const actualizarCultivo = async (id: number, cultivoData: any) => {
  const response = await api.put(`/cultivos/actualizar/${id}`, cultivoData);
  return response.data;
};

export const eliminarCultivo = async (id: number) => {
  const response = await api.delete(`/cultivos/eliminar/${id}`);
  return response.data;
};

// --- API para Tipos de Cultivo (necesario para el formulario) ---
export const listarTiposCultivo = async () => {
    const response = await api.get('/tipo-cultivo/listar');
    return response.data;
}

export const crearTipoCultivo = async (data: { nombre: string }) => {
    const response = await api.post('/tipo-cultivo/crear', data);
    return response.data;
}

export const subirImagenCultivo = async (id: number, file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post(`/cultivos/${id}/imagen`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};