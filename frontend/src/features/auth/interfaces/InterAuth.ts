
export interface LoginData {
  identificacion: string;
  password: string;
}


export interface Permiso {
  id: number;
  nombre: string;
  descripcion?: string;
}

export interface User {
  id: number;
  identificacion: number;
  nombre: string;
  nombres?: string; 
  apellidos?: string;
  correo?: string;
  telefono?: string;
  tipoIdentificacion?: string;
  fotoUrl?: string;
  rolId: number;
  rolNombre: string;
  permisos?: string[]
}

export interface LoginResponse {
  access_token: string;
  user: User;
  permisos: string[];
  modulos: Record<string, string[]>;
}


export interface UpdatePerfilDto {
  tipoIdentificacion?: string;
  identificacion?: number;
  nombres?: string;
  apellidos?: string;
  correo?: string;
  telefono?: string;
}