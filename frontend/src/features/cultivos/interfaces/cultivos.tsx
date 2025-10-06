import type { ReactElement } from 'react';

/**
 * Representa una coordenada geográfica con latitud y longitud.
 */
export interface Coordenada {
  lat: number;
  lng: number;
}

/**
 * Define la estructura de un Lote.
 */
export interface Lote {
  id: number;
  nombre: string;
  area: string;
  estado: string;
  coordenadasPoligono?: Coordenada[];
}

/**
 * Define la estructura de un Cultivo.
 */
export interface Cultivo {
  id: number;
  nombre: string;
}

/**
 * Define la estructura de un Surco.
 */
export interface Surco {
  id: number;
  nombre: string;
  descripcion: string;
  cultivo: Cultivo | null;
  estado: string;
  lote: Lote;
}

/**
 * Define los datos para crear o actualizar un Lote.
 */
export interface LoteData {
  nombre: string;
  area: number;
  coordenadasPoligono: Coordenada[];
  estado?: string;
}

/**
 * Define los datos para crear o actualizar un Surco.
 */
export interface SurcoData {
  nombre: string;
  descripcion?: string;
  cultivoId?: number;
  loteId?: number; // Es opcional porque no se necesita al actualizar.
}

/**
 * Define las propiedades para el componente StatCard.
 */
export interface StatCardProps {
  icon: ReactElement;
  title: string;
  value: number | string;
  color: 'blue' | 'red' | 'green' | 'yellow';
}