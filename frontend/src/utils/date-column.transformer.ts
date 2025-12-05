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