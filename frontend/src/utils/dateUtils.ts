// src/utils/dateUtils.ts

// 1. Obtener la fecha y hora actual exacta en Colombia (para enviar al backend)
export const getColombiaDate = (): Date => {
  const now = new Date();
  // Obtener la fecha en string formato Colombia
  const colombiaTimeStr = now.toLocaleString("en-US", { timeZone: "America/Bogota" });
  return new Date(colombiaTimeStr);
};

// 2. Obtener fecha ISO actual corregida a Colombia (Para guardar en DB)
export const getColombiaISOString = (): string => {
  // Ajustamos el offset manualmente para que el ISO string refleje -5 horas
  // Ojo: toISOString siempre devuelve Z (UTC).
  // Truco: Restamos 5 horas al UTC para que al guardar coincida visualmente o usamos librerías como date-fns-tz
  // Solución nativa robusta para enviar al input type="datetime-local" o DB:

  const tzOffset = -5 * 60; // Colombia es UTC-5
  const localISOTime = new Date(Date.now() - (tzOffset * 60000)).toISOString().slice(0, -1);
  return localISOTime; // Devuelve formato "YYYY-MM-DDTHH:mm:ss.sss" sin la Z
};

// 3. Formatear visualización (Display)
export const formatToColombiaTime = (dateString: string | Date): string => {
  if (!dateString) return '';
  const date = new Date(dateString);

  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date);
};

// 4. Formatear solo fecha (para reportes)
export const formatDateOnly = (dateString: string | Date): string => {
  if (!dateString) return '';
  const date = new Date(dateString);

  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: 'numeric',
  }).format(date);
};

// 5. Formatear para display detallado
export const formatDateDisplay = (dateString: string | Date): string => {
  return formatToColombiaTime(dateString);
};

// 6. Formatear para tablas y nombres de archivo
export const formatToTable = (dateString: string | Date): string => {
  return formatDateOnly(dateString);
};