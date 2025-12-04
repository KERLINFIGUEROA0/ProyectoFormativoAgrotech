import { ValueTransformer } from 'typeorm';

export const dateColumnTransformer: ValueTransformer = {
  // Al leer de la BD: Si tiene tiempo, lo preservamos; si no, lo ponemos a medianoche UTC
  from: (value: string | Date | null): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    // Si el valor incluye tiempo (tiene 'T' o espacio), parseamos como está; sino, medianoche UTC
    if (value.includes('T') || value.includes(' ')) {
      return new Date(value);
    } else {
      return new Date(`${value}T00:00:00.000Z`);
    }
  },
  
  // Al guardar en la BD: Guardamos solo la fecha "YYYY-MM-DD"
  to: (value: Date | string | null): string | null => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    return value.toISOString().split('T')[0]; 
  }
};