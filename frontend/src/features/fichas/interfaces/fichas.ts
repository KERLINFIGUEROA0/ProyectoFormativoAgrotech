export interface Ficha {
  id: number;
  nombre: string;
  id_ficha: string;
  usuarios?: any[];
  usuariosCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface FichaForm {
  nombre?: string;
  id_ficha?: string;
}

export interface FichaOption {
  value: string;
  label: string;
}

export interface CreateFichaDto {
  nombre: string;
  id_ficha: string;
}

export interface UpdateFichaDto {
  nombre?: string;
  id_ficha?: string;
}