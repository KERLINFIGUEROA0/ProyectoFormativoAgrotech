// src/features/actividades/utils/estadoUtils.ts
import type { EstadoActividad } from '../interfaces/actividades';  

/** Devuelve la clase CSS de Tailwind para el badge según el estado */
export const getEstadoBadgeClass = (estado: EstadoActividad): string => {
  switch (estado) {
    case 'completado':
    case 'aprobado':
      return 'bg-green-100 text-green-800';
    case 'en proceso':
    case 'enviado':
      return 'bg-yellow-100 text-yellow-800';
    case 'pendiente':
      return 'bg-blue-100 text-blue-800';
    case 'rechazado':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/** Devuelve el texto legible del estado en español */
export const getEstadoTexto = (estado: EstadoActividad): string => {
  switch (estado) {
    case 'completado':
    case 'aprobado':
      return 'Finalizado';
    case 'en proceso':
      return 'En Proceso';
    case 'enviado':
      return 'Enviado - Esperando Calificación';
    case 'pendiente':
      return 'Pendiente';
    case 'rechazado':
      return 'Rechazado - Requiere Corrección';
    default:
      return 'Desconocido';
  }
};