// src/features/actividades/api/actividadesapi.ts
import { api } from "../../../lib/axios";
import type {
  UpdateActividadPayload,
  AsignarActividadPayload,
  CalificarActividadPayload,
  RespuestaActividad,
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
  archivos?: FileList,
) => {
  const formData = new FormData();

  // Agregar datos del payload con conversión de tipos
  if (asignacionData.cultivo !== undefined) {
    formData.append('cultivo', asignacionData.cultivo.toString());
  }
  if (asignacionData.titulo) {
    formData.append('titulo', asignacionData.titulo);
  }
  if (asignacionData.descripcion) {
    formData.append('descripcion', asignacionData.descripcion);
  }
  if (asignacionData.fecha) {
    formData.append('fecha', asignacionData.fecha);
  }
  if (asignacionData.aprendices && asignacionData.aprendices.length > 0) {
    formData.append('aprendices', JSON.stringify(asignacionData.aprendices));
  }
  if (asignacionData.materiales && asignacionData.materiales.length > 0) {
    formData.append('materiales', JSON.stringify(asignacionData.materiales));
  }
  if (asignacionData.archivoInicial) {
    formData.append('archivoInicial', asignacionData.archivoInicial);
  }

  // Agregar archivos si existen
  if (archivos && archivos.length > 0) {
    Array.from(archivos).forEach((file) => {
      formData.append('files', file);
    });
  }

  const response = await api.post("/actividades/asignar", formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const enviarRespuesta = async (id: number, formData: FormData) => {
  const response = await api.post(`/actividades/${id}/respuesta`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const obtenerRespuestasPorActividad = async (id: number): Promise<RespuestaActividad[]> => {
  const response = await api.get(`/actividades/${id}/respuestas`);
  return response.data;
};

export const calificarRespuesta = async (respuestaId: number, calificacionData: { estado: 'aprobado' | 'rechazado'; comentarioInstructor?: string }) => {
  const response = await api.patch(`/actividades/respuesta/${respuestaId}/calificar`, calificacionData);
  return response.data;
};

export const calificarActividad = async (id: number, calificacionData: CalificarActividadPayload) => {
  const response = await api.patch(`/actividades/${id}/calificar`, calificacionData);
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

/**
 * Descarga un archivo de evidencia de actividad.
 */
export const descargarArchivoActividad = async (filename: string, nombreOriginal?: string) => {
  const response = await api.get(`/actividades/descargar/${filename}`, {
    params: { nombre: nombreOriginal },
    responseType: 'blob', // Para descargar archivos
  });
  return response;
};