import { api } from "../../../lib/axios"; // Usamos tu instancia central de axios
import type { DraculaData } from '../interfaces/dracula';


export const listarDraculas = async () => {

  const response = await api.get("/dracula/listar");
  return response.data;
};


export const crearDracula = async (data: DraculaData) => {

  const response = await api.post("/dracula/crear", data);
  return response.data;
};


export const actualizarDracula = async (id: number, data: DraculaData) => {

  const response = await api.put(`/dracula/actualizar/${id}`, data);
  return response.data;
};


export const eliminarDracula = async (id: number) => {
 
  const response = await api.delete(`/dracula/eliminar/${id}`);
  return response.data;
};