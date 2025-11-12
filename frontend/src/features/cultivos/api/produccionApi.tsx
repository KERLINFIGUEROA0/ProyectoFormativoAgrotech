// src/features/cultivos/api/produccionApi.ts
import { api } from "../../../lib/axios";

export const getProduccionesPorCultivo = async (cultivoId: number) => {
  const response = await api.get(`/producciones/cultivo/${cultivoId}`);
  return response.data;
};

export const getStatsPorCultivo = async (cultivoId: number) => {
  const response = await api.get(`/producciones/cultivo/${cultivoId}/stats`);
  return response.data;
};

export const getAvailableForSale = async () => {
  const response = await api.get('/producciones/available-for-sale');
  return response.data;
};

export const createProduccion = async (data: any) => {
  const response = await api.post('/producciones', data);
  return response.data;
};

export const updateProduccion = async (id: number, data: any) => {
  const response = await api.put(`/producciones/${id}`, data);
  return response.data;
};

export const deleteProduccion = async (id: number) => {
  const response = await api.delete(`/producciones/${id}`);
  return response.data;
};