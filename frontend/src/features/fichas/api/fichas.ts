import { api } from "../../../lib/axios";
import type { Ficha, CreateFichaDto, UpdateFichaDto, FichaOption } from "../interfaces/fichas";

export const getFichas = async (): Promise<Ficha[]> => {
  const response = await api.get("/fichas");
  return response.data.data || response.data;
};

export const getFichaById = async (id: number): Promise<Ficha> => {
  const response = await api.get(`/fichas/${id}`);
  return response.data.data || response.data;
};

export const createFicha = async (data: CreateFichaDto): Promise<Ficha> => {
  const response = await api.post("/fichas", data);
  return response.data.data || response.data;
};

export const updateFicha = async (id: number, data: UpdateFichaDto): Promise<Ficha> => {
  const response = await api.patch(`/fichas/${id}`, data);
  return response.data.data || response.data;
};

export const deleteFicha = async (id: number): Promise<void> => {
  await api.delete(`/fichas/${id}`);
};

export const getFichasOpciones = async (): Promise<FichaOption[]> => {
  const response = await api.get("/fichas/opciones");
  return response.data.data || response.data;
};

export const getFichasOpcionesFromUsuarios = async (): Promise<FichaOption[]> => {
  const response = await api.get("/usuarios/fichas/opciones");
  return response.data.data || response.data;
};