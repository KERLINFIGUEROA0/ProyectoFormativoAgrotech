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
  modulo?: {
    id: number;
    nombre: string;
    descripcion: string;
  };
}

export interface PermisoRol extends Permiso {
}

export interface PermisoUsuario extends Permiso {
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
  ficha?: {
    id: number;
    nombre: string;
    id_ficha: string;
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
  id_ficha?: string;
}
