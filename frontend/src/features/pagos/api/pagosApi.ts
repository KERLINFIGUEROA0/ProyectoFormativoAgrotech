import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/pagos`;

export const getPagosByCultivo = async (cultivoId: number) => {
  const response = await axios.get(`${API_BASE_URL}/cultivo/${cultivoId}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  return response;
};

export const getAllPagos = async () => {
  const response = await axios.get(API_BASE_URL, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  return response;
};