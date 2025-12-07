import { ValueTransformer } from 'typeorm';

export const dateColumnTransformer: ValueTransformer = {
  // Al leer de la BD: Convertimos "2025-12-02" a "2025-12-02T17:00:00.000Z"
  // Ponerlo a las 17:00 UTC (12:00 Colombia) evita el cambio de día por zona horaria.
  from: (value: string | Date | null): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    const result = new Date(`${value}T17:00:00.000Z`);
    return result;
  },

  // Al guardar en la BD: Guardamos solo la fecha "YYYY-MM-DD"
  to: (value: Date | string | null): string | null => {
    if (!value) return null;
    if (typeof value === 'string') {
      return value;
    }
    const result = value.toISOString().split('T')[0];
    return result;
  }
};