// src/features/actividades/interfaces/actividades.ts

// El tipo de estado no cambia
export type EstadoActividad = 'pendiente' | 'en proceso' | 'completado';

// Interfaz para un usuario simple, tal como viene en la relación
export interface UsuarioSimple {
  id: number;
  identificacion: number;
  nombre: string;
  apellidos: string;
}

// Interfaz para un cultivo simple
export interface CultivoSimple {
  id: number;
  nombre: string;
}

// 1. Interfaz principal de Actividad (lo que devuelve la API)
// Corregimos id_actividad a id
export interface Actividad {
  id: number;
  titulo: string;
  fecha: string; // formato ISO string
  descripcion?: string;
  img?: string;
  estado: EstadoActividad;

  // Relaciones que vienen del backend
  usuario?: UsuarioSimple;
  cultivo?: CultivoSimple;
}

// 2. Payload para CREAR una actividad (lo que se envía a la API)
export interface CreateActividadPayload {
  titulo: string;
  fecha: string; // formato YYYY-MM-DD
  descripcion?: string;
  // El backend espera la IDENTIFICACIÓN del usuario, no su ID.
  usuario: number; // <--- ID de IDENTIFICACIÓN del usuario
  cultivo: number; // <--- ID del cultivo
}

// 3. Payload para ACTUALIZAR una actividad
// Hacemos opcionales todos los campos de la creación
export interface UpdateActividadPayload extends Partial<CreateActividadPayload> {
  estado?: EstadoActividad;
}