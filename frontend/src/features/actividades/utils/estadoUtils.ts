// src/features/actividades/utils/estadoUtils.ts
import type { EstadoActividad } from '../interfaces/actividades';  

/** Devuelve la clase CSS de Tailwind para el badge según el estado */
export const getEstadoBadgeClass = (estado: EstadoActividad): string => {
  switch (estado) {
    case 'completado':
      return 'bg-green-100 text-green-800';
    case 'en proceso':
      return 'bg-yellow-100 text-yellow-800';
    case 'pendiente':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/** Devuelve el texto legible del estado en español */
export const getEstadoTexto = (estado: EstadoActividad): string => {
  switch (estado) {
    case 'completado':
      return 'Completado';
    case 'en proceso':
      return 'En Proceso';
    case 'pendiente':
      return 'Pendiente';
    default:
      return 'Desconocido';
  }
};