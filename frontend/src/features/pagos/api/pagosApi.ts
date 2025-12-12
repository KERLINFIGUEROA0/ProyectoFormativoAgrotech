import { api } from '../../../lib/axios';

export const getPagosByCultivo = async (cultivoId: number) => {
  const response = await api.get(`/pagos/cultivo/${cultivoId}`);
  return response;
};

export const getAllPagos = async () => {
  const response = await api.get('/pagos');
  return response;
};
