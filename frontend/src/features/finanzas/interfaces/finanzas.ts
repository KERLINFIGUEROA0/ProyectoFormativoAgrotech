import type { ReactElement } from 'react';

export interface Transaccion {
  id: number | string; // Permitir string para los IDs compuestos 'gasto-123'
  descripcion: string;
  monto: number;
  fecha: string;
  tipo: string; // <-- Nuevo campo: 'ingreso' o 'egreso'
  cantidad?: number;
  unidad?: string; // <-- ✅ Nuevo campo agregado
  precioUnitario?: number;
  rutaFacturaPdf?: string; // <-- Nuevo campo
}

export interface TransaccionData {
  fecha: string;
  produccionId: number;
  cantidad: number;
  monto: number;
  descripcion?: string;
  tipo?: string; // Nuevo campo opcional
}

export interface EstadisticasCardProps {
  icon: ReactElement;
  title: string;
  value: number | string;
  color: 'blue' | 'red' | 'green' | 'yellow';
}