import { api } from "../../../lib/axios";
import type { Rol } from "../interfaces/usuarios";

export const getRoles = async (): Promise<Rol[]> => {
  const response = await api.get("/roles");
  // El backend ya devuelve los datos directamente en la respuesta.
  return response.data;
};

export const createRole = async (data: Partial<Rol>): Promise<Rol> => {
  const response = await api.post("/roles", data);
  return response.data;
};

export const updateRole = async (
  id: number,
  data: Partial<Rol>
): Promise<Rol> => {
  const response = await api.put(`/roles/${id}`, data);
  return response.data;
};

export const deleteRole = async (id: number): Promise<void> => {
  await api.delete(`/roles/${id}`);
};
