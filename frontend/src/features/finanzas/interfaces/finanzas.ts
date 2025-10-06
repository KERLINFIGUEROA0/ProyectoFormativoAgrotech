import type { ReactElement } from 'react';

export interface Transaccion {
  id: string;
  descripcion: string;
  monto: number;
  fecha: string;
  tipo: 'ingreso' | 'egreso';
  cantidad?: number;
  precioUnitario?: number;
}

export interface TransaccionData {
  tipo: 'ingreso' | 'egreso';
  fecha: string;
  produccionId: number; // <-- AHORA ES REQUERIDO
  cantidad: number;
  monto: number; 
  descripcion: string;
}

export interface EstadisticasCardProps {
  icon: ReactElement;
  title: string;
  value: number | string;
  color: 'blue' | 'red' | 'green' | 'yellow';
}