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

export const obtenerCultivosParaActividades = async (): Promise<CultivoSimple[]> => {
   // ... (sin cambios)
   const response = await api.get('/cultivos/listar');
   return response.data.data.map((cultivo: any) => ({
     id: cultivo.id,
     nombre: cultivo.nombre,
     loteId: cultivo.lote?.id
   }));
};

export const obtenerLotesParaActividades = async () => {
   const response = await api.get('/lotes/listar');
   return response.data.data;
};

export const obtenerSublotesParaActividades = async (loteId?: number) => {
   if (loteId) {
     const response = await api.get(`/sublotes/lotes/${loteId}/sublotes`);
     return response.data.data;
   } else {
     const response = await api.get('/sublotes/listar');
     return response.data.data;
   }
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
  return response.data;
};

/**
 * Obtiene todos los pagos (para instructores y administradores).
 */
export const obtenerTodosPagos = async () => {
  const response = await api.get('/pagos');
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