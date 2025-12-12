// src/features/actividades/api/actividadesapi.ts
import { api } from "../../../lib/axios";
import type {
  UpdateActividadPayload,
  AsignarActividadPayload,
  CalificarActividadPayload,
  RespuestaActividad,
  UsuarioSimple,
  CultivoSimple,
} from '../interfaces/actividades';
import type { Material } from '../../inventario/interfaces/inventario';

export const registrarActividad = async (formData: FormData) => {
  const response = await api.post("/actividades/registrar", formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const listarActividades = async () => {
  const response = await api.get("/actividades/listar");
  return response.data;
};

export const actualizarActividad = async (
  id: number,
  actividadData: UpdateActividadPayload,
) => {
  const response = await api.patch(`/actividades/${id}`, actividadData);
  return response.data;
};

export const eliminarActividad = async (id: number) => {
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
    return [];
  }
};

export const obtenerCultivosParaActividades = async (): Promise<CultivoSimple[]> => {
  // Cambiar a endpoint de actividades para usar permisos de Actividades
  const response = await api.get('/actividades/cultivos-disponibles');
  return response.data.data.map((cultivo: any) => ({
    id: cultivo.id,
    nombre: cultivo.nombre,
    loteId: cultivo.lote?.id
  }));
};

export const obtenerLotesParaActividades = async () => {
  // Cambiar a endpoint de actividades
  const response = await api.get('/actividades/lotes-disponibles');
  return response.data.data;
};

export const obtenerSublotesParaActividades = async (loteId?: number) => {
  // Cambiar a endpoint de actividades
  const response = await api.get(`/actividades/sublotes-disponibles/${loteId}`);
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
  if (asignacionData.lote !== undefined) {
    formData.append('lote', asignacionData.lote.toString());
  }
  if (asignacionData.sublote !== undefined) {
    formData.append('sublote', asignacionData.sublote.toString());
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
  if (asignacionData.responsable !== undefined) {
    formData.append('responsable', asignacionData.responsable.toString());
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

/**
 * Obtiene la lista de materiales activos del inventario para actividades.
 */
export const obtenerMaterialesDisponibles = async (): Promise<Material[]> => {
  // Usar endpoint de actividades para mantener permisos consistentes
  const response = await api.get('/actividades/materiales-disponibles');
  // Los materiales ya vienen filtrados del backend
  return response.data.data || [];
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

/**
 * Devuelve materiales al finalizar la actividad (solo para el responsable).
 */
export const devolverMaterialesFinal = async (id: number, materialesDevueltos: { materialId: number; cantidadDevuelta: number; cantidadDanada?: number; unidadSeleccionada?: string }[]) => {
  const response = await api.post(`/actividades/${id}/devolver-materiales-final`, {
    materialesDevueltos,
  });
  return response.data;
};

/**
 * Registra pagos para pasantes.
 */
export const registrarPagosPasantes = async (pagos: Array<{
  idUsuario: number;
  idActividad: number;
  monto: number;
  horasTrabajadas: number;
  tarifaHora: number;
  descripcion: string;
  fechaPago: string;
}>) => {
  const response = await api.post('/pagos', pagos);
  return response.data;
};

/**
 * Obtiene los pagos de un usuario (solo para pasantes).
 */
export const obtenerPagosUsuario = async (userId: number) => {
  const response = await api.get(`/pagos/usuario/${userId}`);
  // El backend retorna { success: true, data }
  return response.data;
};

/**
 * Obtiene todos los pagos (para instructores y administradores).
 */
export const obtenerTodosPagos = async () => {
  const response = await api.get('/pagos');
  // El backend retorna { success: true, data }
  return response.data;
};

/**
 * Actualiza un pago (solo para instructores y administradores).
 */
export const actualizarPago = async (id: number, updateData: {
  monto?: number;
  horasTrabajadas?: number;
  tarifaHora?: number;
  descripcion?: string;
  fechaPago?: string;
}) => {
  const response = await api.put(`/pagos/${id}`, updateData);
  return response.data;
};

/**
 * Obtiene los pagos de una actividad específica.
 */
export const obtenerPagosPorActividad = async (actividadId: number) => {
  const response = await api.get(`/pagos/actividad/${actividadId}`);
  return response.data;
};
