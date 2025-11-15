// src/features/actividades/api/actividadesapi.ts
import { api } from "../../../lib/axios";
import type {
  UpdateActividadPayload,
  AsignarActividadPayload,
  UsuarioSimple,
} from '../interfaces/actividades';
// --- AÑADIR ESTE IMPORT ---
import type { Material } from '../../inventario/interfaces/inventario';

// --- FUNCIONES EXISTENTES (sin cambios) ---

export const registrarActividad = async (formData: FormData) => {
  // ... (sin cambios)
  const response = await api.post("/actividades/registrar", formData, {
    headers: {
      'Content-Type': 'multipart/form-data', 
    },
  });
  return response.data;
};

export const listarActividades = async () => {
  // ... (sin cambios)
  const response = await api.get("/actividades/listar");
  return response.data;
};

export const actualizarActividad = async (
  id: number,
  actividadData: UpdateActividadPayload,
) => {
  // ... (sin cambios)
  const response = await api.patch(`/actividades/${id}`, actividadData);
  return response.data;
};

export const eliminarActividad = async (id: number) => {
  // ... (sin cambios)
  const response = await api.delete(`/actividades/${id}`);
  return response.data;
};

export const obtenerUsuariosParaActividades = async (): Promise<UsuarioSimple[]> => {
  try {
    // Apuntamos al nuevo endpoint '/usuarios/asignables'
    // y esperamos la respuesta envuelta en { data: ... }
    const { data } = await api.get<{ data: UsuarioSimple[] }>('/usuarios/asignables');
    return data.data; // Devolvemos el array de usuarios
  } catch (error) {
    console.error('Error al obtener usuarios asignables:', error);
    return [];
  }
};

export const obtenerCultivosParaActividades = async () => {
  // ... (sin cambios)
  const response = await api.get('/cultivos/listar');
  return response.data.data;
};

export const asignarActividad = async (
  asignacionData: AsignarActividadPayload,
) => {
  // ... (sin cambios)
  const response = await api.post("/actividades/asignar", asignacionData);
  return response.data;
};

// --- AÑADIR ESTA NUEVA FUNCIÓN ---
/**
 * Obtiene la lista de materiales activos del inventario.
 */
export const obtenerMaterialesDisponibles = async (): Promise<Material[]> => {
  // Reutilizamos el endpoint del módulo de inventario
  const response = await api.get('/materiales');
  // Filtramos solo los que están activos y tienen stock
  const materialesActivos = (response.data.data || []).filter(
    (m: Material) => m.estado === true && m.cantidad > 0,
  );
  return materialesActivos;
};