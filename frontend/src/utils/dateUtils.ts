import { DateTime } from 'luxon';

export const DateUtils = {
  // Para mostrar en tablas o listas (ej: "02/12/2025 02:30 PM")
  formatToTable: (isoString: string | Date) => {
    if (!isoString) return 'N/A';
    return DateTime.fromISO(isoString.toString())
      .setZone('America/Bogota')
      .toFormat('dd/MM/yyyy hh:mm a'); // Formato colombiano común
  },

  // Para mostrar solo fecha (ej: "02/12/2025")
  formatDateOnly: (isoString: string | Date) => {
    if (!isoString) return 'N/A';
    return DateTime.fromISO(isoString.toString())
      .setZone('America/Bogota')
      .toFormat('dd/MM/yyyy');
  },

  // Para rellenar inputs de tipo 'datetime-local' en formularios de edición
  formatForInput: (isoString: string | Date) => {
    if (!isoString) return '';
    return DateTime.fromISO(isoString.toString())
      .setZone('America/Bogota')
      .toFormat("yyyy-MM-dd'T'HH:mm");
  },

  // Obtener fecha actual en formato ISO para enviar al backend
  getCurrentISO: () => {
    return DateTime.now().setZone('America/Bogota').toISO() || '';
  }
};