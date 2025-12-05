/**
 * Utility functions for date and time formatting
 */

/**
 * Formats a Date object to a time string in HH:MM:SS format
 * @param date - The Date object to format
 * @returns A string representing the time in HH:MM:SS format
 */
export function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Gets the current date in Colombia timezone as a Date object
 * @returns Current date in Colombia timezone
 */
export function getCurrentDate(): Date {
  // Using native Date for simplicity, assuming local timezone is Colombia
  // For more accurate timezone handling, consider using a library like Luxon
  return new Date();
}

/**
 * Gets the current date and time in Colombia timezone as an ISO string
 * @returns Current date and time in ISO format
 */
export function getCurrentISO(): string {
  return new Date().toISOString();
}

/**
 * Converts an ISO string to a Date object in local timezone
 * @param isoString - The ISO string to convert
 * @returns Date object
 */
export function fromISO(isoString: string): Date {
  return new Date(isoString);
}

/**
 * Converts a Date object to local timezone (assuming Colombia)
 * @param date - The Date object to convert
 * @returns Date object in local timezone
 */
export function toLocalTime(date: Date): Date {
  // For simplicity, return as is. In a real app, handle timezone properly
  return new Date(date);
}

/**
 * Formats a date string or Date object to a time string in HH:MM:SS format
 * @param date - The date to format
 * @returns Formatted time string
 */
export function formatToTable(date: string | Date): string {
  return to(date) ?? '';
}

/**
 * Formats a date string or Date object to a short time format (HH:MM)
 * @param date - The date to format
 * @returns Formatted time string
 */
export function formatDateOnly(date: string | Date): string {
  const time = to(date) ?? '';
  return time.slice(0, 5);
}

/**
 * Formats a Date object to a date string in YYYY-MM-DD format
 * @param date - The Date object to format
 * @returns Formatted date string
 */
export function formatDate(date: Date | string | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * Formats a Date object to a localized date string (DD/MM/YYYY)
 * @param date - The Date object to format
 * @returns Formatted date string
 */
export function formatDateDisplay(date: Date | string | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-CO'); // DD/MM/YYYY
}
// Utility functions for time formatting instead of date
export function from(value: string | Date | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  // Si el valor incluye tiempo (tiene 'T' o espacio), parseamos como está; sino, medianoche UTC
  if (value.includes('T') || value.includes(' ')) {
    return new Date(value);
  } else {
    return new Date(`${value}T00:00:00.000Z`);
  }
}

// Adapted for time formatting: returns time as "HH:MM:SS"
export function to(value: Date | string | null): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  const timeString = value.toTimeString().split(' ')[0]; // Gets "HH:MM:SS"
  return timeString;
}

// Export DateUtils object for backward compatibility
export const DateUtils = {
  formatToTable,
  formatDateOnly,
};