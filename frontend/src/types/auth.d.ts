export interface User {
  id: number;
  identificacion: string;
  nombre: string;
  rolId: number;
  rolNombre: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  permissions: string[];
  loading: boolean;
}