// Configuración de la API
// Para emulador/dispositivo real, cambiar localhost por la IP del computador
// Ejemplo: http://192.168.1.100:3000
// Usando ngrok para desarrollo móvil
export const API_BASE_URL = 'https://pretelegraphic-cheree-lacunal.ngrok-free.dev';

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configurar axios con token
const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem('access_token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

// Funciones de Usuarios
export const getUsuarios = async () => {
  const config = await getAuthHeaders();
  const response = await axios.get(`${API_BASE_URL}/usuarios`, config);
  return response.data;
};

export const createUsuario = async (usuarioData) => {
  const config = await getAuthHeaders();
  const response = await axios.post(`${API_BASE_URL}/usuarios/crear`, usuarioData, config);
  return response.data;
};

export const updateUsuario = async (id, usuarioData) => {
  const config = await getAuthHeaders();
  const response = await axios.put(`${API_BASE_URL}/usuarios/actualizar/${id}`, usuarioData, config);
  return response.data;
};

export const deleteUsuario = async (id) => {
  const config = await getAuthHeaders();
  const response = await axios.delete(`${API_BASE_URL}/usuarios/eliminar/${id}`, config);
  return response.data;
};

// Funciones de Roles
export const getRoles = async () => {
  const config = await getAuthHeaders();
  const response = await axios.get(`${API_BASE_URL}/roles`, config);
  return response.data;
};

export const createRole = async (roleData) => {
  const config = await getAuthHeaders();
  const response = await axios.post(`${API_BASE_URL}/roles`, roleData, config);
  return response.data;
};

export const updateRole = async (id, roleData) => {
  const config = await getAuthHeaders();
  const response = await axios.put(`${API_BASE_URL}/roles/${id}`, roleData, config);
  return response.data;
};

export const deleteRole = async (id) => {
  const config = await getAuthHeaders();
  const response = await axios.delete(`${API_BASE_URL}/roles/${id}`, config);
  return response.data;
};

// Funciones de Fichas
export const getFichas = async () => {
  const config = await getAuthHeaders();
  const response = await axios.get(`${API_BASE_URL}/fichas`, config);
  return response.data;
};

export const createFicha = async (fichaData) => {
  const config = await getAuthHeaders();
  const response = await axios.post(`${API_BASE_URL}/fichas`, fichaData, config);
  return response.data;
};

export const updateFicha = async (id, fichaData) => {
  const config = await getAuthHeaders();
  const response = await axios.put(`${API_BASE_URL}/fichas/${id}`, fichaData, config);
  return response.data;
};

export const deleteFicha = async (id) => {
  const config = await getAuthHeaders();
  const response = await axios.delete(`${API_BASE_URL}/fichas/${id}`, config);
  return response.data;
};

// Funciones de Lotes
export const getLotes = async () => {
  const config = await getAuthHeaders();
  const response = await axios.get(`${API_BASE_URL}/lotes`, config);
  return response.data;
};

export const createLote = async (loteData) => {
  const config = await getAuthHeaders();
  const response = await axios.post(`${API_BASE_URL}/lotes/crear`, loteData, config);
  return response.data;
};

export const updateLote = async (id, loteData) => {
  const config = await getAuthHeaders();
  const response = await axios.put(`${API_BASE_URL}/lotes/actualizar/${id}`, loteData, config);
  return response.data;
};

export const updateLoteEstado = async (id, estadoData) => {
  const config = await getAuthHeaders();
  const response = await axios.patch(`${API_BASE_URL}/lotes/${id}/estado`, estadoData, config);
  return response.data;
};

// Funciones de Cultivos
export const getCultivos = async () => {
  const config = await getAuthHeaders();
  const response = await axios.get(`${API_BASE_URL}/cultivos/listar`, config);
  return response.data;
};

export const createCultivo = async (cultivoData) => {
  const config = await getAuthHeaders();
  const response = await axios.post(`${API_BASE_URL}/cultivos/crear`, cultivoData, config);
  return response.data;
};

export const updateCultivo = async (id, cultivoData) => {
  const config = await getAuthHeaders();
  const response = await axios.put(`${API_BASE_URL}/cultivos/actualizar/${id}`, cultivoData, config);
  return response.data;
};

export const deleteCultivo = async (id) => {
  const config = await getAuthHeaders();
  const response = await axios.delete(`${API_BASE_URL}/cultivos/eliminar/${id}`, config);
  return response.data;
};

// Funciones de Tipos de Cultivo
export const getTiposCultivo = async () => {
  const config = await getAuthHeaders();
  const response = await axios.get(`${API_BASE_URL}/tipo-cultivo/listar`, config);
  return response.data;
};

// Funciones de Reportes de Cultivos
export const exportarExcelCultivo = async (cultivoId) => {
  const config = await getAuthHeaders();
  config.responseType = 'blob';
  const response = await axios.get(`${API_BASE_URL}/cultivos/${cultivoId}/exportar-excel`, config);
  return response.data;
};

export const exportarExcelGeneral = async () => {
  const config = await getAuthHeaders();
  config.responseType = 'blob';
  const response = await axios.get(`${API_BASE_URL}/cultivos/exportar-excel/general`, config);
  return response.data;
};

export const generarPdfTrazabilidad = async (cultivoId, fechaInicio, fechaFin) => {
  const config = await getAuthHeaders();
  config.responseType = 'blob';

  let url = `${API_BASE_URL}/cultivos/${cultivoId}/pdf-trazabilidad`;
  const params = [];
  if (fechaInicio) params.push(`fechaInicio=${fechaInicio}`);
  if (fechaFin) params.push(`fechaFin=${fechaFin}`);
  if (params.length > 0) url += `?${params.join('&')}`;

  const response = await axios.get(url, config);
  return response.data;
};

// Funciones adicionales de Cultivos
export const finalizarCultivo = async (cultivoId, fechaFin) => {
  const config = await getAuthHeaders();
  const response = await axios.post(`${API_BASE_URL}/cultivos/${cultivoId}/finalizar`, { fechaFin }, config);
  return response.data;
};

export const registrarCosecha = async (cultivoId, fechaCosecha, cantidad, esFinal) => {
  const config = await getAuthHeaders();
  const response = await axios.post(`${API_BASE_URL}/cultivos/${cultivoId}/cosecha`, {
    fechaCosecha,
    cantidad,
    esFinal
  }, config);
  return response.data;
};

// Funciones de Sublotes
export const getSublotesPorLote = async (loteId) => {
  const config = await getAuthHeaders();
  const response = await axios.get(`${API_BASE_URL}/sublotes/lote/${loteId}`, config);
  return response.data;
};

// Estadísticas de Lotes
export const getEstadisticasLotes = async () => {
  const config = await getAuthHeaders();
  const response = await axios.get(`${API_BASE_URL}/lotes/estadisticas`, config);
  return response.data;
};

// Funciones de Materiales
export const getMateriales = async () => {
  const config = await getAuthHeaders();
  const response = await axios.get(`${API_BASE_URL}/materiales`, config);
  return response.data;
};

export const createMaterial = async (materialData) => {
  const config = await getAuthHeaders();
  const response = await axios.post(`${API_BASE_URL}/materiales`, materialData, config);
  return response.data;
};

export const updateMaterial = async (id, materialData) => {
  const config = await getAuthHeaders();
  const response = await axios.patch(`${API_BASE_URL}/materiales/${id}`, materialData, config);
  return response.data;
};

export const deleteMaterial = async (id) => {
  const config = await getAuthHeaders();
  const response = await axios.delete(`${API_BASE_URL}/materiales/${id}`, config);
  return response.data;
};

export const desactivarMaterial = async (id) => {
  const config = await getAuthHeaders();
  const response = await axios.patch(`${API_BASE_URL}/materiales/${id}/desactivar`, {}, config);
  return response.data;
};

export const reactivarMaterial = async (id) => {
  const config = await getAuthHeaders();
  const response = await axios.patch(`${API_BASE_URL}/materiales/${id}/reactivar`, {}, config);
  return response.data;
};

// Funciones de Sensores
export const getSensores = async () => {
  const config = await getAuthHeaders();
  const response = await axios.get(`${API_BASE_URL}/sensores`, config);
  return response.data;
};

export const createSensor = async (sensorData) => {
  const config = await getAuthHeaders();
  const response = await axios.post(`${API_BASE_URL}/sensores`, sensorData, config);
  return response.data;
};

export const updateSensor = async (id, sensorData) => {
  const config = await getAuthHeaders();
  const response = await axios.put(`${API_BASE_URL}/sensores/${id}`, sensorData, config);
  return response.data;
};

export const deleteSensor = async (id) => {
  const config = await getAuthHeaders();
  const response = await axios.delete(`${API_BASE_URL}/sensores/${id}`, config);
  return response.data;
};

// Funciones de Información de Sensores
export const getInformacionSensores = async () => {
  const config = await getAuthHeaders();
  const response = await axios.get(`${API_BASE_URL}/informacion-sensor`, config);
  return response.data;
};

export const getInformacionSensoresLatest = async () => {
  const config = await getAuthHeaders();
  const response = await axios.get(`${API_BASE_URL}/informacion-sensor/latest`, config);
  return response.data.data || [];
};

export const createInformacionSensor = async (infoData) => {
  const config = await getAuthHeaders();
  const response = await axios.post(`${API_BASE_URL}/informacion-sensor`, infoData, config);
  return response.data;
};

export const updateInformacionSensor = async (id, infoData) => {
  const config = await getAuthHeaders();
  const response = await axios.put(`${API_BASE_URL}/informacion-sensor/${id}`, infoData, config);
  return response.data;
};

export const deleteInformacionSensor = async (id) => {
  const config = await getAuthHeaders();
  const response = await axios.delete(`${API_BASE_URL}/informacion-sensor/${id}`, config);
  return response.data;
};

// Función para insertar datos de prueba para un sensor
export const insertTestDataForSensor = async (sensorId) => {
  const config = await getAuthHeaders();
  const response = await axios.post(`${API_BASE_URL}/informacion-sensor/test/${sensorId}`, {}, config);
  return response.data;
};