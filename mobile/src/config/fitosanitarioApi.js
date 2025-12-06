import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './api';

// Configurar axios con token
const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem('access_token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const fitosanitarioApi = {
  // Tratamientos
  listarTratamientos: async () => {
    const config = await getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/tratamientos`, config);
    return response.data;
  },

  crearTratamiento: async (data) => {
    const config = await getAuthHeaders();
    const response = await axios.post(`${API_BASE_URL}/tratamientos`, data, config);
    return response.data;
  },

  actualizarTratamiento: async (id, data) => {
    const config = await getAuthHeaders();
    const response = await axios.patch(`${API_BASE_URL}/tratamientos/${id}`, data, config);
    return response.data;
  },

  eliminarTratamiento: async (id) => {
    const config = await getAuthHeaders();
    await axios.delete(`${API_BASE_URL}/tratamientos/${id}`, config);
  },

  // EPA
  listarEpas: async () => {
    const config = await getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/epa`, config);
    return response.data.data || response.data;
  },

  crearEpa: async (data) => {
    const config = await getAuthHeaders();
    const response = await axios.post(`${API_BASE_URL}/epa`, data, config);
    return response.data;
  },

  actualizarEpa: async (id, data) => {
    const config = await getAuthHeaders();
    const response = await axios.patch(`${API_BASE_URL}/epa/${id}`, data, config);
    return response.data;
  },

  eliminarEpa: async (id) => {
    const config = await getAuthHeaders();
    await axios.delete(`${API_BASE_URL}/epa/${id}`, config);
  },

  subirImagenEpa: async (id, file) => {
    const config = await getAuthHeaders();
    const formData = new FormData();
    formData.append('file', file);
    config.headers['Content-Type'] = 'multipart/form-data';
    const response = await axios.post(`${API_BASE_URL}/epa/${id}/imagen`, formData, config);
    return response.data;
  },

  listarTratamientosPorEpa: async (epaId) => {
    const config = await getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/epa/${epaId}/tratamientos`, config);
    return response.data;
  },
};