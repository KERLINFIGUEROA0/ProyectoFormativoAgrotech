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

export const finalizarCultivo = async (id: number, fechaFin: string) => {
  const response = await api.put(`/cultivos/finalizar/${id}`, { fechaFin });
  return response.data;
};

export const registrarCosecha = async (id: number, fecha: string, cantidad: number, esFinal: boolean) => {
  const response = await api.post(`/cultivos/registrar-cosecha/${id}`, { fecha, cantidad, esFinal });
  return response.data;
};

export const eliminarCultivo = async (id: number) => {
  const response = await api.delete(`/cultivos/eliminar/${id}`);
  return response.data;
};

export const subirImagenCultivo = async (id: number, file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post(`/cultivos/${id}/imagen`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}; // 


// --- API para Tipos de Cultivo ---
export const listarTiposCultivo = async () => {
    const response = await api.get('/tipo-cultivo/listar');
    return response.data;
};

export const crearTipoCultivo = async (data: { nombre: string }) => {
    const response = await api.post('/tipo-cultivo/crear', data);
    return response.data;
};

export const actualizarTipoCultivo = async (id: number, data: { nombre: string }) => {
    const response = await api.put(`/tipo-cultivo/actualizar/${id}`, data);
    return response.data;
};

export const eliminarTipoCultivo = async (id: number) => {
    const response = await api.delete(`/tipo-cultivo/eliminar/${id}`);
    return response.data;
};


// --- FUNCIÓN PARA TRAZABILIDAD ---
export const obtenerTrazabilidad = async (cultivoId: number) => {
  const response = await api.get(`/trazabilidad/cultivo/${cultivoId}`);
  return response.data;
};


export const actualizarEstadosLotes = async () => {
  const response = await api.post('/cultivos/actualizar-estados-lotes');
  return response.data;
};

// --- FUNCIÓN PARA GENERAR PDF DE TRAZABILIDAD ---
export const generarPdfTrazabilidad = async (cultivoId: number, fechaInicio?: string, fechaFin?: string) => {
  const params = new URLSearchParams();
  if (fechaInicio) params.append('fechaInicio', fechaInicio);
  if (fechaFin) params.append('fechaFin', fechaFin);

  const response = await api.get(`/cultivos/${cultivoId}/pdf-trazabilidad?${params.toString()}`, {
    responseType: 'blob',
  });
  return response.data;
};