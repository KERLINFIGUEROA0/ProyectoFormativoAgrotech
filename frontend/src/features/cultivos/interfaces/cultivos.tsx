import type { ReactElement } from 'react';

/**
 * Representa una coordenada geográfica con latitud y longitud.
 */
export interface Coordenada {
   lat: number;
   lng: number;
 }

/**
 * Define la estructura de coordenadas geográficas (compatible con zonas).
 */
export interface CoordenadasGeo {
   type: 'point' | 'polygon';
   coordinates: Coordenada | Coordenada[];
 }

/**
 * Define la estructura de un Lote.
 */
export interface Lote {
   id: number;
   nombre: string;
   area?: number;
   estado: string;
   coordenadas?: CoordenadasGeo;
   sublotes?: Sublote[];
 }

/**
 * Define la estructura de un Cultivo.
 */
export interface Cultivo {
  id: number;
  nombre: string;
}

/**
 * Define la estructura de un Sublote.
 */
export interface Sublote {
  id: number;
  nombre: string;
  cultivo: Cultivo | null;
  estado: string;
  lote: Lote;
  coordenadas?: {
    type: 'point' | 'polygon';
    coordinates: { lat: number; lng: number } | Array<{ lat: number; lng: number }>;
  };
  activo_mqtt?: boolean;
}

/**
 * Define los datos para crear o actualizar un Lote.
 */
export interface LoteData {
   nombre: string;
   area: number;
   coordenadas: CoordenadasGeo;
   estado?: string;
 }

/**
 * Define los datos para crear o actualizar un Sublote.
 */
export interface SubloteData {
   nombre: string;
   coordenadas?: {
     type: 'point' | 'polygon';
     coordinates: { lat: number; lng: number } | Array<{ lat: number; lng: number }>;
   };
   cultivoId?: number | null;
   loteId?: number; // Es opcional porque no se necesita al actualizar.
   brokerId?: number | null;
   activo_mqtt?: boolean;
}

/**
 * Define las propiedades para el componente StatCard.
 */
export interface StatCardProps {
  icon: ReactElement;
  title: string;
  value: number | string;
  color: 'blue' | 'red' | 'green' | 'yellow' | 'success' | 'danger';
}

export interface Produccion {
  id: number;
  cantidad: number;
  cantidadOriginal: number;
  fecha: string;
  estado: string;
  cultivo: { id: number; nombre: string; };
  ventas: Venta[];
}

export interface Stats {
  totalCosechado: number;
  cosechaVendida: number;
  ingresosTotales: number;
  gastosTotales: number;
}

export interface Cultivo {
  id: number;
  nombre: string;
  descripcion: string;
  cantidad: number;
  Fecha_Plantado: string;
  Estado: string;
  img: string;
  tipoCultivo: {
    id: number;
    nombre: string;
  };
}

export interface TipoCultivo {
  id: number;
  nombre: string;
}

export interface Venta {
  id: number;
  cantidadVenta: number;
  valorTotalVenta: number;
  fecha: string;
}
