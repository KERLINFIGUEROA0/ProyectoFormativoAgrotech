// src/features/actividades/api/actividadesapi.ts
import { api } from "../../../lib/axios";
import type { CreateActividadPayload, UpdateActividadPayload } from '../interfaces/actividades';

// --- FUNCIONES EXISTENTES (sin cambios en la lógica, solo en los tipos) ---

export const registrarActividad = async (actividadData: CreateActividadPayload) => {
  const response = await api.post("/actividades/registrar", actividadData);
  return response.data;
};

export const listarActividades = async () => {
  const response = await api.get("/actividades/listar");
  // La respuesta del backend ya viene en un formato que coincide con la interfaz Actividad[]
  return response.data;
};

export const actualizarActividad = async (id: number, actividadData: UpdateActividadPayload) => {
  const response = await api.patch(`/actividades/${id}`, actividadData);
  return response.data;
};

export const eliminarActividad = async (id: number) => {
  const response = await api.delete(`/actividades/${id}`);
  return response.data;
};


// --- NUEVAS FUNCIONES NECESARIAS PARA EL FORMULARIO ---

// Función para obtener la lista de todos los usuarios
export const obtenerUsuariosParaActividades = async () => {
  const response = await api.get('/usuarios'); // Asumiendo que esta es la ruta correcta
  return response.data.data; // Usualmente los datos están en una propiedad 'data'
};

// Función para obtener la lista de todos los cultivos
export const obtenerCultivosParaActividades = async () => {
  const response = await api.get('/cultivos/listar');
  return response.data.data;
};