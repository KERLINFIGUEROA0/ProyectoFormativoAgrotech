import type { ReactElement } from 'react';

export interface Transaccion {
  id: number;
  descripcion: string;
  monto: number;
  fecha: string;
  cantidad?: number;
  precioUnitario?: number;
}

export interface TransaccionData {
  fecha: string;
  produccionId: number;
  cantidad: number;
  monto: number; 
  descripcion?: string;
}

export interface EstadisticasCardProps {
  icon: ReactElement;
  title: string;
  value: number | string;
  color: 'blue' | 'red' | 'green' | 'yellow';
}