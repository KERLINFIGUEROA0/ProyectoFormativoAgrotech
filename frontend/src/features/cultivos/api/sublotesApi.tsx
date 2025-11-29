import { api } from '../../../lib/axios';

export const obtenerSublotesPorLote = (loteId: number) =>
  api.get(`/sublotes/lotes/${loteId}/sublotes`);

export const obtenerSublotesDisponiblesPorLote = (loteId: number) =>
  api.get(`/sublotes/lotes/${loteId}/disponibles`);

export const obtenerCultivos = () =>
  api.get('/cultivos/listar');

export const crearSublote = (data: any) =>
  api.post('/sublotes/crear', data);

export const actualizarSublote = (id: number, data: any) =>
  api.put(`/sublotes/actualizar/${id}`, data);

export const actualizarEstadoSublote = (id: number, estado: string) =>
  api.patch(`/sublotes/actualizar/${id}/estado`, { estado });

export const eliminarSublote = (id: number) =>
  api.delete(`/sublotes/eliminar/${id}`);