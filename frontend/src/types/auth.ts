// src/types/auth.ts

export interface LoginData {
  identificacion: string;
  password: string;
}

// Datos del usuario
export interface UsuarioData {
  tipo: string;
  identificacion: number; // Corregido: de string a number
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  fotoUrl?: string;
}

export interface UpdatePerfilDto {
  tipoIdentificacion?: string;
  identificacion?: number; // Corregido: de string a number
  nombres?: string;
  apellidos?: string;
  correo?: string;
  telefono?: string;
}

// Datos de una Ficha en la gestión
export interface GestionFichaData {
  id: number;
  nombre: string;
}

// Datos de un usuario en la gestión
export interface GestionUsuarioData {
  id: number;
  identificacion: number;
  tipo?: string;
  nombre: string;
  apellidos?: string;
  correo: string;
  telefono: string;
  rol: string;
  permisos?: Record<string, boolean>;
  estado: boolean;
  ficha?: GestionFichaData | null; // <-- Propiedad añadida
}

// Datos de un rol en la gestión
export interface GestionRolData {
  id: number;
  nombre: string;
  descripcion?: string;
  usuariosAsignados?: number;
  permisos?: Record<string, boolean>;
}

export interface GestionUsuarioDataConRol extends GestionUsuarioData {
  tipoUsuario?: {
    id: number;
    nombre: string;
  };
}

export interface Permiso {
  id: number;
  nombre: string;
  descripcion: string;
  estado: boolean;
}

export interface UserFormData {
  tipo?: string;
  identificacion?: number;
  nombres?: string;
  apellidos?: string;
  correo?: string;
  telefono?: string;
  rolId?: number;
}

// Para hacer los permisos más estrictos y evitar errores de tipeo
export type PermissionName =
  | "gestion_usuarios"
  | "gestion_contenido"
  | "reportes"
  | "config_system"
  | "seguridad"
  | "base_datos";

export type PermissionsMap = Partial<Record<PermissionName, boolean>>;

// Actualiza la interfaz de rol para usar el nuevo tipo de permisos
export interface GestionRolData {
  id: number;
  nombre: string;
  descripcion?: string;
  usuariosAsignados?: number;
  permi?: PermissionsMap; // Usamos el nuevo tipo
}