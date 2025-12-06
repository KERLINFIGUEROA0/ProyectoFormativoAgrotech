import api from './api';

// Funciones para exportar reportes de cultivos
export const exportarExcelCultivo = async (cultivoId) => {
  const response = await api.get(`/cultivos/${cultivoId}/exportar-excel`, {
    responseType: 'blob',
  });
  return response.data;
};

export const exportarExcelGeneral = async () => {
  const response = await api.get('/cultivos/exportar-excel/general', {
    responseType: 'blob',
  });
  return response.data;
};

export const generarPdfTrazabilidad = async (cultivoId, fechaInicio, fechaFin) => {
  const params = new URLSearchParams();
  if (fechaInicio) params.append('fechaInicio', fechaInicio);
  if (fechaFin) params.append('fechaFin', fechaFin);

  const response = await api.get(`/cultivos/${cultivoId}/pdf-trazabilidad?${params.toString()}`, {
    responseType: 'blob',
  });
  return response.data;
};

// Funciones para producciones
export const listarProducciones = async () => {
  const response = await api.get('/producciones');
  return response.data;
};

export const crearProduccion = async (produccionData) => {
  const response = await api.post('/producciones', produccionData);
  return response.data;
};

export const actualizarProduccion = async (id, produccionData) => {
  const response = await api.put(`/producciones/${id}`, produccionData);
  return response.data;
};

export const eliminarProduccion = async (id) => {
  const response = await api.delete(`/producciones/${id}`);
  return response.data;
};

// Funciones para exportar reportes de producciones (usando endpoints de cultivos como base)
export const exportarExcelProducciones = async () => {
  // Por ahora usamos el reporte general de cultivos como placeholder
  const response = await api.get('/cultivos/exportar-excel/general', {
    responseType: 'blob',
  });
  return response.data;
};

export const exportarPdfProducciones = async () => {
  // Por ahora usamos el PDF de trazabilidad del primer cultivo como placeholder
  // En el futuro se debería crear un endpoint específico para producciones
  const response = await api.get('/cultivos/1/pdf-trazabilidad', {
    responseType: 'blob',
  });
  return response.data;
};