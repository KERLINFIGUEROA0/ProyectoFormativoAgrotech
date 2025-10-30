export interface Rol {
  id: number;
  nombre: string;
  descripcion?: string;
  usuariosAsignados?: number;
  permisos?: Record<string, boolean>;
}

export interface Permiso {
  permisoId: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
}

export interface PermisoRol extends Permiso {
  // Para roles: todos los permisos con su estado activo/inactivo
}

export interface PermisoUsuario extends Permiso {
  // Para usuarios: solo permisos adicionales (no heredados del rol)
  // activo indica si está asignado individualmente al usuario
}

export interface Usuario {
  id: number;
  identificacion: number;
  tipo?: string;
  nombre: string;
  apellidos?: string;
  correo: string;
  telefono: string;
  estado: boolean;
  tipoUsuario?: { 
    id: number;
    nombre: string;
  };
  permisos?: Record<string, boolean>;
}

export interface UsuarioForm {
  tipo?: string;
  identificacion?: number;
  nombre?: string;
  apellidos?: string;
  correo?: string;
  telefono?: string;
  rolId?: number;
}
